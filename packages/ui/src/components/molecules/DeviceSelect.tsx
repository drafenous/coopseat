import type {Device} from '../../types';
import {SelectField} from './SelectField';

type Props={label:string;value:string;items:Device[];placeholder:string;disabled?:boolean;onChange(value:string):void};

export function DeviceSelect({label,value,items,placeholder,disabled,onChange}:Props){
 return <SelectField label={label} value={value} disabled={disabled} onChange={onChange} options={[{value:'',label:placeholder},...items.map(d=>({value:d.id,label:d.name}))]}/>;
}
