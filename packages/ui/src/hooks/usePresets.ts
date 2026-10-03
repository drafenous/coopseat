import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import {readDefaultPreset,readPresets,type Preset} from '../lib/presets';
import type {Settings} from '../lib/settings';
import {DEFAULT_PRESET_KEY,PRESETS_KEY} from '../lib/storage';

type Options={settings:Settings;setSettings:Dispatch<SetStateAction<Settings>>;native:boolean;resetDevices:()=>void;setError:(message:string)=>void;setNotice:(message:string)=>void};

export function usePresets({settings:s,setSettings:setS,native,resetDevices,setError,setNotice}:Options){
 const [presets,setPresets]=useState<Preset[]>(readPresets),[defaultPreset,setDefaultPreset]=useState(readDefaultPreset),[selectedPreset,setSelectedPreset]=useState(defaultPreset);
 useEffect(()=>{localStorage.setItem(PRESETS_KEY,JSON.stringify(presets));},[presets]);
 useEffect(()=>{if(defaultPreset)localStorage.setItem(DEFAULT_PRESET_KEY,defaultPreset);else localStorage.removeItem(DEFAULT_PRESET_KEY);},[defaultPreset]);

 const savePreset=(raw:string)=>{const name=raw.trim().slice(0,40);if(!name)return;const exists=presets.some(p=>p.name===name);setPresets(list=>exists?list.map(p=>p.name===name?{name,settings:s}:p):[...list,{name,settings:s}].sort((a,b)=>a.name.localeCompare(b.name)));setSelectedPreset(name);setError('');setNotice(exists?`Preset "${name}" atualizado.`:`Preset "${name}" salvo.`);};
 const applyPreset=(name:string)=>{setSelectedPreset(name);const p=presets.find(x=>x.name===name);if(!p)return;if(p.settings.backend!==s.backend)resetDevices();setS({...p.settings,backend:native?p.settings.backend:'compat'});setError('');setNotice(`Preset "${name}" aplicado.`);};
 const deletePreset=()=>{if(!selectedPreset||!confirm(`Excluir o preset "${selectedPreset}"?`))return;setPresets(list=>list.filter(p=>p.name!==selectedPreset));if(defaultPreset===selectedPreset)setDefaultPreset('');setNotice(`Preset "${selectedPreset}" excluído.`);setSelectedPreset('');};
 const toggleDefaultPreset=()=>{if(!selectedPreset)return;const isDefault=defaultPreset===selectedPreset;setDefaultPreset(isDefault?'':selectedPreset);setNotice(isDefault?`"${selectedPreset}" não é mais o preset padrão.`:`"${selectedPreset}" será carregado ao abrir o app.`);};

 return {presets,defaultPreset,selectedPreset,savePreset,applyPreset,deletePreset,toggleDefaultPreset};
}
