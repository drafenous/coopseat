import { adminDb } from '@/prisma/db';
import { env } from '../env';
import { ensureRoom, getActiveSession, modPerms } from './access';
import { getPartyPolicy, roomCapacity } from './policy';
import { nicknames } from './routes';

/** Owner-facing room settings. The password hash never leaves the server; only whether one is set. */
export async function roomView(ownerId: string, ownerNickname: string | null) {
  const db = await adminDb();
  const policy = await getPartyPolicy();
  const room = await ensureRoom(ownerId);
  const [whitelist, moderators, session] = await Promise.all([
    db.orm.public.PartyRoomWhitelist.where({ roomId: ownerId }).all(),
    db.orm.public.PartyRoomModerator.where({ roomId: ownerId }).all(),
    getActiveSession(ownerId, policy),
  ]);
  const names = await nicknames([
    ...whitelist.map((w) => w.profileId),
    ...moderators.map((m) => m.profileId),
  ]);
  return {
    shareUrl: ownerNickname ? `${env.appUrl}/party/${ownerNickname}` : null,
    hasPassword: room.passwordHash !== null,
    requireApproval: room.requireApproval,
    whitelistEnabled: room.whitelistEnabled,
    defaultLayout: room.defaultLayout === 'grid' ? 'grid' : 'stage',
    maxParticipants: roomCapacity(policy, room),
    maxStreamers: policy.maxStreamers,
    enabled: policy.enabled,
    whitelist: whitelist.map((w) => ({
      profileId: w.profileId,
      nickname: names.get(w.profileId) ?? '',
      canStream: w.canStream,
    })),
    moderators: moderators.map((m) => ({
      profileId: m.profileId,
      nickname: names.get(m.profileId) ?? '',
      ...modPerms(m),
    })),
    activeSession: session
      ? { id: session.id, startedAt: session.startedAt }
      : null,
  };
}
