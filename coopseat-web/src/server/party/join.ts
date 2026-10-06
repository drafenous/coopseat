import { getRoom, type AccessResult, type RoomOwner } from './access';
import { signalSocketUrl } from './signal';
import { signRoomToken } from './tokens';

/** Shape returned by join, token refresh and session start; clients branch on `state`. */
export async function accessPayload(
  result: AccessResult,
  owner: RoomOwner,
  loadedRoom?: Awaited<ReturnType<typeof getRoom>>,
) {
  const room =
    loadedRoom !== undefined ? loadedRoom : await getRoom(owner.id);
  const roomInfo = {
    owner: owner.nickname,
    ownerId: owner.id,
    defaultLayout: room?.defaultLayout ?? 'stage',
  };
  if (result.state !== 'admitted' && result.state !== 'pending')
    return { ...result, room: roomInfo };

  const { token, expiresAt } = await signRoomToken(result.claims);
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
