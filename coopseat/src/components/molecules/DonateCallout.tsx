import {Heart} from 'lucide-react';
import './DonateCallout.css';

export function DonateCallout({onDonate}:{onDonate():void}){
 return <span className="donate">Ajude a manter esse app gratuito<button type="button" onClick={onDonate}><Heart size={13} fill="currentColor"/> Faça uma doação</button></span>;
}
