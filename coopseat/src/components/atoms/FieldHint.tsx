import type {ReactNode} from 'react';
import {cx} from '../../lib/cx';
import './FieldHint.css';

export function FieldHint({warn,children}:{warn?:boolean;children:ReactNode}){
 return <p className={cx('field-hint',warn&&'warn')}>{children}</p>;
}
