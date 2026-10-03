import type {InputHTMLAttributes,ReactNode} from 'react';
import {FieldHint,TextInput} from '../atoms';
import './Field.css';

type Props=InputHTMLAttributes<HTMLInputElement>&{label:string;error?:string;hint?:ReactNode};

export function Field({label,error,hint,...rest}:Props){
 return <label className="field">{label}
  <TextInput aria-invalid={error?true:undefined} {...rest}/>
  {error?<FieldHint warn>{error}</FieldHint>:hint?<FieldHint muted>{hint}</FieldHint>:null}
 </label>;
}
