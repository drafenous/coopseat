import type {AuthDeepLink,Devices,Mode,NativeEvent,OpenConfig} from './types';

/** API exposed by the Electron preload as `window.input`. */
export type DesktopBridge = {
  info():Promise<{native:boolean;platform:string;version:string;bffUrl?:string}>;
  auth:{open(url:string):Promise<void>;pending():Promise<AuthDeepLink|null>;onCallback(callback:(link:AuthDeepLink)=>void):()=>void};
  secureStore:{get(key:string):Promise<string|null>;set(key:string,value:string):Promise<boolean>;remove(key:string):Promise<boolean>};
  devices():Promise<Devices>;modes(device:string):Promise<{modes:Mode[]}>;
  open(config:OpenConfig):Promise<boolean>;stop():Promise<void>;
  control(key:string,value:number|boolean):Promise<void>;bounds(rect:{x:number;y:number;width:number;height:number}):Promise<void>;window(action:string):Promise<boolean|void>;donate():Promise<void>;watchPointer(on:boolean):Promise<void>;onPointer(callback:()=>void):()=>void;
  onNative(callback:(event:NativeEvent)=>void):()=>void;
};

/**
 * - desktop: Electron, native capture and Bearer sessions kept in the OS secure store.
 * - web: browser only (Chromium capture). With `accounts`, the page is served by the BFF
 *   itself and the account rides on its same-origin httpOnly cookies.
 */
export type Platform = {kind:'desktop';bridge:DesktopBridge}|{kind:'web';accounts:boolean};

let current:Platform={kind:'web',accounts:false};

/** Must run before the first render. */
export function configurePlatform(platform:Platform){current=platform;}
export const platform=()=>current;
export const bridge=()=>current.kind==='desktop'?current.bridge:undefined;
