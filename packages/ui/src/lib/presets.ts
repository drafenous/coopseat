import {readSettings,sanitize,type Settings} from './settings';
import {DEFAULT_PRESET_KEY,PRESETS_KEY} from './storage';

export type Preset={name:string;settings:Settings};

export function readPresets():Preset[] {try{const x=JSON.parse(localStorage.getItem(PRESETS_KEY)||'[]');return Array.isArray(x)?x.filter(p=>p&&typeof p.name==='string'&&p.name.trim()).map(p=>({name:p.name.trim().slice(0,40),settings:sanitize(p.settings)})):[];}catch{return [];}}
export const readDefaultPreset=()=>{const name=localStorage.getItem(DEFAULT_PRESET_KEY)||'';return readPresets().some(p=>p.name===name)?name:'';};
export function initialSettings():Settings {const name=readDefaultPreset();return readPresets().find(p=>p.name===name)?.settings??readSettings();}
