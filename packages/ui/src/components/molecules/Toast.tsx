import type {HTMLAttributes,ReactNode} from 'react';
import {X} from 'lucide-react';
import {cx} from '../../lib/cx';
import {IconButton} from '../atoms';
import './Toast.css';

type Props=HTMLAttributes<HTMLDivElement>&{variant?:'info'|'error'|'countdown';icon:ReactNode;onClose?():void};

export function Toast({variant='info',icon,onClose,children,...rest}:Props){
 return <div className={cx('toast',variant!=='info'&&variant)} {...rest}>{icon}<span>{children}</span>{onClose&&<IconButton label="Fechar" onClick={onClose}><X size={14}/></IconButton>}</div>;
}
