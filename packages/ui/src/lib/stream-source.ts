import {bridge} from '../platform';

export type StreamSourceKind='card'|'screen'|'window';
/**
 * What a streamer sends to the party. Tracks are owned by the source: `stop()` releases them quietly,
 * `end()` releases them and notifies `onEnded` like the user ending a share from the OS/browser UI.
 */
export type StreamSource={kind:StreamSourceKind;label:string;stream:MediaStream;stop():void;end():void;onEnded(callback:()=>void):()=>void};

const GAME_VIDEO:MediaTrackConstraints={frameRate:{ideal:60,max:60},width:{max:1920},height:{max:1080}};
/** Game audio: no voice processing, stereo, 48 kHz. */
const GAME_AUDIO:MediaTrackConstraints={echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2},sampleRate:{ideal:48000}};

function wrap(kind:StreamSourceKind,label:string,stream:MediaStream,onStop?:()=>void):StreamSource{
 let stopped=false;
 const ended=new Set<()=>void>();
 const stop=()=>{if(stopped)return;stopped=true;stream.getTracks().forEach(t=>t.stop());onStop?.();};
 const end=()=>{if(stopped)return;stop();ended.forEach(fn=>fn());};
 // The user can end a share from the OS/browser UI; the video track ending ends the source.
 stream.getVideoTracks()[0]?.addEventListener('ended',end,{once:true});
 return {kind,label,stream,stop,end,onEnded:cb=>{ended.add(cb);return()=>ended.delete(cb);}};
}

/**
 * The capture card as shown in the viewer (compatibility backend). Tracks are cloned so stopping
 * the stream never stops the local preview, and vice versa.
 */
export function cardSource(preview:MediaStream,label:string):StreamSource{
 return wrap('card',label,new MediaStream(preview.getTracks().filter(t=>t.readyState==='live').map(t=>t.clone())));
}

/**
 * Screen or window. On desktop the source comes from our own picker (`sourceId`) and system audio is
 * Windows loopback; on the web the browser shows its picker and tab/system audio when offered.
 */
export async function displaySource({kind,sourceId,label,audio}:{kind:'screen'|'window';sourceId?:string;label?:string;audio:boolean}):Promise<StreamSource>{
 const b=bridge();
 if(b){
  if(!sourceId)throw Error('source_required');
  await b.screen.pick(sourceId,audio);
  const stream=await navigator.mediaDevices.getDisplayMedia({video:GAME_VIDEO,audio:audio?GAME_AUDIO:false});
  // A screen share would also capture this window (chat, other streams): hide it from captures meanwhile.
  if(kind==='screen')await b.screen.protect(true).catch(()=>false);
  return wrap(kind,label??'',stream,kind==='screen'?()=>void b.screen.protect(false).catch(()=>false):undefined);
 }
 const stream=await navigator.mediaDevices.getDisplayMedia({
  video:{...GAME_VIDEO,displaySurface:kind==='screen'?'monitor':'window'},
  audio:audio?GAME_AUDIO:false,
  // Chromium-only hints; other browsers ignore unknown members.
  ...({selfBrowserSurface:'exclude',surfaceSwitching:'include',systemAudio:audio?'include':'exclude'} as object),
 } as DisplayMediaStreamOptions);
 return wrap(kind,label??stream.getVideoTracks()[0]?.label??'',stream);
}

export const canShareScreen=()=>Boolean(bridge()||navigator.mediaDevices?.getDisplayMedia);
