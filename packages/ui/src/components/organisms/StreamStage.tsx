import {
  useCallback,
  useState,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { LogOut, Tv } from 'lucide-react';
import type { Party } from '../../hooks/useParty';
import { mainGridClass } from '../../lib/party/layout';
import { cx } from '../../lib/cx';
import { IconButton } from '../atoms';
import {
  Alert,
  LayoutPicker,
  RequestStreamButton,
  StreamTile,
} from '../molecules';
import { useT } from '../../i18n';

type Props = {
  party: Party;
  onLeave?(): void;
  gate?: ReactNode;
  /** Bottom controls (the same TransportBar as /play). */
  transport?: ReactNode;
  volume?: number;
  showMetrics?: boolean;
  /** Bound to the main tile's video, for picture-in-picture. */
  mainVideoRef?: RefObject<HTMLVideoElement | null>;
  /**
   * Where the native capture window is drawn. Only while the stage has no tiles, so it never covers
   * someone else's stream.
   */
  previewRef?: RefObject<HTMLDivElement | null>;
  /** Self tile that the native window covers while this machine is streaming it. */
  nativeSlotRef?: RefObject<HTMLElement | null>;
};

type DragPayload = { id: string; from: 'main' | 'strip'; index: number };

const MIME = 'application/x-coopseat-stream';

/** The stage: who is streaming, laid out per the chosen layout, plus the stream controls. */
export function StreamStage({
  party: p,
  onLeave,
  gate,
  transport,
  volume,
  showMetrics,
  mainVideoRef,
  previewRef,
  nativeSlotRef,
}: Props) {
  const t = useT().party;
  const nick = (id: string) => p.peers[id]?.nick ?? '';
  const selfId = p.self?.id;
  const occupied = p.slots.main.filter((id): id is string => id != null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const readPayload = (e: DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData(MIME) || e.dataTransfer.getData('text/plain');
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const onDragStart = useCallback(
    (e: DragEvent, payload: DragPayload) => {
      e.dataTransfer.setData(MIME, JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const allowDrop = (e: DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(key);
  };

  const clearDrag = () => setDragOver(null);

  const dropOnMain = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    clearDrag();
    const payload = readPayload(e);
    if (!payload) return;
    if (p.layout === 'stage') {
      if (payload.from === 'strip') p.setFocus(payload.id);
      return;
    }
    if (payload.from === 'main') p.moveGridSlot(payload.index, toIndex);
    else p.dropIntoGrid(payload.id, toIndex);
  };

  const dropOnStrip = (e: DragEvent) => {
    e.preventDefault();
    clearDrag();
    const payload = readPayload(e);
    if (!payload || p.layout !== 'grid') return;
    if (payload.from === 'main') p.hideFromGrid(payload.id);
  };

  const tile = (
    id: string,
    opts: {
      small: boolean;
      index: number;
      from: 'main' | 'strip';
      videoRef?: RefObject<HTMLVideoElement | null>;
    },
  ) => (
    <div
      key={`${opts.from}-${id}-${opts.index}`}
      draggable
      onDragStart={(e) =>
        onDragStart(e, { id, from: opts.from, index: opts.index })
      }
      onDragEnd={clearDrag}
      onDragOver={
        opts.from === 'main'
          ? (e) => allowDrop(e, `main-${opts.index}`)
          : undefined
      }
      onDragLeave={clearDrag}
      onDrop={
        opts.from === 'main' ? (e) => dropOnMain(e, opts.index) : undefined
      }
      className={cx(
        'min-h-0 min-w-0',
        dragOver === `main-${opts.index}` && 'ring-2 ring-accent rounded-lg',
        'opacity-100 [[data-dragging]_&]:opacity-60',
      )}
    >
      <StreamTile
        nick={nick(id)}
        self={id === selfId}
        owner={id === p.ownerId}
        small={opts.small}
        stream={
          id === selfId
            ? (p.localStream ?? p.source?.stream ?? null)
            : (p.remoteStreams[id] ?? null)
        }
        state={p.links[id]}
        volume={volume}
        metrics={p.metrics[id]}
        showMetrics={showMetrics}
        videoRef={opts.videoRef}
        surfaceRef={id === selfId ? nativeSlotRef : undefined}
        onFocus={
          p.layout === 'stage' && opts.from === 'strip'
            ? () => p.setFocus(id)
            : p.layout === 'grid' && opts.from === 'strip'
              ? () => p.showInGrid(id)
              : undefined
        }
        focusLabel={
          p.layout === 'grid' && opts.from === 'strip'
            ? t.stage.showInGrid
            : undefined
        }
      />
    </div>
  );

  const emptyCell = (index: number) => (
    <div
      key={`empty-${index}`}
      role="button"
      tabIndex={0}
      aria-label={t.stage.emptyCell}
      onDragOver={(e) => allowDrop(e, `main-${index}`)}
      onDragLeave={clearDrag}
      onDrop={(e) => dropOnMain(e, index)}
      className={cx(
        'flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-line-soft bg-[#0e141b] text-[12px] text-[#6f7f90]',
        dragOver === `main-${index}` && 'border-accent text-accent ring-2 ring-accent',
      )}
    >
      {t.stage.emptyCell}
    </div>
  );

  const live = p.phase === 'live';
  const canRequest =
    live && !p.isOwner && !p.canStream && !p.self?.streamBlocked;
  const statusText =
    p.phase === 'live'
      ? t.status[p.signalStatus]
      : p.phase === 'connecting'
        ? t.status.connecting
        : null;
  const firstMainId = occupied[0];

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#2a3542] bg-[#0b1016] immersive:fixed immersive:inset-0 immersive:z-9 immersive:rounded-none immersive:border-0">
      <header className="flex flex-none flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2 immersive:hidden">
        <Tv size={17} className="text-[#9aabbb]" />
        <h1 className="min-w-0 truncate text-[14px] font-semibold text-[#d4dee8]">
          {p.access ? t.title(p.access.room.owner) : p.nickname}
        </h1>
        {statusText && (
          <span
            className={cx(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              p.signalStatus === 'open'
                ? 'bg-[#a8f0cb17] text-accent'
                : 'bg-[#ffffff0d] text-[#a5b2c3]',
            )}
          >
            {statusText}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {live && (
            <LayoutPicker
              value={p.layout}
              onChange={p.setLayout}
              splitOrientation={p.splitOrientation}
              onSplitOrientation={p.setSplitOrientation}
              showSplitToggle={p.layout === 'grid' && occupied.length === 2}
            />
          )}
          {canRequest && (
            <RequestStreamButton
              requested={p.requested}
              onRequest={p.requestStream}
            />
          )}
          {onLeave && (
            <IconButton label={t.leave} onClick={onLeave}>
              <LogOut size={18} />
            </IconButton>
          )}
        </div>
      </header>
      {p.stale && p.isOwner && (
        <div className="flex-none px-3 pt-3">
          <Alert tone="info">{t.stream.resume}</Alert>
        </div>
      )}
      <div className="flex min-h-[320px] flex-1 flex-col gap-2 p-2 immersive:min-h-0 immersive:p-0">
        {previewRef && (
          <div
            ref={previewRef}
            className="relative min-h-[200px] flex-1 bg-black"
          />
        )}
        {gate ? (
          <div className={previewRef ? 'flex-none overflow-auto' : 'contents'}>
            {gate}
          </div>
        ) : occupied.length || p.slots.main.some((x) => x == null) ? (
          <>
            <div
              className={cx(
                'grid min-h-0 flex-1 gap-2',
                mainGridClass(
                  occupied.length,
                  p.layout,
                  p.splitOrientation,
                ),
              )}
              onDragOver={
                p.layout === 'stage'
                  ? (e) => allowDrop(e, 'stage-main')
                  : undefined
              }
              onDrop={
                p.layout === 'stage'
                  ? (e) => {
                      e.preventDefault();
                      clearDrag();
                      const payload = readPayload(e);
                      if (payload?.from === 'strip') p.setFocus(payload.id);
                    }
                  : undefined
              }
            >
              {p.slots.main.map((id, index) =>
                id == null
                  ? emptyCell(index)
                  : tile(id, {
                      small: false,
                      index,
                      from: 'main',
                      videoRef:
                        id === firstMainId && p.layout === 'stage'
                          ? mainVideoRef
                          : id === firstMainId
                            ? mainVideoRef
                            : undefined,
                    }),
              )}
            </div>
            {p.slots.strip.length > 0 && (
              <div
                className={cx(
                  'grid flex-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 rounded-lg p-0.5',
                  dragOver === 'strip' && 'ring-2 ring-accent',
                )}
                onDragOver={(e) => {
                  if (p.layout === 'grid') allowDrop(e, 'strip');
                }}
                onDragLeave={clearDrag}
                onDrop={dropOnStrip}
              >
                {p.slots.strip.map((id, index) =>
                  tile(id, { small: true, index, from: 'strip' }),
                )}
              </div>
            )}
            {p.layout === 'grid' && p.slots.hidden.length > 0 && (
              <p className="flex-none text-center text-[12px] text-[#6f7f90]">
                {t.stage.hidden(p.slots.hidden.length)}
              </p>
            )}
          </>
        ) : previewRef ? null : (
          <div className="flex flex-1 items-center justify-center text-[14px] text-[#8494a5]">
            {p.isOwner ? t.stage.emptyOwner : t.stage.empty}
          </div>
        )}
      </div>
      {!gate && transport}
    </section>
  );
}
