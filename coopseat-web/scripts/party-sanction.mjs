import { config as loadEnv } from 'dotenv';
loadEnv({ path: ['.env.local', '.env'], quiet: true });
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';

// Platform-level sanctions (CoopSeat moderation, not room owners).
//   npm run party:sanction -- --user <uuid> --scope <scope> [--hours <n>] [--reason "<text>"]
//   npm run party:sanction -- --revoke <sanction uuid>
// Scopes: platform (whole account), party_host, party_stream, party_join, party_chat.
// Without --hours the sanction is permanent. Applying one also cuts the user out of live sessions
// (and ends the sessions they own for platform/party_host).

const SCOPES = ['platform', 'party_host', 'party_stream', 'party_join', 'party_chat'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const usage = () => {
  console.error('Usage: npm run party:sanction -- --user <uuid> --scope <scope> [--hours <n>] [--reason "<text>"] | --revoke <uuid>');
  process.exit(1);
};

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DIRECT_URL.');
  process.exit(1);
}

async function signal(sessionId, command) {
  const base = (process.env.PARTY_SIGNAL_URL ?? '').replace(/\/$/, '');
  const secret = process.env.PARTY_SIGNAL_SECRET;
  if (!base || !secret) {
    console.warn('PARTY_SIGNAL_URL / PARTY_SIGNAL_SECRET not set: live sessions learn about it on the next token refresh (up to 10 min).');
    return;
  }
  const body = JSON.stringify(command);
  const ts = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac('sha256', secret).update(`${ts}.${nonce}.${body}`).digest('hex');
  const res = await fetch(`${base}/internal/sessions/${sessionId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-coopseat-timestamp': ts,
      'x-coopseat-nonce': nonce,
      'x-coopseat-signature': signature,
    },
    body,
  });
  if (!res.ok) console.error(`signal ${command.action} on ${sessionId}: HTTP ${res.status}`);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const revokeId = arg('revoke');
  if (revokeId) {
    if (!UUID.test(revokeId)) usage();
    const { rowCount } = await client.query(
      'update public.platform_sanctions set "revokedAt" = now() where id = $1 and "revokedAt" is null',
      [revokeId],
    );
    console.log(rowCount ? 'sanction revoked' : 'no active sanction with that id');
  } else {
    const profileId = arg('user');
    const scope = arg('scope');
    const hours = arg('hours');
    const reason = arg('reason') ?? null;
    if (!profileId || !UUID.test(profileId) || !SCOPES.includes(scope)) usage();
    if (hours !== undefined && !(Number(hours) > 0)) usage();
    if (reason && reason.length > 500) usage();

    const { rows } = await client.query(
      `insert into public.platform_sanctions (id, "profileId", scope, reason, "expiresAt", "createdBy")
       values (gen_random_uuid(), $1, $2, $3, case when $4::numeric is null then null else now() + make_interval(hours => $4::int) end, 'cli')
       returning id, "expiresAt"`,
      [profileId, scope, reason, hours ?? null],
    );
    console.log(`sanction ${rows[0].id} (${scope}) until ${rows[0].expiresAt ?? 'forever'}`);

    if (scope === 'platform' || scope === 'party_host') {
      const owned = await client.query(
        `update public.party_sessions set "endedAt" = now(), "endReason" = 'sanction'
          where "roomId" = $1 and "endedAt" is null returning id`,
        [profileId],
      );
      for (const s of owned.rows) await signal(s.id, { action: 'end', reason: 'sanction' });
      if (owned.rowCount) console.log(`ended ${owned.rowCount} owned session(s)`);
    }
    if (scope === 'platform' || scope === 'party_join') {
      const live = await client.query(
        `select p."sessionId" from public.party_session_participants p
           join public.party_sessions s on s.id = p."sessionId"
          where p."profileId" = $1 and p."leftAt" is null and s."endedAt" is null`,
        [profileId],
      );
      for (const r of live.rows) await signal(r.sessionId, { action: 'remove', profileId, reason: 'sanction' });
      if (live.rowCount) console.log(`removed from ${live.rowCount} live session(s)`);
    } else if (scope === 'party_stream' || scope === 'party_chat') {
      const live = await client.query(
        `select p."sessionId" from public.party_session_participants p
           join public.party_sessions s on s.id = p."sessionId"
          where p."profileId" = $1 and p."leftAt" is null and s."endedAt" is null`,
        [profileId],
      );
      for (const r of live.rows) await signal(r.sessionId, { action: 'refresh', profileId });
    }
  }
} finally {
  await client.end();
}
