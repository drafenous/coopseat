import { NextResponse } from 'next/server';
import { route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';
import { createIceServers, TURN_TTL_SECONDS } from '@/server/turn';

/**
 * TURN credentials for signed-in users. Anonymous guests will receive theirs from the
 * room join route, scoped to a valid invite, so the relay can't be used freely.
 */
export const POST = route(async (req) => {
  const session = await requireAuth(req);
  await rateLimit('turn', session.claims.sub);
  const iceServers = await createIceServers();
  return NextResponse.json(
    { iceServers, expiresAt: Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
