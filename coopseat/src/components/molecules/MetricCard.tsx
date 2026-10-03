import type {ReactNode} from 'react';

export function MetricCard({label,value,detail}:{label:string;value:ReactNode;detail:ReactNode}){
 return <div><span>{label}</span><strong>{value}<small>{detail}</small></strong></div>;
}
