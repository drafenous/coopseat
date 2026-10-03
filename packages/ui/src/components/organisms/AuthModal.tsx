import {useEffect,useState,type FormEvent} from 'react';
import type {Auth} from '../../hooks/useAuth';
import {OAUTH_PROVIDERS,PROVIDER_LABELS} from '../../lib/api';
import {errorText} from '../../lib/errors';
import {Button,Divider,TextButton,TextInput} from '../atoms';
import {Modal,ProviderButton} from '../molecules';
import './Auth.css';

export function AuthModal({auth,onClose}:{auth:Auth;onClose():void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(auth.status==='signedIn')onClose();},[auth.status,onClose]);

 const run=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}};
 const web=(path:string)=>void run(()=>auth.openWeb(path));

 if(auth.mfa){
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(code.length===6)void run(()=>auth.submitMfa(code));};
  return <Modal small labelledBy="mfa-title" onClose={()=>{auth.cancelMfa();onClose();}} onSubmit={submit}>
   <h2 id="mfa-title">Verificação em duas etapas</h2>
   <p>Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
   <TextInput className="code-input" autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label="Código" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
   {error&&<p className="auth-error" role="alert">{error}</p>}
   <div className="modal-actions"><Button variant="secondary" onClick={auth.cancelMfa}>Voltar</Button><Button type="submit" disabled={busy||code.length!==6}>Confirmar</Button></div>
  </Modal>;
 }

 const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(email&&password)void run(()=>auth.loginWithPassword(email.trim(),password));};
 return <Modal small closeButton labelledBy="auth-title" onClose={()=>{auth.cancelOAuth();onClose();}} onSubmit={submit}>
  <h2 id="auth-title">Entrar no CoopSeat</h2>
  <p>Sua conta libera o chat e a voz nas sessões e permite criar salas.</p>
  <div className="auth-providers">
   {OAUTH_PROVIDERS.map(p=><ProviderButton key={p} provider={p} compact disabled={busy} onClick={()=>void run(()=>auth.startOAuth(p))}/>)}
  </div>
  {auth.waiting&&<div className="auth-waiting" role="status"><p>Continue no navegador com {PROVIDER_LABELS[auth.waiting]}. O app volta sozinho quando terminar.</p><Button variant="secondary" onClick={auth.cancelOAuth}>Cancelar</Button></div>}
  <Divider label="ou com e-mail"/>
  <label className="auth-field">E-mail<TextInput type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label className="auth-field">Senha<TextInput type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {error&&<p className="auth-error" role="alert">{error}</p>}
  <Button type="submit" disabled={busy||!email||!password}>{busy?'Entrando…':'Entrar'}</Button>
  <div className="auth-links">
   <TextButton onClick={()=>web('/esqueci-senha')}>Esqueci minha senha</TextButton>
   <TextButton onClick={()=>web('/cadastro')}>Criar conta</TextButton>
  </div>
  <p className="auth-fine">Contas são só para maiores de 18 anos. Para assistir como convidado você não precisa de conta.</p>
 </Modal>;
}
