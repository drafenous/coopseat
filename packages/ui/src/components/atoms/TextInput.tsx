import type {InputHTMLAttributes} from 'react';
import {cx} from '../../lib/cx';
import './TextInput.css';

export function TextInput({className,...props}:InputHTMLAttributes<HTMLInputElement>){
 return <input className={cx('text-input',className)} {...props}/>;
}
