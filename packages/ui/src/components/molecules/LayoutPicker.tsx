import { Columns2, LayoutGrid, LayoutPanelTop, Square } from 'lucide-react';
import { LAYOUTS, type Layout } from '../../party/protocol';
import { IconButton } from '../atoms';
import { useT } from '../../i18n';

const ICONS: Record<Layout, typeof Square> = {
  stage: LayoutPanelTop,
  grid: LayoutGrid,
  split: Columns2,
  focus: Square,
};

export function LayoutPicker({
  value,
  onChange,
}: {
  value: Layout;
  onChange(layout: Layout): void;
}) {
  const t = useT().party.layout;
  return (
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
  );
}
