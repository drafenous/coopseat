import {useCallback,useEffect,useRef,useState} from 'react';
import {api,ApiError,bffUrl,loadSession,refreshSession,saveSession,type Account,type LoginResult,type MfaPending,type OAuthProvider,type Session} from '../lib/api';
import {errorText} from '../lib/errors';
import {challengeFor,createVerifier} from '../lib/pkce';
import type {AuthDeepLink} from '../types';

export type AuthStatus='loading'|'signedOut'|'signedIn';
export type TotpEnrollment={factorId:string;qrCode:string;secret:string;uri:string};
type Props={setError(message:string):void;setNotice(message:string):void};

export function useAuth({setError,setNotice}:Props){
 const [status,setStatus]=useState<AuthStatus>('loading');
 const [account,setAccount]=useState<Account|null>(null);
 const [mfa,setMfa]=useState<MfaPending|null>(null);
 const [waiting,setWaiting]=useState<OAuthProvider|null>(null);
 const verifier=useRef<string|null>(null);
 const available=Boolean(window.input?.auth);

 const loadAccount=useCallback(async()=>{
  try{const a=await api<Account>('/api/me');setAccount(a);setStatus('signedIn');return a;}
  catch(e){if(e instanceof ApiError&&e.status===401){await saveSession(null);setAccount(null);setStatus('signedOut');return null;}throw e;}
 },[]);

 const finishLogin=useCallback(async(r:LoginResult)=>{
  if('mfaRequired' in r){setMfa(r);return false;}
  setMfa(null);await saveSession(r.session);await loadAccount();return true;
 },[loadAccount]);

 useEffect(()=>{
  let alive=true;
  void (async()=>{
   if(!(await loadSession())){if(alive)setStatus('signedOut');return;}
   // Offline start keeps the stored session; capture works without an account.
   try{await loadAccount();}catch{if(alive)setStatus('signedOut');}
  })();
  return()=>{alive=false;};
 },[loadAccount]);

 const handleLink=useCallback(async(link:AuthDeepLink)=>{
  try{
   if(link.kind==='callback'){
    const v=verifier.current;verifier.current=null;setWaiting(null);
    if(!v){setError('Esse login não foi iniciado neste app. Tente entrar de novo.');return;}
    if(await finishLogin(await api<LoginResult>('/api/auth/desktop/exchange',{method:'POST',body:{ticket:link.ticket,verifier:v},auth:false})))setNotice('Você entrou no CoopSeat.');
   }else if(link.kind==='linked'){await loadAccount();setNotice('Conta vinculada.');}
   else if(link.kind==='verified'){await refreshSession();await loadAccount();setNotice('Verificação de idade enviada. Seu status foi atualizado.');}
   else{setNotice('E-mail confirmado.');if(await loadSession())await loadAccount();}
  }catch(e){setError(errorText(e));}
 },[finishLogin,loadAccount,setError,setNotice]);

 useEffect(()=>{
  const bridge=window.input?.auth;if(!bridge)return;
  const off=bridge.onCallback(link=>void handleLink(link));
  void bridge.pending().then(link=>{if(link)void handleLink(link);});
  return off;
 },[handleLink]);

 const open=async(url:string)=>{if(!window.input)throw Error('Disponível apenas no aplicativo.');await window.input.auth.open(url);};
 const openWeb=async(path:string)=>open(`${await bffUrl()}${path}`);

 return {
  available,status,account,mfa,waiting,
  loginWithPassword:async(email:string,password:string)=>finishLogin(await api<LoginResult>('/api/auth/login',{method:'POST',body:{email,password},auth:false})),
  startOAuth:async(provider:OAuthProvider)=>{
   const v=createVerifier();verifier.current=v;setWaiting(provider);
   try{await open(`${await bffUrl()}/api/auth/oauth/${provider}?client=desktop&challenge=${await challengeFor(v)}`);}
   catch(e){verifier.current=null;setWaiting(null);throw e;}
  },
  cancelOAuth:()=>{verifier.current=null;setWaiting(null);},
  submitMfa:async(code:string)=>mfa?finishLogin(await api<LoginResult>('/api/auth/mfa/challenge',{method:'POST',body:{mfaToken:mfa.mfaToken,factorId:mfa.factors[0]?.id,code},auth:false})):false,
  cancelMfa:()=>setMfa(null),
  logout:async()=>{
   if(await loadSession())await api('/api/auth/logout',{method:'POST'}).catch(()=>undefined);
   await saveSession(null);setAccount(null);setStatus('signedOut');
  },
  reload:loadAccount,
  updateAccount:async(body:{nickname?:string;acceptTerms?:true})=>{const a=await api<Account>('/api/me',{method:'PATCH',body});setAccount(a);return a;},
  linkProvider:async(provider:OAuthProvider)=>{const {url}=await api<{url:string}>('/api/auth/link/start',{method:'POST',body:{provider}});await open(url);},
  unlink:async(id:string)=>{await api(`/api/auth/identities/${encodeURIComponent(id)}`,{method:'DELETE'});await loadAccount();},
  verifyAge:async()=>{const {url}=await api<{url:string}>('/api/identity/sessions',{method:'POST'});await open(url);},
  enrollTotp:()=>api<TotpEnrollment>('/api/auth/mfa/enroll',{method:'POST',body:{}}),
  verifyTotp:async(factorId:string,code:string)=>{const r=await api<{session:Session}>('/api/auth/mfa/verify',{method:'POST',body:{factorId,code}});await saveSession(r.session);await loadAccount();},
  removeTotp:async(factorId:string)=>{await api(`/api/auth/mfa/${encodeURIComponent(factorId)}`,{method:'DELETE'});await loadAccount();},
  openWeb,
 };
}

export type Auth=ReturnType<typeof useAuth>;
