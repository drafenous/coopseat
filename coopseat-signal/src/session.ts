import { DurableObject } from 'cloudflare:workers';
import { importSPKI, jwtVerify } from 'jose';
import {
  internalHeaders,
  ROOM_TOKEN_AUDIENCE,
  ROOM_TOKEN_ISSUER,
  toPem,
  type InternalCommand,
  type RoomTokenClaims,
} from '@coopseat/ui/party-protocol';
import {
  CLOSE,
  initialState,
  RoomEngine,
  type Effect,
  type State,
} from './engine';
import type { Env } from './env';

type Attachment = { sub: string | null; at: number; replaced?: boolean };

const AUTH_TIMEOUT_MS = 10_000;
const KICK_EVENT_TIMEOUT_MS = 3_000;
let publicKey: Promise<CryptoKey> | undefined;

async function verifyToken(
  env: Env,
  token: unknown,
): Promise<RoomTokenClaims | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  publicKey ??= importSPKI(
    toPem(env.PARTY_TOKEN_PUBLIC_KEY, 'PUBLIC KEY'),
    'EdDSA',
  );
  try {
    const { payload } = await jwtVerify(token, await publicKey, {
      issuer: ROOM_TOKEN_ISSUER,
      audience: ROOM_TOKEN_AUDIENCE,
      algorithms: ['EdDSA'],
    });
    return typeof payload.sub === 'string'
      ? (payload as unknown as RoomTokenClaims)
      : null;
  } catch {
    return null;
  }
}

/**
 * One instance per party session (`idFromName(sessionId)`), so sessions are isolated by
 * construction. Uses hibernatable WebSockets; the engine state is persisted after every change so
 * eviction loses nothing.
 */
export class PartySession extends DurableObject<Env> {
  private engine: RoomEngine | null = null;

  private async load(sid?: string): Promise<RoomEngine> {
    if (this.engine) return this.engine;
    const saved = await this.ctx.storage.get<State>('state');
    if (!saved && !sid) throw new Error('session id unknown');
    this.engine = new RoomEngine(saved ?? initialState(sid!));
    return this.engine;
  }

  private sockets(sub: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => {
      const a = ws.deserializeAttachment() as Attachment | null;
      return a?.sub === sub && !a.replaced;
    });
  }

  private async apply(effects: Effect[]): Promise<void> {
    const engine = this.engine!;
    for (const e of effects) {
      if (e.k === 'send') {
        const data = JSON.stringify(e.msg);
        for (const ws of this.sockets(e.to)) {
          try {
            ws.send(data);
          } catch {
            /* socket already gone */
          }
        }
      } else if (e.k === 'close') {
        for (const ws of this.sockets(e.to)) {
          ws.serializeAttachment({
            ...(ws.deserializeAttachment() as Attachment),
            replaced: true,
          });
          try {
            ws.close(e.code, e.reason);
          } catch {
            /* already closed */
          }
        }
      } else if (e.k === 'event') {
        if (e.event.type === 'kicked') {
          // One short wait so markRemoved commits before the socket closes.
          // A failure falls through to the background retries.
          const err = await this.deliver(e.event, KICK_EVENT_TIMEOUT_MS);
          if (err) this.ctx.waitUntil(this.report(e.event, 1));
        } else {
          // The BFF write can take seconds. Waiting here stalls the single-threaded room,
          // including the approve that just let someone in.
          this.ctx.waitUntil(this.report(e.event));
        }
      } else if (e.k === 'alarm') {
        const pendingAuth = this.ctx
          .getWebSockets()
          .some(
            (ws) => !(ws.deserializeAttachment() as Attachment | null)?.sub,
          );
        const at = [
          e.at,
          pendingAuth ? Date.now() + AUTH_TIMEOUT_MS : null,
        ].filter((t): t is number => t !== null);
        if (at.length) await this.ctx.storage.setAlarm(Math.min(...at));
        else await this.ctx.storage.deleteAlarm();
      }
    }
    if (engine.state.ended) {
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.put('state', engine.state);
    } else {
      await this.ctx.storage.put('state', engine.state);
    }
  }

  /** Null when the BFF accepted the event. */
  private async deliver(
    event: unknown,
    timeoutMs?: number,
  ): Promise<string | null> {
    const body = JSON.stringify(event);
    try {
      const res = await fetch(
        `${this.env.APP_URL.replace(/\/$/, '')}/api/party/internal/events`,
        {
          method: 'POST',
          headers: await internalHeaders(this.env.PARTY_SIGNAL_SECRET, body),
          body,
          signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
        },
      );
      return res.ok ? null : String(res.status);
    } catch (err) {
      return String(err);
    }
  }

  private async report(event: unknown, from = 0): Promise<void> {
    let last = 'unknown';
    for (let attempt = from; attempt < 5; attempt++) {
      if (attempt) await scheduler.wait(1000 * 2 ** (attempt - 1));
      const err = await this.deliver(event);
      if (!err) return;
      last = err;
    }
    console.warn('event failed', last);
  }

  async fetch(req: Request): Promise<Response> {
    const sid = req.headers.get('x-session-id') ?? undefined;
    const engine = await this.load(sid);
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({
        sub: null,
        at: Date.now(),
      } satisfies Attachment);
      await this.ctx.storage.setAlarm(Date.now() + AUTH_TIMEOUT_MS);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/internal' && req.method === 'POST') {
      const cmd = (await req.json()) as InternalCommand;
      if (cmd.action === 'removed')
        return Response.json({ closed: engine.closedKick(cmd.profileId) });
      await this.apply(engine.internal(cmd, Date.now()));
      return Response.json({ ok: true });
    }
    return new Response('not found', { status: 404 });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const engine = await this.load();
    const att = ws.deserializeAttachment() as Attachment;
    if (att.replaced) return;
    if (typeof message !== 'string') return ws.close(CLOSE.invalid, 'invalid');

    let auth: { t?: unknown; token?: unknown } | null = null;
    if (!att.sub || message.startsWith('{"t":"auth"')) {
      try {
        auth = JSON.parse(message);
      } catch {
        auth = null;
      }
    }

    if (auth?.t === 'auth') {
      const claims = await verifyToken(this.env, auth.token);
      if (!claims || (att.sub && claims.sub !== att.sub))
        return ws.close(CLOSE.invalid, 'invalid');
      if (!att.sub) {
        for (const other of this.sockets(claims.sub)) {
          other.serializeAttachment({
            ...(other.deserializeAttachment() as Attachment),
            replaced: true,
          });
          try {
            other.send(JSON.stringify({ t: 'removed', reason: 'replaced' }));
            other.close(CLOSE.removed, 'replaced');
          } catch {
            /* already closed */
          }
        }
        ws.serializeAttachment({
          ...att,
          sub: claims.sub,
        } satisfies Attachment);
      }
      await this.apply(engine.join(claims, Date.now()));
      return;
    }
    if (!att.sub) return ws.close(CLOSE.invalid, 'invalid');
    await this.apply(engine.message(att.sub, message, Date.now()));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.onGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.onGone(ws);
  }

  private async onGone(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att?.sub || att.replaced) return;
    const engine = await this.load();
    await this.apply(engine.disconnect(att.sub, Date.now()));
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att && !att.sub && now - att.at >= AUTH_TIMEOUT_MS) {
        att.replaced = true;
        ws.serializeAttachment(att);
        ws.close(CLOSE.invalid, 'invalid');
      }
    }
    const saved = await this.ctx.storage.get<State>('state');
    if (!saved && !this.engine) return;
    const engine = await this.load();
    await this.apply(engine.alarm(now));
  }
}
