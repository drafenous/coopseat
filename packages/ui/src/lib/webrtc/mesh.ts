import type { ClientMessage, Quality, SignalData } from '../../party/protocol';
import { track } from '../telemetry';
import { allocateBitrates, DEFAULT_UPLOAD_BUDGET_KBPS } from './encoding';
import { PeerLink, type LinkState } from './peer';
import {
  applyRelayBitrateCap,
  getSelectedCandidateType,
  type IceConfig,
} from './relay';
import {
  BitrateAdapter,
  inboundMetrics,
  inboundSample,
  outboundSample,
  type InboundMetrics,
  type InboundSample,
} from './stats';

/** A hidden tile keeps its (paused) connection this long before it is closed. */
export const HIDDEN_CLOSE_MS = 20_000;
const STATS_INTERVAL_MS = 2_000;
const CONNECT_TIMEOUT_MS = 45_000;
const TURN_REFRESH_LEAD_S = 60;

export type PeerMeshOptions = {
  selfId: string;
  send(msg: ClientMessage): void;
  getIceConfig(): Promise<IceConfig>;
  uploadBudgetKbps?: number;
  onRemoteStream(streamerId: string, stream: MediaStream | null): void;
  onLinkState?(streamerId: string, state: LinkState): void;
  onMetrics?(streamerId: string, metrics: InboundMetrics): void;
};

type Outgoing = {
  link: PeerLink;
  quality: Quality;
  adapter: BitrateAdapter;
  relayCapKbps: number | null;
  reported: boolean;
};
type Incoming = {
  link: PeerLink;
  quality: Quality;
  hiddenTimer: ReturnType<typeof setTimeout> | null;
  connectTimer: ReturnType<typeof setTimeout> | null;
  prev: InboundSample | null;
  reported: boolean;
};

const pcId = (streamer: string, viewer: string) => `${streamer}>${viewer}`;

/**
 * Mesh of peer connections for one party session. As a streamer it answers each `subscribe` with a
 * dedicated sendonly connection; as a viewer it only connects to streamers whose tile is visible.
 */
export class PeerMesh {
  private out = new Map<string, Outgoing>();
  private inc = new Map<string, Incoming>();
  private stream: MediaStream | null = null;
  private ice: IceConfig | null = null;
  private icePromise: Promise<IceConfig> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private statsTimer: ReturnType<typeof setInterval>;
  private closed = false;

  constructor(private opts: PeerMeshOptions) {
    this.statsTimer = setInterval(() => void this.tick(), STATS_INTERVAL_MS);
  }

  // ── streamer side ──

  /** Replaces the outgoing media on every viewer link; null drops all viewers. */
  async setLocalStream(stream: MediaStream | null) {
    this.stream = stream;
    if (!stream) {
      for (const id of [...this.out.keys()]) this.dropViewer(id);
      return;
    }
    await Promise.all(
      [...this.out.values()].map((o) => o.link.setStream(stream)),
    );
  }

  /** Viewers whose PeerConnection is still waiting on ICE servers. */
  private readonly opening = new Set<string>();

  async onSubscribe(viewerId: string, quality: Quality) {
    if (this.closed || !this.stream) return;
    const existing = this.out.get(viewerId);
    if (existing) {
      existing.quality = quality;
      await existing.link.setPaused(quality === 'paused');
      this.rebalance();
      return;
    }
    if (this.opening.has(viewerId)) return;
    this.opening.add(viewerId);
    let ice: IceConfig;
    try {
      ice = await this.iceConfig();
    } catch {
      this.opening.delete(viewerId);
      return;
    }
    if (
      this.closed ||
      !this.stream ||
      !this.opening.has(viewerId) ||
      this.out.has(viewerId)
    ) {
      this.opening.delete(viewerId);
      return;
    }
    const link = new PeerLink({
      id: pcId(this.opts.selfId, viewerId),
      side: 'streamer',
      iceServers: ice.iceServers,
      send: (data) => this.opts.send({ t: 'signal', to: viewerId, data }),
      onState: (state) => {
        if (state === 'connected') void this.onOutgoingConnected(viewerId);
        if (state === 'failed') this.dropViewer(viewerId);
      },
    });
    const entry: Outgoing = {
      link,
      quality,
      adapter: new BitrateAdapter(0),
      relayCapKbps: null,
      reported: false,
    };
    this.out.set(viewerId, entry);
    this.opening.delete(viewerId);
    if (quality === 'paused') await link.setPaused(true);
    await link.setStream(this.stream);
    this.rebalance();
  }

  /** The viewer unsubscribed or left. */
  dropViewer(viewerId: string) {
    this.opening.delete(viewerId);
    const o = this.out.get(viewerId);
    if (!o) return;
    o.link.close();
    this.out.delete(viewerId);
    this.rebalance();
  }

  /** Before (re)announcing a stream: the server forgets old subscriptions, so the links must go too. */
  resetOutgoing() {
    for (const id of [...this.out.keys()]) this.dropViewer(id);
  }

  get viewerCount() {
    return this.out.size;
  }

  // ── viewer side ──

  /** Shows a streamer's tile: subscribes (or resumes) at the given quality. */
  async watch(streamerId: string, quality: Exclude<Quality, 'paused'>) {
    if (this.closed || streamerId === this.opts.selfId) return;
    const existing = this.inc.get(streamerId);
    if (existing) {
      if (existing.hiddenTimer) {
        clearTimeout(existing.hiddenTimer);
        existing.hiddenTimer = null;
      }
      if (existing.quality !== quality) {
        existing.quality = quality;
        this.opts.send({ t: 'subscribe', to: streamerId, quality });
      }
      return;
    }
    let ice: IceConfig;
    try {
      ice = await this.iceConfig();
    } catch {
      return;
    }
    if (this.closed || this.inc.has(streamerId)) return;
    let entry: Incoming | null = null;
    const link = new PeerLink({
      id: pcId(streamerId, this.opts.selfId),
      side: 'viewer',
      iceServers: ice.iceServers,
      send: (data) => this.opts.send({ t: 'signal', to: streamerId, data }),
      onTrack: (stream) => {
        // The offer can take longer than the old 15s budget, and the answer follows
        // only after the track is already here. Aborting at that point drops the video.
        if (entry?.connectTimer) {
          clearTimeout(entry.connectTimer);
          entry.connectTimer = null;
        }
        this.opts.onRemoteStream(streamerId, stream);
      },
      onState: (state) => {
        this.opts.onLinkState?.(streamerId, state);
        if (state === 'connected') void this.onIncomingConnected(streamerId);
        if (state === 'failed') void this.resubscribe(streamerId);
      },
    });
    entry = {
      link,
      quality,
      hiddenTimer: null,
      connectTimer: null,
      prev: null,
      reported: false,
    };
    // A lost subscribe or an offer that never comes must not leave a black tile forever.
    entry.connectTimer = setTimeout(() => {
      if (this.inc.get(streamerId) === entry && link.linkState !== 'connected')
        void this.resubscribe(streamerId);
    }, CONNECT_TIMEOUT_MS);
    this.inc.set(streamerId, entry);
    // The track (and so the stream) arrives with the offer, before ICE connects: report the state now.
    this.opts.onLinkState?.(streamerId, 'connecting');
    this.opts.send({ t: 'subscribe', to: streamerId, quality });
  }

  /** The streamer restarted (e.g. reloaded): rebuild the connection at the same quality. */
  async restartIncoming(streamerId: string) {
    const i = this.inc.get(streamerId);
    if (!i) return;
    const quality = i.quality === 'paused' ? null : i.quality;
    this.unwatch(streamerId, false);
    if (quality) await this.watch(streamerId, quality);
  }

  /** Hides a tile: the streamer stops sending at once; the connection closes after HIDDEN_CLOSE_MS. */
  hide(streamerId: string) {
    const i = this.inc.get(streamerId);
    if (!i || i.hiddenTimer) return;
    i.quality = 'paused';
    this.opts.send({ t: 'subscribe', to: streamerId, quality: 'paused' });
    i.hiddenTimer = setTimeout(() => this.unwatch(streamerId), HIDDEN_CLOSE_MS);
  }

  unwatch(streamerId: string, notify = true) {
    const i = this.inc.get(streamerId);
    if (!i) return;
    if (i.hiddenTimer) clearTimeout(i.hiddenTimer);
    if (i.connectTimer) clearTimeout(i.connectTimer);
    i.link.close();
    this.inc.delete(streamerId);
    if (notify) this.opts.send({ t: 'unsubscribe', to: streamerId });
    this.opts.onRemoteStream(streamerId, null);
  }

  isWatching(streamerId: string) {
    return this.inc.has(streamerId);
  }

  // ── both ──

  async onSignal(from: string, data: SignalData) {
    const [streamer, viewer] = data.pc.split('>');
    const outgoing = streamer === this.opts.selfId && viewer === from;
    const incoming = viewer === this.opts.selfId && streamer === from;
    if (outgoing) await this.out.get(from)?.link.handle(data);
    else if (incoming) await this.inc.get(from)?.link.handle(data);
  }

  /** The peer left the room or stopped streaming. */
  onPeerGone(id: string, { stoppedStreaming = false } = {}) {
    if (this.inc.has(id)) this.unwatch(id, false);
    if (!stoppedStreaming) this.dropViewer(id);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.statsTimer);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    for (const id of [...this.inc.keys()]) this.unwatch(id, false);
    for (const o of this.out.values()) o.link.close();
    this.out.clear();
  }

  // ── internals ──

  private async iceConfig(): Promise<IceConfig> {
    if (this.ice) return this.ice;
    this.icePromise ??= this.opts
      .getIceConfig()
      .then((c) => {
        this.ice = c;
        this.scheduleRefresh(c);
        return c;
      })
      .finally(() => {
        this.icePromise = null;
      });
    return this.icePromise;
  }

  /** TURN credentials expire; swap them on live connections before they do. */
  private scheduleRefresh(c: IceConfig) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!c.relay) return;
    const ms = Math.max(
      30_000,
      (c.expiresAt - TURN_REFRESH_LEAD_S) * 1000 - Date.now(),
    );
    this.refreshTimer = setTimeout(() => {
      this.ice = null;
      void this.iceConfig()
        .then((next) => {
          for (const l of [...this.out.values(), ...this.inc.values()])
            l.link.setIceServers(next.iceServers);
        })
        .catch(() => {
          this.refreshTimer = setTimeout(() => this.scheduleRefresh(c), 30_000);
        });
    }, ms);
  }

  private rebalance() {
    const viewers: Record<string, Quality> = {};
    for (const [id, o] of this.out) viewers[id] = o.quality;
    const alloc = allocateBitrates(
      viewers,
      this.opts.uploadBudgetKbps ?? DEFAULT_UPLOAD_BUDGET_KBPS,
    );
    for (const [id, o] of this.out) {
      const kbps = alloc[id];
      if (kbps === undefined || o.quality === 'paused') continue;
      o.adapter.setCeiling(
        o.relayCapKbps === null ? kbps : Math.min(kbps, o.relayCapKbps),
      );
      void o.link.tune({ quality: o.quality, maxKbps: o.adapter.kbps });
    }
  }

  private async onOutgoingConnected(viewerId: string) {
    const o = this.out.get(viewerId);
    if (!o) return;
    const ice = this.ice;
    if (
      ice?.relay &&
      (await applyRelayBitrateCap(o.link.pc, ice.maxRelayBitrateKbps))
    ) {
      o.relayCapKbps = ice.maxRelayBitrateKbps;
      this.rebalance();
    }
    if (!o.reported) {
      o.reported = true;
      await this.report(o.link.pc);
    }
  }

  private async onIncomingConnected(streamerId: string) {
    const i = this.inc.get(streamerId);
    if (!i) return;
    if (i.connectTimer) {
      clearTimeout(i.connectTimer);
      i.connectTimer = null;
    }
    if (i.reported) return;
    i.reported = true;
    await this.report(i.link.pc);
  }

  private async report(pc: RTCPeerConnection) {
    const candidateType = await getSelectedCandidateType(pc).catch(() => null);
    if (candidateType) track({ event: 'rtc_connected', candidateType });
  }

  /** Failed beyond the ICE restarts: start over with a fresh connection. */
  private async resubscribe(streamerId: string) {
    const i = this.inc.get(streamerId);
    if (!i) return;
    this.unwatch(streamerId);
    if (i.quality === 'paused') return;
    const quality = i.quality;
    await new Promise((r) => setTimeout(r, 1_000));
    if (!this.closed && !this.inc.has(streamerId))
      await this.watch(streamerId, quality);
  }

  private async tick() {
    for (const [, o] of this.out) {
      if (o.quality === 'paused' || o.link.linkState !== 'connected') continue;
      const sample = await outboundSample(o.link.pc).catch(() => null);
      if (!sample) continue;
      const next = o.adapter.update(sample);
      if (next !== null)
        void o.link.tune({ quality: o.quality, maxKbps: next });
    }
    if (!this.opts.onMetrics) return;
    for (const [id, i] of this.inc) {
      if (i.link.linkState !== 'connected') continue;
      const s = await inboundSample(i.link.pc).catch(() => null);
      if (!s) continue;
      if (i.prev) this.opts.onMetrics(id, inboundMetrics(i.prev, s));
      i.prev = s;
    }
  }
}
