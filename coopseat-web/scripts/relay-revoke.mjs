import { config as loadEnv } from 'dotenv';
loadEnv({ path: ['.env.local', '.env'], quiet: true });
import pg from 'pg';

// Revokes still-valid TURN credentials at Cloudflare, so a block or kill switch also cuts
// sessions that already hold credentials.
//   npm run relay:revoke -- --user <profile uuid>
//   npm run relay:revoke -- --all

const args = process.argv.slice(2);
const userIndex = args.indexOf('--user');
const profileId = userIndex >= 0 ? args[userIndex + 1] : null;
const all = args.includes('--all');
if ((!profileId && !all) || (profileId && all) || (profileId && !/^[0-9a-f-]{36}$/i.test(profileId))) {
  console.error('Usage: npm run relay:revoke -- --user <uuid> | --all');
  process.exit(1);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
if (!url || !keyId || !token) {
  console.error('Set DIRECT_URL, CLOUDFLARE_TURN_KEY_ID and CLOUDFLARE_TURN_API_TOKEN.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(
    `select id, "profileId", username from public.relay_credentials
      where "revokedAt" is null and "expiresAt" > now() and username <> ''
        and ($1::uuid is null or "profileId" = $1::uuid)`,
    [profileId],
  );
  let revoked = 0;
  for (const row of rows) {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/${encodeURIComponent(row.username)}/revoke`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      console.error(`failed ${row.id} (user ${row.profileId}): HTTP ${res.status}`);
      continue;
    }
    await client.query('update public.relay_credentials set "revokedAt" = now() where id = $1', [row.id]);
    revoked++;
  }
  console.log(`revoked ${revoked} of ${rows.length} active credential(s)`);
  if (revoked < rows.length) process.exitCode = 1;
} finally {
  await client.end();
}
