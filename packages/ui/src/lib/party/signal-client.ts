import {
  PING_INTERVAL_MS,
  SOCKET_DEAD_MS,
  type ClientMessage,
  type ServerMessage,
} from '../../party/protocol';

/** Close codes set by coopseat-signal. */
export const SIGNAL_CLOSE = {
  removed: 4000,
  ended: 4001,
  invalid: 4002,
} as const;
export type SignalStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
export type SignalClientOptions = {
  url: string;
  /** Always returns the freshest room token; called on every (re)connect. */
  token(): Promise<string | null>;
  onMessage(msg: ServerMessage): void;
  onStatus(status: SignalStatus): void;
  /** The server closed with an invalid-token code; the owner should refresh admission. */
  onInvalid(): Promise<boolean>;
  /** The session is already over. The close can arrive without the `session_end` message. */
  onEnded?(reason: string): void;
};

const BACKOFF_MS = [500, 1_000, 2_000, 4_000, 8_000, 15_000];

/**
 * WebSocket to the session's Durable Object. Auth is the first message (never in the URL), pings keep
 * NATs and proxies open, and drops reconnect with backoff; the server keeps the seat for 30 s.
 */
export class SignalClient {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private stopped = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSeen = 0;
  private queue: ClientMessage[] = [];
  private authed = false;

  constructor(private opts: SignalClientOptions) {
    void this.connect();
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN && this.authed)
      this.ws.send(JSON.stringify(msg));
    else if (msg.t !== 'ping' && msg.t !== 'signal' && this.queue.length < 50)
      this.queue.push(msg);
  }

  /** Re-authenticates the open socket with a new token (refresh, approval, permission change). */
  async reauth() {
    const token = await this.opts.token();
    if (token && this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ t: 'auth', token }));
  }

  close() {
    this.stopped = true;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      try {
        ws.close(1000, 'bye');
      } catch {
        /* closed */
      }
    }
    this.opts.onStatus('closed');
  }

  private async connect() {
    if (this.stopped) return;
    this.opts.onStatus(this.attempt ? 'reconnecting' : 'connecting');
    const token = await this.opts.token();
    if (this.stopped) return;
    if (!token) {
      this.close();
      return;
    }
    const ws = new WebSocket(this.opts.url);
    this.ws = ws;
    this.authed = false;
    ws.onopen = () => {
      ws.send(JSON.stringify({ t: 'auth', token }));
      this.lastSeen = Date.now();
      this.startPing();
    };
    ws.onmessage = (e) => {
      this.lastSeen = Date.now();
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(e.data)) as ServerMessage;
      } catch {
        return;
      }
      if (msg.t === 'welcome') {
        this.authed = true;
        this.attempt = 0;
        this.opts.onStatus('open');
        const pending = this.queue;
        this.queue = [];
        pending.forEach((m) => this.send(m));
      }
      if (msg.t !== 'pong') this.opts.onMessage(msg);
    };
    ws.onerror = () => {
      /* onclose follows */
    };
    ws.onclose = (e) => {
      this.clearTimers();
      if (this.ws !== ws || this.stopped) return;
      this.ws = null;
      if (e.code === SIGNAL_CLOSE.ended) {
        this.opts.onEnded?.(e.reason);
        this.close();
        return;
      }
      if (e.code === SIGNAL_CLOSE.removed) {
        this.close();
        return;
      }
      if (e.code === SIGNAL_CLOSE.invalid) {
        void this.opts
          .onInvalid()
          .then((ok) => (ok ? this.retry() : this.close()));
        return;
      }
      this.retry();
    };
  }

  private retry() {
    if (this.stopped) return;
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)]!;
    this.attempt++;
    this.opts.onStatus('reconnecting');
    this.retryTimer = setTimeout(
      () => void this.connect(),
      delay + Math.random() * 250,
    );
  }

  private startPing() {
    this.clearTimers();
    this.pingTimer = setInterval(() => {
      const ws = this.ws;
      if (!ws) return;
      // A socket that stops answering is dead even if the browser hasn't noticed yet.
      if (Date.now() - this.lastSeen > SOCKET_DEAD_MS) {
        try {
          ws.close(4999, 'dead');
        } catch {
          /* closed */
        }
        ws.onclose?.(new CloseEvent('close', { code: 4999 }));
        return;
      }
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ t: 'ping' }));
    }, PING_INTERVAL_MS);
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
