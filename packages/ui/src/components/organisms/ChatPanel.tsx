import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SendHorizontal, Trash2 } from 'lucide-react';
import { CHAT_MAX_GRAPHEMES, type ChatMessage } from '../../party/protocol';
import { chatLength, validChat } from '../../hooks/useChat';
import { cx } from '../../lib/cx';
import { IconButton, TextInput } from '../atoms';
import { EmojiPicker } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  messages: ChatMessage[];
  selfId: string | null;
  ownerId: string;
  enabled: boolean;
  canChat: boolean;
  canDelete: boolean;
  onSend(text: string): void;
  onDelete(id: string): void;
};

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Messages render as plain text (React escapes them); nothing is ever injected as HTML. */
export function ChatPanel({
  messages,
  selfId,
  ownerId,
  enabled,
  canChat,
  canDelete,
  onSend,
  onDelete,
}: Props) {
  const t = useT().party.chat;
  const [text, setText] = useState('');
  const list = useRef<HTMLOListElement>(null),
    input = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const length = chatLength(text),
    over = length > CHAT_MAX_GRAPHEMES;
  const disabled = !enabled || !canChat;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled || !validChat(text)) return;
    onSend(text);
    setText('');
    stick.current = true;
  };
  const addEmoji = (emoji: string) => {
    setText((x) => x + emoji);
    input.current?.focus();
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol
        ref={list}
        aria-live="polite"
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3 [scrollbar-width:thin]"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {!messages.length && (
          <li className="py-6 text-center text-[13px] text-[#8494a5]">
            {t.empty}
          </li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            className="group flex items-start gap-2 text-[13px] leading-[1.45]"
          >
            <p className="min-w-0 flex-1 break-words text-[#d4dee8]">
              <span
                className={cx(
                  'mr-1.5 font-semibold',
                  m.from === ownerId
                    ? 'text-accent'
                    : m.from === selfId
                      ? 'text-[#9ec7ff]'
                      : 'text-[#c3d0dd]',
                )}
              >
                {m.nick}
              </span>
              {m.text}
              <time
                className="ml-1.5 text-[11px] text-[#6f7f90]"
                dateTime={new Date(m.at).toISOString()}
              >
                {time(m.at)}
              </time>
            </p>
            {(canDelete || m.from === selfId) && (
              <IconButton
                size="xs"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                label={t.delete}
                onClick={() => onDelete(m.id)}
              >
                <Trash2 size={13} />
              </IconButton>
            )}
          </li>
        ))}
      </ol>
      <form
        className="flex-none border-t border-line-soft px-3 py-2.5"
        onSubmit={submit}
      >
        <div className="flex items-center gap-1.5">
          <TextInput
            ref={input}
            value={text}
            disabled={disabled}
            maxLength={CHAT_MAX_GRAPHEMES * 8}
            aria-invalid={over || undefined}
            aria-label={t.placeholder}
            placeholder={
              !enabled ? t.disabled : !canChat ? t.muted : t.placeholder
            }
            onChange={(e) => setText(e.target.value)}
          />
          <EmojiPicker disabled={disabled} onPick={addEmoji} />
          <IconButton
            size="sm"
            label={t.send}
            disabled={disabled || over || !text.trim()}
            type="submit"
          >
            <SendHorizontal size={17} />
          </IconButton>
        </div>
        <p className="mt-1.5 flex justify-between text-[11px] text-[#6f7f90]">
          <span>{t.erased}</span>
          <span className={over ? 'text-danger' : undefined}>
            {length}/{CHAT_MAX_GRAPHEMES}
          </span>
        </p>
      </form>
    </div>
  );
}
