import type {ReactNode} from 'react';
import {cx} from '../../lib/cx';
import './FieldHint.css';

export function FieldHint({warn,muted,children}:{warn?:boolean;muted?:boolean;children:ReactNode}){
 return <p className={cx('field-hint',warn&&'warn',muted&&'muted')}>{children}</p>;
}
