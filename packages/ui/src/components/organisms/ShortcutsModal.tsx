import { Keyboard } from 'lucide-react';
import { Button, Kbd } from '../atoms';
import { Modal } from '../molecules';
import { useT } from '../../i18n';

export function ShortcutsModal({ onClose }: { onClose(): void }) {
  const all = useT(),
    t = all.transport;
  const rows = [
    { keys: 'F11', label: t.fullscreen },
    { keys: 'Esc', label: t.exit },
    { keys: 'M', label: t.mute },
  ];
  return (
    <Modal labelledBy="shortcuts-title" small closeButton onClose={onClose}>
      <h2 id="shortcuts-title" className="flex items-center gap-2">
        <Keyboard size={20} className="text-[#8d9dad]" />
        {t.shortcutsTitle}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map(({ keys, label }) => (
          <li
            key={keys}
            className="flex items-center justify-between gap-4 rounded-[10px] border border-[#2a3846] bg-[#ffffff04] px-3.5 py-3 text-[14px] text-[#c3d0dd]"
          >
            <span className="capitalize">{label}</span>
            <Kbd>{keys}</Kbd>
          </li>
        ))}
      </ul>
      <Button className="mt-5" onClick={onClose}>
        {all.common.close}
      </Button>
    </Modal>
  );
}
