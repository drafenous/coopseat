import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';

type Props=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'title'>&{label:string;title?:string;selected?:boolean;text?:string;size?:'md'|'sm'|'xs'};
const pads={md:'p-2',sm:'p-[5px]',xs:'p-1'};

export function IconButton({label,title=label,selected,text,size='md',className,children,...rest}:Props){
 return <button type="button" aria-label={label} title={title} {...rest} className={cx('inline-flex items-center justify-center rounded-[7px] not-disabled:hover:bg-[#ffffff0d] not-disabled:hover:text-[#effff8]',
  selected?'bg-[#a8f0cb17] text-[#a8f0cb]':'bg-transparent text-[#a5b2c3]',
  text?'gap-[7px] px-[11px] py-[7px] text-[12px] font-[550] max-[900px]:p-2':pads[size],
  className)}>{children}{text&&<span className="max-[900px]:hidden">{text}</span>}</button>;
}
