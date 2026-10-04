import type {SignalData} from '../../party/protocol';
import {preferVideoCodecs,prepareTrack,tuneAudioSender,tuneVideoSender,withStereoOpus,type SenderTuning} from './encoding';

export type LinkState='connecting'|'connected'|'reconnecting'|'failed'|'closed';
export type PeerLinkOptions={
 /** `${streamerId}>${viewerId}`, matched against SignalData.pc. */
 id:string;
 /** The streamer side offers (impolite); the viewer side answers and yields on collisions (polite). */
 side:'streamer'|'viewer';
 iceServers:RTCIceServer[];
 send(data:SignalData):void;
 onTrack?(stream:MediaStream):void;
 onState?(state:LinkState):void;
};

/** Survives brief packet loss: ICE `disconnected` often recovers by itself. */
export const DISCONNECT_GRACE_MS=5_000;
export const MAX_ICE_RESTARTS=4;
const RESTART_BACKOFF_MS=[0,2_000,5_000,10_000];

/** One RTCPeerConnection between a streamer and one viewer, with perfect negotiation and ICE restarts. */
export class PeerLink{
 readonly pc:RTCPeerConnection;
 private makingOffer=false;private ignoreOffer=false;private restarts=0;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private stream:MediaStream|null=null;private paused=false;
 private state:LinkState='connecting';private closed=false;

 constructor(private opts:PeerLinkOptions){
  this.pc=new RTCPeerConnection({iceServers:opts.iceServers,bundlePolicy:'max-bundle'});
  this.pc.onnegotiationneeded=()=>void this.offer();
  this.pc.onicecandidate=({candidate})=>{this.opts.send({pc:opts.id,candidate:candidate?candidate.toJSON() as SignalData['candidate']:null});};
  this.pc.oniceconnectionstatechange=()=>this.onIce();
  this.pc.ontrack=({streams,track})=>{opts.onTrack?.(streams[0]??new MediaStream([track]));};
 }

 get polite(){return this.opts.side==='viewer';}
 get linkState(){return this.state;}

 /** Streamer side: sends the stream's tracks, swapping without renegotiation when the kinds match. */
 async setStream(stream:MediaStream|null){
  this.stream=stream;
  const tracks=stream?.getTracks()??[];
  for(const kind of ['video','audio'] as const){
   const track=tracks.find(t=>t.kind===kind)??null;
   const tx=this.pc.getTransceivers().find(t=>t.sender.track?.kind===kind||t.receiver.track.kind===kind);
   if(track)prepareTrack(track);
   if(tx){await tx.sender.replaceTrack(this.paused?null:track);continue;}
   if(!track||!stream)continue;
   const created=this.pc.addTransceiver(track,{direction:'sendonly',streams:[stream]});
   if(kind==='video')preferVideoCodecs(created);
   if(this.paused)await created.sender.replaceTrack(null);
  }
 }

 /** Hidden tile: stop encoding and sending without renegotiating; resume swaps the tracks back. */
 async setPaused(paused:boolean){
  if(this.paused===paused)return;
  this.paused=paused;
  const tracks=this.stream?.getTracks()??[];
  await Promise.all(this.pc.getSenders().map(s=>{
   const kind=s.track?.kind??this.pc.getTransceivers().find(t=>t.sender===s)?.receiver.track.kind;
   return s.replaceTrack(paused?null:tracks.find(t=>t.kind===kind)??null);
  }));
 }

 async tune(tuning:SenderTuning){
  for(const sender of this.pc.getSenders()){
   const kind=this.pc.getTransceivers().find(t=>t.sender===sender)?.receiver.track.kind;
   if(kind==='video')await tuneVideoSender(sender,tuning);
   else if(kind==='audio')await tuneAudioSender(sender);
  }
 }

 setIceServers(iceServers:RTCIceServer[]){
  try{this.pc.setConfiguration({...this.pc.getConfiguration(),iceServers});}catch{/* closed */}
 }

 async handle(data:SignalData){
  if(this.closed)return;
  const pc=this.pc;
  try{
   if(data.description){
    const desc=data.description;
    const collision=desc.type==='offer'&&(this.makingOffer||pc.signalingState!=='stable');
    this.ignoreOffer=!this.polite&&collision;
    if(this.ignoreOffer)return;
    const sdp=desc.sdp&&this.opts.side==='streamer'?withStereoOpus(desc.sdp):desc.sdp;
    await pc.setRemoteDescription({type:desc.type,sdp});
    if(desc.type==='offer'){
     await pc.setLocalDescription();
     if(pc.localDescription)this.opts.send({pc:this.opts.id,description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
    }
   }else if('candidate' in data){
    try{await pc.addIceCandidate(data.candidate??undefined);}
    catch(e){if(!this.ignoreOffer)throw e;}
   }
  }catch(e){console.warn('WebRTC signaling error',this.opts.id,e);}
 }

 close(){
  if(this.closed)return;
  this.closed=true;this.clearTimer();
  this.pc.onnegotiationneeded=null;this.pc.onicecandidate=null;this.pc.oniceconnectionstatechange=null;this.pc.ontrack=null;
  this.pc.close();
  this.setState('closed');
 }

 private async offer(){
  if(this.closed||this.opts.side!=='streamer'&&this.pc.signalingState==='stable'&&!this.pc.remoteDescription)return;
  try{
   this.makingOffer=true;
   await this.pc.setLocalDescription();
   const d=this.pc.localDescription;
   if(d)this.opts.send({pc:this.opts.id,description:{type:d.type,sdp:d.sdp}});
  }catch(e){console.warn('WebRTC offer failed',this.opts.id,e);}
  finally{this.makingOffer=false;}
 }

 private onIce(){
  const s=this.pc.iceConnectionState;
  if(s==='connected'||s==='completed'){this.clearTimer();this.restarts=0;this.setState('connected');return;}
  if(s==='disconnected'){
   this.setState('reconnecting');
   this.clearTimer();
   this.timer=setTimeout(()=>{if(this.pc.iceConnectionState==='disconnected')this.restartIce();},DISCONNECT_GRACE_MS);
   return;
  }
  if(s==='failed')this.restartIce();
 }

 private restartIce(){
  if(this.closed)return;
  if(this.restarts>=MAX_ICE_RESTARTS){this.setState('failed');return;}
  const delay=RESTART_BACKOFF_MS[Math.min(this.restarts,RESTART_BACKOFF_MS.length-1)]!;
  this.restarts++;
  this.setState('reconnecting');
  this.clearTimer();
  this.timer=setTimeout(()=>{
   if(this.closed)return;
   const s=this.pc.iceConnectionState;
   if(s==='connected'||s==='completed')return;
   this.pc.restartIce();
   this.timer=setTimeout(()=>{const now=this.pc.iceConnectionState;if(now!=='connected'&&now!=='completed')this.restartIce();},15_000);
  },delay);
 }

 private clearTimer(){if(this.timer){clearTimeout(this.timer);this.timer=null;}}
 private setState(state:LinkState){if(this.state===state)return;this.state=state;this.opts.onState?.(state);}
}
