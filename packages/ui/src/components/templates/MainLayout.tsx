import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type PanelSide = 'left' | 'right';

/** With both open: stage | chat | settings. Collapsed panels stay as a thin rail. */
type Props = {
  immersive: boolean;
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

const workspace =
  'grid min-h-[440px] flex-[1_1_0] grid-rows-[minmax(0,1fr)] items-stretch gap-[clamp(16px,1.6vw,28px)] immersive:block max-[750px]:min-h-0 max-[750px]:flex-none max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto]';

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
    'max-[1200px]:grid-cols-[minmax(0,1fr)_auto] max-[1200px]:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] max-[1200px]:[&>*:first-child]:row-span-2 max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto] max-[750px]:[&>*:first-child]:row-span-1',
};

function bothColumns(roomCollapsed: boolean, panelCollapsed: boolean) {
  if (roomCollapsed && panelCollapsed) return columns.bothRails;
  if (roomCollapsed) return columns.bothRoomRail;
  if (panelCollapsed) return columns.bothPanelRail;
  return columns.both;
}

export function MainLayout({
  immersive,
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
  return (
    <div
      className="flex min-h-screen flex-col"
      data-immersive={immersive || undefined}
    >
      {header}
      <main className="flex w-full flex-1 flex-col px-[clamp(16px,2.5vw,48px)] pt-[clamp(14px,2vh,24px)] immersive:p-0">
        <div className={cx(workspace, grid)}>
          {viewer}
          {showRoom && (
            <div data-room className="flex min-h-0 flex-col immersive:hidden">
              {roomPanel}
            </div>
          )}
          {showPanel && (
            <div
              data-panel
              className="flex min-h-0 flex-col gap-3 immersive:hidden"
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
