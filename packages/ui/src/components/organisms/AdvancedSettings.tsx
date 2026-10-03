import {SlidersHorizontal} from 'lucide-react';
import type {Mode} from '../../types';
import type {Backend,Settings} from '../../lib/settings';
import {Collapsible,SelectField,ToggleField} from '../molecules';
import {useT} from '../../i18n';

const RESOLUTIONS=['1920x1080','1280x720','640x480','3840x2160'];
const FPS=[60,30];

type Props={settings:Settings;change<K extends keyof Settings>(key:K,value:Settings[K]):void;modes:Mode[];native:boolean;locked:boolean;onBackendChange(backend:Backend):void};

export function AdvancedSettings({settings:s,change,modes,native,locked,onBackendChange}:Props){
 const t=useT().advanced;
 return <Collapsible icon={<SlidersHorizontal size={14}/>} title={t.title}>
  <SelectField<Backend> label={t.backend} disabled={locked} value={s.backend} onChange={onBackendChange} options={[
   {value:'native',label:t.native(native),disabled:!native},
   {value:'compat',label:t.compat},
  ]}/>
  {s.backend==='native'
   ?<SelectField label={t.videoFormat} value={s.mode} disabled={locked} onChange={v=>change('mode',v)} placeholder={t.noModes} options={modes.map(m=>({value:m.index,label:`${m.width} × ${m.height} · ${m.fps.toFixed(2).replace('.00','')} fps · ${m.format}`}))}/>
   :<div className="grid grid-cols-[1fr_84px] gap-2.5">
    <SelectField label={t.resolution} disabled={locked} value={s.resolution} onChange={v=>change('resolution',v)} options={RESOLUTIONS.map(r=>({value:r,label:r.replace('x',' × ')}))}/>
    <SelectField label="FPS" disabled={locked} value={s.fps} onChange={v=>change('fps',v)} options={FPS.map(f=>({value:f,label:String(f)}))}/>
   </div>}
  <ToggleField label="VSync" hint={s.backend==='native'?t.vsyncNative:t.vsyncCompat} checked={s.vsync} disabled={s.backend!=='native'} onChange={v=>change('vsync',v)}/>
 </Collapsible>;
}
