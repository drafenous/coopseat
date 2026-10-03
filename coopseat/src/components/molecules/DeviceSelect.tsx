import type {Device} from '../../types';
import {SelectField} from './SelectField';

type Props={label:string;value:string;items:Device[];placeholder:string;disabled?:boolean;onChange(value:string):void};

export function DeviceSelect({label,value,items,placeholder,disabled,onChange}:Props){
 return <SelectField label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{items.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</SelectField>;
}
