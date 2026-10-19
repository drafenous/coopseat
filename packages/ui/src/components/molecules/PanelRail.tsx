import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { PanelSide } from '../templates/MainLayout';

type Props = {
  label: string;
  expandLabel: string;
  side: PanelSide;
  onExpand(): void;
  badge?: number;
};

/** Narrow strip left when a side panel is collapsed: expand control + vertical title. */
export function PanelRail({
  label,
  expandLabel,
  side,
  onExpand,
  badge,
}: Props) {
  return (
    <button
      type="button"
      aria-label={expandLabel}
      title={expandLabel}
      onClick={onExpand}
      className={cx(
        'flex h-full w-11 flex-none flex-col items-center gap-2.5 overflow-hidden rounded-[14px] border border-[#2a3542] bg-[#121921] px-1 py-3 text-[#8494a5]',
        'hover:border-[#3a4a5a] hover:bg-[#ffffff08] hover:text-[#c3d0dd]',
        'immersive:hidden max-[750px]:min-h-[120px]',
      )}
    >
      {side === 'right' ? (
        <PanelRightOpen size={18} className="flex-none" />
      ) : (
        <PanelLeftOpen size={18} className="flex-none" />
      )}
      {badge ? (
        <span className="flex-none rounded-full bg-[#ffffff14] px-1.5 text-[11px] font-semibold text-[#e3ebf2]">
          {badge}
        </span>
      ) : null}
      <span className="mt-1 min-h-0 flex-1 truncate text-[12px] font-semibold tracking-[0.08em] [writing-mode:vertical-rl] rotate-180">
        {label}
      </span>
    </button>
  );
}
