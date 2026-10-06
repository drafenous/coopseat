import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { IconButton } from '../atoms';
import { useT } from '../../i18n';

const EMOJIS = [
  '😀',
  '😂',
  '🤣',
  '😅',
  '😊',
  '😍',
  '😎',
  '🤔',
  '😮',
  '😢',
  '😡',
  '🥳',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '🤝',
  '👀',
  '🔥',
  '💯',
  '🎉',
  '❤️',
  '💀',
  '🤡',
  '😈',
  '👻',
  '🏆',
  '🎮',
  '🕹️',
  '⚔️',
  '🛡️',
  '🎯',
  '💥',
  '⭐',
  '✅',
  '❌',
  '⚡',
  '🍿',
];

/** Lightweight picker for common reactions; any emoji typed from the keyboard works too. */
export function EmojiPicker({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick(emoji: string): void;
}) {
  const t = useT().party.chat;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <IconButton
        size="sm"
        label={t.emoji}
        disabled={disabled}
        selected={open}
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        <Smile size={17} />
      </IconButton>
      {open && (
        <div
          role="listbox"
          aria-label={t.emoji}
          className="absolute right-0 bottom-full z-20 mb-2 grid w-[248px] grid-cols-8 gap-0.5 rounded-xl border border-line bg-surface p-2 shadow-[0_12px_32px_#000000a0]"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="option"
              aria-selected={false}
              className="rounded-md p-1 text-[18px] leading-none hover:bg-[#ffffff12]"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
