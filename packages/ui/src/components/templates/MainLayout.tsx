import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type PanelSide = 'left' | 'right';

/** With both open: stage | chat | settings. Collapsed panels stay as a thin rail. */
type Props = {
  immersive: boolean;
  /** Cinema chrome shown as overlays over the video. */
  chromeOverlay?: boolean;
  panelSide: PanelSide;
  panelCollapsed: boolean;
  roomCollapsed?: boolean;
  header: ReactNode;
  viewer: ReactNode;
  panelTop?: ReactNode;
  panel?: ReactNode;
  roomPanel?: ReactNode;
  toasts: ReactNode;
  metrics: ReactNode;
  footer: ReactNode;
  modals: ReactNode;
};

const workspaceBase =
  'min-h-[440px] flex-[1_1_0] grid-rows-[minmax(0,1fr)] items-stretch gap-[clamp(16px,1.6vw,28px)] max-[750px]:min-h-0 max-[750px]:flex-none max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto]';

/** Static class names so Tailwind can emit every grid template. */
const columns = {
  right: 'grid-cols-[minmax(0,1fr)_clamp(300px,21vw,400px)] max-[1000px]:grid-cols-[minmax(0,1fr)_290px]',
  rightRail: 'grid-cols-[minmax(0,1fr)_44px]',
  left: 'grid-cols-[clamp(300px,21vw,400px)_minmax(0,1fr)] max-[1000px]:grid-cols-[290px_minmax(0,1fr)] [&>[data-panel]]:order-first [&>[data-room]]:order-first max-[750px]:[&>[data-panel]]:order-none max-[750px]:[&>[data-room]]:order-none',
  leftRail: 'grid-cols-[44px_minmax(0,1fr)]',
  collapsed: 'grid-cols-[minmax(0,1fr)]',
  // stage | chat | settings
  both: 'grid-cols-[minmax(0,1fr)_clamp(280px,20vw,380px)_clamp(260px,18vw,360px)]',
  bothRoomRail: 'grid-cols-[minmax(0,1fr)_44px_clamp(260px,18vw,360px)]',
  bothPanelRail: 'grid-cols-[minmax(0,1fr)_clamp(280px,20vw,380px)_44px]',
  bothRails: 'grid-cols-[minmax(0,1fr)_44px_44px]',
  bothNarrow:
    'max-[1200px]:grid-cols-[minmax(0,1fr)_auto] max-[1200px]:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto] max-[750px]:[&>*:first-child]:row-span-1',
};

/** Cinema overlay: flush to the edges, square corners, opaque. */
const overlayShell =
  'fixed top-[68px] bottom-14 z-20 flex max-h-[calc(100vh-68px-3.5rem)] overflow-hidden [&>aside]:rounded-none! [&>aside]:border-y-0! [&>button]:rounded-none!';

function bothColumns(roomCollapsed: boolean, panelCollapsed: boolean) {
  if (roomCollapsed && panelCollapsed) return columns.bothRails;
  if (roomCollapsed) return columns.bothRoomRail;
  if (panelCollapsed) return columns.bothPanelRail;
  return columns.both;
}

export function MainLayout({
  immersive,
  chromeOverlay = false,
  panelSide,
  panelCollapsed,
  roomCollapsed = false,
  header,
  viewer,
  panelTop,
  panel,
  roomPanel,
  toasts,
  metrics,
  footer,
  modals,
}: Props) {
  const showPanel = Boolean(panel),
    showRoom = Boolean(roomPanel);
  const grid =
    showPanel && showRoom
      ? cx(bothColumns(roomCollapsed, panelCollapsed), columns.bothNarrow)
      : showRoom
        ? roomCollapsed
          ? columns.rightRail
          : columns.right
        : showPanel
          ? panelCollapsed
            ? panelSide === 'left'
              ? columns.leftRail
              : columns.rightRail
            : columns[panelSide]
          : columns.collapsed;
  const panelWidth = panelCollapsed
    ? 'w-11'
    : 'w-[clamp(260px,18vw,360px)]';
  const roomWidth = roomCollapsed
    ? 'w-11'
    : 'w-[clamp(280px,20vw,380px)]';
  // With both panels, stack them on the right (chat left of settings).
  const panelSideClass =
    showRoom || panelSide === 'right' ? 'right-0' : 'left-0';
  const roomSideClass = showPanel
    ? panelCollapsed
      ? 'right-11'
      : 'right-[clamp(260px,18vw,360px)]'
    : panelSideClass;
  // Edge borders only toward the video, not the screen edge.
  const panelEdgeBorder =
    showRoom || panelSide === 'right'
      ? '[&>aside]:border-r-0! [&>aside]:border-l! [&>button]:border-r-0! [&>button]:border-l!'
      : '[&>aside]:border-l-0! [&>aside]:border-r! [&>button]:border-l-0! [&>button]:border-r!';
  const roomEdgeBorder = showPanel
    ? '[&>aside]:border-r-0! [&>aside]:border-l! [&>button]:border-r-0! [&>button]:border-l!'
    : panelEdgeBorder;
  const hideChrome = immersive && !chromeOverlay;
  return (
    <div
      className="flex min-h-screen flex-col"
      data-immersive={immersive || undefined}
      data-cinema-chrome={chromeOverlay || undefined}
    >
      {header}
      <main
        className={cx(
          'flex w-full flex-1 flex-col',
          immersive
            ? 'p-0'
            : 'px-[clamp(16px,2.5vw,48px)] pt-[clamp(14px,2vh,24px)]',
        )}
      >
        <div
          className={cx(
            workspaceBase,
            immersive ? 'block' : cx('grid', grid),
          )}
        >
          {viewer}
          {showRoom && (
            <div
              data-room
              data-overlay={chromeOverlay || undefined}
              className={cx(
                'min-h-0 flex-col',
                hideChrome && 'hidden',
                chromeOverlay
                  ? cx(overlayShell, roomWidth, roomSideClass, roomEdgeBorder)
                  : 'flex',
              )}
            >
              {roomPanel}
            </div>
          )}
          {showPanel && (
            <div
              data-panel
              data-overlay={chromeOverlay || undefined}
              className={cx(
                'min-h-0 flex-col',
                hideChrome && 'hidden',
                chromeOverlay
                  ? cx(
                      overlayShell,
                      panelWidth,
                      panelSideClass,
                      panelEdgeBorder,
                      !panelCollapsed && 'gap-0',
                    )
                  : 'flex gap-3',
              )}
            >
              {!panelCollapsed && panelTop}
              {panel}
            </div>
          )}
        </div>
        {toasts}
        {metrics}
        {footer}
      </main>
      {modals}
    </div>
  );
}
