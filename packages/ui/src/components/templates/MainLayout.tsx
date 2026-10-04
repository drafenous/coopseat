import type {ReactNode} from 'react';
import {cx} from '../../lib/cx';

export type PanelSide='left'|'right';

/** `roomPanel` (party) sits opposite the settings panel, or on `panelSide` when the settings panel is hidden. */
type Props={immersive:boolean;panelSide:PanelSide;panelCollapsed:boolean;header:ReactNode;viewer:ReactNode;panelTop?:ReactNode;panel?:ReactNode;roomPanel?:ReactNode;toasts:ReactNode;metrics:ReactNode;footer:ReactNode;modals:ReactNode};

const workspace='grid min-h-[440px] flex-[1_1_0] grid-rows-[minmax(0,1fr)] items-stretch gap-[clamp(16px,1.6vw,28px)] immersive:block max-[750px]:min-h-0 max-[750px]:flex-none max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto]';
const columns={
 right:'grid-cols-[minmax(0,1fr)_clamp(300px,21vw,400px)] max-[1000px]:grid-cols-[minmax(0,1fr)_290px]',
 left:'grid-cols-[clamp(300px,21vw,400px)_minmax(0,1fr)] max-[1000px]:grid-cols-[290px_minmax(0,1fr)] [&>[data-panel]]:order-first [&>[data-room]]:order-first max-[750px]:[&>[data-panel]]:order-none max-[750px]:[&>[data-room]]:order-none',
 collapsed:'grid-cols-[minmax(0,1fr)]',
 // Both panels: three columns on wide screens; below 1200px the settings panel drops under the stage.
 bothLeft:'grid-cols-[clamp(260px,18vw,360px)_minmax(0,1fr)_clamp(280px,20vw,380px)] [&>[data-panel]]:order-first',
 bothRight:'grid-cols-[clamp(280px,20vw,380px)_minmax(0,1fr)_clamp(260px,18vw,360px)] [&>[data-room]]:order-first',
 bothNarrow:'max-[1200px]:grid-cols-[minmax(0,1fr)_300px] max-[1200px]:[&>[data-room]]:order-none max-[1200px]:[&>[data-panel]]:order-last max-[1200px]:[&>[data-panel]]:col-span-2 max-[750px]:grid-cols-1 max-[750px]:[&>[data-panel]]:col-span-1',
};

export function MainLayout({immersive,panelSide,panelCollapsed,header,viewer,panelTop,panel,roomPanel,toasts,metrics,footer,modals}:Props){
 const showPanel=Boolean(panel)&&!panelCollapsed,showRoom=Boolean(roomPanel);
 const grid=showPanel&&showRoom?cx(panelSide==='left'?columns.bothLeft:columns.bothRight,columns.bothNarrow)
  :showPanel||showRoom?columns[panelSide]:columns.collapsed;
 return <div className="flex min-h-screen flex-col" data-immersive={immersive||undefined}>
  {header}
  <main className="flex w-full flex-1 flex-col px-[clamp(16px,2.5vw,48px)] pt-[clamp(14px,2vh,24px)] immersive:p-0">
   <div className={cx(workspace,grid)}>
    {viewer}
    {showPanel&&<div data-panel className="flex min-h-0 flex-col gap-3 immersive:hidden">{panelTop}{panel}</div>}
    {showRoom&&<div data-room className="flex min-h-0 flex-col immersive:hidden">{roomPanel}</div>}
   </div>
   {toasts}
   {metrics}
   {footer}
  </main>
  {modals}
 </div>;
}
