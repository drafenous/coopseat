import type {HTMLAttributes,ReactNode} from 'react';
import {X} from 'lucide-react';
import {IconButton} from '../atoms';
import {useT} from '../../i18n';

type Variant='info'|'error'|'countdown';
type Props=HTMLAttributes<HTMLDivElement>&{variant?:Variant;icon:ReactNode;onClose?():void};

const variants:Record<Variant,string>={
 info:'border-[#365060] bg-[#14212bf5] text-[#d7e7ef] [&>svg]:text-[#8fd3f0]',
 error:'border-[#65433d] bg-[#2a1918f5] text-[#f8c2b8] [&>svg]:text-[#f59a8b]',
 countdown:'border-[#b0f3d266] bg-[#122420f5] text-[#d8f5e7] [&>svg]:text-accent',
};

export function Toast({variant='info',icon,onClose,children,...rest}:Props){
 const t=useT();
 return <div className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-[10px] border py-[13px] pr-2 pl-[15px] text-[14px] leading-[1.5] shadow-[0_12px_32px_#00000080] animate-toast-in motion-reduce:animate-none [&>svg]:mt-0.5 [&>svg]:flex-none ${variants[variant]}`} {...rest}>
  {icon}<span className="min-w-0 flex-1 wrap-anywhere">{children}</span>
  {onClose&&<IconButton size="xs" className="-mt-px" label={t.common.close} onClick={onClose}><X size={14}/></IconButton>}
 </div>;
}
