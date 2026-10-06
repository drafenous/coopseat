import { NextResponse } from 'next/server';
import { adminDb } from '@/prisma/db';
import { ApiError, route } from '@/server/http';
import {
  decideAccess,
  endSession,
  ensureRoom,
  getActiveSession,
} from '@/server/party/access';
import { accessPayload } from '@/server/party/join';
import { getPartyPolicy } from '@/server/party/policy';
import { NO_STORE, partyCaller } from '@/server/party/routes';
import { activeSanctions, isBlocked } from '@/server/party/sanctions';
import { isUniqueViolation } from '@/server/profiles';

/**
 * The owner starts a session by starting their own stream. Calling it again while a session is live
 * returns the same session (reload / reconnect), so a session only ends by an explicit stop or timeout.
 */
export const POST = route(async (req) => {
  const { viewer } = await partyCaller(req, 'party_session');
  const [policy, sanctions] = await Promise.all([
    getPartyPolicy(),
    activeSanctions(viewer.profileId),
  ]);
  if (!policy.enabled) throw new ApiError(503, 'party_disabled');
  if (
    isBlocked(sanctions, 'party_host') ||
    isBlocked(sanctions, 'party_stream')
  ) {
    throw new ApiError(403, 'party_unavailable');
  }
  if (!viewer.permissions.host.allowed) {
    throw new ApiError(403, 'party_requirements', {
      missing: viewer.permissions.host.missing,
    });
  }
  if (!viewer.nickname)
    throw new ApiError(403, 'party_requirements', { missing: ['nickname'] });

  const room = await ensureRoom(viewer.profileId);
  if (!(await getActiveSession(viewer.profileId, policy))) {
    const db = await adminDb();
    try {
      await db.orm.public.PartySession.create({ roomId: viewer.profileId });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  const owner = { id: viewer.profileId, nickname: viewer.nickname };
  const result = await decideAccess({
    viewer,
    owner,
    policy,
    sanctions,
    room: Promise.resolve(room),
  });
  return NextResponse.json(await accessPayload(result, owner, room), {
    headers: NO_STORE,
  });
});

/** Ends the owner's live session: every viewer is disconnected, other streams stop and chat is erased. */
export const DELETE = route(async (req) => {
  const { viewer } = await partyCaller(req, 'party_session');
  const session = await getActiveSession(
    viewer.profileId,
    await getPartyPolicy(),
  );
  if (session) await endSession(session.id, 'owner_ended');
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
});
