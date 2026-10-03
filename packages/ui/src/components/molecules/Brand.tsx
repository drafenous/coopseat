import {Armchair} from 'lucide-react';
import './Brand.css';

export function Brand(){
 return <a className="brand" href="#"><span className="brand-icon"><Armchair size={22}/></span>coop<span className="brand-seat">seat</span><span className="version">0.1</span></a>;
}
