import type {ReactNode} from 'react';
import {cx} from '../../lib/cx';
import './MainLayout.css';

type Props={immersive:boolean;header:ReactNode;viewer:ReactNode;panel:ReactNode;toasts:ReactNode;metrics:ReactNode;footer:ReactNode;modals:ReactNode};

export function MainLayout({immersive,header,viewer,panel,toasts,metrics,footer,modals}:Props){
 return <div className={cx('app',immersive&&'immersive')}>
  {header}
  <main>
   <div className="workspace">{viewer}{panel}</div>
   {toasts}
   {metrics}
   {footer}
  </main>
  {modals}
 </div>;
}
