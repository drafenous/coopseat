import {Plus,Save,Star,Trash2} from 'lucide-react';
import type {Preset} from '../../lib/presets';
import {FieldHint,MenuDivider,MenuItem,Select} from '../atoms';
import {DropdownMenu} from '../molecules';
import {useT} from '../../i18n';

type Props={presets:Preset[];selected:string;defaultPreset:string;locked:boolean;menuOpen:boolean;onMenuOpenChange(open:boolean):void;onApply(name:string):void;onSaveNew():void;onUpdate(name:string):void;onToggleDefault():void;onDelete():void};

export function PresetPicker({presets,selected,defaultPreset,locked,menuOpen,onMenuOpenChange,onApply,onSaveNew,onUpdate,onToggleDefault,onDelete}:Props){
 const t=useT().presetPicker;
 const isDefault=Boolean(selected)&&defaultPreset===selected;
 return <>
  <div className="mb-3.5 flex items-center gap-1.5">
   <div className="min-w-0 flex-1"><Select aria-label={t.label} value={selected} disabled={locked} onChange={onApply} placeholder={presets.length?t.choose:t.none}
    options={presets.map(p=>({value:p.name,label:`${p.name}${p.name===defaultPreset?' ★':''}`}))}/></div>
   <DropdownMenu label={t.options} open={menuOpen} onOpenChange={onMenuOpenChange}>
    <MenuItem onClick={onSaveNew}><Plus size={15}/> {t.saveNew}</MenuItem>
    {selected&&<>
     <MenuItem onClick={()=>onUpdate(selected)}><Save size={15}/> {t.update(selected)}</MenuItem>
     <MenuItem onClick={onToggleDefault}><Star size={15} fill={isDefault?'currentColor':'none'}/> {isDefault?t.stopDefault:t.makeDefault}</MenuItem>
     <MenuDivider/>
     <MenuItem danger disabled={locked} onClick={onDelete}><Trash2 size={15}/> {t.delete(selected)}</MenuItem>
    </>}
   </DropdownMenu>
  </div>
  {isDefault&&<FieldHint><Star size={11} fill="currentColor"/> {t.autoOpens}</FieldHint>}
 </>;
}
