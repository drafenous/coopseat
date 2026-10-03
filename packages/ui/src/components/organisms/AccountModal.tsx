import {useState,type FormEvent} from 'react';
import type {Auth,TotpEnrollment} from '../../hooks/useAuth';
import {GATE_MESSAGES,OAUTH_PROVIDERS,PROVIDER_LABELS,type Account,type Gate} from '../../lib/api';
import {errorText} from '../../lib/errors';
import {Button,TextInput} from '../atoms';
import {Modal,ProviderButton} from '../molecules';
import {Avatar} from './Avatar';
import './Auth.css';

const AGE_LABELS:Record<Account['ageStatus'],string>={UNVERIFIED:'Não verificada',PENDING:'Em análise',VERIFIED:'Verificada (18+)',REJECTED:'Não aprovada'};
const GATES:[keyof Account['permissions'],string][]=[['chat','Chat nas sessões'],['voice','Voz nas sessões'],['host','Criar salas']];
const gateText=(g:Gate)=>g.allowed?'Liberado':g.missing.map(m=>GATE_MESSAGES[m]).join(' ');

export function AccountModal({auth,onClose,onNickname}:{auth:Auth;onClose():void;onNickname():void}){
 const a=auth.account;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [enrollment,setEnrollment]=useState<TotpEnrollment|null>(null),[code,setCode]=useState('');
 if(!a)return null;

 const run=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{setBusy(false);}};
 const linked=new Set(a.identities.map(i=>i.provider==='twitter'?'x':i.provider));
 const canVerifyAge=a.emailConfirmed&&Boolean(a.nickname);
 const confirmTotp=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(enrollment&&code.length===6)void run(async()=>{await auth.verifyTotp(enrollment.factorId,code);setEnrollment(null);setCode('');});};

 return <Modal closeButton labelledBy="account-title" onClose={onClose} onSubmit={enrollment?confirmTotp:undefined}>
  <div className="account-head">
   <Avatar account={a}/>
   <div><h2 id="account-title">{a.nickname??'Sem apelido'}</h2><p>{a.email??'Sem e-mail'}</p></div>
  </div>
  {error&&<p className="auth-error" role="alert">{error}</p>}

  <section className="account-section">
   <h3>Perfil</h3>
   <div className="account-row"><span>Apelido</span>{a.nickname?<strong>{a.nickname}</strong>:<Button variant="secondary" onClick={onNickname}>Escolher apelido</Button>}</div>
   <div className="account-row"><span>E-mail</span>{a.emailConfirmed?<span className="account-ok">Confirmado</span>:<span className="account-warn">{a.needsEmail?'Adicione um e-mail no site':'Confirme pelo link que enviamos'}</span>}</div>
   {a.pendingEmail&&<div className="account-row"><span>Novo e-mail</span><span className="account-warn">{a.pendingEmail} (aguardando confirmação)</span></div>}
  </section>

  <section className="account-section">
   <h3>Verificação de idade</h3>
   <div className="account-row">
    <span className={a.ageStatus==='VERIFIED'?'account-ok':'account-warn'}>{AGE_LABELS[a.ageStatus]}</span>
    {(a.ageStatus==='UNVERIFIED'||a.ageStatus==='REJECTED')&&<Button variant="secondary" disabled={busy||!canVerifyAge} onClick={()=>void run(auth.verifyAge)}>Verificar idade</Button>}
    {a.ageStatus==='PENDING'&&<Button variant="secondary" disabled={busy} onClick={()=>void run(auth.reload)}>Atualizar</Button>}
   </div>
   {!canVerifyAge&&a.ageStatus!=='VERIFIED'&&<p>Confirme seu e-mail e escolha um apelido antes de verificar a idade.</p>}
   {a.ageStatus!=='VERIFIED'&&<p>A lei exige confirmar que você é maior de 18 anos para usar chat e voz. Guardamos só o resultado, nunca a foto do documento.</p>}
  </section>

  <section className="account-section">
   <h3>Permissões nas sessões</h3>
   <div className="account-row"><span>Assistir</span><span className="account-ok">Liberado</span></div>
   {GATES.map(([key,label])=><div key={key} className="account-row"><span>{label}</span><span className={a.permissions[key].allowed?'account-ok':'account-warn'}>{gateText(a.permissions[key])}</span></div>)}
  </section>

  <section className="account-section">
   <h3>Contas vinculadas</h3>
   {a.identities.map(i=><div key={i.id} className="account-row"><span>{PROVIDER_LABELS[i.provider]??i.provider}{i.email?` · ${i.email}`:''}</span>
    {a.identities.length>1&&<Button variant="secondary" disabled={busy} onClick={()=>void run(()=>auth.unlink(i.id))}>Desvincular</Button>}</div>)}
   <div className="auth-providers">
    {OAUTH_PROVIDERS.filter(p=>!linked.has(p)).map(p=><ProviderButton key={p} provider={p} action="Vincular" disabled={busy} onClick={()=>void run(()=>auth.linkProvider(p))}/>)}
   </div>
  </section>

  <section className="account-section">
   <h3>Segurança</h3>
   {a.mfa.factors.map(f=><div key={f.id} className="account-row"><span>{f.name}</span>
    <Button variant="secondary" disabled={busy||a.mfa.level!=='aal2'} onClick={()=>void run(()=>auth.removeTotp(f.id))}>Remover</Button></div>)}
   {!a.mfa.enabled&&!enrollment&&<div className="account-row"><span>Verificação em duas etapas desativada</span>
    <Button variant="secondary" disabled={busy} onClick={()=>void run(async()=>setEnrollment(await auth.enrollTotp()))}>Ativar</Button></div>}
   {enrollment&&<>
    <div className="account-qr"><img src={enrollment.qrCode} alt="QR code do autenticador"/><div><p>Escaneie com Google Authenticator, Authy ou similar. Ou digite a chave:</p><code>{enrollment.secret}</code></div></div>
    <TextInput className="text-input code-input" autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label="Código do autenticador" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
    <div className="modal-actions"><Button variant="secondary" onClick={()=>{setEnrollment(null);setCode('');}}>Cancelar</Button><Button type="submit" disabled={busy||code.length!==6}>Confirmar código</Button></div>
   </>}
   <div className="account-row"><span>Senha, e-mail e exclusão da conta</span><Button variant="secondary" disabled={busy} onClick={()=>void run(()=>auth.openWeb('/conta'))}>Abrir no site</Button></div>
  </section>

  <div className="modal-actions"><Button variant="secondary" disabled={busy} onClick={()=>void run(async()=>{await auth.logout();onClose();})}>Sair</Button></div>
 </Modal>;
}
