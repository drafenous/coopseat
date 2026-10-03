import {Switch} from '../atoms';
import './ToggleField.css';

type Props={label:string;hint:string;checked:boolean;disabled?:boolean;onChange(checked:boolean):void};

export function ToggleField({label,hint,checked,disabled,onChange}:Props){
 return <label className="toggle"><span>{label}<span className="hint">{hint}</span></span><Switch checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}/></label>;
}
