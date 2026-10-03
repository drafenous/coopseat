import {Plus,Save,Star,Trash2} from 'lucide-react';
import type {Preset} from '../../lib/presets';
import {FieldHint,MenuDivider,MenuItem,Select} from '../atoms';
import {DropdownMenu} from '../molecules';
import './PresetPicker.css';

type Props={presets:Preset[];selected:string;defaultPreset:string;locked:boolean;menuOpen:boolean;onMenuOpenChange(open:boolean):void;onApply(name:string):void;onSaveNew():void;onUpdate(name:string):void;onToggleDefault():void;onDelete():void};

export function PresetPicker({presets,selected,defaultPreset,locked,menuOpen,onMenuOpenChange,onApply,onSaveNew,onUpdate,onToggleDefault,onDelete}:Props){
 const isDefault=Boolean(selected)&&defaultPreset===selected;
 return <>
  <div className="preset-bar">
   <Select aria-label="Preset" value={selected} disabled={locked||!presets.length} onChange={e=>onApply(e.target.value)}>
    <option value="">{presets.length?'Escolher preset…':'Nenhum preset salvo'}</option>
    {presets.map(p=><option key={p.name} value={p.name}>{p.name}{p.name===defaultPreset?' ★':''}</option>)}
   </Select>
   <DropdownMenu label="Opções de preset" open={menuOpen} onOpenChange={onMenuOpenChange}>
    <MenuItem onClick={onSaveNew}><Plus size={15}/> Salvar como novo preset…</MenuItem>
    {selected&&<>
     <MenuItem onClick={()=>onUpdate(selected)}><Save size={15}/> Atualizar “{selected}”</MenuItem>
     <MenuItem onClick={onToggleDefault}><Star size={15} fill={isDefault?'currentColor':'none'}/> {isDefault?'Deixar de abrir com este preset':'Abrir o app com este preset'}</MenuItem>
     <MenuDivider/>
     <MenuItem danger disabled={locked} onClick={onDelete}><Trash2 size={15}/> Excluir “{selected}”</MenuItem>
    </>}
   </DropdownMenu>
  </div>
  {isDefault&&<FieldHint><Star size={11} fill="currentColor"/> Abre automaticamente com o app</FieldHint>}
 </>;
}
