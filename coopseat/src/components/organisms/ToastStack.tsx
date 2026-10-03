import {CircleAlert,Clapperboard,Info} from 'lucide-react';
import {COUNTDOWN_FROM,type Countdown} from '../../lib/settings';
import {Toast} from '../molecules';
import './ToastStack.css';

type Props={countdown:Countdown;onEnterCinema():void;onDisableAutoCinema():void;error:string;onCloseError():void;notice:string;onCloseNotice():void};

export function ToastStack({countdown,onEnterCinema,onDisableAutoCinema,error,onCloseError,notice,onCloseNotice}:Props){
 return <div className="toasts">
  {countdown!==null&&<Toast variant="countdown" role="status" aria-live="polite" icon={<Clapperboard size={16}/>}>
   {countdown==='paused'?<>Modo cinema em pausa<small>Fique parado para retomar a contagem</small></>
    :<>Entrando no modo cinema em {Array.from({length:COUNTDOWN_FROM-countdown+1},(_,i)=><b key={i}>{COUNTDOWN_FROM-i}... </b>)}<small>Mexa o mouse para pausar</small></>}
   <span className="toast-actions"><button type="button" onClick={onEnterCinema}>Entrar agora</button><button type="button" onClick={onDisableAutoCinema}>Desativar automático</button></span>
  </Toast>}
  {error&&<Toast variant="error" role="alert" icon={<CircleAlert size={16}/>} onClose={onCloseError}>{error}</Toast>}
  {notice&&<Toast key={notice} role="status" icon={<Info size={16}/>} onClose={onCloseNotice}>{notice}</Toast>}
 </div>;
}
