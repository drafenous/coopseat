import { NextResponse, type NextRequest } from 'next/server';
import { dictionaries, errorMessage, type ErrorCode } from '@/i18n/dictionaries';
import { localeFromRequest } from '@/i18n/server';
import { adminDb } from '@/prisma/db';
import { turnSchema } from '@/lib/validation/party';
import { ApiError, readJson, route } from '@/server/http';
import { verifyRoomToken } from '@/server/party/tokens';
import { rateLimit } from '@/server/rate-limit';
import { evaluateRelay, type RelayDenyReason } from '@/server/relay-policy';
import { requireAuth } from '@/server/session';
import { createIceServers, STUN_ONLY, turnUsername } from '@/server/turn';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Blocks and kill switches share one vague message so users can't probe which rule hit them. */
const DENY_MESSAGE: Record<RelayDenyReason, ErrorCode> = {
  disabled: 'relay_unavailable',
  audience_disabled: 'relay_unavailable',
  user_blocked: 'relay_unavailable',
  budget_exceeded: 'relay_unavailable',
  budget_unverified: 'relay_unavailable',
  quota_exceeded: 'relay_quota_exceeded',
  app_version_blocked: 'relay_app_outdated',
};

/** Only the desktop app sends this header; browsers are never subject to version rules. */
function appVersion(req: NextRequest): string | null {
  const value = req.headers.get('x-coopseat-version')?.trim();
  return value && /^v?\d+(\.\d+){0,2}([-+][\w.-]+)?$/.test(value) && value.length <= 32 ? value : null;
}

/**
 * A room token is issued only after the watch gate (verified 18+) and admission to a live session,
 * so it stands in for both checks; the session must still be live.
 */
async function assertAdmitted(roomToken: string, profileId: string): Promise<void> {
  const claims = await verifyRoomToken(roomToken);
  if (!claims || claims.sub !== profileId || claims.status !== 'admitted') throw new ApiError(403, 'party_token_invalid');
  const db = await adminDb();
  const session = await db.orm.public.PartySession.where({ id: claims.sid }).first();
  if (!session || session.endedAt !== null) throw new ApiError(403, 'party_token_invalid');
}

/**
 * ICE servers for participants admitted to a live Gaming-Party session. When the relay policy denies
 * TURN, answers with STUN only (`relay: false`) so direct connections keep working and only
 * relay-dependent ones fail.
 */
export const POST = route(async (req) => {
  const session = await requireAuth(req);
  const profileId = session.claims.sub;
  await rateLimit('turn', profileId);
  const { roomToken } = await readJson(req, turnSchema);
  await assertAdmitted(roomToken, profileId);

  const version = appVersion(req);
  const decision = await evaluateRelay({ audience: 'member', profileId, appVersion: version });
  if (!decision.allowed) {
    console.warn('TURN relay denied', { profileId, reason: decision.reason });
    const code = DENY_MESSAGE[decision.reason];
    const message = errorMessage(dictionaries[localeFromRequest(req)], code);
    return NextResponse.json({ iceServers: STUN_ONLY, relay: false, reason: code, message }, { headers: NO_STORE });
  }

  const ttl = decision.policy.credentialTtlSeconds;
  const iceServers = await createIceServers(ttl);
  const issuedAt = Date.now();
  const db = await adminDb();
  await db.orm.public.RelayCredential.create({
    profileId,
    username: turnUsername(iceServers) ?? '',
    audience: 'member',
    appVersion: version,
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(issuedAt + ttl * 1000).toISOString(),
  });
  return NextResponse.json(
    {
      iceServers,
      expiresAt: Math.floor(issuedAt / 1000) + ttl,
      relay: true,
      maxRelayBitrateKbps: decision.policy.maxRelayBitrateKbps,
    },
    { headers: NO_STORE },
  );
});
