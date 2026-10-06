import { useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Clapperboard, Monitor, Tv } from 'lucide-react';
import type { EffectIndex, NativeEvent, SmoothingLevel } from '../../types';
import type { Backend } from '../../lib/settings';
import { useVideoFilters } from '../../hooks/useVideoFilters';
import { Tag } from '../atoms';
import { useT } from '../../i18n';

type Props = {
  backend: Backend;
  running: boolean;
  stats: NativeEvent | null;
  smoothing: SmoothingLevel;
  effect: EffectIndex;
  cinemaHint: boolean;
  screenRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  emptyState: ReactNode;
  transport: ReactNode;
  partyHref?: string;
  onPartyClick?(event: MouseEvent<HTMLAnchorElement>): void;
};

const grid =
  'before:absolute before:inset-0 before:bg-[linear-gradient(#ffffff02_1px,transparent_1px),linear-gradient(90deg,#ffffff02_1px,transparent_1px)] before:bg-size-[32px_32px]';

export function CaptureViewer({
  backend,
  running,
  stats,
  smoothing,
  effect,
  cinemaHint,
  screenRef,
  videoRef,
  audioRef,
  emptyState,
  transport,
  partyHref,
  onPartyClick,
}: Props) {
  const t = useT().viewer;
  const compatLive = running && backend === 'compat';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filtered = useVideoFilters({
    videoRef,
    canvasRef,
    smoothing,
    effect,
    enabled: compatLive,
  });
  return (
    <section className="relative flex flex-col overflow-hidden rounded-[14px] border border-[#2c3743] bg-[#0a0e13] immersive:fixed immersive:inset-0 immersive:z-9 immersive:rounded-none immersive:border-0">
      <div className="flex h-[50px] flex-none items-center justify-between border-b border-[#ffffff0a] bg-[#111821] px-[18px] immersive:hidden">
        <span className="flex min-w-0 items-center gap-[9px] text-[14px] text-[#c3cedb] min-[1800px]:text-[15px]">
          <Monitor size={16} className="shrink-0" />
          <span className="truncate">{t.monitor}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {running && stats?.width ? (
            <span className="text-[12px] text-accent tabular-nums">
              {stats.width} × {stats.height}
              {stats.fps ? ` · ${stats.fps.toFixed(0)} fps` : ''}
            </span>
          ) : null}
          <Tag>{backend === 'native' ? t.native : t.compat}</Tag>
          {partyHref && (
            <a
              href={partyHref}
              onClick={onPartyClick}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent-border bg-accent px-3 text-[13px] font-[650] whitespace-nowrap text-accent-ink no-underline shadow-[0_3px_18px_#9aedc40a] hover:bg-accent-hover"
            >
              <Tv size={14} />
              {t.startParty}
            </a>
          )}
        </span>
      </div>
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center bg-[#070b10] bg-[radial-gradient(ellipse_at_50%_45%,#17272a66,transparent_65%)] immersive:h-full max-[750px]:min-h-[360px] max-[750px]:flex-none ${grid}`}
        ref={screenRef}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 size-full bg-black object-contain ${compatLive ? 'block' : 'hidden'}`}
        />
        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 size-full bg-black object-contain ${compatLive && filtered ? 'block' : 'hidden'}`}
        />
        <audio ref={audioRef} autoPlay />
        {emptyState}
        {cinemaHint && (
          <div className="pointer-events-none absolute bottom-7 left-1/2 z-2 flex -translate-x-1/2 items-center gap-2 rounded-3xl border border-[#ffffff1a] bg-[#050a0ee0] px-4 py-2.5 text-[13px] whitespace-nowrap text-[#e1eaf2] animate-fade-in-slow">
            <Clapperboard size={15} className="text-accent" /> {t.cinemaHint}
          </div>
        )}
      </div>
      {transport}
    </section>
  );
}
