import {getLocale,getT} from '../i18n';
import {bridge,platform} from '../platform';

export type Session={accessToken:string;refreshToken:string;expiresAt:number};
export type GateRequirement='email'|'nickname'|'age'|'mfa';
export type Gate={allowed:boolean;missing:GateRequirement[]};
export type AgeStatus='UNVERIFIED'|'PENDING'|'VERIFIED'|'REJECTED';
export type Account={
 id:string;email:string|null;pendingEmail:string|null;emailConfirmed:boolean;needsEmail:boolean;
 nickname:string|null;nicknameChangedAt:string|null;avatarUrl:string|null;
 ageStatus:AgeStatus;ageVerifiedAt:string|null;termsVersion:string|null;
 identities:{id:string;provider:string;email:string|null}[];
 mfa:{enabled:boolean;factors:{id:string;name:string}[];level:'aal1'|'aal2'};
 permissions:{watch:Gate;chat:Gate;host:Gate};
 message?:string;
};
export type MfaPending={mfaRequired:true;mfaToken:string;factors:{id:string;name:string}[]};
export type LoginResult={session:Session}|MfaPending;

export class ApiError extends Error{
 constructor(public status:number,public code:string,message:string,public fields?:Record<string,string[]>){super(message);}
}

export const DEFAULT_BFF='https://coopseat.com';
export {OAUTH_PROVIDERS,PROVIDER_LABELS,type OAuthProvider} from './providers';

let bff:Promise<string>|null=null;
export const bffUrl=()=>{
 const b=bridge();
 return bff??=(b?b.info().then(i=>i.bffUrl||DEFAULT_BFF,()=>DEFAULT_BFF):Promise.resolve(platform().kind==='web'&&cookieSession()?location.origin:DEFAULT_BFF));
};
/** On the web the BFF serves this page, so the session lives in its httpOnly cookies. */
const cookieSession=()=>{const p=platform();return p.kind==='web'&&p.accounts;};

const SESSION_KEY='auth.session';
let session:Session|null=null,loaded=false;
const isSession=(s:unknown):s is Session=>{const x=s as Session;return Boolean(x)&&typeof x.accessToken==='string'&&typeof x.refreshToken==='string'&&typeof x.expiresAt==='number';};

export async function loadSession(){
 if(loaded)return session;
 try{const raw=await bridge()?.secureStore.get(SESSION_KEY);const s:unknown=raw?JSON.parse(raw):null;session=isSession(s)?s:null;}catch{session=null;}
 loaded=true;return session;
}
export async function saveSession(s:Session|null){
 const b=bridge();if(!b)return;
 session=s;loaded=true;
 if(s)await b.secureStore.set(SESSION_KEY,JSON.stringify(s));else await b.secureStore.remove(SESSION_KEY);
}

type Options={method?:string;body?:unknown;auth?:boolean};
async function send<T>(path:string,{method='GET',body}:Options,token?:string):Promise<T>{
 const cookies=cookieSession();
 const headers:Record<string,string>=cookies?{}:{'x-coopseat-client':'desktop'};
 headers['accept-language']=getLocale();
 if(body!==undefined)headers['content-type']='application/json';
 if(token)headers.authorization=`Bearer ${token}`;
 let res:Response;
 try{res=await fetch(`${await bffUrl()}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:cookies?'same-origin':'omit'});}
 catch{throw new ApiError(0,'network',getT().api.network);}
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=data?.error??{};throw new ApiError(res.status,e.code??'error',e.message??getT().api.generic,e.fields);}
 return data as T;
}

let refreshing:Promise<Session|null>|null=null;
/** Single-flight refresh; a rejected refresh token signs the user out. */
export function refreshSession(){
 return refreshing??=(async()=>{
  const current=await loadSession();if(!current)return null;
  try{const r=await send<{session:Session}>('/api/auth/refresh',{method:'POST',body:{refreshToken:current.refreshToken}});await saveSession(r.session);return r.session;}
  catch(e){if(e instanceof ApiError&&e.status===401){await saveSession(null);return null;}throw e;}
 })().finally(()=>{refreshing=null;});
}

export const checkNickname=(nickname:string)=>send<{available:boolean;reason?:string}>(`/api/nicknames/available?n=${encodeURIComponent(nickname)}`,{});

export async function api<T>(path:string,opts:Options={}):Promise<T>{
 if(opts.auth===false)return send<T>(path,opts);
 let s=await loadSession();
 if(s&&s.expiresAt-60<Date.now()/1000)s=await refreshSession();
 try{return await send<T>(path,opts,s?.accessToken);}
 catch(e){
  if(!(e instanceof ApiError&&e.status===401&&s))throw e;
  const next=await refreshSession();if(!next)throw e;
  return send<T>(path,opts,next.accessToken);
 }
}
