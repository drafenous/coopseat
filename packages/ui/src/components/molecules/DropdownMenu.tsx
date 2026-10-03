import {useEffect,useRef,type ReactNode} from 'react';
import {Ellipsis} from 'lucide-react';
import {IconButton} from '../atoms';

type Props={label:string;open:boolean;onOpenChange(open:boolean):void;icon?:ReactNode;triggerClassName?:string;menuClassName?:string;children:ReactNode};

export function DropdownMenu({label,open,onOpenChange,icon=<Ellipsis size={18}/>,triggerClassName='size-10 border border-[#304050] min-[1800px]:size-11',menuClassName='min-w-[250px]',children}:Props){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;
  const click=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))onOpenChange(false);};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onOpenChange(false);};
  document.addEventListener('mousedown',click);window.addEventListener('keydown',key);
  return()=>{document.removeEventListener('mousedown',click);window.removeEventListener('keydown',key);};
 },[open,onOpenChange]);
 return <div className="relative" ref={ref}>
  <IconButton className={triggerClassName} label={label} selected={open} aria-haspopup="menu" aria-expanded={open} onClick={()=>onOpenChange(!open)}>{icon}</IconButton>
  {open&&<div className={`absolute top-[calc(100%+6px)] right-0 z-30 flex ${menuClassName} flex-col rounded-[10px] border border-line bg-[#172230] p-1.5 shadow-[0_14px_36px_#00000090]`} role="menu" onClick={e=>{if((e.target as HTMLElement).closest('button'))onOpenChange(false);}}>{children}</div>}
 </div>;
}
