import type {InputHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';

/** `code` is the large, spaced-out look for one-time codes. */
export function TextInput({code,className,...props}:InputHTMLAttributes<HTMLInputElement>&{code?:boolean}){
 return <input className={cx('h-10 w-full min-w-0 rounded-[7px] border border-[#304050] bg-field px-2.5 text-field-text placeholder:text-subtle hover:border-[#3d5163] aria-invalid:border-danger min-[1800px]:h-11',
  code?'text-center text-[18px] tracking-[6px]':'text-[13px] min-[1800px]:text-[14px]',className)} {...props}/>;
}
