import type {SelectHTMLAttributes} from 'react';
import {Select} from '../atoms';
import './Field.css';

export function SelectField({label,children,...rest}:SelectHTMLAttributes<HTMLSelectElement>&{label:string}){
 return <label className="field">{label}<Select {...rest}>{children}</Select></label>;
}
