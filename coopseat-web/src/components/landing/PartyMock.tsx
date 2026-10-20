import { Armchair, Plus } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries/en';

const GUESTS = [
  { initials: 'LU', className: 'bg-[#f3c97a] text-[#3a2a0b]' },
  { initials: 'TH', className: 'bg-[#9ec5ff] text-[#0f2340]' },
];

const CHAT_COLORS = ['text-[#f3c97a]', 'text-[#9ec5ff]'];

const PLAYERS = [
  {
    name: 'Você',
    pos: '1ST',
    body: 'bg-[#e8edf3]',
    lights: 'bg-[#ff6b6b]',
    lane: 'left-1/2',
    rival: { body: 'bg-[#f3c97a]', lights: 'bg-[#fff4c8]', lane: 'left-[40%]' },
  },
  {
    name: 'luna',
    pos: '2ND',
    body: 'bg-[#f3c97a]',
    lights: 'bg-[#fff4c8]',
    lane: 'left-[58%]',
    rival: { body: 'bg-[#e8edf3]', lights: 'bg-[#ff6b6b]', lane: 'left-[46%]' },
  },
  {
    name: 'theo',
    pos: '3RD',
    body: 'bg-[#9ec5ff]',
    lights: 'bg-[#d6e8ff]',
    lane: 'left-[42%]',
    rival: { body: 'bg-[#f3c97a]', lights: 'bg-[#fff4c8]', lane: 'left-[60%]' },
  },
  {
    name: 'mia',
    pos: '4TH',
    body: 'bg-[#f5a5c8]',
    lights: 'bg-[#ffd0e4]',
    lane: 'left-[64%]',
    rival: { body: 'bg-[#9ec5ff]', lights: 'bg-[#d6e8ff]', lane: 'left-[48%]' },
  },
];

function Racer({
  body,
  lights,
  className,
}: {
  body: string;
  lights: string;
  className: string;
}) {
  return (
    <div className={`absolute -translate-x-1/2 ${className}`}>
      <div className="mx-auto h-[0.42em] w-[1.6em] rounded-t-[0.4em] bg-[#c9d4df]" />
      <div
        className={`relative h-[0.68em] w-[2.7em] rounded-[0.28em] shadow-[0_8px_18px_-4px_#b0f3d288] ${body}`}
      >
        <span
          className={`absolute top-[0.22em] left-[0.22em] h-[0.16em] w-[0.5em] rounded-full ${lights}`}
        />
        <span
          className={`absolute top-[0.22em] right-[0.22em] h-[0.16em] w-[0.5em] rounded-full ${lights}`}
        />
      </div>
    </div>
  );
}

function RaceScene({
  size,
  body,
  lights,
  lane,
  rival,
}: {
  size: string;
  body: string;
  lights: string;
  lane: string;
  rival?: { body: string; lights: string; lane: string };
}) {
  return (
    <div className={`absolute inset-y-0 -right-px left-0 overflow-hidden bg-[#050b12] ${size}`}>
      <div className="absolute inset-x-0 top-0 h-[60%] bg-[linear-gradient(180deg,#07121f_0%,#16324a_45%,#4f7d73_78%,#f3c97a_100%)]" />
      <div className="absolute top-[18%] left-1/2 size-[30%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#ffe9b3_0%,#f3c97a_45%,#ff9d9d_100%)] shadow-[0_0_60px_10px_#f3c97a55] [mask-image:linear-gradient(180deg,#000_52%,transparent_52%,transparent_58%,#000_58%,#000_68%,transparent_68%,transparent_73%,#000_73%,#000_81%,transparent_81%,transparent_85%,#000_85%)]" />
      <div className="absolute inset-x-0 top-[38%] h-[22%] bg-[#173240] [clip-path:polygon(0_100%,0_55%,12%_20%,24%_60%,38%_10%,52%_55%,63%_30%,78%_70%,90%_25%,100%_50%,100%_100%)]" />
      <div className="absolute inset-x-0 top-[46%] h-[14%] bg-[#0d1f2a] [clip-path:polygon(0_100%,0_40%,18%_75%,30%_35%,46%_80%,60%_45%,74%_85%,88%_40%,100%_70%,100%_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[40%] overflow-hidden [perspective:180px]">
        <div className="absolute inset-x-[-60%] -top-px bottom-[-40%] origin-top [transform:rotateX(62deg)] bg-[linear-gradient(#b0f3d260_1px,transparent_1px),linear-gradient(90deg,#b0f3d260_1px,transparent_1px)] bg-[size:48px_48px] motion-safe:animate-road" />
        <div className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-[#050b12] to-transparent" />
      </div>
      {rival && (
        <Racer
          body={rival.body}
          lights={rival.lights}
          className={`${rival.lane} bottom-[36%] text-[0.55em]`}
        />
      )}
      <Racer body={body} lights={lights} className={`${lane} bottom-[10%]`} />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,#0000002e_3px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-transparent via-white/[0.04] to-transparent motion-safe:animate-scan" />
    </div>
  );
}

export function PartyMock({ t }: { t: Dictionary['home']['room'] }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden>
      <div className="absolute -inset-6 rounded-[36px] bg-[#9ec5ff]/10 blur-3xl" />
      <div className="relative space-y-4 rounded-2xl border border-line bg-background/80 p-4 shadow-[0_30px_70px_-30px_#000] backdrop-blur">
        <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-[#0c141c]">
          <div className="absolute inset-0 motion-safe:animate-stage-single">
            <RaceScene
              size="text-[22px]"
              body="bg-[#e8edf3]"
              lights="bg-[#ff6b6b]"
              lane="left-1/2"
            />
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-between px-3 font-mono text-[10px] font-semibold tracking-wider text-white/85">
              <p>
                <span className="text-accent">POS 1ST</span>
                <span className="mx-2 text-white/40">·</span>
                LAP 2/3
              </p>
              <p className="text-sm font-bold text-white/90 italic">
                187
                <span className="ml-1 text-[9px] font-semibold text-white/60 not-italic">
                  KM/H
                </span>
              </p>
            </div>
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
              <span className="size-1.5 rounded-full bg-[#ff6b6b] motion-safe:animate-pulse" />
              {t.live}
            </span>
            <span className="absolute top-2.5 right-2.5 rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold tracking-wider text-white">
              {t.quality}
            </span>
          </div>
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1 opacity-0 motion-safe:animate-stage-multi">
            {PLAYERS.map((player, i) => (
              <div
                key={player.name}
                className="relative overflow-hidden rounded-md"
              >
                <RaceScene
                  size="text-[13px]"
                  body={player.body}
                  lights={player.lights}
                  lane={player.lane}
                  rival={player.rival}
                />
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  <span className="size-1 rounded-full bg-[#ff6b6b]" />
                  {i === 0 ? t.you : player.name}
                  <span className="text-accent">{player.pos}</span>
                </span>
              </div>
            ))}
          </div>
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
