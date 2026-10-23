/**
 * How a person points at a room: a nickname, a site path, or a desktop link.
 * Shared by the BFF and the clients. No DOM, no Node-only APIs.
 */

const NICKNAME = /^[A-Za-z0-9_]{3,20}$/;

/** A room as the directory and the header search show it. No ids, no secrets. */
export type RoomListing = {
  nickname: string;
  /** Profile photo. Null when the host has not set one, or the room is not listed. */
  avatarUrl: string | null;
  /** False hides live occupancy and room protections. Search can still open the room. */
  listed: boolean;
  open: boolean;
  people: number;
  capacity: number;
  hasPassword: boolean;
  requireApproval: boolean;
  /** Private room: only the allow list can enter. */
  inviteOnly: boolean;
};

export type RoomStatusFilter = 'open' | 'closed' | 'all';

export const ROOM_STATUS_FILTERS: readonly RoomStatusFilter[] = [
  'open',
  'closed',
  'all',
];

export function isRoomStatusFilter(value: string): value is RoomStatusFilter {
  return (ROOM_STATUS_FILTERS as readonly string[]).includes(value);
}

/** Whether the room asks for a password. `any` leaves that out of the filter. */
export type RoomPasswordFilter = 'any' | 'yes' | 'no';

export const ROOM_PASSWORD_FILTERS: readonly RoomPasswordFilter[] = [
  'any',
  'yes',
  'no',
];

export function isRoomPasswordFilter(value: string): value is RoomPasswordFilter {
  return (ROOM_PASSWORD_FILTERS as readonly string[]).includes(value);
}

/**
 * Same three modes as the room settings: approval, allow list only, or open join.
 * `any` leaves visibility out of the filter.
 */
export type RoomVisibilityFilter = 'any' | 'protected' | 'private' | 'public';

export const ROOM_VISIBILITY_FILTERS: readonly RoomVisibilityFilter[] = [
  'any',
  'protected',
  'private',
  'public',
];

export function isRoomVisibilityFilter(
  value: string,
): value is RoomVisibilityFilter {
  return (ROOM_VISIBILITY_FILTERS as readonly string[]).includes(value);
}

/** Protected wins when approval is on, even if an allow list also exists. */
export function roomVisibility(
  room: Pick<RoomListing, 'requireApproval' | 'inviteOnly'>,
): Exclude<RoomVisibilityFilter, 'any'> {
  if (room.requireApproval) return 'protected';
  if (room.inviteOnly) return 'private';
  return 'public';
}

/**
 * Nickname from a search box. Accepts the bare name, `/party/Name`,
 * `/pt-BR/party/Name`, an http(s) URL with that path, or `coopseat://party/Name`.
 */
export function parseRoomQuery(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 300) return null;
  if (text.startsWith('/')) return nicknameFromPath(text);
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return nicknameFromUrl(text);
  if (text.includes('/party/')) return nicknameFromUrl(`https://${text}`);
  return NICKNAME.test(text) ? text : null;
}

function nicknameFromUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol === 'coopseat:') {
    const route = `${url.hostname}${url.pathname}`.replace(/\/+$/, '');
    const match = /^party\/([A-Za-z0-9_]{3,20})$/.exec(route);
    return match?.[1] ?? null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return nicknameFromPath(url.pathname);
}

function nicknameFromPath(pathname: string): string | null {
  const match = /^\/(?:pt-BR\/)?party\/([A-Za-z0-9_]{3,20})\/?$/.exec(pathname);
  return match?.[1] ?? null;
}
