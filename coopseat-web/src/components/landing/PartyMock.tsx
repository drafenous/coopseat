import { Armchair, Plus } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries/en';

const GUESTS = [
  { initials: 'LU', className: 'bg-[#f3c97a] text-[#3a2a0b]' },
  { initials: 'TH', className: 'bg-[#9ec5ff] text-[#0f2340]' },
];

const CHAT_COLORS = ['text-[#f3c97a]', 'text-[#9ec5ff]'];

export function PartyMock({ t }: { t: Dictionary['home']['party'] }) {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-6 rounded-[36px] bg-[#9ec5ff]/10 blur-3xl" />
      <div className="relative space-y-4 rounded-2xl border border-line bg-background/80 p-4 shadow-[0_30px_70px_-30px_#000] backdrop-blur">
        <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-[linear-gradient(160deg,#16324a_0%,#4f7d73_55%,#f3c97a_100%)]">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0d1f2a] [clip-path:polygon(0_100%,0_50%,15%_20%,32%_60%,50%_15%,68%_55%,84%_25%,100%_60%,100%_100%)]" />
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
            <span className="size-1.5 rounded-full bg-[#ff6b6b] motion-safe:animate-pulse" />
            {t.live}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 p-2.5 text-center">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-ink">
              <Armchair size={18} />
            </span>
            <span className="text-[10px] leading-tight font-semibold text-accent">
              {t.host}
            </span>
          </div>
          {GUESTS.map((g) => (
            <div
              key={g.initials}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line-soft bg-surface p-2.5 text-center"
            >
              <span
                className={`grid size-9 place-items-center rounded-full text-xs font-bold ${g.className}`}
              >
                {g.initials}
              </span>
              <span className="text-[10px] leading-tight text-muted">
                {t.guest}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line p-2.5 text-center">
            <span className="grid size-9 place-items-center rounded-full border border-dashed border-line-strong text-subtle">
              <Plus size={16} />
            </span>
            <span className="text-[10px] leading-tight text-subtle">
              {t.invite}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {t.chat.map((m, i) => (
            <p
              key={m.name}
              className="w-fit max-w-[90%] rounded-xl rounded-tl-sm bg-surface px-3 py-2 text-xs text-foreground"
            >
              <span
                className={`mr-1.5 font-semibold ${CHAT_COLORS[i] ?? 'text-accent'}`}
              >
                {m.name}
              </span>
              {m.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
