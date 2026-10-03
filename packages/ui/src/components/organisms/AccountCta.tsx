import {UserPlus} from 'lucide-react';
import {Button} from '../atoms';
import {useT} from '../../i18n';

export function AccountCta({onSignUp,onSignIn}:{onSignUp():void;onSignIn():void}){
 const t=useT().accountCta;
 return <section className="flex-none rounded-[14px] border border-accent-border bg-[#121921] px-5 py-4 min-[1800px]:px-6">
  <div className="mb-1.5 flex items-center gap-[9px] text-[#c3d0dd]"><UserPlus size={18} className="text-accent"/><h2 className="text-[15px] font-[550]">{t.title}</h2></div>
  <p className="mb-3.5 text-[13px] text-[#8494a5]">{t.body}</p>
  <div className="grid gap-2">
   <Button onClick={onSignUp}>{t.signUp}</Button>
   <Button variant="secondary" compact wide onClick={onSignIn}>{t.signIn}</Button>
  </div>
 </section>;
}
