import type {NativeEvent} from '../../types';
import type {Backend} from '../../lib/settings';
import {MetricCard} from '../molecules';
import './MetricsBar.css';

export function MetricsBar({stats,backend,running}:{stats:NativeEvent|null;backend:Backend;running:boolean}){
 return <section className="metrics">
  <MetricCard label="SINAL RECEBIDO" value={stats?.width?`${stats.width} × ${stats.height}`:'—'} detail={stats?.format||(running?'Aguardando dados':'Inicie a captura para ver')}/>
  <MetricCard label={`FPS ${backend==='native'?'NA TELA':'NEGOCIADOS'}`} value={stats?.fps?.toFixed(1)||'—'} detail="quadros por segundo"/>
  <MetricCard label="QUADROS PERDIDOS" value={stats?.dropped??'—'} detail="descartados pelo app"/>
 </section>;
}
