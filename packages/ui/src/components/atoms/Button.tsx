import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';
import './Button.css';

export type ButtonVariant='primary'|'secondary'|'danger';
/** `wide` fills the row; `inline` sizes a primary button to its label. */
type Style={variant?:ButtonVariant;stop?:boolean;hero?:boolean;wide?:boolean;inline?:boolean;className?:string};
type Props=ButtonHTMLAttributes<HTMLButtonElement>&Style;

/** Button look for other elements, e.g. a router link. */
export const buttonClass=({variant='primary',stop,hero,wide,inline,className}:Style={})=>cx(variant==='danger'?'danger-button':variant,stop&&'stop',hero&&'hero',wide&&'wide',inline&&'auto-width',className);

export function Button({variant,stop,hero,wide,inline,className,type='button',...rest}:Props){
 return <button type={type} className={buttonClass({variant,stop,hero,wide,inline,className})} {...rest}/>;
}
