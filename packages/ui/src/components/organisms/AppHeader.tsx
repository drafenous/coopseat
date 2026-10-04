import {useState} from 'react';
import {ChevronDown,CircleHelp,LogOut,Settings,Tv,UserRound,Wrench} from 'lucide-react';
import type {Auth} from '../../hooks/useAuth';
import {cx} from '../../lib/cx';
import {IconButton,MenuDivider,MenuItem} from '../atoms';
import {Brand,DropdownMenu,StatusPill,type CaptureStatus} from '../molecules';
import {Avatar} from './Avatar';
import {useT} from '../../i18n';

type Props={status:CaptureStatus;auth:Auth;onHelp():void;onTroubleshoot():void;onPreferences():void;onLogin():void;onMyAccount():void;onMyRoom?():void;onSignOut():void};

const accountLink=(login?:boolean,open?:boolean)=>cx('flex items-center gap-2 rounded-full border border-line-strong text-[13px] font-semibold text-[#d4dee8] hover:bg-[#ffffff0a]',open?'bg-[#ffffff0a]':'bg-transparent',login?'px-4 py-[7px]':'py-[5px] pr-2.5 pl-1.5');

export function AppHeader({status,auth,onHelp,onTroubleshoot,onPreferences,onLogin,onMyAccount,onMyRoom,onSignOut}:Props){
 const t=useT().header;
 const a=auth.account;
 const [menu,setMenu]=useState(false);
 return <header className="flex h-[68px] flex-none items-center justify-between gap-4 border-b border-[#ffffff0d] bg-[#0e141b] px-[clamp(16px,2.5vw,48px)] immersive:hidden">
  <Brand/>
  <div className="flex items-center gap-5">
   <StatusPill status={status}/>
   <div className="flex items-center gap-1">
    <IconButton label={t.troubleshoot} onClick={onTroubleshoot}><Wrench size={19}/></IconButton>
    <IconButton label={t.help} onClick={onHelp}><CircleHelp size={20}/></IconButton>
    <IconButton label={t.preferences} onClick={onPreferences}><Settings size={19}/></IconButton>
   </div>
   {auth.available&&auth.status!=='loading'&&(a
    ?<DropdownMenu label={t.myAccount} open={menu} onOpenChange={setMenu} menuClassName="min-w-[200px]"
      trigger={p=><button type="button" className={accountLink(false,menu)} aria-label={t.myAccount} {...p}>
       <Avatar small account={a}/>{a.nickname??t.myAccount}<ChevronDown size={14} className={cx('text-[#9aabbb] transition-transform',menu&&'rotate-180')}/>
      </button>}>
      <MenuItem onClick={onMyAccount}><UserRound size={15}/> {t.myAccount}</MenuItem>
      {onMyRoom&&<MenuItem onClick={onMyRoom}><Tv size={15}/> {t.myRoom}</MenuItem>}
      <MenuDivider/>
      <MenuItem danger onClick={onSignOut}><LogOut size={15}/> {t.signOut}</MenuItem>
     </DropdownMenu>
    :<button type="button" className={accountLink(true)} onClick={onLogin}>{t.signIn}</button>)}
  </div>
 </header>;
}
