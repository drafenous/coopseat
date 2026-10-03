import type {ReactNode} from 'react';

export function StepItem({step,title,children}:{step:number;title:string;children:ReactNode}){
 return <li className="flex items-start gap-3.5">
  <span className="grid size-7 flex-none place-items-center rounded-full bg-accent text-[13px] font-bold text-accent-ink">{step}</span>
  <div className="text-[14px] leading-[1.55] text-[#a9b6c4]"><b className="mb-0.5 block font-semibold text-[#e8eef4]">{title}</b>{children}</div>
 </li>;
}
