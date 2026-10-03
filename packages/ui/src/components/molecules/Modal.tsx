import {useEffect,type FormEvent,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {cx} from '../../lib/cx';
import {IconButton} from '../atoms';
import {useT} from '../../i18n';

type Props={labelledBy:string;small?:boolean;closeButton?:boolean;onClose():void;onSubmit?(e:FormEvent<HTMLFormElement>):void;children:ReactNode};

/** Title styles apply to a direct `h2` child; nested titles style themselves with `modalTitleClass`. */
export const modalTitleClass='text-[20px] font-semibold tracking-[-0.3px]';
const title='[&>h2]:text-[20px] [&>h2]:font-semibold [&>h2]:tracking-[-0.3px]';

export function Modal({labelledBy,small,closeButton,onClose,onSubmit,children}:Props){
 const t=useT();
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 const dialog={
  className:cx('relative max-h-[calc(100vh-40px)] overflow-y-auto rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_60px_#000000a0] animate-modal-in motion-reduce:animate-none',title,
   small?'w-[min(420px,100%)] [&>h2]:mb-2 [&>p]:mb-4':'w-[min(620px,100%)] [&>h2]:mb-[18px]'),
  role:'dialog','aria-modal':true,'aria-labelledby':labelledBy,
 };
 const body=<>{closeButton&&<IconButton className="absolute top-3.5 right-3.5" label={t.common.close} onClick={onClose}><X size={18}/></IconButton>}{children}</>;
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070bcc] p-5 backdrop-blur-[3px] animate-fade-in motion-reduce:animate-none" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  {onSubmit?<form {...dialog} onSubmit={onSubmit}>{body}</form>:<div {...dialog}>{body}</div>}
 </div>;
}

/** Right-aligned action row at the bottom of a modal; pass `inline` to primary buttons inside it. */
export function ModalActions({children}:{children:ReactNode}){
 return <div className="mt-5 flex justify-end gap-2.5">{children}</div>;
}
