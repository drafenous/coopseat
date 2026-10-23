'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Kbd } from '../components/atoms/Kbd';
import { I18nProvider, useT, type UiLocale } from '../i18n';
import { ApiError } from '../lib/api';
import { parseRoomQuery, type RoomListing } from '../party/room-query';
import { publicGet } from './client';
import { downloadPath, partyPath, roomsPath } from './paths';
import { RoomCard } from './RoomCard';

type Props = {
  locale?: UiLocale;
  /** Desktop and the in-app web player open the room here instead of navigating. */
  onOpenRoom?: (nickname: string) => void;
  partyHref?: (nickname: string) => string;
  downloadHref?: string;
  browseHref?: string;
  onBrowse?: () => void;
  className?: string;
};

export function RoomSearch(props: Props) {
  const { locale, partyHref, downloadHref, browseHref, ...rest } = props;
  const form = (
    <SearchForm
      {...rest}
      partyHref={
        partyHref ?? (locale ? (nickname) => partyPath(nickname, locale) : undefined)
      }
      downloadHref={downloadHref ?? (locale ? downloadPath(locale) : undefined)}
      browseHref={browseHref ?? (locale ? roomsPath(locale) : undefined)}
    />
  );
  return locale ? <I18nProvider locale={locale}>{form}</I18nProvider> : form;
}

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'missing' }
  | { kind: 'error' }
  | { kind: 'found'; room: RoomListing };

function SearchForm({
  onOpenRoom,
  partyHref,
  downloadHref,
  browseHref,
  onBrowse,
  className,
}: Omit<Props, 'locale'>) {
  const t = useT().directory;
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  // Ignores a lookup that finishes after the field changes or a newer search starts.
  const lookupSeq = useRef(0);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'k' ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey)
      )
        return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      inputRef.current?.focus();
      inputRef.current?.select();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          return;
        }
        if (event.key !== 'Tab' || !panelRef.current) return;
        const items = [
          ...panelRef.current.querySelectorAll<HTMLElement>(
            'button, a[href], input',
          ),
        ].filter((el) => !el.hasAttribute('disabled'));
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = previous;
        window.removeEventListener('keydown', onKey);
      };
    }
    if (wasOpen.current) triggerRef.current?.focus();
  }, [open]);

  const close = () => setOpen(false);

  const openRoom = (nickname: string) => {
    close();
    if (onOpenRoom) onOpenRoom(nickname);
    else if (partyHref) location.assign(partyHref(nickname));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nickname = parseRoomQuery(query);
    if (!nickname) {
      lookupSeq.current += 1;
      setResult({ kind: 'invalid' });
      return;
    }
    if (
      result.kind === 'found' &&
      result.room.nickname.toLowerCase() === nickname.toLowerCase()
    ) {
      openRoom(result.room.nickname);
      return;
    }
    const seq = ++lookupSeq.current;
    setResult({ kind: 'loading' });
    try {
      const data = await publicGet<{ room: RoomListing }>(
        `/api/party/rooms/lookup?q=${encodeURIComponent(nickname)}`,
      );
      if (lookupSeq.current !== seq) return;
      setResult({ kind: 'found', room: data.room });
    } catch (err) {
      if (lookupSeq.current !== seq) return;
      if (err instanceof ApiError && err.status === 404)
        setResult({ kind: 'missing' });
      else if (err instanceof ApiError && err.status === 400)
        setResult({ kind: 'invalid' });
      else setResult({ kind: 'error' });
    }
  };

  const message =
    result.kind === 'invalid'
      ? t.invalid
      : result.kind === 'missing'
        ? t.notFound
        : result.kind === 'error'
          ? t.error
          : result.kind === 'loading'
            ? t.loading
            : null;

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#03070bcc] px-4 pt-[14vh] backdrop-blur-[3px] animate-fade-in motion-reduce:animate-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-[min(560px,100%)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_80px_#000000b0] animate-modal-in motion-reduce:animate-none"
      >
        <h2 id={titleId} className="sr-only">
          {t.searchLabel}
        </h2>
        <form role="search" onSubmit={onSubmit}>
          <div className="flex items-center gap-3 border-b border-line-soft px-4">
            <Search size={18} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              maxLength={300}
              aria-label={t.searchLabel}
              onChange={(event) => {
                lookupSeq.current += 1;
                setQuery(event.target.value);
                setResult({ kind: 'idle' });
              }}
              className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-strong outline-none placeholder:text-subtle"
            />
          </div>
        </form>
        <div className="p-3">
          {result.kind === 'found' ? (
            <RoomCard
              room={result.room}
              onEnter={
                onOpenRoom || partyHref
                  ? () => openRoom(result.room.nickname)
                  : undefined
              }
              downloadHref={downloadHref}
            />
          ) : message ? (
            <p className="px-2 py-3 text-[14px] text-muted" role="status">
              {message}
            </p>
          ) : (
            <p className="px-2 py-3 text-[14px] text-muted">{t.searchHint}</p>
          )}
          {(browseHref || onBrowse) && (
            <div className="mt-1 border-t border-line-soft px-2 pt-2">
              {onBrowse ? (
                <button
                  type="button"
                  className="text-[13px] font-semibold text-accent hover:underline"
                  onClick={() => {
                    close();
                    onBrowse();
                  }}
                >
                  {t.browse}
                </button>
              ) : (
                <a
                  className="text-[13px] font-semibold text-accent hover:underline"
                  href={browseHref}
                  onClick={close}
                >
                  {t.browse}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t.searchLabel}
        aria-keyshortcuts="Control+K"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-2.5 text-[#d4dee8] transition hover:bg-white/5"
      >
        <Search size={16} />
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      {open && createPortal(dialog, document.body)}
    </div>
  );
}
