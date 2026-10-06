import type { ReactNode, RefObject } from 'react';
import { LogOut, MessageSquare, PanelRightOpen, Tv } from 'lucide-react';
import type { Party } from '../../hooks/useParty';
import { cx } from '../../lib/cx';
import { IconButton } from '../atoms';
import {
  Alert,
  LayoutPicker,
  RequestStreamButton,
  StreamButton,
  StreamTile,
} from '../molecules';
import { useT } from '../../i18n';

type Props = {
  party: Party;
  panelOpen: boolean;
  onOpenPanel(): void;
  /** Starts streaming the source chosen in the side panel. */
  onStartStream(): void;
  /** Why the panel's choice can't be streamed yet, if it can't. */
  startBlocked?: string;
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

const mainGrid = (n: number, layout: string) =>
  layout === 'split'
    ? 'grid-cols-2 max-[750px]:grid-cols-1'
    : layout !== 'grid' || n <= 1
      ? 'grid-cols-1'
      : n <= 4
        ? 'grid-cols-2'
        : n <= 9
          ? 'grid-cols-3'
          : 'grid-cols-4';

/** The stage: who is streaming, laid out per the chosen layout, plus the stream controls. */
export function StreamStage({
  party: p,
  panelOpen,
  onOpenPanel,
  onStartStream,
  startBlocked,
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
  const tile = (id: string, small: boolean) => (
    <StreamTile
      key={id}
      nick={nick(id)}
      self={id === selfId}
      owner={id === p.ownerId}
      small={small}
      stream={
        id === selfId
          ? (p.source?.stream ?? null)
          : (p.remoteStreams[id] ?? null)
      }
      state={p.links[id]}
      volume={volume}
      metrics={p.metrics[id]}
      showMetrics={showMetrics}
      videoRef={!small && id === p.slots.main[0] ? mainVideoRef : undefined}
      surfaceRef={id === selfId ? nativeSlotRef : undefined}
      onFocus={
        p.slots.main[0] !== id || p.layout === 'grid'
          ? () => {
              p.setFocus(id);
              if (p.layout === 'grid') p.setLayout('stage');
            }
          : undefined
      }
    />
  );
  const stop = () => {
    if (!p.isOwner || confirm(t.stream.confirmStop)) void p.stopStreaming();
  };
  const live = p.phase === 'live';
  const canRequest =
    live && !p.isOwner && !p.canStream && !p.self?.streamBlocked;
  const showStream = p.isOwner || (live && p.canStream);
  const statusText =
    p.phase === 'live'
      ? t.status[p.signalStatus]
      : p.phase === 'connecting'
        ? t.status.connecting
        : null;

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
          {live && <LayoutPicker value={p.layout} onChange={p.setLayout} />}
          {canRequest && (
            <RequestStreamButton
              requested={p.requested}
              disabled={!p.ownerLive}
              title={p.ownerLive ? undefined : t.stream.ownerFirst}
              onRequest={p.requestStream}
            />
          )}
          {showStream && (
            <StreamButton
              streaming={Boolean(p.source)}
              busy={p.busy}
              disabled={(!p.isOwner && !p.ownerLive) || Boolean(startBlocked)}
              title={
                !p.isOwner && !p.ownerLive ? t.stream.ownerFirst : startBlocked
              }
              onStart={onStartStream}
              onStop={stop}
            />
          )}
          {!panelOpen && (
            <IconButton label={t.stage.openPanel} onClick={onOpenPanel}>
              {p.chat.unread > 0 ? (
                <MessageSquare size={18} className="text-accent" />
              ) : (
                <PanelRightOpen size={18} />
              )}
            </IconButton>
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
        ) : p.slots.main.length ? (
          <>
            <div
              className={cx(
                'grid min-h-0 flex-1 gap-2',
                mainGrid(p.slots.main.length, p.layout),
              )}
            >
              {p.slots.main.map((id) => tile(id, false))}
            </div>
            {p.slots.strip.length > 0 && (
              <div className="grid flex-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                {p.slots.strip.map((id) => tile(id, true))}
              </div>
            )}
            {p.slots.hidden.length > 0 && (
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
