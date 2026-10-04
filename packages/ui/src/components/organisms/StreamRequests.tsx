import {Check,Hand,X} from 'lucide-react';
import type {PendingUser} from '../../party/protocol';
import {IconButton,SectionLabel} from '../atoms';
import {useT} from '../../i18n';

/** Requests to stream; a grant only lasts for the current session. */
export function StreamRequests({users,onGrant,onDeny}:{users:PendingUser[];onGrant(id:string):void;onDeny(id:string):void}){
 const t=useT().party.requests;
 if(!users.length)return null;
 return <section className="border-b border-line-soft px-4 py-3">
  <SectionLabel icon={<Hand size={14}/>}>{t.title.toUpperCase()} · {users.length}</SectionLabel>
  <ul className="space-y-1">{users.map(u=><li key={u.id} className="flex items-center gap-2 text-[13px] text-[#d4dee8]">
   <span className="min-w-0 flex-1 truncate">{u.nick}</span>
   <IconButton size="sm" label={`${t.grant} ${u.nick}`} className="text-accent" onClick={()=>onGrant(u.id)}><Check size={16}/></IconButton>
   <IconButton size="sm" label={`${t.deny} ${u.nick}`} onClick={()=>onDeny(u.id)}><X size={16}/></IconButton>
  </li>)}</ul>
 </section>;
}
