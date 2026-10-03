import {Sparkles} from 'lucide-react';
import {EFFECTS,gridEffect,type Effect,type Settings,type Smoothing} from '../../lib/settings';
import {Collapsible,SelectField,ToggleField} from '../molecules';
import {useT} from '../../i18n';

type Props={settings:Settings;change<K extends keyof Settings>(key:K,value:Settings[K]):void};

export function EffectSettings({settings:s,change}:Props){
 const t=useT().effects; const grid=gridEffect(s.effect);
 return <Collapsible icon={<Sparkles size={14}/>} title={t.title}>
  <SelectField<Effect> label={t.effect} value={s.effect} onChange={v=>change('effect',v)} options={EFFECTS.map(e=>({value:e,label:t.list[e]}))}/>
  <ToggleField label={t.smoothing} hint={grid?t.smoothingGrid:t.smoothingHint} checked={s.smoothing!=='off'&&!grid} disabled={grid} onChange={v=>change('smoothing',v?'light':'off')}/>
  {s.smoothing!=='off'&&!grid&&<SelectField<Smoothing> label={t.smoothingLevel} value={s.smoothing} onChange={v=>change('smoothing',v)} options={[
   {value:'light',label:t.smoothingLight},
   {value:'strong',label:t.smoothingStrong},
  ]}/>}
 </Collapsible>;
}
