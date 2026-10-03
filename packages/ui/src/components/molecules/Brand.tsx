import {Armchair} from 'lucide-react';
import './Brand.css';

export function Brand({href='#',version='0.1'}:{href?:string;version?:string|null}){
 return <a className="brand" href={href}><span className="brand-icon"><Armchair size={22}/></span>coop<span className="brand-seat">seat</span>{version&&<span className="version">{version}</span>}</a>;
}
