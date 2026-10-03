import {CircleHelp} from 'lucide-react';
import type {Auth} from '../../hooks/useAuth';
import {IconButton} from '../atoms';
import {Brand,StatusPill,type CaptureStatus} from '../molecules';
import {Avatar} from './Avatar';
import './AppHeader.css';
import './Auth.css';

type Props={status:CaptureStatus;auth:Auth;onHelp():void;onLogin():void;onAccount():void};

export function AppHeader({status,auth,onHelp,onLogin,onAccount}:Props){
 const a=auth.account;
 return <header>
  <Brand/>
  <div className="header-right">
   <StatusPill status={status}/>
   <IconButton label="Ajuda" onClick={onHelp}><CircleHelp size={20}/></IconButton>
   {auth.available&&auth.status!=='loading'&&(a
    ?<button type="button" className="account-link" onClick={onAccount} aria-label="Minha conta"><Avatar small account={a}/>{a.nickname??'Minha conta'}</button>
    :<button type="button" className="account-link login" onClick={onLogin}>Entrar</button>)}
  </div>
 </header>;
}
