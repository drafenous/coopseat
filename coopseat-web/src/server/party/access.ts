import {
  OWNER_PERMS,
  type EndReason,
  type ModPerms,
} from '@coopseat/ui/party-protocol';
import { permissionsFor } from '@/lib/gates';
import { NICKNAME_PATTERN } from '@/lib/validation/account';
import { adminDb } from '@/prisma/db';
import { accountPermissions } from '../account';
import { auth as authErrors } from '../auth-errors';
import { gotrue } from '../gotrue';
import { ApiError } from '../http';
import { ensureProfile, isUniqueViolation } from '../profiles';
import { rateLimit } from '../rate-limit';
import type { AuthContext } from '../session';
import { verifyRoomPassword } from './password';
import { getPartyPolicy, roomCapacity, type PartyPolicy } from './policy';
import { activeSanctions, isBlocked, type SanctionScope } from './sanctions';
import { signalCommand, signalKickHeld } from './signal';
import type { RoomTokenInput } from './tokens';

export type Viewer = {
  profileId: string;
  nickname: string | null;
  permissions: ReturnType<typeof permissionsFor>;
  /** Loaded with the viewer so admission does not read sanctions a second time. */
  sanctions?: Set<SanctionScope>;
};

/** Auth user, profile and sanctions in one round, then the watch gate. Throws if the account is suspended. */
export async function loadViewer(session: AuthContext): Promise<Viewer> {
  const [user, profile, sanctions] = await Promise.all([
    authErrors(gotrue.getUser(session.token)),
    ensureProfile(session.claims.sub),
    activeSanctions(session.claims.sub),
  ]);
  if (sanctions.has('platform')) throw new ApiError(403, 'account_suspended');
  return {
    profileId: session.claims.sub,
    nickname: profile.nickname,
    sanctions,
    permissions: accountPermissions(user, session.claims, profile),
  };
}

export type RoomOwner = { id: string; nickname: string };

/** Rooms are addressed by the owner's nickname (case-insensitive). */
export async function findOwner(nickname: string): Promise<RoomOwner | null> {
  if (!NICKNAME_PATTERN.test(nickname)) return null;
  const db = await adminDb();
  const profile = await db.orm.public.Profile.where({
    nicknameKey: nickname.toLowerCase(),
  }).first();
  return profile?.nickname
    ? { id: profile.id, nickname: profile.nickname }
    : null;
}

export async function getRoom(ownerId: string) {
  const db = await adminDb();
  return db.orm.public.PartyRoom.where({ ownerId }).first();
}

/** New rooms start as Protected (approval + allow-list bypass). */
export async function ensureRoom(ownerId: string) {
  const existing = await getRoom(ownerId);
  if (existing) return existing;
  const db = await adminDb();
  try {
    return await db.orm.public.PartyRoom.create({
      ownerId,
      requireApproval: true,
      whitelistEnabled: true,
    });
  } catch (err) {
    if (isUniqueViolation(err)) return (await getRoom(ownerId))!;
    throw err;
  }
}

export function sessionEndsAt(startedAt: string, policy: PartyPolicy): number {
  return (
    Math.floor(Date.parse(startedAt) / 1000) + policy.sessionMaxHours * 3600
  );
}

/** Ends the session row and tells the signal server. Returns false if it had already ended. */
export async function endSession(
  sessionId: string,
  reason: EndReason,
  notifySignal = true,
): Promise<boolean> {
  const db = await adminDb();
  const now = new Date().toISOString();
  const updated = await db.orm.public.PartySession.where({ id: sessionId })
    .where((s) => s.endedAt.isNull())
    .updateAll({ endedAt: now, endReason: reason });
  if (updated.length === 0) return false;
  await db.orm.public.PartySessionParticipant.where({ sessionId })
    .where((p) => p.leftAt.isNull())
    .updateAll({ leftAt: now });
  if (notifySignal) await signalCommand(sessionId, { action: 'end', reason });
  return true;
}

/**
 * The live session of a room, closing it first if it outlived `sessionMaxHours`.
 * The policy read overlaps the session read when the caller has not loaded it yet.
 */
export async function getActiveSession(
  roomId: string,
  policy?: PartyPolicy | Promise<PartyPolicy>,
) {
  const db = await adminDb();
  const [session, resolved] = await Promise.all([
    db.orm.public.PartySession.where({ roomId })
      .where((s) => s.endedAt.isNull())
      .first(),
    policy ?? getPartyPolicy(),
  ]);
  if (!session) return null;
  if (sessionEndsAt(session.startedAt, resolved) * 1000 <= Date.now()) {
    await endSession(session.id, 'max_duration');
    return null;
  }
  return session;
}

export async function getModerator(roomId: string, profileId: string) {
  const db = await adminDb();
  return db.orm.public.PartyRoomModerator.where({ roomId, profileId }).first();
}

export function modPerms(row: {
  canKick: boolean;
  canBan: boolean;
  canStopStreams: boolean;
  canApprove: boolean;
  canGrantStream: boolean;
  canDeleteMessages: boolean;
}): ModPerms {
  return {
    kick: row.canKick,
    ban: row.canBan,
    stopStreams: row.canStopStreams,
    approve: row.canApprove,
    grantStream: row.canGrantStream,
    deleteMessages: row.canDeleteMessages,
  };
}

export async function getActiveBan(roomId: string, profileId: string) {
  const db = await adminDb();
  const ban = await db.orm.public.PartyRoomBan.where({
    roomId,
    profileId,
  }).first();
  return ban && (!ban.expiresAt || Date.parse(ban.expiresAt) > Date.now())
    ? ban
    : null;
}

/**
 * A kick of someone who is still a moderator or still on the allow list lasts for this
 * session. Only the owner may clear it. A kicked stranger stays on the normal approval path.
 */
export async function assertCanLiftKick(
  actor: Actor,
  roomId: string,
  sessionId: string,
  profileId: string,
): Promise<void> {
  if (actor.role === 'owner') return;
  const db = await adminDb();
  const [row, moderator, listed] = await Promise.all([
    db.orm.public.PartySessionParticipant.where({
      sessionId,
      profileId,
    }).first(),
    getModerator(roomId, profileId),
    db.orm.public.PartyRoomWhitelist.where({ roomId, profileId }).first(),
  ]);
  if (row?.removal === 'kick' && (moderator || listed))
    throw new ApiError(403, 'party_forbidden');
}

/** One row per (session, profile); an explicit re-admission after a kick clears the removal. */
export async function admitParticipant(
  sessionId: string,
  profileId: string,
): Promise<void> {
  const db = await adminDb();
  const rows = db.orm.public.PartySessionParticipant;
  const existing = await rows.where({ sessionId, profileId }).first();
  if (existing) {
    if (existing.removal !== null || existing.leftAt !== null) {
      await rows
        .where({ id: existing.id })
        .updateAll({ removal: null, removedBy: null, leftAt: null });
    }
    return;
  }
  await rows.create({ sessionId, profileId });
}

export async function markRemoved(
  sessionId: string,
  profileId: string,
  removal: 'kick' | 'ban',
  by: string,
) {
  const db = await adminDb();
  await db.orm.public.PartySessionParticipant.where({
    sessionId,
    profileId,
  }).updateAll({
    removal,
    removedBy: by,
    leftAt: new Date().toISOString(),
  });
}

export type AccessResult =
  | {
      state: 'admitted' | 'pending';
      claims: RoomTokenInput;
      sessionId: string;
      endsAt: number;
      /** The signal room is still holding a kick that this token is allowed to pass. */
      releaseKick?: boolean;
    }
  | { state: 'offline'; isOwner: boolean; canOpen: boolean }
  | { state: 'password_required' }
  | { state: 'not_invited' }
  | { state: 'kicked' }
  | { state: 'banned' }
  | { state: 'unavailable' }
  | { state: 'disabled' }
  | { state: 'requirements'; missing: string[] };

/**
 * Decides whether a viewer may enter the room's live session and with which role. Order matters:
 * sanctions, identity gate, ban, live session, then the room protections (allow list skips the
 * password and the approval; previously admitted participants skip everything until kicked).
 */
export async function decideAccess(input: {
  viewer: Viewer;
  owner: RoomOwner;
  password?: string;
  expectedSessionId?: string;
  /** Already loaded by the caller; read here otherwise. */
  policy?: PartyPolicy;
  sanctions?: Set<SanctionScope>;
  room?: ReturnType<typeof getRoom>;
}): Promise<AccessResult> {
  const { viewer, owner } = input;
  const isOwner = viewer.profileId === owner.id;
  // Independent reads go out together, including the live session; the checks below keep their order.
  const policyPromise = input.policy ?? getPartyPolicy();
  const [policy, sanctions, ban, room, session] = await Promise.all([
    policyPromise,
    input.sanctions ?? viewer.sanctions ?? activeSanctions(viewer.profileId),
    isOwner ? null : getActiveBan(owner.id, viewer.profileId),
    input.room ?? getRoom(owner.id),
    getActiveSession(owner.id, policyPromise),
  ]);
  if (!policy.enabled) return { state: 'disabled' };
  if (isBlocked(sanctions, 'party_join')) return { state: 'unavailable' };
  if (!viewer.permissions.watch.allowed)
    return { state: 'requirements', missing: viewer.permissions.watch.missing };
  if (ban) return { state: 'banned' };
  if (
    !room ||
    !session ||
    (input.expectedSessionId && input.expectedSessionId !== session.id)
  ) {
    return {
      state: 'offline',
      isOwner,
      canOpen: isOwner || (await durableCanStream(room, viewer, sanctions)),
    };
  }

  const endsAt = sessionEndsAt(session.startedAt, policy);
  const base = {
    sid: session.id,
    rid: room.ownerId,
    sub: viewer.profileId,
    nick: viewer.nickname ?? '',
    streamBlocked:
      !viewer.permissions.host.allowed || isBlocked(sanctions, 'party_stream'),
    chat:
      policy.chatEnabled &&
      viewer.permissions.chat.allowed &&
      !isBlocked(sanctions, 'party_chat'),
    cfg: {
      cap: roomCapacity(policy, room),
      maxStreamers: policy.maxStreamers,
      ownerGraceSeconds: policy.ownerGraceSeconds,
      endsAt,
      chat: policy.chatEnabled,
    },
  };
  const result = (
    state: 'admitted' | 'pending',
    claims: Pick<RoomTokenInput, 'role' | 'canStream' | 'mod'> &
      Partial<Pick<RoomTokenInput, 'streamBlocked'>>,
    releaseKick = false,
  ): AccessResult => ({
    state,
    sessionId: session.id,
    endsAt,
    claims: { ...base, ...claims, status: state },
    ...(releaseKick ? { releaseKick: true } : {}),
  });

  if (isOwner) {
    return result('admitted', {
      role: 'owner',
      canStream: true,
      mod: OWNER_PERMS,
      streamBlocked: base.streamBlocked || isBlocked(sanctions, 'party_host'),
    });
  }

  const db = await adminDb();
  const [moderator, listed, participant] = await Promise.all([
    getModerator(room.ownerId, viewer.profileId),
    db.orm.public.PartyRoomWhitelist.where({
      roomId: room.ownerId,
      profileId: viewer.profileId,
    }).first(),
    db.orm.public.PartySessionParticipant.where({
      sessionId: session.id,
      profileId: viewer.profileId,
    }).first(),
  ]);
  const returning = participant?.removal === null ? participant : null;
  const role = moderator ? ('moderator' as const) : ('member' as const);
  const claims = {
    role,
    canStream: listed?.canStream ?? false,
    mod: moderator ? modPerms(moderator) : null,
  };

  if (participant?.removal === 'kick' && (moderator || listed))
    return { state: 'kicked' };

  const privileged = Boolean(moderator || listed);
  // The removal row can still be null while the room already tombstoned the kick.
  const kickHeld =
    (privileged || returning) && participant?.removal == null
      ? await signalKickHeld(session.id, viewer.profileId)
      : false;
  if (privileged && kickHeld) return { state: 'kicked' };

  if (privileged || returning) {
    // A row already open for this session does not need another read/write on every token refresh.
    if (!returning || returning.leftAt !== null)
      await admitParticipant(session.id, viewer.profileId);
    return result('admitted', claims, kickHeld);
  }

  if (room.passwordHash) {
    if (!input.password) return { state: 'password_required' };
    await rateLimit('party_password', `${viewer.profileId}:${room.ownerId}`);
    if (!(await verifyRoomPassword(input.password, room.passwordHash)))
      throw new ApiError(403, 'party_password_invalid');
  }

  // Protected → pending; Private → not invited; Public → admit.
  // A recorded kick of someone without privilege is allowed back by those rules,
  // and the room needs an explicit clearance or the new token is still rejected.
  const recordedKick = participant?.removal === 'kick';
  if (room.requireApproval) return result('pending', claims, recordedKick);
  if (room.whitelistEnabled) return { state: 'not_invited' };

  await admitParticipant(session.id, viewer.profileId);
  return result('admitted', claims, recordedKick);
}

/**
 * True when this person may open a closed room: the owner, or a whitelist entry that already
 * allows streaming. Session-only grants and password/approval admission do not.
 * Allow-list stream grants apply in every visibility mode (including Public).
 */
async function durableCanStream(
  room: { ownerId: string } | null,
  viewer: Viewer,
  sanctions: Set<SanctionScope>,
): Promise<boolean> {
  if (!room) return false;
  if (!viewer.permissions.host.allowed || isBlocked(sanctions, 'party_stream'))
    return false;
  const db = await adminDb();
  const listed = await db.orm.public.PartyRoomWhitelist.where({
    roomId: room.ownerId,
    profileId: viewer.profileId,
  }).first();
  return Boolean(listed?.canStream);
}

/**
 * Opens the room's live session when none exists, then admits the caller.
 * The owner can always open their room. Anyone else needs a durable `canStream` on the allow list.
 */
export async function openLiveSession(input: {
  viewer: Viewer;
  owner: RoomOwner;
}): Promise<AccessResult> {
  const { viewer, owner } = input;
  const isOwner = viewer.profileId === owner.id;
  const [policy, sanctions] = await Promise.all([
    getPartyPolicy(),
    viewer.sanctions ?? activeSanctions(viewer.profileId),
  ]);
  if (!policy.enabled) throw new ApiError(503, 'party_disabled');
  if (
    isBlocked(sanctions, 'party_join') ||
    isBlocked(sanctions, 'party_stream') ||
    (isOwner && isBlocked(sanctions, 'party_host'))
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

  const room = isOwner ? await ensureRoom(owner.id) : await getRoom(owner.id);
  if (!isOwner) {
    if (!(await durableCanStream(room, viewer, sanctions)))
      throw new ApiError(403, 'party_forbidden');
    if (await getActiveBan(owner.id, viewer.profileId))
      return { state: 'banned' };
  }

  if (!(await getActiveSession(owner.id, policy))) {
    const db = await adminDb();
    try {
      await db.orm.public.PartySession.create({ roomId: owner.id });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  return decideAccess({
    viewer,
    owner,
    policy,
    sanctions,
    room: Promise.resolve(room),
  });
}

export type Actor = { role: 'owner' | 'moderator'; perms: ModPerms };

export async function actorFor(
  roomId: string,
  profileId: string,
): Promise<Actor | null> {
  if (roomId === profileId) return { role: 'owner', perms: OWNER_PERMS };
  const moderator = await getModerator(roomId, profileId);
  return moderator ? { role: 'moderator', perms: modPerms(moderator) } : null;
}

/** Nobody acts on the owner; moderators can't act on other moderators. */
export async function assertCanTarget(
  roomId: string,
  actor: Actor,
  targetId: string,
): Promise<void> {
  if (targetId === roomId) throw new ApiError(403, 'party_target_invalid');
  if (actor.role === 'moderator' && (await getModerator(roomId, targetId))) {
    throw new ApiError(403, 'party_target_invalid');
  }
}

export async function logModeration(event: {
  roomId: string;
  sessionId?: string | null;
  actorId: string;
  targetId?: string | null;
  action: string;
  detail?: string | null;
}): Promise<void> {
  const db = await adminDb();
  await db.orm.public.PartyModerationEvent.create({
    roomId: event.roomId,
    sessionId: event.sessionId ?? null,
    actorId: event.actorId,
    targetId: event.targetId ?? null,
    action: event.action,
    detail: event.detail ?? null,
  });
}
