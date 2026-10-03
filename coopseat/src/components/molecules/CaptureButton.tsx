import {Play,Power} from 'lucide-react';
import {Button} from '../atoms';

type Props={running:boolean;busy:boolean;canStart:boolean;hero?:boolean;onStart():void;onStop():void};

export function CaptureButton({running,busy,canStart,hero,onStart,onStop}:Props){
 const active=running||busy;
 return <Button hero={hero} stop={active} disabled={!active&&!canStart} onClick={active?onStop:onStart}>{active?<Power size={18}/>:<Play size={18}/>} {running?'Parar captura':busy?'Cancelar':'Iniciar captura'}</Button>;
}
