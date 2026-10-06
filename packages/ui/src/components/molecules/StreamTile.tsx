import { useEffect, useRef, useState, type RefObject } from 'react';
import { Expand, Loader2, Volume2, VolumeX, WifiOff } from 'lucide-react';
import type { InboundMetrics, LinkState } from '../../lib/webrtc';
import { cx } from '../../lib/cx';
import { IconButton } from '../atoms';
import { useT } from '../../i18n';

type Props = {
  nick: string;
  stream: MediaStream | null;
  self?: boolean;
  owner?: boolean;
  state?: LinkState;
  small?: boolean;
  onFocus?(): void;
  /** Page volume (0–1) applied on top of the tile's own mute. */
  volume?: number;
  /** Shown as an overlay when set (the transport bar's stats toggle). */
  metrics?: InboundMetrics | null;
  showMetrics?: boolean;
  /** Bound to this tile's video when it is the focused stream, for picture-in-picture. */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** Native capture draws into this tile, so the copied stream is not shown here. */
  surfaceRef?: RefObject<HTMLElement | null>;
};

export function StreamTile({
  nick,
  stream,
  self,
  owner,
  state,
  small,
  onFocus,
  volume = 1,
  metrics,
  showMetrics,
  videoRef,
  surfaceRef,
}: Props) {
  const t = useT().party.stage;
  const video = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [autoMuted, setAutoMuted] = useState(false);
  const setVideo = (el: HTMLVideoElement | null) => {
    video.current = el;
    if (videoRef) videoRef.current = el;
  };
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const next = surfaceRef ? null : stream;
    if (v.srcObject !== next) v.srcObject = next;
    if (!stream) return;
    // Without a prior click on the page, autoplay with sound is refused and the video stays black.
    // Muted autoplay is always allowed, so fall back to it and let the user turn the sound on.
    v.play().catch(() => {
      if (self || !v.isConnected) return;
      v.muted = true;
      setMuted(true);
      setAutoMuted(true);
      void v.play().catch(() => {});
    });
  }, [stream, self, surfaceRef]);
  useEffect(() => {
    if (video.current) video.current.volume = Math.min(1, Math.max(0, volume));
  }, [volume, stream]);
  const unmute = () => {
    const v = video.current;
    setMuted(false);
    setAutoMuted(false);
    if (v) {
      v.muted = false;
      void v.play().catch(() => {});
    }
  };
  const overlay =
    !self &&
    (!stream ||
      state === 'reconnecting' ||
      state === 'failed' ||
      state === 'connecting');
  const stats =
    showMetrics && !self && metrics
      ? [
          metrics.width && metrics.height
            ? `${metrics.width} × ${metrics.height}`
            : null,
          metrics.fps !== null ? `${Math.round(metrics.fps)} fps` : null,
          `${Math.round(metrics.kbps)} kbps`,
          metrics.lossRate > 0.001
            ? t.loss(Math.round(metrics.lossRate * 1000) / 10)
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;
  return (
    <figure
      ref={surfaceRef}
      className={cx(
        'group relative m-0 flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border bg-black immersive:rounded-none immersive:border-0',
        owner ? 'border-[#3c5a4e]' : 'border-line-soft',
        small ? 'aspect-video' : 'h-full w-full',
      )}
    >
      {/* Our own preview is always muted to avoid echo. */}
      <video
        ref={setVideo}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        muted={self || muted}
      />
      {overlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0b1016cc] text-[13px] text-[#a5b2c3]">
          {state === 'failed' ? (
            <WifiOff size={20} />
          ) : (
            <Loader2
              size={20}
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {state === 'failed'
            ? t.failed
            : state === 'reconnecting'
              ? t.reconnecting
              : t.connecting}
        </div>
      )}
      {autoMuted && !overlay && (
        <button
          type="button"
          onClick={unmute}
          className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-[#000000c0] px-2 py-1 text-[12px] font-semibold text-white hover:bg-[#000000e0] focus-visible:outline-2 focus-visible:outline-[#6ee7b7]"
        >
          <VolumeX size={14} />
          {t.unmute}
        </button>
      )}
      {stats && !overlay && (
        <span
          className={cx(
            'pointer-events-none absolute right-2 rounded-md bg-[#000000a8] px-2 py-0.5 text-[11px] text-accent tabular-nums',
            small ? 'bottom-2 max-w-[45%] truncate' : 'top-2',
          )}
        >
          {stats}
        </span>
      )}
      <figcaption className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-md bg-[#000000a8] px-2 py-0.5 text-[12px] font-semibold text-white">
        {self ? `${nick} · ${t.you}` : nick}
      </figcaption>
      <div
        className={cx(
          'absolute right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          stats && !small ? 'top-9' : 'top-2',
        )}
      >
        {!self && (
          <IconButton
            size="xs"
            className="bg-[#000000a8]"
            label={muted ? t.unmute : t.mute}
            onClick={() => (muted ? unmute() : setMuted(true))}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </IconButton>
        )}
        {onFocus && (
          <IconButton
            size="xs"
            className="bg-[#000000a8]"
            label={t.focus}
            onClick={onFocus}
          >
            <Expand size={15} />
          </IconButton>
        )}
      </div>
    </figure>
  );
}
