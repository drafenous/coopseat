import {useEffect,type FormEvent,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {cx} from '../../lib/cx';
import {IconButton} from '../atoms';
import './Modal.css';

type Props={labelledBy:string;small?:boolean;closeButton?:boolean;onClose():void;onSubmit?(e:FormEvent<HTMLFormElement>):void;children:ReactNode};

export function Modal({labelledBy,small,closeButton,onClose,onSubmit,children}:Props){
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 const dialog={className:cx('modal',small&&'small'),role:'dialog','aria-modal':true,'aria-labelledby':labelledBy};
 const body=<>{closeButton&&<IconButton className="modal-close" label="Fechar" onClick={onClose}><X size={18}/></IconButton>}{children}</>;
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  {onSubmit?<form {...dialog} onSubmit={onSubmit}>{body}</form>:<div {...dialog}>{body}</div>}
 </div>;
}
