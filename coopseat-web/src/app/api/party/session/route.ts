import { NextResponse } from 'next/server';
import { ApiError, route } from '@/server/http';
import {
  endSession,
  getActiveSession,
  openLiveSession,
} from '@/server/party/access';
import { accessPayload } from '@/server/party/join';
import { getPartyPolicy } from '@/server/party/policy';
import { NO_STORE, partyCaller } from '@/server/party/routes';

/**
 * The owner starts a session by starting their own stream. Calling it again while a session is live
 * returns the same session. Stopping a stream does not end it; the owner can still close it here.
 */
export const POST = route(async (req) => {
  const { viewer } = await partyCaller(req, 'party_session');
  if (!viewer.nickname)
    throw new ApiError(403, 'party_requirements', { missing: ['nickname'] });
  const owner = { id: viewer.profileId, nickname: viewer.nickname };
  const result = await openLiveSession({ viewer, owner });
  return NextResponse.json(await accessPayload(result, owner), {
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
