import type {ReactNode} from 'react';
import {ArrowUpRight,AudioLines,Bookmark,MonitorPlay,RefreshCw,Settings2,Zap} from 'lucide-react';
import type {Devices,Mode} from '../../types';
import type {DeviceKey} from '../../hooks/useCapture';
import {CINEMA_DELAYS,type Backend,type Settings} from '../../lib/settings';
import {Divider,IconButton,SectionLabel,TextButton} from '../atoms';
import {CaptureButton,DeviceSelect,SelectField,ToggleField} from '../molecules';
import {AdvancedSettings} from './AdvancedSettings';
import './SettingsPanel.css';

type Props={settings:Settings;change<K extends keyof Settings>(key:K,value:Settings[K]):void;devices:Devices;modes:Mode[];native:boolean;running:boolean;busy:boolean;canStart:boolean;needsPermission:boolean;presetPicker:ReactNode;onRefresh():void;onPermit():void;onSelectDevice(key:DeviceKey,value:string):void;onBackendChange(backend:Backend):void;onStart():void;onStop():void};

export function SettingsPanel({settings:s,change,devices,modes,native,running,busy,canStart,needsPermission,presetPicker,onRefresh,onPermit,onSelectDevice,onBackendChange,onStart,onStop}:Props){
 const locked=running||busy;
 return <aside>
  <div className="aside-body">
   <div className="panel-title"><Settings2 size={18}/><h2>Configurar entrada</h2><IconButton label="Atualizar dispositivos" disabled={locked} onClick={onRefresh}><RefreshCw size={16}/></IconButton></div>
   <SectionLabel icon={<Bookmark size={14}/>}>PRESET</SectionLabel>
   {presetPicker}
   <Divider/>
   <DeviceSelect label="Placa de captura" value={s.video} items={devices.video} placeholder="Selecione um dispositivo" disabled={locked} onChange={v=>onSelectDevice('video',v)}/>
   {needsPermission&&<TextButton onClick={onPermit}>Permitir câmera e microfone <ArrowUpRight size={13}/></TextButton>}
   <SectionLabel icon={<AudioLines size={14}/>}>ÁUDIO</SectionLabel>
   <DeviceSelect label="Entrada de áudio da placa" value={s.audio} items={devices.audio} placeholder="Sem áudio" disabled={locked} onChange={v=>onSelectDevice('audio',v)}/>
   <DeviceSelect label="Tocar o som em" value={s.output} items={devices.output} placeholder="Padrão do Windows" disabled={locked} onChange={v=>onSelectDevice('output',v)}/>
   <SectionLabel icon={<MonitorPlay size={14}/>}>EXIBIÇÃO</SectionLabel>
   <ToggleField label="Modo cinema automático" hint="Esconde os controles e amplia o vídeo na janela quando você fica parado. Mexa o mouse para voltar." checked={s.autoFull} onChange={v=>change('autoFull',v)}/>
   {s.autoFull&&<SelectField label="Entrar no modo cinema após" value={s.cinemaDelay} onChange={e=>change('cinemaDelay',Number(e.target.value))}>{CINEMA_DELAYS.map(d=><option key={d} value={d}>{d} segundos parado</option>)}</SelectField>}
   <Divider/>
   <ToggleField label="Conectar ao abrir" hint="Inicia a captura assim que o app abre" checked={s.auto} onChange={v=>change('auto',v)}/>
   <AdvancedSettings settings={s} change={change} modes={modes} native={native} locked={locked} onBackendChange={onBackendChange}/>
  </div>
  <div className="aside-foot">
   <CaptureButton running={running} busy={busy} canStart={canStart} onStart={onStart} onStop={onStop}/>
   <p className="panel-foot"><Zap size={13}/> A captura fica no seu PC. Nada é gravado.</p>
  </div>
 </aside>;
}
