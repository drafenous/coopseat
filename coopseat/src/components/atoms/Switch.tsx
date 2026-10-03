import type {InputHTMLAttributes} from 'react';
import './Switch.css';

export function Switch(props:Omit<InputHTMLAttributes<HTMLInputElement>,'type'>){
 return <input className="switch" type="checkbox" {...props}/>;
}
