import {Activity,Clapperboard,Keyboard,Maximize,Pin} from 'lucide-react';
import {IconButton} from '../atoms';
import {Shortcut,VolumeControl} from '../molecules';
import './TransportBar.css';

type Props={volume:number;onVolume(volume:number):void;showStats:boolean;onToggleStats():void;top:boolean;canPin:boolean;onPin():void;cinemaActive:boolean;canCinema:boolean;onCinema():void;onFullscreen():void};

export function TransportBar({volume,onVolume,showStats,onToggleStats,top,canPin,onPin,cinemaActive,canCinema,onCinema,onFullscreen}:Props){
 return <div className="transport">
  <VolumeControl volume={volume} onChange={onVolume}/>
  <div className="shortcuts"><Keyboard size={14}/><Shortcut keys="F11">tela cheia</Shortcut><Shortcut keys="Esc">sair</Shortcut><Shortcut keys="M">silenciar</Shortcut></div>
  <div className="transport-actions">
   <IconButton label="Detalhes técnicos" selected={showStats} aria-pressed={showStats} onClick={onToggleStats}><Activity size={17}/></IconButton>
   <IconButton label="Sempre no topo" selected={top} aria-pressed={top} disabled={!canPin} onClick={onPin}><Pin size={17}/></IconButton>
   <span className="transport-sep"/>
   <IconButton label="Modo cinema" title="Modo cinema: esconde os controles e amplia o vídeo na janela" text="Cinema" selected={cinemaActive} disabled={!canCinema} onClick={onCinema}><Clapperboard size={17}/></IconButton>
   <IconButton label="Tela cheia no monitor inteiro" title="Tela cheia no monitor inteiro · F11" text="Tela cheia" onClick={onFullscreen}><Maximize size={17}/></IconButton>
  </div>
 </div>;
}
