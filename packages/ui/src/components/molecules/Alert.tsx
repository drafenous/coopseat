import type {ReactNode} from 'react';
import './Alert.css';

export function Alert({tone='error',children}:{tone?:'error'|'success'|'info';children:ReactNode}){
 return <div role={tone==='error'?'alert':'status'} className={`alert ${tone}`}>{children}</div>;
}
