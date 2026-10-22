import { adminDb } from '@/prisma/db';
import {
  parseRoomQuery,
  roomVisibility,
  type RoomListing,
  type RoomPasswordFilter,
  type RoomStatusFilter,
  type RoomVisibilityFilter,
} from '@coopseat/ui/party-protocol';
import { ApiError } from '../http';
import { findOwner, getRoom, sessionEndsAt } from './access';
import { getPartyPolicy, roomCapacity, type PartyPolicy } from './policy';

/** Rows on one directory page. Open rooms still sort first, across pages. */
export const ROOM_PAGE_SIZE = 20;

type RoomShape = {
  passwordHash: string | null;
  requireApproval: boolean;
  whitelistEnabled: boolean;
  maxParticipants: number | null;
};

function isLive(startedAt: string, policy: PartyPolicy): boolean {
  return sessionEndsAt(startedAt, policy) * 1000 > Date.now();
}

function toCard(
  nickname: string,
  avatarUrl: string | null,
  room: RoomShape | null,
  open: boolean,
  people: number,
  policy: PartyPolicy,
): RoomListing {
  const inviteOnly = Boolean(room?.whitelistEnabled && !room.requireApproval);
  return {
    nickname,
    avatarUrl,
    open,
    people: open ? people : 0,
    capacity: roomCapacity(policy, room),
    hasPassword: room?.passwordHash != null,
    requireApproval: room?.requireApproval ?? true,
    inviteOnly,
  };
}

async function presentCounts(sessionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sessionIds.length === 0) return counts;
  const db = await adminDb();
  const rows = await db.orm.public.PartySessionParticipant.where((p) =>
    p.sessionId.in(sessionIds),
  )
    .where((p) => p.leftAt.isNull())
    .where((p) => p.removal.isNull())
    .all();
  for (const row of rows)
    counts.set(row.sessionId, (counts.get(row.sessionId) ?? 0) + 1);
  return counts;
}

/**
 * One room by nickname or link. Reads only: a public lookup must not end sessions or create rooms.
 * A nickname with no room row yet is closed, with the same defaults a new room would get.
 */
export async function lookupRoom(raw: string): Promise<RoomListing> {
  const nickname = parseRoomQuery(raw);
  if (!nickname) throw new ApiError(400, 'invalid_input');
  const owner = await findOwner(nickname);
  if (!owner) throw new ApiError(404, 'party_not_found');
  const db = await adminDb();
  const [room, policy, session] = await Promise.all([
    getRoom(owner.id),
    getPartyPolicy(),
    db.orm.public.PartySession.where({ roomId: owner.id })
      .where((s) => s.endedAt.isNull())
      .first(),
  ]);
  const open = Boolean(session && isLive(session.startedAt, policy));
  const people =
    open && session ? ((await presentCounts([session.id])).get(session.id) ?? 0) : 0;
  return toCard(owner.nickname, owner.avatarUrl, room, open, people, policy);
}

export type RoomPage = {
  rooms: RoomListing[];
  total: number;
  page: number;
  pageSize: number;
};

export type RoomListRestrictions = {
  password?: RoomPasswordFilter;
  /** One mode, or several. Missing and `any` leave visibility out of the filter. */
  visibility?: RoomVisibilityFilter | Exclude<RoomVisibilityFilter, 'any'>[];
};

function matchesRestrictions(
  card: RoomListing,
  restrictions: RoomListRestrictions,
): boolean {
  const password = restrictions.password ?? 'any';
  if (password === 'yes' && !card.hasPassword) return false;
  if (password === 'no' && card.hasPassword) return false;
  const visibility = restrictions.visibility;
  if (visibility == null || visibility === 'any') return true;
  const allowed = (Array.isArray(visibility) ? visibility : [visibility]).filter(
    (item) => item !== 'any',
  );
  return allowed.length === 0 || allowed.includes(roomVisibility(card));
}

/** Rooms whose owner turned on `listed`. Unlisted rooms stay reachable by name. */
export async function listRooms(
  status: RoomStatusFilter,
  page = 1,
  restrictions: RoomListRestrictions = {},
): Promise<RoomPage> {
  const db = await adminDb();
  const [rooms, policy] = await Promise.all([
    db.orm.public.PartyRoom.where({ listed: true }).all(),
    getPartyPolicy(),
  ]);
  if (rooms.length === 0) {
    return { rooms: [], total: 0, page, pageSize: ROOM_PAGE_SIZE };
  }
  const ownerIds = rooms.map((room) => room.ownerId);
  const [profiles, sessions] = await Promise.all([
    db.orm.public.Profile.where((p) => p.id.in(ownerIds)).all(),
    db.orm.public.PartySession.where((s) => s.roomId.in(ownerIds))
      .where((s) => s.endedAt.isNull())
      .all(),
  ]);
  const owners = new Map(
    profiles.flatMap((profile) =>
      profile.nickname
        ? [
            [
              profile.id,
              { nickname: profile.nickname, avatarUrl: profile.avatarUrl },
            ] as const,
          ]
        : [],
    ),
  );
  const liveSessions = sessions.filter((session) =>
    isLive(session.startedAt, policy),
  );
  const byRoom = new Map(liveSessions.map((session) => [session.roomId, session]));
  const counts = await presentCounts(liveSessions.map((session) => session.id));
  const cards = rooms.flatMap((room) => {
    const owner = owners.get(room.ownerId);
    if (!owner) return [];
    const session = byRoom.get(room.ownerId);
    const open = Boolean(session);
    return [
      toCard(
        owner.nickname,
        owner.avatarUrl,
        room,
        open,
        session ? (counts.get(session.id) ?? 0) : 0,
        policy,
      ),
    ];
  });
  const filtered = cards.filter((card) => {
    const statusOk =
      status === 'all' ? true : status === 'open' ? card.open : !card.open;
    return statusOk && matchesRestrictions(card, restrictions);
  });
  filtered.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    if (a.people !== b.people) return b.people - a.people;
    return a.nickname.localeCompare(b.nickname);
  });
  const start = (page - 1) * ROOM_PAGE_SIZE;
  return {
    rooms: filtered.slice(start, start + ROOM_PAGE_SIZE),
    total: filtered.length,
    page,
    pageSize: ROOM_PAGE_SIZE,
  };
}
