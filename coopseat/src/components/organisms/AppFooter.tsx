import {Check,Radio} from 'lucide-react';
import {DonateCallout} from '../molecules';
import './AppFooter.css';

export function AppFooter({onDonate}:{onDonate():void}){
 return <footer>
  <span><Radio size={13}/> Preview local de vídeo e áudio</span>
  <DonateCallout onDonate={onDonate}/>
  <span><Check size={13}/> Nenhum dado enviado</span>
 </footer>;
}
