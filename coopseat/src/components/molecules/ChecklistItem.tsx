import type {ReactNode} from 'react';
import {CircleAlert,CircleCheck,CircleDashed} from 'lucide-react';
import './ChecklistItem.css';

type Status='ok'|'warn'|'neutral';
const icons={ok:CircleCheck,warn:CircleAlert,neutral:CircleDashed};

export function ChecklistItem({status,title,children}:{status:Status;title:string;children:ReactNode}){
 const Icon=icons[status];
 return <li className={status}><Icon size={17}/><span><b>{title}</b>{children}</span></li>;
}
