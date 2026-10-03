import type {ButtonHTMLAttributes} from 'react';
import './TextButton.css';

export function TextButton(props:ButtonHTMLAttributes<HTMLButtonElement>){
 return <button type="button" className="text-button" {...props}/>;
}
