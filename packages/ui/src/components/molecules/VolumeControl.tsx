import {Volume2,VolumeX} from 'lucide-react';
import {IconButton} from '../atoms';
import './VolumeControl.css';

export function VolumeControl({volume,onChange}:{volume:number;onChange(volume:number):void}){
 return <div className="volume">
  <IconButton label={volume?'Silenciar':'Ativar som'} title="Silenciar · M" onClick={()=>onChange(volume?0:.75)}>{volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</IconButton>
  <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>onChange(Number(e.target.value))}/>
  <span>{Math.round(volume*100)}%</span>
 </div>;
}
