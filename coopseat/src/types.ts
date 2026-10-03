export type Device = {id:string;name:string};
export type Mode = {index:number;width:number;height:number;fps:number;format:string;supported:boolean};
export type Devices = {video:Device[];audio:Device[];output:Device[]};
export type NativeEvent = {type:string;message?:string;width?:number;height?:number;fps?:number;format?:string;dropped?:number;queueMs?:number;audioMs?:number};
export type OpenConfig = {device:string;mode:number;audio:string;output:string;volume:number;vsync:boolean;top:boolean};
export type AuthDeepLink = {kind:'callback';ticket:string}|{kind:'linked'}|{kind:'confirmed'}|{kind:'verified'};
declare global { interface Window { input?: {
  info():Promise<{native:boolean;platform:string;version:string;bffUrl?:string}>;
  auth:{open(url:string):Promise<void>;pending():Promise<AuthDeepLink|null>;onCallback(callback:(link:AuthDeepLink)=>void):()=>void};
  secureStore:{get(key:string):Promise<string|null>;set(key:string,value:string):Promise<boolean>;remove(key:string):Promise<boolean>};
  devices():Promise<Devices>;modes(device:string):Promise<{modes:Mode[]}>;
  open(config:OpenConfig):Promise<boolean>;stop():Promise<void>;
  control(key:string,value:number|boolean):Promise<void>;bounds(rect:{x:number;y:number;width:number;height:number}):Promise<void>;window(action:string):Promise<boolean|void>;donate():Promise<void>;watchPointer(on:boolean):Promise<void>;onPointer(callback:()=>void):()=>void;
  onNative(callback:(event:NativeEvent)=>void):()=>void;
}}}
