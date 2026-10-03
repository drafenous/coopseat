import {useEffect,useRef,type ReactNode} from 'react';
import {Ellipsis} from 'lucide-react';
import {IconButton} from '../atoms';
import './DropdownMenu.css';

type Props={label:string;open:boolean;onOpenChange(open:boolean):void;children:ReactNode};

export function DropdownMenu({label,open,onOpenChange,children}:Props){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;
  const click=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))onOpenChange(false);};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onOpenChange(false);};
  document.addEventListener('mousedown',click);window.addEventListener('keydown',key);
  return()=>{document.removeEventListener('mousedown',click);window.removeEventListener('keydown',key);};
 },[open,onOpenChange]);
 return <div className="menu-wrap" ref={ref}>
  <IconButton className="menu-button" label={label} selected={open} aria-haspopup="menu" aria-expanded={open} onClick={()=>onOpenChange(!open)}><Ellipsis size={18}/></IconButton>
  {open&&<div className="menu" role="menu" onClick={e=>{if((e.target as HTMLElement).closest('button'))onOpenChange(false);}}>{children}</div>}
 </div>;
}
