import type {ButtonHTMLAttributes} from 'react';

export function MenuItem({danger,...rest}:ButtonHTMLAttributes<HTMLButtonElement>&{danger?:boolean}){
 return <button type="button" role="menuitem" className={danger?'danger':undefined} {...rest}/>;
}
