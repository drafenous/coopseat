import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';
import './Button.css';

type Props=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary';stop?:boolean;hero?:boolean};

export function Button({variant='primary',stop,hero,className,type='button',...rest}:Props){
 return <button type={type} className={cx(variant,stop&&'stop',hero&&'hero',className)} {...rest}/>;
}
