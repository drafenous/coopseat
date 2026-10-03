import type {Devices} from '../types';
import {SETTINGS_KEY} from './storage';

export type Backend='native'|'compat';
export type Settings={backend:Backend;video:string;audio:string;output:string;mode:number;resolution:string;fps:number;volume:number;vsync:boolean;auto:boolean;autoFull:boolean;cinemaDelay:number};
export type Countdown=number|'paused'|null;

export const CINEMA_DELAYS=[5,10,30,60],COUNTDOWN_FROM=3,PAUSE_MS=3000;
export const defaults:Settings={backend:'native',video:'',audio:'',output:'',mode:-1,resolution:'1920x1080',fps:60,volume:.75,vsync:false,auto:false,autoFull:true,cinemaDelay:5};
export const emptyDevices:Devices={video:[],audio:[],output:[]};

export function sanitize(x:any):Settings {
 if(!x||typeof x!=='object')return defaults;
 const volume=Number(x.volume??.75);
 return {...defaults,...Object.fromEntries(Object.entries(x).filter(([k,v])=>k in defaults && typeof v===typeof defaults[k as keyof Settings])),volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.75,cinemaDelay:CINEMA_DELAYS.includes(Number(x.cinemaDelay))?Number(x.cinemaDelay):defaults.cinemaDelay};
}

export function readSettings():Settings {try{return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch{return defaults;}}
