import type {ButtonHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';
import './IconButton.css';

type Props=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'title'>&{label:string;title?:string;selected?:boolean;text?:string};

export function IconButton({label,title=label,selected,text,className,children,...rest}:Props){
 return <button type="button" className={cx('icon',text&&'labeled',selected&&'selected',className)} aria-label={label} title={title} {...rest}>{children}{text&&<span>{text}</span>}</button>;
}
