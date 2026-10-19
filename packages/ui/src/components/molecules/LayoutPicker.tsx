import { Columns2, LayoutGrid, LayoutPanelTop, Rows2 } from 'lucide-react';
import { LAYOUTS, type Layout } from '../../party/protocol';
import type { SplitOrientation } from '../../lib/party/layout';
import { IconButton } from '../atoms';
import { useT } from '../../i18n';

const ICONS: Record<Layout, typeof LayoutPanelTop> = {
  stage: LayoutPanelTop,
  grid: LayoutGrid,
};

export function LayoutPicker({
  value,
  onChange,
  splitOrientation,
  onSplitOrientation,
  showSplitToggle,
}: {
  value: Layout;
  onChange(layout: Layout): void;
  splitOrientation?: SplitOrientation;
  onSplitOrientation?(orientation: SplitOrientation): void;
  /** When the grid has exactly two tiles. */
  showSplitToggle?: boolean;
}) {
  const t = useT().party.layout;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        role="radiogroup"
        aria-label={t.label}
        className="flex items-center gap-0.5 rounded-lg border border-line-soft bg-[#0e141b] p-0.5"
      >
        {LAYOUTS.map((l) => {
          const Icon = ICONS[l];
          return (
            <IconButton
              key={l}
              size="sm"
              role="radio"
              aria-checked={value === l}
              selected={value === l}
              label={t[l]}
              onClick={() => onChange(l)}
            >
              <Icon size={16} />
            </IconButton>
          );
        })}
      </div>
      {showSplitToggle && splitOrientation && onSplitOrientation && (
        <div
          role="radiogroup"
          aria-label={t.splitOrientation}
          className="flex items-center gap-0.5 rounded-lg border border-line-soft bg-[#0e141b] p-0.5"
        >
          <IconButton
            size="sm"
            role="radio"
            aria-checked={splitOrientation === 'horizontal'}
            selected={splitOrientation === 'horizontal'}
            label={t.horizontal}
            onClick={() => onSplitOrientation('horizontal')}
          >
            <Columns2 size={16} />
          </IconButton>
          <IconButton
            size="sm"
            role="radio"
            aria-checked={splitOrientation === 'vertical'}
            selected={splitOrientation === 'vertical'}
            label={t.vertical}
            onClick={() => onSplitOrientation('vertical')}
          >
            <Rows2 size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
