import {ArrowUpRight,Cable,ChevronRight,Monitor} from 'lucide-react';
import {Button} from '../atoms';
import {CaptureButton,ChecklistItem} from '../molecules';
import './ViewerEmptyState.css';

type Props={busy:boolean;hasDevices:boolean;videoName?:string;audioName?:string;formatLabel:string;needsPermission:boolean;canStart:boolean;onStart():void;onStop():void;onPermit():void};

export function ViewerEmptyState({busy,hasDevices,videoName,audioName,formatLabel,needsPermission,canStart,onStart,onStop,onPermit}:Props){
 return <div className="empty">
  <div className="screen-symbol"><Monitor size={42} strokeWidth={1.2}/><span><Cable size={17}/></span></div>
  <h2>{busy?'Preparando a captura…':hasDevices?'Tudo pronto para jogar':'Conecte sua placa de captura'}</h2>
  {hasDevices?<ul className="checklist">
   <ChecklistItem status={videoName?'ok':'warn'} title="Placa">{videoName||'Escolha uma placa no painel ao lado'}</ChecklistItem>
   <ChecklistItem status={audioName?'ok':'neutral'} title="Áudio">{audioName||'Sem áudio · escolha a entrada da placa'}</ChecklistItem>
   <ChecklistItem status={formatLabel?'ok':'neutral'} title="Imagem">{formatLabel||'Detectando formatos…'}</ChecklistItem>
  </ul>:<>
   <p>Ligue o HDMI do console na placa de captura<br/>e a placa numa porta USB do computador.</p>
   <div className="connection"><span>CONSOLE</span><ChevronRight size={14}/><span>CAPTURA USB</span><ChevronRight size={14}/><span>COMPUTADOR</span></div>
  </>}
  {needsPermission?<Button hero onClick={onPermit}><ArrowUpRight size={18}/> Permitir câmera e microfone</Button>
   :<CaptureButton hero running={false} busy={busy} canStart={canStart} onStart={onStart} onStop={onStop}/>}
 </div>;
}
