import {useId} from 'react';
import {ChevronUp} from 'lucide-react';
import {CINEMA_DELAYS} from '../../lib/settings';
import {Select} from '../atoms';
import {DropdownMenu} from './DropdownMenu';
import {useT} from '../../i18n';

type Props={auto:boolean;delay:number;open:boolean;onOpenChange(open:boolean):void;onAuto(auto:boolean):void;onDelay(delay:number):void};

const NEVER=0;

export function CinemaMenu({auto,delay,open,onOpenChange,onAuto,onDelay}:Props){
 const t=useT().cinemaMenu,id=useId();
 const choose=(v:number)=>{if(v===NEVER){onAuto(false);return;}onDelay(v);onAuto(true);};
 return <DropdownMenu up dialog label={t.label} open={open} onOpenChange={onOpenChange} icon={<ChevronUp size={15}/>} triggerClassName="-ml-1.5 px-[3px] py-2" menuClassName="w-[300px]">
  <div className="flex flex-col gap-2 p-2">
   <label id={`${id}-label`} htmlFor={id} className="text-[13px] text-[#c9d4de]">{t.enterIn}</label>
   <Select id={id} labelledBy={`${id}-label`} value={auto?delay:NEVER} onChange={choose} options={[...CINEMA_DELAYS.map(d=>({value:d,label:t.seconds(d)})),{value:NEVER,label:t.never}]}/>
   <p className="text-[12px] leading-[1.45] text-[#8494a5]">{t.hint}</p>
  </div>
 </DropdownMenu>;
}
