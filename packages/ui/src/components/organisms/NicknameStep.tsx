import {useEffect,useState,type FormEvent} from 'react';
import type {Auth} from '../../hooks/useAuth';
import {checkNickname} from '../../lib/api';
import {errorText} from '../../lib/errors';
import {Button,FieldHint,TextButton,TextInput} from '../atoms';
import {Modal,ModalActions} from '../molecules';
import {authError} from './authStyles';
import {useT} from '../../i18n';

const NICKNAME=/^[a-zA-Z0-9_]{3,20}$/;
type Check={nickname:string;available:boolean;reason?:string};

export function NicknameStep({auth,onClose}:{auth:Auth;onClose():void}){
 const T=useT(),t=T.nickname;
 const needsTerms=!auth.account?.termsVersion;
 const [nickname,setNickname]=useState(''),[terms,setTerms]=useState(false),[check,setCheck]=useState<Check|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const valid=NICKNAME.test(nickname);

 useEffect(()=>{
  if(!valid)return;
  let alive=true;
  const timer=setTimeout(()=>{checkNickname(nickname).then(r=>{if(alive)setCheck({nickname,...r});},()=>undefined);},350);
  return()=>{alive=false;clearTimeout(timer);};
 },[nickname,valid]);

 const current=check?.nickname===nickname?check:null;
 const hint=!nickname?null:!valid?t.format:!current?t.checking:current.available?t.available:current.reason??t.taken;
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!valid||(needsTerms&&!terms))return;
  setBusy(true);setError('');
  try{await auth.updateAccount({nickname,...(needsTerms?{acceptTerms:true as const}:{})});onClose();}
  catch(err){setError(errorText(err));}finally{setBusy(false);}
 };
 const web=(path:string)=>void auth.openWeb(path).catch(err=>setError(errorText(err)));

 return <Modal small labelledBy="nick-title" onClose={onClose} onSubmit={e=>void submit(e)}>
  <h2 id="nick-title">{t.title}</h2>
  <p>{t.body}</p>
  <TextInput autoFocus aria-label={t.label} placeholder={t.placeholder} maxLength={20} autoComplete="off" spellCheck={false} value={nickname} onChange={e=>setNickname(e.target.value.trim())}/>
  {hint&&<FieldHint warn={!current?.available}>{hint}</FieldHint>}
  {needsTerms&&<label className="mt-3 flex items-start gap-2.5 text-[13px] text-muted"><input className="mt-[3px] mr-[3px] mb-[3px] ml-1" type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>
   <span>{t.acceptTerms(<TextButton inline onClick={()=>web('/terms')}>{t.terms}</TextButton>,<TextButton inline onClick={()=>web('/privacy')}>{t.privacy}</TextButton>)}</span></label>}
  {error&&<p className={authError} role="alert">{error}</p>}
  <ModalActions><Button variant="secondary" onClick={onClose}>{t.notNow}</Button><Button type="submit" inline disabled={busy||!valid||current?.available===false||(needsTerms&&!terms)}>{T.common.save}</Button></ModalActions>
 </Modal>;
}
