import { Cable, Maximize2, Pin, Volume2 } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries/en';

const FRIENDS = [
  { initials: 'LU', className: 'bg-[#f3c97a] text-[#3a2a0b]' },
  { initials: 'TH', className: 'bg-[#9ec5ff] text-[#0f2340]' },
  { initials: 'MA', className: 'bg-[#f5a5c8] text-[#3d1027]' },
];

function GameScene() {
  return (
    <div className="relative aspect-video overflow-hidden bg-[#050b12]">
      <div className="absolute inset-x-0 top-0 h-[60%] bg-[linear-gradient(180deg,#07121f_0%,#16324a_45%,#4f7d73_78%,#f3c97a_100%)]" />
      <div className="absolute top-[18%] left-1/2 size-[30%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#ffe9b3_0%,#f3c97a_45%,#ff9d9d_100%)] shadow-[0_0_60px_10px_#f3c97a55] [mask-image:linear-gradient(180deg,#000_52%,transparent_52%,transparent_58%,#000_58%,#000_68%,transparent_68%,transparent_73%,#000_73%,#000_81%,transparent_81%,transparent_85%,#000_85%)]" />
      <div className="absolute inset-x-0 top-[38%] h-[22%] bg-[#173240] [clip-path:polygon(0_100%,0_55%,12%_20%,24%_60%,38%_10%,52%_55%,63%_30%,78%_70%,90%_25%,100%_50%,100%_100%)]" />
      <div className="absolute inset-x-0 top-[46%] h-[14%] bg-[#0d1f2a] [clip-path:polygon(0_100%,0_40%,18%_75%,30%_35%,46%_80%,60%_45%,74%_85%,88%_40%,100%_70%,100%_100%)]" />

      <div className="absolute inset-x-0 bottom-0 h-[40%] overflow-hidden [perspective:180px]">
        <div className="absolute inset-x-[-60%] -top-px bottom-[-40%] origin-top [transform:rotateX(62deg)] bg-[linear-gradient(#b0f3d260_1px,transparent_1px),linear-gradient(90deg,#b0f3d260_1px,transparent_1px)] bg-[size:48px_48px] motion-safe:animate-road" />
        <div className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-[#050b12] to-transparent" />
      </div>

      <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2">
        <div className="mx-auto h-[10px] w-[38px] rounded-t-[8px] bg-[#c9d4df]" />
        <div className="relative h-[16px] w-[64px] rounded-[6px] bg-[#e8edf3] shadow-[0_10px_24px_-4px_#b0f3d288]">
          <span className="absolute top-[5px] left-[5px] h-[4px] w-[12px] rounded-full bg-[#ff6b6b] shadow-[0_0_10px_#ff6b6b]" />
          <span className="absolute top-[5px] right-[5px] h-[4px] w-[12px] rounded-full bg-[#ff6b6b] shadow-[0_0_10px_#ff6b6b]" />
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 flex justify-between p-3 font-mono text-[10px] font-semibold tracking-wider text-white/85 sm:text-[11px]">
        <div className="space-y-0.5">
          <p>LAP 2/3</p>
          <p className="text-accent">POS 1ST</p>
        </div>
        <p>00:42.17</p>
      </div>
      <p className="absolute bottom-3 left-3 font-mono text-lg font-bold text-white/90 italic sm:text-xl">
        187
        <span className="ml-1 text-[10px] font-semibold text-white/60 not-italic">
          KM/H
        </span>
      </p>

      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,#0000002e_3px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-transparent via-white/[0.04] to-transparent motion-safe:animate-scan" />
    </div>
  );
}

export function HeroMock({ t }: { t: Dictionary['home']['mock'] }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden>
      <div className="absolute -inset-8 rounded-[40px] bg-accent/15 blur-3xl motion-safe:animate-glow" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_40px_90px_-30px_#000]">
        <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff9d9d]/80" />
          <span className="size-2.5 rounded-full bg-[#f3c97a]/80" />
          <span className="size-2.5 rounded-full bg-[#9ad9bd]/80" />
          <span className="ml-2 text-xs text-subtle">{t.title}</span>
          <div className="ml-auto flex items-center gap-2.5 text-subtle">
            <Pin size={13} />
            <Maximize2 size={13} />
          </div>
        </div>
        <GameScene />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft px-4 py-2.5 text-[11px] font-medium text-muted">
          <span className="flex items-center gap-1.5 font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse" />
            {t.live}
          </span>
          <span>Full HD</span>
          <span className="text-strong">60 FPS</span>
          <Volume2 size={13} className="ml-auto" />
        </div>
      </div>

      <div className="absolute -top-11 -right-2 rounded-xl border border-line bg-surface/90 px-3 py-2.5 shadow-xl backdrop-blur sm:-right-8 motion-safe:animate-float">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {FRIENDS.map((f) => (
              <span
                key={f.initials}
                className={`grid size-7 place-items-center rounded-full text-[10px] font-bold ring-2 ring-surface ${f.className}`}
              >
                {f.initials}
              </span>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-strong">{t.watching(3)}</p>
            <p className="text-[10px] font-semibold tracking-wider text-accent uppercase">
              {t.soon}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-14 left-4 flex items-center gap-2 rounded-xl border border-line bg-surface/90 px-3 py-2 text-xs font-medium text-muted shadow-xl backdrop-blur sm:-left-8 motion-safe:animate-float-delayed">
        <Cable size={14} className="text-accent" />
        {t.chain}
      </div>
    </div>
  );
}
