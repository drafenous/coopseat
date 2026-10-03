import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';

export function MenuItem({danger,className,...rest}:ButtonHTMLAttributes<HTMLButtonElement>&{danger?:boolean}){
 return <button type="button" role="menuitem" {...rest} className={cx('flex w-full items-center gap-2.5 rounded-[7px] border-0 bg-transparent px-[11px] py-2.5 text-left text-[13px] min-[1800px]:text-[14px] not-disabled:hover:bg-[#ffffff0f] [&>svg]:flex-none',
  danger?'text-[#f5a597]':'text-[#d4dee8] [&>svg]:text-[#9aabbb]',className)}/>;
}
