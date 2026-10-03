import './Divider.css';

export function Divider({label}:{label?:string}){
 return label?<div className="divider labeled">{label}</div>:<div className="divider"/>;
}
