/**
 * Gaming-Party wire protocol, shared by the web backend (token issuer), coopseat-signal (WebSocket
 * relay) and the clients. Framework-free: runs in Node, Workers and browsers.
 */

export type PartyRole = 'owner' | 'moderator' | 'member';
export type AdmissionStatus = 'admitted' | 'pending';
export type Layout = 'stage' | 'grid';
/** `paused`: the tile is hidden; the streamer stops encoding for that viewer but keeps the connection. */
export type Quality = 'high' | 'low' | 'paused';
export const QUALITIES: readonly Quality[] = ['high', 'low', 'paused'];
export const LAYOUTS: readonly Layout[] = ['stage', 'grid'];

export type ModPerms = {
  kick: boolean;
  ban: boolean;
  stopStreams: boolean;
  approve: boolean;
  grantStream: boolean;
  deleteMessages: boolean;
};
export const OWNER_PERMS: ModPerms = {
  kick: true,
  ban: true,
  stopStreams: true,
  approve: true,
  grantStream: true,
  deleteMessages: true,
};

/** Room limits frozen into each token so the signal server never needs the database. */
export type RoomConfig = {
  cap: number;
  maxStreamers: number;
  ownerGraceSeconds: number;
  endsAt: number;
  chat: boolean;
};

export type RoomTokenClaims = {
  /** party_sessions.id; one Durable Object per session. */
  sid: string;
  /** party_rooms.ownerId. */
  rid: string;
  sub: string;
  nick: string;
  role: PartyRole;
  status: AdmissionStatus;
  /** Allowed to stream without asking (owner, or allow list with streaming). */
  canStream: boolean;
  /** Never allowed to stream (identity/2FA gate failed or a stream sanction). Wins over grants. */
  streamBlocked: boolean;
  chat: boolean;
  mod: ModPerms | null;
  cfg: RoomConfig;
  exp: number;
};

/** Key env vars may hold a PEM (real or `\n`-escaped newlines) or just its base64 body on one line. */
export function toPem(
  value: string,
  label: 'PRIVATE KEY' | 'PUBLIC KEY',
): string {
  const v = value.trim().replace(/\\n/g, '\n');
  if (v.includes('-----BEGIN')) return v;
  const body =
    v
      .replace(/\s+/g, '')
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

export const ROOM_TOKEN_ISSUER = 'coopseat-web';
export const ROOM_TOKEN_AUDIENCE = 'coopseat-signal';
export const ROOM_TOKEN_TTL_SECONDS = 600;
/** Clients refresh before expiry; the server tolerates this much lateness before dropping the socket. */
export const ROOM_TOKEN_REFRESH_MS = 8 * 60_000;
export const ROOM_TOKEN_GRACE_SECONDS = 120;

export const MAX_STREAMERS = 10;
export const CHAT_MAX_GRAPHEMES = 200;
export const CHAT_HISTORY = 100;
export const PING_INTERVAL_MS = 15_000;
export const SOCKET_DEAD_MS = 45_000;
/** A participant who drops keeps role, grants and live status if back within this window. */
export const RECONNECT_GRACE_MS = 30_000;
export const PENDING_TTL_MS = 2 * 60_000;
export const MAX_PENDING = 10;
export const MAX_SIGNAL_BYTES = 16 * 1024;

export type Participant = {
  id: string;
  nick: string;
  role: PartyRole;
  streaming: boolean;
  canStream: boolean;
  connected: boolean;
};
export type ChatMessage = {
  id: string;
  from: string;
  nick: string;
  text: string;
  at: number;
};
export type PendingUser = { id: string; nick: string; at: number };
export type RemovalReason =
  | 'kick'
  | 'ban'
  | 'sanction'
  | 'full'
  | 'denied'
  | 'replaced'
  | 'token_expired'
  | 'invalid';
export type EndReason =
  | 'owner_ended'
  | 'owner_timeout'
  | 'empty'
  | 'max_duration'
  | 'sanction'
  | 'operator';

/** SDP / ICE payload relayed between two peers. `pc` identifies the connection (`streamerId>viewerId`). */
export type SignalData = {
  pc: string;
  description?: {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
  };
  candidate?: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  } | null;
};

export type ClientMessage =
  | { t: 'auth'; token: string }
  | { t: 'ping' }
  | { t: 'chat'; text: string }
  | { t: 'chat_delete'; id: string }
  | { t: 'stream_start' }
  | { t: 'stream_stop' }
  | { t: 'stream_request' }
  | { t: 'stream_grant'; to: string }
  | { t: 'stream_revoke'; to: string }
  | { t: 'stream_kill'; to: string }
  | { t: 'subscribe'; to: string; quality: Quality }
  | { t: 'unsubscribe'; to: string }
  | { t: 'signal'; to: string; data: SignalData }
  | { t: 'kick'; to: string }
  | { t: 'end' };

export type Self = {
  id: string;
  nick: string;
  role: PartyRole;
  status: AdmissionStatus;
  canStream: boolean;
  streamBlocked: boolean;
  chat: boolean;
  mod: ModPerms | null;
};

export type ServerMessage =
  | {
      t: 'welcome';
      you: Self;
      session: { id: string; endsAt: number };
      peers: Participant[];
      chat: ChatMessage[];
      pending: PendingUser[];
      requests: PendingUser[];
      chatEnabled: boolean;
    }
  | { t: 'pong' }
  | { t: 'presence'; peer: Participant }
  | { t: 'left'; id: string }
  | { t: 'chat'; msg: ChatMessage }
  | { t: 'chat_deleted'; id: string }
  | { t: 'pending'; user: PendingUser }
  | { t: 'pending_removed'; id: string }
  | { t: 'approved' }
  | { t: 'refresh_token' }
  | { t: 'stream_request'; user: PendingUser }
  | { t: 'stream_request_removed'; id: string }
  | { t: 'stream_granted' }
  | { t: 'stream_revoked' }
  | { t: 'stream_reset'; id: string }
  | { t: 'subscribe'; from: string; quality: Quality }
  | { t: 'unsubscribe'; from: string }
  | { t: 'signal'; from: string; data: SignalData }
  | { t: 'removed'; reason: RemovalReason }
  | { t: 'session_end'; reason: EndReason }
  | { t: 'error'; code: string };

/** Backend → signal server (HMAC-signed). */
export type InternalCommand =
  | { action: 'end'; reason: EndReason }
  | { action: 'remove'; profileId: string; reason: RemovalReason }
  | { action: 'approve'; profileId: string }
  | { action: 'deny'; profileId: string }
  | { action: 'refresh'; profileId: string };

/** Signal server → backend (HMAC-signed). */
export type SignalEvent =
  | { type: 'joined'; sessionId: string; profileId: string }
  | { type: 'left'; sessionId: string; profileId: string }
  | { type: 'kicked'; sessionId: string; profileId: string; by: string }
  | { type: 'stream_killed'; sessionId: string; profileId: string; by: string }
  | { type: 'ended'; sessionId: string; reason: EndReason };

/**
 * Normalizes a chat message: NFC, control characters removed (keeps emoji ZWJ sequences), whitespace
 * collapsed, at most CHAT_MAX_GRAPHEMES user-perceived characters. Returns null when empty or too long.
 */
export function sanitizeChat(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > CHAT_MAX_GRAPHEMES * 16)
    return null;
  const text = raw
    .normalize('NFC')
    .replace(
      /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || graphemeCount(text) > CHAT_MAX_GRAPHEMES) return null;
  return text;
}

export function graphemeCount(text: string): number {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        l?: string,
        o?: { granularity: 'grapheme' },
      ) => { segment(s: string): Iterable<unknown> };
    }
  ).Segmenter;
  if (!Segmenter) return Array.from(text).length;
  let n = 0;
  for (const _ of new Segmenter(undefined, { granularity: 'grapheme' }).segment(
    text,
  ))
    n++;
  return n;
}

const encoder = new TextEncoder();

/** HMAC-SHA256 hex over `${timestamp}.${nonce}.${body}`; WebCrypto so it runs everywhere. */
export async function signInternal(
  secret: string,
  timestamp: string,
  nonce: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${nonce}.${body}`),
  );
  return Array.from(new Uint8Array(mac), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const INTERNAL_MAX_SKEW_MS = 60_000;
export const INTERNAL_HEADERS = {
  timestamp: 'x-coopseat-timestamp',
  nonce: 'x-coopseat-nonce',
  signature: 'x-coopseat-signature',
} as const;

export async function verifyInternal(
  secret: string,
  headers: { get(name: string): string | null },
  body: string,
  now = Date.now(),
): Promise<{ nonce: string } | null> {
  const ts = headers.get(INTERNAL_HEADERS.timestamp),
    nonce = headers.get(INTERNAL_HEADERS.nonce),
    sig = headers.get(INTERNAL_HEADERS.signature);
  if (
    !ts ||
    !nonce ||
    !sig ||
    !/^\d{10,16}$/.test(ts) ||
    !/^[\w-]{16,64}$/.test(nonce)
  )
    return null;
  if (Math.abs(now - Number(ts)) > INTERNAL_MAX_SKEW_MS) return null;
  return constantTimeEqual(await signInternal(secret, ts, nonce, body), sig)
    ? { nonce }
    : null;
}

export async function internalHeaders(
  secret: string,
  body: string,
): Promise<Record<string, string>> {
  const ts = String(Date.now()),
    nonce = crypto.randomUUID();
  return {
    'content-type': 'application/json',
    [INTERNAL_HEADERS.timestamp]: ts,
    [INTERNAL_HEADERS.nonce]: nonce,
    [INTERNAL_HEADERS.signature]: await signInternal(secret, ts, nonce, body),
  };
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
