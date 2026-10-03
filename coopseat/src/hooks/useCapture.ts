import {useCallback,useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {Devices,Mode,NativeEvent} from '../types';
import {errorText,niceError} from '../lib/errors';
import {emptyDevices,type Backend,type Settings} from '../lib/settings';

type Options={settings:Settings;setSettings:Dispatch<SetStateAction<Settings>>;top:boolean;setError:Dispatch<SetStateAction<string>>;setNotice:(message:string)=>void};
export type DeviceKey='video'|'audio'|'output';

export function useCapture({settings:s,setSettings:setS,top,setError,setNotice}:Options){
 const [devices,setDevices]=useState<Devices>(emptyDevices),[modes,setModes]=useState<Mode[]>([]),[native,setNative]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[running,setRunning]=useState(false),[stats,setStats]=useState<NativeEvent|null>(null);
 const videoRef=useRef<HTMLVideoElement>(null),audioRef=useRef<HTMLAudioElement>(null),screenRef=useRef<HTMLDivElement>(null),stream=useRef<MediaStream|null>(null),audioStream=useRef<MediaStream|null>(null),generation=useRef(0),autoDone=useRef(false),current=useRef(s),runningRef=useRef(false);
 current.current=s;runningRef.current=running;

 const release=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());audioStream.current?.getTracks().forEach(t=>t.stop());stream.current=null;audioStream.current=null;if(videoRef.current)videoRef.current.srcObject=null;if(audioRef.current)audioRef.current.srcObject=null;},[]);
 const stop=useCallback(async()=>{generation.current++;release();await window.input?.stop();setRunning(false);setBusy(false);setStats(null);},[release]);

 useEffect(()=>{let alive=true;window.input?.info().then(info=>{if(!alive)return;setNative(info.native);if(!info.native)setS(x=>({...x,backend:'compat'}));setLoaded(true);}).catch(e=>{setError(errorText(e));setLoaded(true);});if(!window.input){setLoaded(true);setS(x=>({...x,backend:'compat'}));}return()=>{alive=false;release();};},[release]);
 useEffect(()=>window.input?.onNative(e=>{if(e.type==='started'){setBusy(false);setRunning(true);setStats(e);}else if(e.type==='stats')setStats(x=>({...x,...e}));else if(e.type==='error'){setError(e.message||'Falha nativa.');void stop();}else if(e.type==='warning')setNotice(e.message||'');else if(e.type==='stopped'){setRunning(false);setBusy(false);setStats(null);if(e.message)setError(previous=>previous||e.message!);}}),[stop]);

 const refresh=useCallback(async()=>{setError('');try{
  let d:Devices;const backend=current.current.backend;
  if(backend==='native') d=await window.input!.devices();else {if(!navigator.mediaDevices)throw Error('Abra pelo aplicativo ou em localhost.');const all=await navigator.mediaDevices.enumerateDevices();const to=(kind:MediaDeviceKind)=>all.filter(x=>x.kind===kind&&x.deviceId).map((x,i)=>({id:x.deviceId,name:x.label||`Dispositivo ${i+1}`}));d={video:to('videoinput'),audio:to('audioinput'),output:to('audiooutput')};}
  if(current.current.backend!==backend)return;setDevices(d);setS(x=>({...x,video:d.video.some(v=>v.id===x.video)?x.video:(d.video.find(v=>/fifine|capture|usb video/i.test(v.name))||d.video[0])?.id||'',audio:d.audio.some(a=>a.id===x.audio)?x.audio:'',output:d.output.some(a=>a.id===x.output)?x.output:''}));
 }catch(e){setError(niceError(e));}},[]);
 useEffect(()=>{if(loaded)void refresh();},[s.backend,loaded,refresh]);
 useEffect(()=>{let alive=true;setModes([]);if(s.backend==='native'&&s.video)window.input!.modes(s.video).then(({modes:m})=>{if(!alive)return;const supported=m.filter(x=>x.supported);setModes(supported);setS(x=>({...x,mode:supported.some(v=>v.index===x.mode)?x.mode:(supported.slice().sort((a,b)=>Math.abs(a.fps-60)-Math.abs(b.fps-60)||Math.abs(a.width-1920)-Math.abs(b.width-1920)||(['NV12','YUY2','MJPG'].indexOf(a.format)-['NV12','YUY2','MJPG'].indexOf(b.format)))[0]?.index??0)}));}).catch(e=>alive&&setError(errorText(e)));return()=>{alive=false;};},[s.video,s.backend]);
 useEffect(()=>{const fn=()=>{if(runningRef.current){setNotice('A lista de dispositivos mudou. Se a captura parou, reconecte a placa e atualize.');}else void refresh();};navigator.mediaDevices?.addEventListener('devicechange',fn);return()=>navigator.mediaDevices?.removeEventListener('devicechange',fn);},[refresh]);

 const start=useCallback(async()=>{const cfg=current.current;setError('');setNotice('');setBusy(true);setStats(null);const token=++generation.current;
 try{
  if(!cfg.video)throw Error('Selecione uma placa de captura.');
  if(cfg.backend==='native'){await window.input!.open({device:cfg.video,mode:cfg.mode,audio:cfg.audio,output:cfg.output,volume:cfg.volume,vsync:cfg.vsync,top});return;}
  const [width,height]=cfg.resolution.split('x').map(Number);
  const v=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:cfg.video},width:{exact:width},height:{exact:height},frameRate:{ideal:cfg.fps}},audio:false});
  if(token!==generation.current){v.getTracks().forEach(t=>t.stop());return;}stream.current=v;
  const track=v.getVideoTracks()[0];track.addEventListener('ended',()=>{setError('A placa foi desconectada ou interrompeu a captura.');void stop();},{once:true});
  if(videoRef.current){videoRef.current.srcObject=v;await videoRef.current.play();}
  if(cfg.audio){try{const a=await navigator.mediaDevices.getUserMedia({video:false,audio:{deviceId:{exact:cfg.audio},echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2},sampleRate:{ideal:48000}}});if(token!==generation.current){a.getTracks().forEach(t=>t.stop());return;}audioStream.current=a;
   if(audioRef.current){audioRef.current.srcObject=a;audioRef.current.volume=cfg.volume;const el=audioRef.current as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};if(cfg.output&&el.setSinkId)await el.setSinkId(cfg.output);await el.play();}
  }catch(e){audioStream.current?.getTracks().forEach(t=>t.stop());audioStream.current=null;setNotice(`Vídeo ativo, mas o áudio falhou: ${niceError(e)}`);}}
  if(token!==generation.current)return;const actual=track.getSettings();setStats({type:'started',width:actual.width,height:actual.height,fps:actual.frameRate,format:'Chromium'});setRunning(true);setBusy(false);
 }catch(e){if(token!==generation.current)return;release();setBusy(false);setRunning(false);setError(niceError(e));}
 },[release,stop,top]);
 useEffect(()=>{if(loaded&&s.auto&&s.video&&!autoDone.current&&(s.backend==='compat'||modes.length)){autoDone.current=true;void start();}},[loaded,s.auto,s.video,s.backend,modes,start]);

 useEffect(()=>{if(audioRef.current)audioRef.current.volume=s.volume;if(s.backend==='native'&&running)void window.input?.control('volume',s.volume);},[s.volume,running,s.backend]);
 useEffect(()=>{if(s.backend==='native'&&running)void window.input?.control('vsync',s.vsync);},[s.vsync,running,s.backend]);

 const permit=async()=>{try{const v=await navigator.mediaDevices.getUserMedia({video:true,audio:false});v.getTracks().forEach(t=>t.stop());await refresh();}catch(e){setError(niceError(e));}};
 const resetDevices=useCallback(()=>setDevices(emptyDevices),[]);
 const selectDevice=(key:DeviceKey,value:string)=>setS(x=>({...x,[key]:value,...(key==='video'?{mode:-1}:{})}));
 const changeBackend=(backend:Backend)=>{setDevices(emptyDevices);setS(x=>({...x,video:'',audio:'',output:'',backend}));};

 return {devices,modes,native,loaded,busy,running,stats,videoRef,audioRef,screenRef,start,stop,refresh,permit,resetDevices,selectDevice,changeBackend};
}
