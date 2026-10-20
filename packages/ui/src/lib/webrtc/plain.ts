import type { ClientMessage, Quality, SignalData } from '../../party/protocol';
import {
  capVideoSender,
  SEND_MAX_HEIGHT,
  SEND_MAX_WIDTH,
  sendScale,
  trackPixelSize,
} from './encoding';
import { lockFrameRate, type FrameGate } from './frame-clock';
import type { LinkState } from './peer';
import type { IceConfig } from './relay';
import {
  inboundMetrics,
  inboundSample,
  outboundMetrics,
  outboundSample,
  type InboundMetrics,
  type InboundSample,
  type OutboundMetrics,
  type OutboundSample,
} from './stats';

export type PlainMeshOptions = {
  selfId: string;
  send(msg: ClientMessage): void;
  getIceConfig(): Promise<IceConfig>;
  onRemoteStream(streamerId: string, stream: MediaStream | null): void;
  onLinkState?(streamerId: string, state: LinkState): void;
  onMetrics?(streamerId: string, metrics: InboundMetrics): void;
  /** Aggregate send-side stats while this peer is streaming. */
  onOutboundMetrics?(metrics: OutboundMetrics | null): void;
};

const STATS_INTERVAL_MS = 2_000;
const MEASURE_MS = 400;

/** One frame's display size, for tracks whose settings omit width and height. */
function measureTrack(
  track: MediaStreamTrack,
): Promise<{ width: number; height: number } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([track]);
    let settled = false;
    const finish = (width: number, height: number) => {
      if (settled) return;
      settled = true;
      video.srcObject = null;
      video.remove();
      resolve(width > 0 && height > 0 ? { width, height } : null);
    };
    const timer = setTimeout(() => finish(0, 0), MEASURE_MS);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      finish(video.videoWidth, video.videoHeight);
    };
    video.style.cssText =
      'position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;pointer-events:none';
    try {
      document.body.append(video);
    } catch {
      clearTimeout(timer);
      finish(0, 0);
      return;
    }
    void video.play().catch(() => {});
  });
}

type Side = 'streamer' | 'viewer';

const pcId = (streamer: string, viewer: string) => `${streamer}>${viewer}`;
const RETRY_MS = 1_000;
const MAX_RETRIES = 3;

/**
 * One peer connection. The streamer adds the capture tracks and offers.
 * The viewer only answers. Candidates are sent as they appear.
 */
class PlainLink {
  readonly pc: RTCPeerConnection;
  private makingOffer = false;
  private attaching = false;
  private closed = false;
  private queued: RTCIceCandidateInit[] = [];
  private remote = new MediaStream();
  /** 1 until the source is larger than 720p. Kept across offers for the same track. */
  private scale = 1;
  private scaledTrack: string | null = null;
  /** One extra apply after the offer, so a late encoder still gets the cap. */
  private recapped = false;

  constructor(
    private id: string,
    private side: Side,
    iceServers: RTCIceServer[],
    private send: (data: SignalData) => void,
    private onTrack?: (stream: MediaStream) => void,
    private onState?: (state: LinkState) => void,
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.onnegotiationneeded = () => {
      if (!this.attaching && this.side === 'streamer') void this.offer();
    };
    this.pc.onicecandidate = ({ candidate }) => {
      if (this.closed) return;
      this.send({
        pc: this.id,
        candidate: candidate
          ? (candidate.toJSON() as SignalData['candidate'])
          : null,
      });
    };
    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') this.onState?.('connected');
      else if (s === 'failed') this.onState?.('failed');
    };
    this.pc.ontrack = ({ track }) => {
      if (this.closed || this.remote.getTracks().includes(track)) return;
      this.remote.addTrack(track);
      this.onTrack?.(this.remote);
    };
  }

  /** First media on a streamer connection. One offer covers every track added here. */
  attach(stream: MediaStream) {
    this.attaching = true;
    try {
      for (const track of stream.getTracks()) {
        if (track.kind === 'video' || track.kind === 'audio')
          this.pc.addTrack(track, stream);
      }
    } finally {
      this.attaching = false;
    }
    void this.offer();
  }

  /** Same kinds swap in place. A new kind is added, which offers again. */
  async setStream(stream: MediaStream) {
    for (const kind of ['video', 'audio'] as const) {
      const track = stream.getTracks().find((t) => t.kind === kind) ?? null;
      const sender = this.pc.getSenders().find((s) => {
        if (s.track?.kind === kind) return true;
        return (
          this.pc.getTransceivers().find((t) => t.sender === s)?.receiver.track
            .kind === kind
        );
      });
      if (sender) {
        await sender.replaceTrack(track);
        continue;
      }
      if (track) this.pc.addTrack(track, stream);
    }
    await this.applySendCap();
  }

  async handle(data: SignalData) {
    if (this.closed) return;
    const pc = this.pc;
    try {
      if (data.description?.sdp) {
        const desc = data.description;
        if (desc.type === 'offer' && this.side === 'streamer') return;
        if (desc.type === 'answer' && this.side === 'viewer') return;
        await pc.setRemoteDescription({ type: desc.type, sdp: desc.sdp });
        if (desc.type === 'offer') {
          const answer = await pc.createAnswer();
          if (this.closed) return;
          await pc.setLocalDescription(answer);
          this.publish();
        }
        await this.flushCandidates();
      } else if (data.candidate) {
        if (!pc.remoteDescription) this.queued.push(data.candidate);
        else await pc.addIceCandidate(data.candidate);
      }
    } catch (e) {
      console.warn('WebRTC signaling error', this.id, e);
    }
  }

  /**
   * The encoded frame is still above 720p. Learn the scale from that frame once, then apply
   * the cap a single extra time. Repeating `setParameters` on every stats tick stalls the encoder.
   */
  noteEncodedSize(width: number, height: number) {
    if (this.closed || this.side !== 'streamer') return;
    if (width <= SEND_MAX_WIDTH && height <= SEND_MAX_HEIGHT) return;
    if (this.scale === 1) {
      this.scale = sendScale(width, height);
      void this.applySendCap();
      return;
    }
    if (this.recapped) return;
    this.recapped = true;
    void this.applySendCap();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.ontrack = null;
    this.pc.close();
  }

  private async offer() {
    if (this.closed || this.makingOffer || this.pc.signalingState !== 'stable')
      return;
    try {
      this.makingOffer = true;
      await this.applySendCap();
      if (this.closed || this.pc.signalingState !== 'stable') return;
      const offer = await this.pc.createOffer();
      if (this.closed || this.pc.signalingState !== 'stable') return;
      await this.pc.setLocalDescription(offer);
      await this.applySendCap();
      this.publish();
    } catch (e) {
      console.warn('WebRTC offer failed', this.id, e);
    } finally {
      this.makingOffer = false;
    }
  }

  private publish() {
    const d = this.pc.localDescription;
    if (!d || this.closed) return;
    this.send({
      pc: this.id,
      description: { type: d.type, sdp: d.sdp },
    });
  }

  /** Fits the outgoing picture in 720p30. The preview keeps the original track. */
  private async applySendCap() {
    if (this.closed || this.side !== 'streamer') return;
    let scale = this.scale;
    for (const sender of this.pc.getSenders()) {
      const kind =
        sender.track?.kind ??
        this.pc.getTransceivers().find((t) => t.sender === sender)?.receiver
          .track.kind;
      if (kind !== 'video') continue;
      const track = sender.track;
      if (track) {
        try {
          track.contentHint = 'motion';
        } catch {
          /* read-only in some engines */
        }
        if (this.scaledTrack !== track.id) {
          const size = trackPixelSize(track) ?? (await measureTrack(track));
          scale = size ? sendScale(size.width, size.height) : 1;
          this.scale = scale;
          this.scaledTrack = track.id;
          this.recapped = false;
        } else scale = this.scale;
      }
      await capVideoSender(sender, scale);
    }
  }

  private async flushCandidates() {
    const queued = this.queued;
    this.queued = [];
    for (const candidate of queued) {
      if (this.closed) return;
      await this.pc.addIceCandidate(candidate);
    }
  }
}

/**
 * One connection per viewer. Visible tiles subscribe at `high` and hidden tiles
 * unsubscribe. Video is scaled to 720p and forwarded at a steady 30fps. SDP is left alone.
 */
export class PlainMesh {
  private out = new Map<string, PlainLink>();
  private inc = new Map<string, PlainLink>();
  private openingOut = new Set<string>();
  private openingIn = new Set<string>();
  private stream: MediaStream | null = null;
  /** The capture track the gate is reading, so a repeat of the same stream does not rebuild it. */
  private gatedSource: MediaStreamTrack | null = null;
  private gate: FrameGate | null = null;
  /** Capture video replaced by the 30fps gate. Audio tracks stay the original ones. */
  private sendStream: MediaStream | null = null;
  private ice: IceConfig | null = null;
  private icePromise: Promise<IceConfig> | null = null;
  private retries = new Map<string, number>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private prevIn = new Map<string, InboundSample>();
  private prevOut = new Map<string, OutboundSample>();
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(private opts: PlainMeshOptions) {
    if (opts.onMetrics || opts.onOutboundMetrics)
      this.statsTimer = setInterval(() => void this.tick(), STATS_INTERVAL_MS);
  }

  async setLocalStream(stream: MediaStream | null) {
    this.stream = stream;
    if (!stream) {
      this.releaseGate();
      for (const id of [...this.out.keys()]) this.dropViewer(id);
      this.prevOut.clear();
      this.opts.onOutboundMetrics?.(null);
      return;
    }
    this.bindSend(stream);
    const send = this.outgoing();
    if (!send) return;
    await Promise.all(
      [...this.out.values()].map((link) => link.setStream(send)),
    );
  }

  /** The server forgets subscriptions when a stream is announced again. */
  resetOutgoing() {
    for (const id of [...this.out.keys()]) this.dropViewer(id);
  }

  get viewerCount() {
    return this.out.size;
  }

  async onSubscribe(viewerId: string, _quality: Quality) {
    if (this.closed || !this.stream) return;
    if (this.out.has(viewerId) || this.openingOut.has(viewerId)) return;
    this.openingOut.add(viewerId);
    let ice: IceConfig;
    try {
      ice = await this.iceConfig();
    } catch {
      this.openingOut.delete(viewerId);
      return;
    }
    const stream = this.outgoing();
    if (
      this.closed ||
      !stream ||
      !this.openingOut.has(viewerId) ||
      this.out.has(viewerId)
    ) {
      this.openingOut.delete(viewerId);
      return;
    }
    const link = this.open(
      pcId(this.opts.selfId, viewerId),
      'streamer',
      viewerId,
      ice,
    );
    this.out.set(viewerId, link);
    this.openingOut.delete(viewerId);
    link.attach(stream);
  }

  dropViewer(viewerId: string) {
    this.openingOut.delete(viewerId);
    const link = this.out.get(viewerId);
    if (!link) return;
    link.close();
    this.out.delete(viewerId);
  }

  /** A visible tile. `quality` is ignored: the wire subscribe is always `high`. */
  async watch(streamerId: string, _quality: Exclude<Quality, 'paused'>) {
    if (this.closed || streamerId === this.opts.selfId) return;
    if (
      this.inc.has(streamerId) ||
      this.openingIn.has(streamerId) ||
      this.retryTimers.has(streamerId)
    )
      return;
    this.openingIn.add(streamerId);
    let ice: IceConfig;
    try {
      ice = await this.iceConfig();
    } catch {
      this.openingIn.delete(streamerId);
      return;
    }
    if (
      this.closed ||
      !this.openingIn.has(streamerId) ||
      this.inc.has(streamerId)
    ) {
      this.openingIn.delete(streamerId);
      return;
    }
    const link = this.open(
      pcId(streamerId, this.opts.selfId),
      'viewer',
      streamerId,
      ice,
    );
    this.inc.set(streamerId, link);
    this.openingIn.delete(streamerId);
    this.opts.onLinkState?.(streamerId, 'connecting');
    this.opts.send({ t: 'subscribe', to: streamerId, quality: 'high' });
  }

  /** The streamer announced again and the server dropped the old subscription. */
  async restartIncoming(streamerId: string) {
    const pending = this.retryTimers.has(streamerId);
    if (!this.inc.has(streamerId) && !pending) return;
    this.cancelRetry(streamerId);
    if (this.inc.has(streamerId)) this.unwatch(streamerId, false);
    await this.watch(streamerId, 'high');
  }

  /** A hidden tile closes now. There is no paused layer. */
  hide(streamerId: string) {
    this.cancelRetry(streamerId);
    this.unwatch(streamerId, true);
  }

  isWatching(streamerId: string) {
    return this.inc.has(streamerId) || this.retryTimers.has(streamerId);
  }

  async onSignal(from: string, data: SignalData) {
    const [streamer, viewer] = data.pc.split('>');
    if (streamer === this.opts.selfId && viewer === from)
      await this.out.get(from)?.handle(data);
    else if (viewer === this.opts.selfId && streamer === from)
      await this.inc.get(from)?.handle(data);
  }

  /** The peer left, or stopped streaming (`stoppedStreaming` keeps our outgoing links). */
  onPeerGone(id: string, { stoppedStreaming = false } = {}) {
    this.cancelRetry(id);
    if (this.inc.has(id)) this.unwatch(id, false);
    if (!stoppedStreaming) this.dropViewer(id);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.releaseGate();
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
    this.prevIn.clear();
    this.prevOut.clear();
    for (const id of [...this.retryTimers.keys()]) this.cancelRetry(id);
    for (const id of [...this.inc.keys()]) this.unwatch(id, false);
    for (const link of this.out.values()) link.close();
    this.out.clear();
    this.openingIn.clear();
    this.openingOut.clear();
  }

  private async tick() {
    if (this.closed) return;
    if (this.opts.onMetrics) {
      for (const [id, link] of this.inc) {
        const sample = await inboundSample(link.pc).catch(() => null);
        if (!sample || this.closed) continue;
        const prev = this.prevIn.get(id);
        if (prev) this.opts.onMetrics(id, inboundMetrics(prev, sample));
        this.prevIn.set(id, sample);
      }
    }
    if (this.opts.onOutboundMetrics) await this.tickOutbound();
  }

  /** Sums send bitrate across viewers; resolution/fps come from any live link or the local track. */
  private async tickOutbound() {
    const onOut = this.opts.onOutboundMetrics;
    if (!onOut || this.closed) return;
    if (!this.stream) {
      this.prevOut.clear();
      onOut(null);
      return;
    }
    if (this.out.size === 0) {
      this.prevOut.clear();
      const track = this.stream.getVideoTracks()[0];
      const s = track?.getSettings();
      onOut({
        kbps: 0,
        lossRate: 0,
        rttMs: null,
        fps: s?.frameRate ?? null,
        width: s?.width ?? null,
        height: s?.height ?? null,
      });
      return;
    }
    let kbps = 0,
      lossNum = 0,
      lossDen = 0,
      rttMs: number | null = null,
      fps: number | null = null,
      width: number | null = null,
      height: number | null = null;
    let any = false;
    for (const [id, link] of this.out) {
      const sample = await outboundSample(link.pc).catch(() => null);
      if (!sample || this.closed) continue;
      if (sample.width && sample.height)
        link.noteEncodedSize(sample.width, sample.height);
      const prev = this.prevOut.get(id);
      this.prevOut.set(id, sample);
      if (!prev) continue;
      const m = outboundMetrics(prev, sample);
      any = true;
      kbps += m.kbps;
      const sent = sample.packetsSent - prev.packetsSent;
      const lost = Math.max(0, sample.packetsLost - prev.packetsLost);
      lossNum += lost;
      lossDen += sent + lost;
      if (m.rttMs !== null) rttMs = m.rttMs;
      if (m.fps !== null) fps = m.fps;
      if (m.width !== null) width = m.width;
      if (m.height !== null) height = m.height;
    }
    for (const id of [...this.prevOut.keys()]) {
      if (!this.out.has(id)) this.prevOut.delete(id);
    }
    if (!any) {
      const track = this.stream.getVideoTracks()[0];
      const s = track?.getSettings();
      onOut({
        kbps: 0,
        lossRate: 0,
        rttMs: null,
        fps: s?.frameRate ?? null,
        width: s?.width ?? null,
        height: s?.height ?? null,
      });
      return;
    }
    onOut({
      kbps,
      lossRate: lossDen > 0 ? lossNum / lossDen : 0,
      rttMs,
      fps,
      width,
      height,
    });
  }

  /** What viewers receive. The preview keeps `stream`; this one is paced at 30fps. */
  private outgoing(): MediaStream | null {
    return this.sendStream ?? this.stream;
  }

  private bindSend(stream: MediaStream) {
    const video = stream.getVideoTracks()[0] ?? null;
    if (video !== this.gatedSource) {
      this.releaseGate();
      if (video) {
        const gate = lockFrameRate(video);
        if (gate) {
          this.gate = gate;
          this.gatedSource = video;
        }
      }
    }
    const sendVideo = this.gate?.track ?? video;
    this.sendStream = new MediaStream(
      [sendVideo, ...stream.getAudioTracks()].filter(
        (track): track is MediaStreamTrack => Boolean(track),
      ),
    );
  }

  private releaseGate() {
    this.gate?.stop();
    this.gate = null;
    this.gatedSource = null;
    this.sendStream = null;
  }

  private open(id: string, side: Side, peerId: string, ice: IceConfig) {
    return new PlainLink(
      id,
      side,
      ice.iceServers,
      (data) => this.opts.send({ t: 'signal', to: peerId, data }),
      side === 'viewer'
        ? (stream) => this.opts.onRemoteStream(peerId, stream)
        : undefined,
      side === 'viewer'
        ? (state) => {
            if (state === 'connected') this.retries.delete(peerId);
            if (state === 'failed') this.onIncomingFailed(peerId);
            else this.opts.onLinkState?.(peerId, state);
          }
        : undefined,
    );
  }

  /** A failed viewer link is closed and subscribed again, up to three times. */
  private onIncomingFailed(streamerId: string) {
    const attempt = (this.retries.get(streamerId) ?? 0) + 1;
    const pending = this.retryTimers.get(streamerId);
    if (pending) clearTimeout(pending);
    this.retryTimers.delete(streamerId);
    this.unwatch(streamerId, true);
    if (this.closed || attempt > MAX_RETRIES) {
      this.retries.delete(streamerId);
      this.opts.onLinkState?.(streamerId, 'failed');
      return;
    }
    this.retries.set(streamerId, attempt);
    this.opts.onLinkState?.(streamerId, 'connecting');
    this.retryTimers.set(
      streamerId,
      setTimeout(() => void this.resume(streamerId), RETRY_MS),
    );
  }

  private async resume(streamerId: string) {
    this.retryTimers.delete(streamerId);
    if (this.closed || !this.retries.has(streamerId)) return;
    await this.watch(streamerId, 'high');
    if (
      this.closed ||
      !this.retries.has(streamerId) ||
      this.inc.has(streamerId) ||
      this.openingIn.has(streamerId) ||
      this.retryTimers.has(streamerId)
    )
      return;
    this.onIncomingFailed(streamerId);
  }

  private cancelRetry(streamerId: string) {
    const timer = this.retryTimers.get(streamerId);
    if (timer) clearTimeout(timer);
    this.retryTimers.delete(streamerId);
    this.retries.delete(streamerId);
  }

  private unwatch(streamerId: string, notify: boolean) {
    this.openingIn.delete(streamerId);
    this.prevIn.delete(streamerId);
    const link = this.inc.get(streamerId);
    if (!link) return;
    link.close();
    this.inc.delete(streamerId);
    if (notify) this.opts.send({ t: 'unsubscribe', to: streamerId });
    this.opts.onRemoteStream(streamerId, null);
  }

  private async iceConfig(): Promise<IceConfig> {
    if (this.ice) return this.ice;
    this.icePromise ??= this.opts
      .getIceConfig()
      .then((c) => {
        this.ice = c;
        return c;
      })
      .finally(() => {
        this.icePromise = null;
      });
    return this.icePromise;
  }
}
