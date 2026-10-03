export type Device = {id:string;name:string};
export type Mode = {index:number;width:number;height:number;fps:number;format:string;supported:boolean};
export type Devices = {video:Device[];audio:Device[];output:Device[]};
export type NativeEvent = {type:string;message?:string;width?:number;height?:number;fps?:number;format?:string;dropped?:number;queueMs?:number;audioMs?:number};
export type OpenConfig = {device:string;mode:number;audio:string;output:string;volume:number;vsync:boolean;top:boolean};
export type AuthDeepLink = {kind:'callback';ticket:string}|{kind:'linked'}|{kind:'confirmed'}|{kind:'verified'};
