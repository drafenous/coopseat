import {cx} from '../../lib/cx';
import {Dot} from '../atoms';
import './StatusPill.css';

export type CaptureStatus='idle'|'busy'|'live';
const labels:Record<CaptureStatus,string>={idle:'Pronto para conectar',busy:'Conectando…',live:'Captura ativa'};

export function StatusPill({status}:{status:CaptureStatus}){
 return <span className={cx('status',status!=='idle'&&status)}><Dot/>{labels[status]}</span>;
}
