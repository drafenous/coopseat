import { getRoom, type AccessResult, type RoomOwner } from './access';
import { signalCommand, signalSocketUrl } from './signal';
import { signRoomToken } from './tokens';

/** Shape returned by join, token refresh and session start; clients branch on `state`. */
export async function accessPayload(
  result: AccessResult,
  owner: RoomOwner,
  loadedRoom?: Awaited<ReturnType<typeof getRoom>>,
) {
  const room = loadedRoom !== undefined ? loadedRoom : await getRoom(owner.id);
  const roomInfo = {
    owner: owner.nickname,
    ownerId: owner.id,
    defaultLayout: room?.defaultLayout === 'grid' ? 'grid' : 'stage',
  };
  if (result.state !== 'admitted' && result.state !== 'pending')
    return { ...result, room: roomInfo };

  // The room ignores a newer iat until this clearance. The token carries the same iat.
  const iat = Math.floor(Date.now() / 1000);
  if (result.releaseKick)
    await signalCommand(result.sessionId, {
      action: 'clear',
      profileId: result.claims.sub,
      iat,
    });
  const { token, expiresAt } = await signRoomToken(result.claims, iat);
  const { claims } = result;
  return {
    state: result.state,
    token,
    expiresAt,
    sessionId: result.sessionId,
    endsAt: result.endsAt,
    signalUrl: signalSocketUrl(result.sessionId),
    you: {
      id: claims.sub,
      nick: claims.nick,
      role: claims.role,
      canStream: claims.canStream,
      streamBlocked: claims.streamBlocked,
      chat: claims.chat,
      mod: claims.mod,
    },
    room: roomInfo,
  };
}
