import type {ReactNode} from 'react';

export function MetricCard({label,value,detail}:{label:string;value:ReactNode;detail:ReactNode}){
 return <div className="border-r border-[#2a3542] px-[22px] last:border-0 max-[1000px]:px-3.5 max-[750px]:px-3">
  <span className="text-[11px] font-semibold tracking-[1.1px] text-[#8d9fb1]">{label}</span>
  <strong className="mt-2 block text-[22px] font-medium tracking-[-0.4px] text-[#e1eaf2] tabular-nums">{value}<small className="mt-1 block text-[12px] font-normal tracking-normal text-[#8494a5]">{detail}</small></strong>
 </div>;
}
