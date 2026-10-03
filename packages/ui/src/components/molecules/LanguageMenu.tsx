import {useState} from 'react';
import {Check,Languages} from 'lucide-react';
import {MenuItem} from '../atoms';
import {DropdownMenu} from './DropdownMenu';
import {LOCALE_NAMES,UI_LOCALES,setLocale,useLocale,useT} from '../../i18n';

export function LanguageMenu(){
 const [open,setOpen]=useState(false);
 const locale=useLocale(),label=useT().common.language;
 return <DropdownMenu label={label} open={open} onOpenChange={setOpen} icon={<Languages size={19}/>} triggerClassName="" menuClassName="min-w-[170px]">
  {UI_LOCALES.map(l=><MenuItem key={l} role="menuitemradio" aria-checked={l===locale} lang={l} onClick={()=>setLocale(l)}>
   <span className="flex-1">{LOCALE_NAMES[l]}</span>{l===locale&&<Check size={15}/>}
  </MenuItem>)}
 </DropdownMenu>;
}
