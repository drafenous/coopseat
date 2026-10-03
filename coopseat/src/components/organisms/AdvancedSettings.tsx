import {useState} from 'react';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import type {Mode} from '../../types';
import {cx} from '../../lib/cx';
import type {Backend,Settings} from '../../lib/settings';
import {SelectField,ToggleField} from '../molecules';
import './AdvancedSettings.css';

type Props={settings:Settings;change<K extends keyof Settings>(key:K,value:Settings[K]):void;modes:Mode[];native:boolean;locked:boolean;onBackendChange(backend:Backend):void};

export function AdvancedSettings({settings:s,change,modes,native,locked,onBackendChange}:Props){
 const [open,setOpen]=useState(false);
 return <>
  <button type="button" className={cx('advanced-toggle',open&&'open')} aria-expanded={open} onClick={()=>setOpen(x=>!x)}><SlidersHorizontal size={14}/> Avançado<ChevronDown size={15}/></button>
  {open&&<div className="advanced">
   <SelectField label="Modo de captura" disabled={locked} value={s.backend} onChange={e=>onBackendChange(e.target.value as Backend)}>
    <option value="native" disabled={!native}>Nativo · menor atraso{!native?' (não disponível)':''}</option>
    <option value="compat">Compatibilidade · funciona em qualquer PC</option>
   </SelectField>
   {s.backend==='native'
    ?<SelectField label="Formato de vídeo" value={s.mode} disabled={locked} onChange={e=>change('mode',Number(e.target.value))}>{modes.length?modes.map(m=><option key={m.index} value={m.index}>{m.width} × {m.height} · {m.fps.toFixed(2).replace('.00','')} fps · {m.format}</option>):<option>Nenhum modo disponível</option>}</SelectField>
    :<div className="split">
     <SelectField label="Resolução" disabled={locked} value={s.resolution} onChange={e=>change('resolution',e.target.value)}><option value="1920x1080">1920 × 1080</option><option value="1280x720">1280 × 720</option><option value="640x480">640 × 480</option><option value="3840x2160">3840 × 2160</option></SelectField>
     <SelectField label="FPS" disabled={locked} value={s.fps} onChange={e=>change('fps',Number(e.target.value))}><option>60</option><option>30</option></SelectField>
    </div>}
   <ToggleField label="VSync" hint={s.backend==='native'?'Evita cortes na imagem':'Disponível só no modo Nativo'} checked={s.vsync} disabled={s.backend!=='native'} onChange={v=>change('vsync',v)}/>
  </div>}
 </>;
}
