import {useState,type FormEvent} from 'react';
import type {Auth,TotpEnrollment} from '../../hooks/useAuth';
import {OAUTH_PROVIDERS,PROVIDER_LABELS,type Account,type Gate} from '../../lib/api';
import {useT} from '../../i18n';
import {errorText} from '../../lib/errors';
import {Button,TextInput} from '../atoms';
import {Modal,ModalActions,ProviderButton,modalTitleClass} from '../molecules';
import {Avatar} from './Avatar';
import {authError,authProviders} from './authStyles';

const section='border-t border-[#1f2b37] py-4';
const heading='mb-2.5 text-[12px] font-bold tracking-[0.6px] text-[#7d8ea0] uppercase';
const row='flex min-h-9 items-center justify-between gap-3 text-[13px]';

const GATES=['chat','host'] as const satisfies readonly (keyof Account['permissions'])[];

export function AccountModal({auth,onClose,onNickname}:{auth:Auth;onClose():void;onNickname():void}){
 const T=useT(),t=T.account;
 const gateText=(g:Gate)=>g.allowed?t.allowed:g.missing.map(m=>T.gates[m]).join(' ');
 const a=auth.account;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [enrollment,setEnrollment]=useState<TotpEnrollment|null>(null),[code,setCode]=useState('');
 if(!a)return null;

 const run=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}};
 const linked=new Set(a.identities.map(i=>i.provider==='twitter'?'x':i.provider));
 const canVerifyAge=a.emailConfirmed&&Boolean(a.nickname);
 const confirmTotp=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(enrollment&&code.length===6)void run(async()=>{await auth.verifyTotp(enrollment.factorId,code);setEnrollment(null);setCode('');});};

 return <Modal closeButton labelledBy="account-title" onClose={onClose} onSubmit={enrollment?confirmTotp:undefined}>
  <div className="mb-1.5 flex items-center gap-3.5">
   <Avatar account={a}/>
   <div><h2 id="account-title" className={modalTitleClass}>{a.nickname??t.noNickname}</h2><p>{a.email??t.noEmail}</p></div>
  </div>
  {error&&<p className={authError} role="alert">{error}</p>}

  <section className={section}>
   <h3 className={heading}>{t.profile}</h3>
   <div className={row}><span className="text-muted">{t.nickname}</span>{a.nickname?<strong>{a.nickname}</strong>:<Button variant="secondary" compact onClick={onNickname}>{t.chooseNickname}</Button>}</div>
   <div className={row}><span className="text-muted">{t.email}</span>{a.emailConfirmed?<span className="text-ok">{t.confirmed}</span>:<span className="text-warn">{a.needsEmail?t.addEmailOnSite:t.confirmViaLink}</span>}</div>
   {a.pendingEmail&&<div className={row}><span className="text-muted">{t.newEmail}</span><span className="text-warn">{t.awaiting(a.pendingEmail)}</span></div>}
  </section>

  <section className={section}>
   <h3 className={heading}>{t.ageTitle}</h3>
   <div className={row}>
    <span className={a.ageStatus==='VERIFIED'?'text-ok':'text-warn'}>{t.ageLabels[a.ageStatus]}</span>
    {(a.ageStatus==='UNVERIFIED'||a.ageStatus==='REJECTED')&&<Button variant="secondary" compact disabled={busy||!canVerifyAge} onClick={()=>void run(auth.verifyAge)}>{t.verifyAge}</Button>}
    {a.ageStatus==='PENDING'&&<Button variant="secondary" compact disabled={busy} onClick={()=>void run(auth.reload)}>{t.refresh}</Button>}
   </div>
   {!canVerifyAge&&a.ageStatus!=='VERIFIED'&&<p>{t.agePrereq}</p>}
   {a.ageStatus!=='VERIFIED'&&<p>{t.ageExplainer}</p>}
  </section>

  <section className={section}>
   <h3 className={heading}>{t.permissionsTitle}</h3>
   <div className={row}><span className="text-muted">{t.watch}</span><span className="text-ok">{t.allowed}</span></div>
   {GATES.map(key=><div key={key} className={row}><span className="text-muted">{t.gates[key]}</span><span className={a.permissions[key].allowed?'text-ok':'text-warn'}>{gateText(a.permissions[key])}</span></div>)}
  </section>

  <section className={section}>
   <h3 className={heading}>{t.linkedTitle}</h3>
   {a.identities.map(i=><div key={i.id} className={row}><span className="text-muted">{PROVIDER_LABELS[i.provider]??i.provider}{i.email?` · ${i.email}`:''}</span>
    {a.identities.length>1&&<Button variant="secondary" compact disabled={busy} onClick={()=>void run(()=>auth.unlink(i.id))}>{t.unlink}</Button>}</div>)}
   <div className={authProviders}>
    {OAUTH_PROVIDERS.filter(p=>!linked.has(p)).map(p=><ProviderButton key={p} provider={p} action={T.providers.link} disabled={busy} onClick={()=>void run(()=>auth.linkProvider(p))}/>)}
   </div>
  </section>

  <section className={section}>
   <h3 className={heading}>{t.security}</h3>
   {a.mfa.factors.map(f=><div key={f.id} className={row}><span className="text-muted">{f.name}</span>
    <Button variant="secondary" compact disabled={busy||a.mfa.level!=='aal2'} onClick={()=>void run(()=>auth.removeTotp(f.id))}>{t.remove}</Button></div>)}
   {!a.mfa.enabled&&!enrollment&&<div className={row}><span className="text-muted">{t.totpOff}</span>
    <Button variant="secondary" compact disabled={busy} onClick={()=>void run(async()=>setEnrollment(await auth.enrollTotp()))}>{t.activate}</Button></div>}
   {enrollment&&<>
    <div className="my-2.5 flex items-center gap-4"><img className="size-[150px] rounded-lg bg-white p-1.5" src={enrollment.qrCode} alt={t.qrAlt}/><div><p>{t.scanQr}</p><code className="text-[12px] break-all text-field-text">{enrollment.secret}</code></div></div>
    <TextInput code autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label={t.codeLabel} maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
    <ModalActions><Button variant="secondary" onClick={()=>{setEnrollment(null);setCode('');}}>{T.common.cancel}</Button><Button type="submit" inline disabled={busy||code.length!==6}>{t.confirmCode}</Button></ModalActions>
   </>}
   <div className={row}><span className="text-muted">{t.manageOnSite}</span><Button variant="secondary" compact disabled={busy} onClick={()=>void run(()=>auth.openWeb('/account'))}>{t.openOnSite}</Button></div>
  </section>

  <ModalActions><Button variant="secondary" disabled={busy} onClick={()=>void run(async()=>{await auth.logout();onClose();})}>{t.signOut}</Button></ModalActions>
 </Modal>;
}
