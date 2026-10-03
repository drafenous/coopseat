import type {ReactNode} from 'react';
import './StepItem.css';

export function StepItem({step,title,children}:{step:number;title:string;children:ReactNode}){
 return <li><span>{step}</span><div><b>{title}</b>{children}</div></li>;
}
