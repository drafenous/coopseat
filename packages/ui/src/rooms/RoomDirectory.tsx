'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, ListFilter, ListX, Loader2 } from 'lucide-react';
import { I18nProvider, useT, type UiLocale } from '../i18n';
import type { RoomListing } from '../party/room-query';
import { publicGet } from './client';
import { MultiSelect } from './MultiSelect';
import { downloadPath, partyPath } from './paths';
import { RoomCard } from './RoomCard';

type Props = {
  locale?: UiLocale;
  onOpenRoom?: (nickname: string) => void;
  partyHref?: (nickname: string) => string;
  downloadHref?: string;
  onBack?: () => void;
};

export function RoomDirectory(props: Props) {
  const { locale, partyHref, downloadHref, ...rest } = props;
  const body = (
    <Directory
      {...rest}
      partyHref={
        partyHref ??
        (locale && !rest.onOpenRoom
          ? (nickname) => partyPath(nickname, locale)
          : undefined)
      }
      downloadHref={
        downloadHref ??
        (locale && !rest.onOpenRoom ? downloadPath(locale) : undefined)
      }
    />
  );
  return locale ? <I18nProvider locale={locale}>{body}</I18nProvider> : body;
}

function Directory({
  onOpenRoom,
  partyHref,
  downloadHref,
  onBack,
}: Omit<Props, 'locale'>) {
  const t = useT().directory;
  const [status, setStatus] = useState<Array<'open' | 'closed'>>(['open']);
  const [password, setPassword] = useState<Array<'yes' | 'no'>>([]);
  const [visibility, setVisibility] = useState<
    Array<'protected' | 'private' | 'public'>
  >([]);
  const [page, setPage] = useState(1);
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const filtersRef = useRef<HTMLDivElement>(null);
  const narrowed =
    status.length !== 1 ||
    status[0] !== 'open' ||
    password.length === 1 ||
    (visibility.length > 0 && visibility.length < 3);

  useEffect(() => {
    let cancel = false;
    setPhase('loading');
    publicGet<{
      rooms: RoomListing[];
      total: number;
      page: number;
      pageSize: number;
    }>(directoryQuery(page, status, password, visibility))
      .then((data) => {
        if (cancel) return;
        setRooms(data.rooms);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancel) setPhase('error');
      });
    return () => {
      cancel = true;
    };
  }, [status, password, visibility, page]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || filtersRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[role="listbox"]')) return;
      setFiltersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (nickname: string) =>
    partyHref?.(nickname) ?? (onOpenRoom ? undefined : partyPath(nickname));

  return (
    <section className="flex min-h-[420px] flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              className="mb-3 text-[13px] font-semibold text-muted hover:text-strong"
              onClick={onBack}
            >
              {t.back}
            </button>
          )}
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-strong">
            {t.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{t.intro}</p>
        </div>
        <div ref={filtersRef} className="relative">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-[#d4dee8] hover:bg-white/5"
          >
            <ListFilter size={15} />
            {t.filter}
            {narrowed && (
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            )}
          </button>
          {filtersOpen && (
            <div
              id={filtersId}
              className="absolute top-[calc(100%+8px)] right-0 z-30 flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-[0_16px_40px_#000000a0]"
            >
              <MultiSelect
                label={t.filters}
                placeholder={t.all}
                options={[
                  { value: 'open', label: t.open },
                  { value: 'closed', label: t.closed },
                ]}
                value={status}
                onChange={(next) => {
                  setStatus(next);
                  setPage(1);
                }}
              />
              <MultiSelect
                label={t.passwordFilter}
                placeholder={t.passwordAny}
                options={[
                  { value: 'yes', label: t.passwordYes },
                  { value: 'no', label: t.passwordNo },
                ]}
                value={password}
                onChange={(next) => {
                  setPassword(next);
                  setPage(1);
                }}
              />
              <MultiSelect
                label={t.visibilityFilter}
                placeholder={t.visibilityAny}
                options={[
                  { value: 'protected', label: t.visibilityProtected },
                  { value: 'private', label: t.visibilityPrivate },
                  { value: 'public', label: t.visibilityPublic },
                ]}
                value={visibility}
                onChange={(next) => {
                  setVisibility(next);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
      {phase === 'loading' && (
        <DirectoryNotice
          icon={
            <Loader2
              size={26}
              className="animate-spin motion-reduce:animate-none"
            />
          }
          title={t.loading}
          status
        />
      )}
      {phase === 'error' && (
        <DirectoryNotice
          icon={<CircleAlert size={26} className="text-danger" />}
          title={t.error}
          alert
        />
      )}
      {phase === 'ready' && rooms.length === 0 && (
        <DirectoryNotice
          icon={<ListX size={26} />}
          title={t.empty}
          hint={t.emptyHint}
        />
      )}
      {phase === 'ready' && rooms.length > 0 && (
        <ul className="mt-8 divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
          {rooms.map((room) => (
            <li key={room.nickname}>
              <RoomCard
                layout="row"
                room={room}
                partyHref={onOpenRoom ? undefined : hrefFor(room.nickname)}
                onEnter={
                  onOpenRoom ? () => onOpenRoom(room.nickname) : undefined
                }
                downloadHref={downloadHref}
              />
            </li>
          ))}
        </ul>
      )}
      {phase === 'ready' && total > pageSize && (
        <nav
          aria-label={t.pages}
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted">{t.pageLabel(page, pageCount)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-[#d4dee8] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t.previous}
            </button>
            <button
              type="button"
              className="rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-[#d4dee8] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              {t.next}
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}

function DirectoryNotice({
  icon,
  title,
  hint,
  status,
  alert,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  status?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      role={alert ? 'alert' : status ? 'status' : undefined}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
        {icon}
      </div>
      <p className="text-[16px] font-semibold text-strong">{title}</p>
      {hint && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function directoryQuery(
  page: number,
  status: Array<'open' | 'closed'>,
  password: Array<'yes' | 'no'>,
  visibility: Array<'protected' | 'private' | 'public'>,
) {
  const params = new URLSearchParams({
    page: String(page),
    status: status.length === 1 ? status[0] : 'all',
  });
  if (password.length === 1) params.set('password', password[0]);
  if (visibility.length > 0 && visibility.length < 3)
    for (const item of visibility) params.append('visibility', item);
  return `/api/party/rooms?${params}`;
}
