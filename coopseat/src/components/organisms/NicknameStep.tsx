import {useEffect,useState,type FormEvent} from 'react';
import type {Auth} from '../../hooks/useAuth';
import {checkNickname} from '../../lib/api';
import {errorText} from '../../lib/errors';
import {Button,FieldHint,TextButton,TextInput} from '../atoms';
import {Modal} from '../molecules';
import './Auth.css';

const NICKNAME=/^[a-zA-Z0-9_]{3,20}$/;
type Check={nickname:string;available:boolean;reason?:string};

export function NicknameStep({auth,onClose}:{auth:Auth;onClose():void}){
 const needsTerms=!auth.account?.termsVersion;
 const [nickname,setNickname]=useState(''),[terms,setTerms]=useState(false),[check,setCheck]=useState<Check|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const valid=NICKNAME.test(nickname);

 useEffect(()=>{
  if(!valid)return;
  let alive=true;
  const t=setTimeout(()=>{checkNickname(nickname).then(r=>{if(alive)setCheck({nickname,...r});},()=>undefined);},350);
  return()=>{alive=false;clearTimeout(t);};
 },[nickname,valid]);

 const current=check?.nickname===nickname?check:null;
 const hint=!nickname?null:!valid?'De 3 a 20 caracteres: letras, números ou _.':!current?'Verificando…':current.available?'Disponível.':current.reason??'Esse apelido já está em uso.';
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!valid||(needsTerms&&!terms))return;
  setBusy(true);setError('');
  try{await auth.updateAccount({nickname,...(needsTerms?{acceptTerms:true as const}:{})});onClose();}
  catch(err){setError(errorText(err));}finally{setBusy(false);}
 };
 const web=(path:string)=>void auth.openWeb(path).catch(err=>setError(errorText(err)));

 return <Modal small labelledBy="nick-title" onClose={onClose} onSubmit={e=>void submit(e)}>
  <h2 id="nick-title">Escolha seu apelido</h2>
  <p>É o nome que os outros veem nas sessões. Ele é único e só pode ser trocado a cada 30 dias.</p>
  <TextInput autoFocus aria-label="Apelido" placeholder="Ex.: rodri_gamer" maxLength={20} autoComplete="off" spellCheck={false} value={nickname} onChange={e=>setNickname(e.target.value.trim())}/>
  {hint&&<FieldHint warn={!current?.available}>{hint}</FieldHint>}
  {needsTerms&&<label className="auth-check"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>
   <span>Tenho 18 anos ou mais e aceito os <TextButton onClick={()=>web('/termos')}>Termos de Uso</TextButton> e a <TextButton onClick={()=>web('/privacidade')}>Política de Privacidade</TextButton>.</span></label>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Agora não</Button><Button type="submit" disabled={busy||!valid||current?.available===false||(needsTerms&&!terms)}>Salvar</Button></div>
 </Modal>;
}
