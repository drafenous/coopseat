import {CircleHelp,Wrench} from 'lucide-react';
import type {Auth} from '../../hooks/useAuth';
import {cx} from '../../lib/cx';
import {IconButton} from '../atoms';
import {Brand,LanguageMenu,StatusPill,type CaptureStatus} from '../molecules';
import {Avatar} from './Avatar';
import {useT} from '../../i18n';

type Props={status:CaptureStatus;auth:Auth;onHelp():void;onTroubleshoot():void;onLogin():void;onAccount():void};

const accountLink=(login?:boolean)=>cx('flex items-center gap-2 rounded-full border border-line-strong bg-transparent text-[13px] font-semibold text-[#d4dee8] hover:bg-[#ffffff0a]',login?'px-4 py-[7px]':'py-[5px] pr-3 pl-1.5');

export function AppHeader({status,auth,onHelp,onTroubleshoot,onLogin,onAccount}:Props){
 const t=useT().header;
 const a=auth.account;
 return <header className="flex h-[68px] flex-none items-center justify-between gap-4 border-b border-[#ffffff0d] bg-[#0e141b] px-[clamp(16px,2.5vw,48px)] immersive:hidden">
  <Brand/>
  <div className="flex items-center gap-5">
   <StatusPill status={status}/>
   <div className="flex items-center gap-1">
    <IconButton label={t.troubleshoot} onClick={onTroubleshoot}><Wrench size={19}/></IconButton>
    <IconButton label={t.help} onClick={onHelp}><CircleHelp size={20}/></IconButton>
    <LanguageMenu/>
   </div>
   {auth.available&&auth.status!=='loading'&&(a
    ?<button type="button" className={accountLink()} onClick={onAccount} aria-label={t.myAccount}><Avatar small account={a}/>{a.nickname??t.myAccount}</button>
    :<button type="button" className={accountLink(true)} onClick={onLogin}>{t.signIn}</button>)}
  </div>
 </header>;
}
