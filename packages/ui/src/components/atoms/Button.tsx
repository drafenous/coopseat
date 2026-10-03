import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';

export type ButtonVariant='primary'|'secondary'|'danger';
/** `wide` fills the row; `inline` sizes a primary button to its label; `compact` shrinks a secondary/danger button to fit a list row. */
type Style={variant?:ButtonVariant;stop?:boolean;hero?:boolean;wide?:boolean;inline?:boolean;compact?:boolean;className?:string};
type Props=ButtonHTMLAttributes<HTMLButtonElement>&Style;

const base='flex items-center justify-center gap-[9px] border no-underline';

const primaryClass=({stop,hero,inline}:Style)=>cx(base,'font-[650] shadow-[0_3px_18px_#9aedc40a]',
 stop?'border-[#4c6e61] bg-[#263331] text-accent not-disabled:hover:bg-[#2e3f3c]':'border-accent-border bg-accent text-accent-ink not-disabled:hover:bg-accent-hover',
 hero?'mt-[22px] w-auto min-w-[240px] rounded-[10px] px-7 py-3.5 text-[15px] short:mt-4':cx('rounded-lg text-[14px]',inline?'w-auto px-[22px] py-3':'w-full p-[13px]'));

const outlineClass=({variant,wide,compact}:Style)=>cx(base,'rounded-lg bg-transparent font-semibold',
 variant==='danger'?'border-[#7a3b40] text-danger not-disabled:hover:bg-[#ff9d9d14]':'border-line-strong text-[#d4dee8] not-disabled:hover:bg-[#ffffff0a]',
 compact?'px-3 py-[7px] text-[13px]':'px-[18px] py-3 text-[14px]',
 wide&&'w-full');

/** Button look for other elements, e.g. a router link. */
export const buttonClass=({variant='primary',className,...style}:Style={})=>cx(variant==='primary'?primaryClass(style):outlineClass({variant,...style}),className);

export function Button({variant,stop,hero,wide,inline,compact,className,type='button',...rest}:Props){
 return <button type={type} className={buttonClass({variant,stop,hero,wide,inline,compact,className})} {...rest}/>;
}
