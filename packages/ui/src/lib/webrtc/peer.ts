import type { SignalData } from '../../party/protocol';
import {
  preferVideoCodecs,
  prepareTrack,
  tuneAudioSender,
  tuneVideoSender,
  withStereoOpus,
  type SenderTuning,
} from './encoding';

export type LinkState =
  'connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed';
export type PeerLinkOptions = {
  /** `${streamerId}>${viewerId}`, matched against SignalData.pc. */
  id: string;
  /** The streamer side offers (impolite); the viewer side answers and yields on collisions (polite). */
  side: 'streamer' | 'viewer';
  iceServers: RTCIceServer[];
  send(data: SignalData): void;
  onTrack?(stream: MediaStream): void;
  onState?(state: LinkState): void;
};

function addressClass(address: string | null | undefined): string {
  if (!address) return 'none';
  if (address.endsWith('.local')) return 'mdns';
  if (address === '::1' || address.startsWith('127.')) return 'loopback';
  if (address.startsWith('169.254.') || address.startsWith('fe80:')) return 'linklocal';
  if (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  ) {
    return 'private';
  }
  return 'other';
}

/** Survives brief packet loss: ICE `disconnected` often recovers by itself. */
export const DISCONNECT_GRACE_MS = 5_000;
export const MAX_ICE_RESTARTS = 4;
const RESTART_BACKOFF_MS = [0, 2_000, 5_000, 10_000];
/**
 * Holds a short, steady jitter buffer. With the default (as small as possible) a clump of late
 * frames is rendered faster than realtime until the buffer is empty again.
 */
const PLAYOUT_TARGET_MS = 100;

function holdPlayout(receiver: RTCRtpReceiver) {
  const hint = receiver as RTCRtpReceiver & {
    jitterBufferTarget?: number | null;
    playoutDelayHint?: number | null;
  };
  try {
    if ('jitterBufferTarget' in receiver)
      hint.jitterBufferTarget = PLAYOUT_TARGET_MS;
    else if ('playoutDelayHint' in receiver)
      hint.playoutDelayHint = PLAYOUT_TARGET_MS / 1000;
  } catch {
    /* closed, or the engine rejected the target */
  }
}

/** One RTCPeerConnection between a streamer and one viewer, with perfect negotiation and ICE restarts. */
export class PeerLink {
  readonly pc: RTCPeerConnection;
  private makingOffer = false;
  /** Set while this side is restarting ICE, so the viewer may send that one offer. */
  private iceRestart = false;
  /** The local SDP was already sent. Gathering can keep `setLocalDescription` pending. */
  private localSent = false;
  private ignoreOffer = false;
  private restarts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stream: MediaStream | null = null;
  private paused = false;
  private state: LinkState = 'connecting';
  private closed = false;
  private queued: RTCIceCandidate[] = [];

  constructor(private opts: PeerLinkOptions) {
    this.pc = new RTCPeerConnection({
      iceServers: opts.iceServers,
      bundlePolicy: 'max-bundle',
    });
    this.pc.onnegotiationneeded = () => void this.offer();
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.queued.push(candidate);
        return;
      }
      const lan = this.queued.some((c) => {
        const k = addressClass(c.address);
        return c.type === 'host' && (k === 'private' || k === 'loopback');
      });
      const chosen = this.queued.filter((c) => {
        const k = addressClass(c.address);
        if (k === 'mdns' || k === 'linklocal') return false;
        if (lan && c.type === 'host' && k === 'other') return false;
        return true;
      });
      for (const c of chosen) {
        this.opts.send({
          pc: opts.id,
          candidate: c.toJSON() as SignalData['candidate'],
        });
      }
      this.queued = [];
      this.opts.send({ pc: opts.id, candidate: null });
    };
    this.pc.oniceconnectionstatechange = () => this.onIce();
    this.pc.ontrack = ({ streams, track, receiver }) => {
      holdPlayout(receiver);
      opts.onTrack?.(streams[0] ?? new MediaStream([track]));
    };
  }

  get polite() {
    return this.opts.side === 'viewer';
  }
  get linkState() {
    return this.state;
  }

  /** Streamer side: sends the stream's tracks, swapping without renegotiation when the kinds match. */
  async setStream(stream: MediaStream | null) {
    this.stream = stream;
    const tracks = stream?.getTracks() ?? [];
    for (const kind of ['video', 'audio'] as const) {
      const track = tracks.find((t) => t.kind === kind) ?? null;
      const tx = this.pc
        .getTransceivers()
        .find(
          (t) =>
            t.sender.track?.kind === kind || t.receiver.track.kind === kind,
        );
      if (track) prepareTrack(track);
      if (tx) {
        await tx.sender.replaceTrack(this.paused ? null : track);
        continue;
      }
      if (!track || !stream) continue;
      const created = this.pc.addTransceiver(track, {
        direction: 'sendonly',
        streams: [stream],
      });
      if (kind === 'video') preferVideoCodecs(created);
      if (this.paused) await created.sender.replaceTrack(null);
    }
  }

  /** Hidden tile: stop encoding and sending without renegotiating; resume swaps the tracks back. */
  async setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    const tracks = this.stream?.getTracks() ?? [];
    await Promise.all(
      this.pc.getSenders().map((s) => {
        const kind =
          s.track?.kind ??
          this.pc.getTransceivers().find((t) => t.sender === s)?.receiver.track
            .kind;
        return s.replaceTrack(
          paused ? null : (tracks.find((t) => t.kind === kind) ?? null),
        );
      }),
    );
  }

  async tune(tuning: SenderTuning) {
    for (const sender of this.pc.getSenders()) {
      const kind = this.pc.getTransceivers().find((t) => t.sender === sender)
        ?.receiver.track.kind;
      if (kind === 'video') await tuneVideoSender(sender, tuning);
      else if (kind === 'audio') await tuneAudioSender(sender);
    }
  }

  setIceServers(iceServers: RTCIceServer[]) {
    try {
      this.pc.setConfiguration({ ...this.pc.getConfiguration(), iceServers });
    } catch {
      /* closed */
    }
  }

  async handle(data: SignalData) {
    if (this.closed) return;
    const pc = this.pc;
    try {
      if (data.description) {
        const desc = data.description;
        const collision =
          desc.type === 'offer' &&
          (this.makingOffer || pc.signalingState !== 'stable');
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;
        const sdp =
          desc.sdp && this.opts.side === 'streamer'
            ? withStereoOpus(desc.sdp)
            : desc.sdp;
        await pc.setRemoteDescription({ type: desc.type, sdp });
        if (desc.type === 'offer') {
          this.localSent = false;
          const op = pc.setLocalDescription();
          this.publishLocal();
          await op;
          this.publishLocal();
        }
      } else if ('candidate' in data) {
        try {
          const line = data.candidate?.candidate ?? '';
          if (line.includes('.local')) return;
          await pc.addIceCandidate(data.candidate ?? undefined);
        } catch (e) {
          if (!this.ignoreOffer) throw e;
        }
      }
    } catch (e) {
      console.warn('WebRTC signaling error', this.opts.id, e);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.clearTimer();
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.ontrack = null;
    this.pc.close();
    this.setState('closed');
  }

  private async offer() {
    // Only the streamer offers, except when this side is restarting ICE. Answering and
    // offering at the same time leaves setLocalDescription stuck.
    if (
      this.closed ||
      this.makingOffer ||
      (this.opts.side !== 'streamer' && !this.iceRestart)
    )
      return;
    try {
      this.makingOffer = true;
      this.localSent = false;
      const op = this.pc.setLocalDescription();
      this.publishLocal();
      await op;
      if (this.pc.localDescription) this.publishLocal();
    } catch (e) {
      console.warn('WebRTC offer failed', this.opts.id, e);
    } finally {
      this.makingOffer = false;
      this.iceRestart = false;
    }
  }

  /** Sends the local SDP as soon as it exists, without waiting out ICE gathering. */
  private publishLocal(): boolean {
    const d = this.pc.pendingLocalDescription ?? this.pc.localDescription;
    if (!d?.sdp.includes('ice-ufrag') || this.localSent || this.closed)
      return false;
    this.localSent = true;
    this.opts.send({
      pc: this.opts.id,
      description: { type: d.type, sdp: d.sdp },
    });
    return this.pc.localDescription === null;
  }

  private onIce() {
    const s = this.pc.iceConnectionState;
    if (s === 'connected' || s === 'completed') {
      this.clearTimer();
      this.restarts = 0;
      this.setState('connected');
      return;
    }
    if (s === 'disconnected') {
      this.setState('reconnecting');
      this.clearTimer();
      this.timer = setTimeout(() => {
        if (this.pc.iceConnectionState === 'disconnected') this.restartIce();
      }, DISCONNECT_GRACE_MS);
      return;
    }
    if (s === 'failed') this.restartIce();
  }

  private restartIce() {
    if (this.closed) return;
    if (this.restarts >= MAX_ICE_RESTARTS) {
      this.setState('failed');
      return;
    }
    const delay =
      RESTART_BACKOFF_MS[
        Math.min(this.restarts, RESTART_BACKOFF_MS.length - 1)
      ]!;
    this.restarts++;
    this.setState('reconnecting');
    this.clearTimer();
    this.timer = setTimeout(() => {
      if (this.closed) return;
      const s = this.pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') return;
      this.iceRestart = true;
      this.pc.restartIce();
      this.timer = setTimeout(() => {
        const now = this.pc.iceConnectionState;
        if (now !== 'connected' && now !== 'completed') this.restartIce();
      }, 15_000);
    }, delay);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  private setState(state: LinkState) {
    if (this.state === state) return;
    this.state = state;
    this.opts.onState?.(state);
  }
}
