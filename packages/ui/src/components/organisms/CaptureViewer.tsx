import type {ReactNode,RefObject} from 'react';
import {Clapperboard,Monitor} from 'lucide-react';
import type {NativeEvent} from '../../types';
import type {Backend} from '../../lib/settings';
import {Dot,Kbd,Tag} from '../atoms';
import './CaptureViewer.css';

type Props={backend:Backend;running:boolean;stats:NativeEvent|null;cinemaHint:boolean;screenRef:RefObject<HTMLDivElement|null>;videoRef:RefObject<HTMLVideoElement|null>;audioRef:RefObject<HTMLAudioElement|null>;emptyState:ReactNode;transport:ReactNode};

export function CaptureViewer({backend,running,stats,cinemaHint,screenRef,videoRef,audioRef,emptyState,transport}:Props){
 const compatLive=running&&backend==='compat';
 return <section className="viewer">
  <div className="viewer-top">
   <span><Monitor size={16}/> Monitor de captura</span>
   <span className="viewer-info">{running&&stats?.width?<span className="live-info">{stats.width} × {stats.height}{stats.fps?` · ${stats.fps.toFixed(0)} fps`:''}</span>:null}<Tag>{backend==='native'?'NATIVO':'COMPATIBILIDADE'}</Tag></span>
  </div>
  <div className="screen" ref={screenRef}>
   <video ref={videoRef} autoPlay playsInline muted className={compatLive?'visible':''}/><audio ref={audioRef} autoPlay/>
   {emptyState}
   {compatLive&&<div className="live-badge"><Dot/>AO VIVO</div>}
   {cinemaHint&&<div className="cinema-hint"><Clapperboard size={15}/> Modo cinema · mexa o mouse para sair · <Kbd>F11</Kbd> monitor inteiro</div>}
  </div>
  {transport}
 </section>;
}
