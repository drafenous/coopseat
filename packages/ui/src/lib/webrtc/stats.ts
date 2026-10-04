import {MIN_VIDEO_KBPS} from './encoding';

export type OutboundSample={at:number;bytesSent:number;packetsSent:number;packetsLost:number;rttMs:number|null;availableKbps:number|null;limitation:string|null;fps:number|null};
export type InboundSample={at:number;bytesReceived:number;packetsReceived:number;packetsLost:number;jitterMs:number|null;fps:number|null;width:number|null;height:number|null;freezeCount:number};
export type InboundMetrics={kbps:number;lossRate:number;jitterMs:number|null;fps:number|null;width:number|null;height:number|null;freezes:number};

type Stat=Record<string,unknown>&{type:string;id:string};
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;

export async function outboundSample(pc:RTCPeerConnection):Promise<OutboundSample>{
 const stats=await pc.getStats();
 const s:OutboundSample={at:performance.now(),bytesSent:0,packetsSent:0,packetsLost:0,rttMs:null,availableKbps:null,limitation:null,fps:null};
 stats.forEach((r:Stat)=>{
  if(r.type==='outbound-rtp'&&r.kind==='video'){s.bytesSent+=num(r.bytesSent)??0;s.packetsSent+=num(r.packetsSent)??0;s.fps=num(r.framesPerSecond);s.limitation=typeof r.qualityLimitationReason==='string'?r.qualityLimitationReason:null;}
  else if(r.type==='remote-inbound-rtp'&&r.kind==='video'){s.packetsLost+=num(r.packetsLost)??0;const rtt=num(r.roundTripTime);if(rtt!==null)s.rttMs=rtt*1000;}
  else if(r.type==='candidate-pair'&&r.nominated&&r.state==='succeeded'){const a=num(r.availableOutgoingBitrate);if(a!==null)s.availableKbps=a/1000;if(s.rttMs===null){const rtt=num(r.currentRoundTripTime);if(rtt!==null)s.rttMs=rtt*1000;}}
 });
 return s;
}

export async function inboundSample(pc:RTCPeerConnection):Promise<InboundSample>{
 const stats=await pc.getStats();
 const s:InboundSample={at:performance.now(),bytesReceived:0,packetsReceived:0,packetsLost:0,jitterMs:null,fps:null,width:null,height:null,freezeCount:0};
 stats.forEach((r:Stat)=>{
  if(r.type!=='inbound-rtp')return;
  s.bytesReceived+=num(r.bytesReceived)??0;s.packetsReceived+=num(r.packetsReceived)??0;s.packetsLost+=num(r.packetsLost)??0;
  if(r.kind==='video'){const j=num(r.jitter);s.jitterMs=j===null?null:j*1000;s.fps=num(r.framesPerSecond);s.width=num(r.frameWidth);s.height=num(r.frameHeight);s.freezeCount=num(r.freezeCount)??0;}
 });
 return s;
}

export function inboundMetrics(prev:InboundSample,next:InboundSample):InboundMetrics{
 const secs=Math.max(0.001,(next.at-prev.at)/1000);
 const received=next.packetsReceived-prev.packetsReceived,lost=Math.max(0,next.packetsLost-prev.packetsLost);
 return {kbps:Math.max(0,(next.bytesReceived-prev.bytesReceived)*8/1000/secs),lossRate:received+lost>0?lost/(received+lost):0,jitterMs:next.jitterMs,fps:next.fps,width:next.width,height:next.height,freezes:next.freezeCount};
}

/**
 * Per-viewer send-rate controller (AIMD on top of the browser's congestion control): backs off fast
 * on loss, high RTT or bandwidth limitation, recovers slowly after sustained clean samples, and never
 * exceeds the allocation from the upload budget or the estimated available bandwidth.
 */
export class BitrateAdapter{
 private target:number;private clean=0;private prev:OutboundSample|null=null;
 constructor(private ceiling:number){this.target=ceiling;}
 setCeiling(kbps:number){this.ceiling=kbps;this.target=Math.min(this.target,kbps)||kbps;}
 get kbps(){return this.target;}
 /** Returns the new target when it changed enough to be worth a setParameters call. */
 update(s:OutboundSample):number|null{
  const prev=this.prev;this.prev=s;
  if(!prev)return null;
  const sent=s.packetsSent-prev.packetsSent,lost=Math.max(0,s.packetsLost-prev.packetsLost);
  const loss=sent+lost>0?lost/(sent+lost):0;
  const congested=loss>0.05||(s.rttMs??0)>350||s.limitation==='bandwidth';
  const before=this.target;
  if(congested){this.clean=0;this.target=Math.max(MIN_VIDEO_KBPS,Math.floor(this.target*0.75));}
  else if(loss<0.01&&++this.clean>=3){this.target=Math.min(this.ceiling,Math.ceil(this.target*1.1));}
  if(s.availableKbps!==null)this.target=Math.max(MIN_VIDEO_KBPS,Math.min(this.target,Math.floor(s.availableKbps*0.9)));
  return Math.abs(this.target-before)>=Math.max(50,before*0.05)?this.target:null;
 }
}
