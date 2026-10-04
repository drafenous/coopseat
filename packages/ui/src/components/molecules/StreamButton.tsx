import {Radio,Square} from 'lucide-react';
import {Button} from '../atoms';
import {useT} from '../../i18n';

type Props={streaming:boolean;busy:boolean;disabled?:boolean;title?:string;onStart():void;onStop():void};

/** Party stream on/off. Separate from the capture button: capturing doesn't mean sending. */
export function StreamButton({streaming,busy,disabled,title,onStart,onStop}:Props){
 const t=useT().party.stream;
 return <Button inline stop={streaming} disabled={busy||(!streaming&&disabled)} title={title} onClick={streaming?onStop:onStart}>
  {streaming?<Square size={16}/>:<Radio size={17}/>} {busy?t.starting:streaming?t.stop:t.start}
 </Button>;
}
