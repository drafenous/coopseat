import {
  CHAT_HISTORY,
  MAX_PENDING,
  MAX_SIGNAL_BYTES,
  PENDING_TTL_MS,
  RECONNECT_GRACE_MS,
  ROOM_TOKEN_GRACE_SECONDS,
  SOCKET_DEAD_MS,
  sanitizeChat,
  type AdmissionStatus,
  type ChatMessage,
  type EndReason,
  type InternalCommand,
  type ModPerms,
  type Participant,
  type PartyRole,
  type PendingUser,
  QUALITIES,
  type Quality,
  type RemovalReason,
  type RoomConfig,
  type RoomTokenClaims,
  type ServerMessage,
  type SignalData,
  type SignalEvent,
} from '@coopseat/ui/party-protocol';

/**
 * Pure state machine of one Gaming-Party session. The Durable Object feeds it socket events and
 * executes the returned effects; keeping I/O out makes every rule unit-testable.
 */

export type Effect =
  | { k: 'send'; to: string; msg: ServerMessage }
  | { k: 'close'; to: string; code: number; reason: RemovalReason | EndReason }
  | { k: 'event'; event: SignalEvent }
  | { k: 'alarm'; at: number | null };

export type Member = {
  id: string;
  nick: string;
  role: PartyRole;
  status: AdmissionStatus;
  canStream: boolean;
  streamBlocked: boolean;
  chat: boolean;
  mod: ModPerms | null;
  exp: number;
  connected: boolean;
  goneAt: number | null;
  lastSeen: number;
  joinedAt: number;
  streaming: boolean;
  granted: boolean;
  announced: boolean;
  chatHits: number[];
  msgHits: number[];
};

export type State = {
  sid: string;
  ownerId: string | null;
  cfg: RoomConfig | null;
  members: Record<string, Member>;
  chat: ChatMessage[];
  requests: Record<string, PendingUser>;
  /** streamerId -> viewerId -> quality */
  subs: Record<string, Record<string, Quality>>;
  ended: EndReason | null;
};

export const CLOSE = { removed: 4000, ended: 4001, invalid: 4002 } as const;
const CHAT_WINDOW_MS = 5000;
const CHAT_MAX_PER_WINDOW = 5;
const MSG_WINDOW_MS = 10_000;
const MSG_MAX_PER_WINDOW = 300;

export function initialState(sid: string): State {
  return {
    sid,
    ownerId: null,
    cfg: null,
    members: {},
    chat: [],
    requests: {},
    subs: {},
    ended: null,
  };
}

const pendingUser = (m: Member): PendingUser => ({
  id: m.id,
  nick: m.nick,
  at: m.joinedAt,
});

export class RoomEngine {
  private fx: Effect[] = [];

  constructor(
    public state: State,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  // ---------- queries ----------

  private admitted(): Member[] {
    return Object.values(this.state.members).filter(
      (m) => m.status === 'admitted',
    );
  }

  private streamAllowed(m: Member): boolean {
    return !m.streamBlocked && (m.role === 'owner' || m.canStream || m.granted);
  }

  participant(m: Member): Participant {
    return {
      id: m.id,
      nick: m.nick,
      role: m.role,
      streaming: m.streaming,
      canStream: this.streamAllowed(m),
      connected: m.connected,
    };
  }

  private perms(m: Member): ModPerms | null {
    return m.role === 'owner' || m.role === 'moderator' ? m.mod : null;
  }

  private ownerLive(): boolean {
    const owner = this.state.ownerId
      ? this.state.members[this.state.ownerId]
      : undefined;
    return Boolean(owner?.streaming);
  }

  // ---------- effect helpers ----------

  private send(to: string, msg: ServerMessage) {
    const m = this.state.members[to];
    if (m?.connected) this.fx.push({ k: 'send', to, msg });
  }

  private broadcast(msg: ServerMessage, except?: string) {
    for (const m of this.admitted()) if (m.id !== except) this.send(m.id, msg);
  }

  private toPerm(perm: keyof ModPerms, msg: ServerMessage) {
    for (const m of this.admitted())
      if (this.perms(m)?.[perm]) this.send(m.id, msg);
  }

  private error(to: string, code: string) {
    this.send(to, { t: 'error', code });
  }

  private flush(): Effect[] {
    const out = this.fx;
    this.fx = [];
    out.push({ k: 'alarm', at: this.nextAlarm() });
    return out;
  }

  // ---------- lifecycle ----------

  /** A socket authenticated with a valid room token (first connect, reconnect or token refresh). */
  join(claims: RoomTokenClaims, now: number): Effect[] {
    const s = this.state;
    if (s.ended) {
      this.fx.push({
        k: 'send',
        to: claims.sub,
        msg: { t: 'session_end', reason: s.ended },
      });
      this.fx.push({
        k: 'close',
        to: claims.sub,
        code: CLOSE.ended,
        reason: s.ended,
      });
      return this.flush();
    }
    if (claims.sid !== s.sid) return this.reject(claims.sub, 'invalid');
    if (claims.role === 'owner') {
      s.ownerId = claims.sub;
      s.cfg = claims.cfg;
    }
    s.cfg ??= claims.cfg;

    const existing = s.members[claims.sub];
    if (!existing) {
      const active = Object.values(s.members).filter(
        (m) => m.connected || m.goneAt !== null,
      );
      if (claims.role !== 'owner' && active.length >= s.cfg.cap)
        return this.reject(claims.sub, 'full');
      if (
        claims.status === 'pending' &&
        active.filter((m) => m.status === 'pending').length >= MAX_PENDING
      ) {
        return this.reject(claims.sub, 'full');
      }
    }

    const wasPending = existing?.status === 'pending';
    const m: Member = existing ?? {
      id: claims.sub,
      nick: claims.nick,
      role: claims.role,
      status: claims.status,
      canStream: false,
      streamBlocked: true,
      chat: false,
      mod: null,
      exp: claims.exp,
      connected: true,
      goneAt: null,
      lastSeen: now,
      joinedAt: now,
      streaming: false,
      granted: false,
      announced: false,
      chatHits: [],
      msgHits: [],
    };
    Object.assign(m, {
      nick: claims.nick,
      role: claims.role,
      status: claims.status,
      canStream: claims.canStream,
      streamBlocked: claims.streamBlocked,
      chat: claims.chat,
      mod: claims.mod,
      exp: claims.exp,
      connected: true,
      goneAt: null,
      lastSeen: now,
    });
    s.members[m.id] = m;
    if (m.streaming && !this.streamAllowed(m)) this.stopStream(m);

    if (m.status === 'pending') {
      if (!existing)
        this.toPerm('approve', { t: 'pending', user: pendingUser(m) });
      this.send(m.id, this.welcome(m));
      return this.flush();
    }

    if (wasPending) this.toPerm('approve', { t: 'pending_removed', id: m.id });
    this.send(m.id, this.welcome(m));
    this.broadcast({ t: 'presence', peer: this.participant(m) }, m.id);
    if (!m.announced) {
      m.announced = true;
      if (m.role !== 'owner')
        this.fx.push({
          k: 'event',
          event: { type: 'joined', sessionId: s.sid, profileId: m.id },
        });
    }
    return this.flush();
  }

  private welcome(m: Member): ServerMessage {
    const s = this.state;
    const admitted = m.status === 'admitted';
    const perms = this.perms(m);
    return {
      t: 'welcome',
      you: {
        id: m.id,
        nick: m.nick,
        role: m.role,
        status: m.status,
        canStream: this.streamAllowed(m),
        streamBlocked: m.streamBlocked,
        chat: m.chat,
        mod: perms,
      },
      session: { id: s.sid, endsAt: s.cfg?.endsAt ?? 0 },
      peers: admitted ? this.admitted().map((p) => this.participant(p)) : [],
      chat: admitted ? s.chat : [],
      pending:
        admitted && perms?.approve
          ? Object.values(s.members)
              .filter((p) => p.status === 'pending')
              .map(pendingUser)
          : [],
      requests: admitted && perms?.grantStream ? Object.values(s.requests) : [],
      chatEnabled: Boolean(s.cfg?.chat),
    };
  }

  private reject(to: string, reason: RemovalReason): Effect[] {
    this.fx.push({ k: 'send', to, msg: { t: 'removed', reason } });
    this.fx.push({ k: 'close', to, code: CLOSE.removed, reason });
    return this.flush();
  }

  /** Removes a member for good (kick, ban, sanction, denial). */
  private remove(m: Member, reason: RemovalReason) {
    this.send(m.id, { t: 'removed', reason });
    if (m.connected)
      this.fx.push({ k: 'close', to: m.id, code: CLOSE.removed, reason });
    this.forget(m);
  }

  private forget(m: Member) {
    const s = this.state;
    if (m.streaming) this.stopStream(m);
    for (const viewers of Object.values(s.subs)) delete viewers[m.id];
    delete s.members[m.id];
    if (s.requests[m.id]) {
      delete s.requests[m.id];
      this.toPerm('grantStream', { t: 'stream_request_removed', id: m.id });
    }
    if (m.status === 'pending')
      this.toPerm('approve', { t: 'pending_removed', id: m.id });
    else this.broadcast({ t: 'left', id: m.id });
  }

  private stopStream(m: Member) {
    m.streaming = false;
    delete this.state.subs[m.id];
    this.broadcast({ t: 'presence', peer: this.participant(m) });
  }

  disconnect(sub: string, now: number): Effect[] {
    const m = this.state.members[sub];
    if (!m || this.state.ended) return this.flush();
    if (m.status === 'pending') {
      this.forget(m);
      return this.flush();
    }
    m.connected = false;
    m.goneAt = now;
    this.broadcast({ t: 'presence', peer: this.participant(m) });
    return this.flush();
  }

  /** Ends the session for everyone. `notify` is false when the backend initiated it. */
  end(reason: EndReason, notify: boolean): Effect[] {
    const s = this.state;
    if (s.ended) return this.flush();
    for (const m of Object.values(s.members)) {
      if (!m.connected) continue;
      this.fx.push({ k: 'send', to: m.id, msg: { t: 'session_end', reason } });
      this.fx.push({ k: 'close', to: m.id, code: CLOSE.ended, reason });
    }
    if (notify)
      this.fx.push({
        k: 'event',
        event: { type: 'ended', sessionId: s.sid, reason },
      });
    this.state = { ...initialState(s.sid), ended: reason };
    return this.flush();
  }

  alarm(now: number): Effect[] {
    const s = this.state;
    if (s.ended) return this.flush();
    if (s.cfg && s.cfg.endsAt * 1000 <= now)
      return this.end('max_duration', true);

    for (const m of Object.values(s.members)) {
      if (m.connected && now - m.lastSeen >= SOCKET_DEAD_MS) {
        this.fx.push({
          k: 'close',
          to: m.id,
          code: CLOSE.invalid,
          reason: 'invalid',
        });
        m.connected = false;
        m.goneAt = now;
        if (m.status === 'pending') {
          this.forget(m);
          continue;
        }
        this.broadcast({ t: 'presence', peer: this.participant(m) });
      }
      if (m.status === 'pending' && now - m.joinedAt >= PENDING_TTL_MS) {
        this.remove(m, 'denied');
        continue;
      }
      if (m.goneAt === null) continue;
      if (m.id === s.ownerId) {
        if (now - m.goneAt >= (s.cfg?.ownerGraceSeconds ?? 60) * 1000)
          return this.end('owner_timeout', true);
      } else if (now - m.goneAt >= RECONNECT_GRACE_MS) {
        this.forget(m);
        this.fx.push({
          k: 'event',
          event: { type: 'left', sessionId: s.sid, profileId: m.id },
        });
      }
    }
    return this.flush();
  }

  private nextAlarm(): number | null {
    const s = this.state;
    if (s.ended) return null;
    const times: number[] = [];
    if (s.cfg) times.push(s.cfg.endsAt * 1000);
    for (const m of Object.values(s.members)) {
      if (m.connected) times.push(m.lastSeen + SOCKET_DEAD_MS);
      if (m.status === 'pending') times.push(m.joinedAt + PENDING_TTL_MS);
      if (m.goneAt !== null) {
        const grace =
          m.id === s.ownerId
            ? (s.cfg?.ownerGraceSeconds ?? 60) * 1000
            : RECONNECT_GRACE_MS;
        times.push(m.goneAt + grace);
      }
    }
    return times.length ? Math.min(...times) : null;
  }

  internal(cmd: InternalCommand): Effect[] {
    if (cmd.action === 'end') return this.end(cmd.reason, false);
    const m = this.state.members[cmd.profileId];
    if (!m) return this.flush();
    switch (cmd.action) {
      case 'remove':
        this.remove(m, cmd.reason);
        break;
      case 'deny':
        if (m.status === 'pending') this.remove(m, 'denied');
        break;
      case 'approve':
        if (m.status === 'pending') {
          // Drop them from the lobby queue now. They stay pending until the refreshed token
          // rejoins, which is what actually exposes peers, chat and ICE.
          this.toPerm('approve', { t: 'pending_removed', id: m.id });
          this.send(m.id, { t: 'approved' });
        }
        break;
      case 'refresh':
        this.send(m.id, { t: 'refresh_token' });
        break;
    }
    return this.flush();
  }

  // ---------- client messages ----------

  message(sub: string, raw: string, now: number): Effect[] {
    const m = this.state.members[sub];
    if (!m || this.state.ended) return this.flush();
    m.lastSeen = now;
    if (now / 1000 > m.exp + ROOM_TOKEN_GRACE_SECONDS) {
      this.remove(m, 'token_expired');
      return this.flush();
    }
    m.msgHits = m.msgHits.filter((t) => now - t < MSG_WINDOW_MS);
    if (m.msgHits.length >= MSG_MAX_PER_WINDOW) {
      this.error(sub, 'rate_limited');
      return this.flush();
    }
    m.msgHits.push(now);

    if (raw.length > MAX_SIGNAL_BYTES + 1024) {
      this.error(sub, 'too_large');
      return this.flush();
    }
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.error(sub, 'invalid');
      return this.flush();
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') {
      this.error(sub, 'invalid');
      return this.flush();
    }

    if (msg.t === 'ping') {
      this.fx.push({ k: 'send', to: sub, msg: { t: 'pong' } });
      return this.flush();
    }
    if (m.status !== 'admitted') {
      this.error(sub, 'pending');
      return this.flush();
    }
    const target =
      typeof msg.to === 'string' ? this.state.members[msg.to] : undefined;

    switch (msg.t) {
      case 'chat':
        this.chat(m, msg.text, now);
        break;
      case 'chat_delete':
        this.chatDelete(m, msg.id);
        break;
      case 'stream_start':
        this.streamStart(m);
        break;
      case 'stream_stop':
        if (m.role === 'owner') return this.end('owner_ended', true);
        if (m.streaming) this.stopStream(m);
        break;
      case 'stream_request':
        this.streamRequest(m);
        break;
      case 'stream_grant':
        this.streamGrant(m, target, true);
        break;
      case 'stream_revoke':
        this.streamGrant(m, target, false);
        break;
      case 'stream_kill':
        this.streamKill(m, target);
        break;
      case 'subscribe':
        this.subscribe(
          m,
          target,
          QUALITIES.find((q) => q === msg.quality) ?? 'low',
        );
        break;
      case 'unsubscribe':
        if (target && this.state.subs[target.id]?.[m.id]) {
          delete this.state.subs[target.id]![m.id];
          this.send(target.id, { t: 'unsubscribe', from: m.id });
        }
        break;
      case 'signal':
        this.relaySignal(m, target, msg.data, raw.length);
        break;
      case 'kick':
        this.kick(m, target);
        break;
      case 'end':
        if (m.role === 'owner') return this.end('owner_ended', true);
        this.error(sub, 'forbidden');
        break;
      default:
        this.error(sub, 'invalid');
    }
    return this.flush();
  }

  private chat(m: Member, text: unknown, now: number) {
    if (!this.state.cfg?.chat || !m.chat)
      return this.error(m.id, 'chat_forbidden');
    m.chatHits = m.chatHits.filter((t) => now - t < CHAT_WINDOW_MS);
    if (m.chatHits.length >= CHAT_MAX_PER_WINDOW)
      return this.error(m.id, 'chat_rate_limited');
    const clean = sanitizeChat(text);
    if (!clean) return this.error(m.id, 'chat_invalid');
    m.chatHits.push(now);
    const msg: ChatMessage = {
      id: this.newId(),
      from: m.id,
      nick: m.nick,
      text: clean,
      at: now,
    };
    this.state.chat.push(msg);
    if (this.state.chat.length > CHAT_HISTORY)
      this.state.chat.splice(0, this.state.chat.length - CHAT_HISTORY);
    this.broadcast({ t: 'chat', msg });
  }

  private chatDelete(m: Member, id: unknown) {
    const index = this.state.chat.findIndex((c) => c.id === id);
    if (index < 0) return;
    const msg = this.state.chat[index]!;
    if (msg.from !== m.id && !this.perms(m)?.deleteMessages)
      return this.error(m.id, 'forbidden');
    this.state.chat.splice(index, 1);
    this.broadcast({ t: 'chat_deleted', id: msg.id });
  }

  private streamStart(m: Member) {
    // Already live (e.g. the streamer reloaded the page): the old connections are gone, so viewers rebuild them.
    if (m.streaming) {
      delete this.state.subs[m.id];
      this.broadcast({ t: 'stream_reset', id: m.id }, m.id);
      return;
    }
    if (!this.streamAllowed(m)) return this.error(m.id, 'stream_forbidden');
    if (m.role !== 'owner' && !this.ownerLive())
      return this.error(m.id, 'owner_not_live');
    const live = this.admitted().filter((p) => p.streaming).length;
    if (live >= (this.state.cfg?.maxStreamers ?? 10))
      return this.error(m.id, 'stream_full');
    m.streaming = true;
    if (this.state.requests[m.id]) {
      delete this.state.requests[m.id];
      this.toPerm('grantStream', { t: 'stream_request_removed', id: m.id });
    }
    this.broadcast({ t: 'presence', peer: this.participant(m) });
  }

  private streamRequest(m: Member) {
    if (m.streamBlocked) return this.error(m.id, 'stream_forbidden');
    if (this.streamAllowed(m) || this.state.requests[m.id]) return;
    const user = pendingUser(m);
    this.state.requests[m.id] = user;
    this.toPerm('grantStream', { t: 'stream_request', user });
  }

  private canTarget(
    actor: Member,
    target: Member | undefined,
  ): target is Member {
    if (!target || target.id === actor.id || target.role === 'owner')
      return false;
    return !(actor.role === 'moderator' && target.role === 'moderator');
  }

  private streamGrant(
    actor: Member,
    target: Member | undefined,
    grant: boolean,
  ) {
    if (!this.perms(actor)?.grantStream)
      return this.error(actor.id, 'forbidden');
    if (!this.canTarget(actor, target) || target.status !== 'admitted')
      return this.error(actor.id, 'invalid_target');
    if (grant && target.streamBlocked)
      return this.error(actor.id, 'stream_forbidden');
    target.granted = grant;
    if (this.state.requests[target.id]) {
      delete this.state.requests[target.id];
      this.toPerm('grantStream', {
        t: 'stream_request_removed',
        id: target.id,
      });
    }
    this.send(target.id, { t: grant ? 'stream_granted' : 'stream_revoked' });
    if (!grant && target.streaming && !this.streamAllowed(target))
      this.stopStream(target);
    else this.broadcast({ t: 'presence', peer: this.participant(target) });
  }

  private streamKill(actor: Member, target: Member | undefined) {
    if (!this.perms(actor)?.stopStreams)
      return this.error(actor.id, 'forbidden');
    if (!this.canTarget(actor, target) || !target.streaming)
      return this.error(actor.id, 'invalid_target');
    target.granted = false;
    this.stopStream(target);
    this.send(target.id, { t: 'stream_revoked' });
    this.fx.push({
      k: 'event',
      event: {
        type: 'stream_killed',
        sessionId: this.state.sid,
        profileId: target.id,
        by: actor.id,
      },
    });
  }

  private subscribe(m: Member, target: Member | undefined, quality: Quality) {
    if (!target || target.id === m.id || !target.streaming)
      return this.error(m.id, 'invalid_target');
    const viewers = (this.state.subs[target.id] ??= {});
    viewers[m.id] = quality;
    this.send(target.id, { t: 'subscribe', from: m.id, quality });
  }

  /** SDP/ICE only flows between a streamer and one of its subscribers, never to pending users. */
  private relaySignal(
    m: Member,
    target: Member | undefined,
    data: unknown,
    size: number,
  ) {
    if (!target || target.status !== 'admitted' || size > MAX_SIGNAL_BYTES)
      return this.error(m.id, 'invalid_target');
    const linked = Boolean(
      this.state.subs[target.id]?.[m.id] || this.state.subs[m.id]?.[target.id],
    );
    if (!linked) return this.error(m.id, 'not_subscribed');
    if (!isSignalData(data)) return this.error(m.id, 'invalid');
    this.send(target.id, { t: 'signal', from: m.id, data });
  }

  private kick(actor: Member, target: Member | undefined) {
    if (!this.perms(actor)?.kick) return this.error(actor.id, 'forbidden');
    if (!this.canTarget(actor, target))
      return this.error(actor.id, 'invalid_target');
    this.remove(target, 'kick');
    this.fx.push({
      k: 'event',
      event: {
        type: 'kicked',
        sessionId: this.state.sid,
        profileId: target.id,
        by: actor.id,
      },
    });
  }
}

function isSignalData(v: unknown): v is SignalData {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  if (typeof d.pc !== 'string' || d.pc.length > 100) return false;
  if (d.description !== undefined) {
    const desc = d.description as Record<string, unknown> | null;
    if (
      !desc ||
      !['offer', 'answer', 'pranswer', 'rollback'].includes(String(desc.type))
    )
      return false;
    if (desc.sdp !== undefined && typeof desc.sdp !== 'string') return false;
  }
  if (d.candidate !== undefined && d.candidate !== null) {
    const c = d.candidate as Record<string, unknown>;
    if (typeof c.candidate !== 'string' || c.candidate.length > 1024)
      return false;
  }
  return d.description !== undefined || d.candidate !== undefined;
}
