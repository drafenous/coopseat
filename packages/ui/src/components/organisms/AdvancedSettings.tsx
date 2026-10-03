import {useState} from 'react';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import type {Mode} from '../../types';
import {cx} from '../../lib/cx';
import {EFFECTS,gridEffect,type Backend,type Effect,type Settings,type Smoothing} from '../../lib/settings';
import {SelectField,ToggleField} from '../molecules';
import {useT} from '../../i18n';

const RESOLUTIONS=['1920x1080','1280x720','640x480','3840x2160'];
const FPS=[60,30];

type Props={settings:Settings;change<K extends keyof Settings>(key:K,value:Settings[K]):void;modes:Mode[];native:boolean;locked:boolean;onBackendChange(backend:Backend):void};

export function AdvancedSettings({settings:s,change,modes,native,locked,onBackendChange}:Props){
 const t=useT().advanced;
 const [open,setOpen]=useState(false);
 const grid=gridEffect(s.effect);
 return <>
  <button type="button" className="mt-0.5 flex w-full items-center gap-2 border-t border-line-soft bg-transparent px-0.5 py-3 text-[13px] font-[550] text-[#a5b4c3] hover:text-[#e1eaf2]" aria-expanded={open} onClick={()=>setOpen(x=>!x)}><SlidersHorizontal size={14}/> {t.title}<ChevronDown size={15} className={cx('ml-auto transition-transform duration-150 motion-reduce:transition-none',open&&'rotate-180')}/></button>
  {open&&<div className="pt-1.5">
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
   <SelectField<Effect> label={t.effect} value={s.effect} onChange={v=>change('effect',v)} options={EFFECTS.map(e=>({value:e,label:t.effects[e]}))}/>
   <ToggleField label={t.smoothing} hint={grid?t.smoothingGrid:t.smoothingHint} checked={s.smoothing!=='off'&&!grid} disabled={grid} onChange={v=>change('smoothing',v?'light':'off')}/>
   {s.smoothing!=='off'&&!grid&&<SelectField<Smoothing> label={t.smoothingLevel} value={s.smoothing} onChange={v=>change('smoothing',v)} options={[
    {value:'light',label:t.smoothingLight},
    {value:'strong',label:t.smoothingStrong},
   ]}/>}
  </div>}
 </>;
}
