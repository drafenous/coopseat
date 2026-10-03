import type {ReactNode} from 'react';
import {cx} from '../../lib/cx';

export type PanelSide='left'|'right';

type Props={immersive:boolean;panelSide:PanelSide;panelCollapsed:boolean;header:ReactNode;viewer:ReactNode;panelTop?:ReactNode;panel:ReactNode;toasts:ReactNode;metrics:ReactNode;footer:ReactNode;modals:ReactNode};

const workspace='grid min-h-[440px] flex-[1_1_0] grid-rows-[minmax(0,1fr)] items-stretch gap-[clamp(16px,1.6vw,28px)] immersive:block max-[750px]:min-h-0 max-[750px]:flex-none max-[750px]:grid-cols-1 max-[750px]:grid-rows-[auto]';
const columns={
 right:'grid-cols-[minmax(0,1fr)_clamp(300px,21vw,400px)] max-[1000px]:grid-cols-[minmax(0,1fr)_290px]',
 left:'grid-cols-[clamp(300px,21vw,400px)_minmax(0,1fr)] max-[1000px]:grid-cols-[290px_minmax(0,1fr)] [&>[data-panel]]:order-first max-[750px]:[&>[data-panel]]:order-none',
 collapsed:'grid-cols-[minmax(0,1fr)]',
};

export function MainLayout({immersive,panelSide,panelCollapsed,header,viewer,panelTop,panel,toasts,metrics,footer,modals}:Props){
 return <div className="flex min-h-screen flex-col" data-immersive={immersive||undefined}>
  {header}
  <main className="flex w-full flex-1 flex-col px-[clamp(16px,2.5vw,48px)] pt-[clamp(14px,2vh,24px)] immersive:p-0">
   <div className={cx(workspace,columns[panelCollapsed?'collapsed':panelSide])}>{viewer}{!panelCollapsed&&<div data-panel className="flex min-h-0 flex-col gap-3 immersive:hidden">{panelTop}{panel}</div>}</div>
   {toasts}
   {metrics}
   {footer}
  </main>
  {modals}
 </div>;
}
