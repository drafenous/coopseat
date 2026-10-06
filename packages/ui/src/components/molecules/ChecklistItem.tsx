import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';

type Status = 'ok' | 'warn' | 'neutral';
const icons = { ok: CircleCheck, warn: CircleAlert, neutral: CircleDashed };
const iconColors = {
  ok: 'text-[#9aefc5]',
  warn: 'text-warn',
  neutral: 'text-[#7d8ea0]',
};

export function ChecklistItem({
  status,
  title,
  children,
}: {
  status: Status;
  title: string;
  children: ReactNode;
}) {
  const Icon = icons[status];
  return (
    <li
      className={`flex items-start gap-[11px] rounded-[10px] border bg-[#0e161dcc] px-3.5 py-[11px] ${status === 'warn' ? 'border-[#5a4a2a]' : 'border-[#26323d]'}`}
    >
      <Icon size={17} className={`mt-px flex-none ${iconColors[status]}`} />
      <span className="flex min-w-0 flex-col gap-0.5 text-[13px] wrap-anywhere text-[#c9d4de] min-[1800px]:text-[14px]">
        <b className="text-[11px] font-semibold tracking-[0.8px] text-[#8d9dad] uppercase">
          {title}
        </b>
        {children}
      </span>
    </li>
  );
}
