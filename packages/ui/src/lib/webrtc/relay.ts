import {api} from '../api';

export type CandidateType='host'|'srflx'|'prflx'|'relay';

/** Response of `POST /api/turn`. */
export type IceConfig=
 |{iceServers:RTCIceServer[];relay:true;expiresAt:number;maxRelayBitrateKbps:number}
 |{iceServers:RTCIceServer[];relay:false;reason:'relay_unavailable'|'relay_quota_exceeded'|'relay_app_outdated';message:string};

/** ICE servers for an admitted participant; TURN only when the relay policy allows. */
export const fetchIceConfig=(roomToken:string)=>api<IceConfig>('/api/turn',{method:'POST',body:{roomToken}});

/**
 * Local candidate type of the active pair: `relay` means media flows through TURN (billed);
 * anything else is a direct connection. Null until ICE has a succeeded nominated pair.
 */
export async function getSelectedCandidateType(pc:RTCPeerConnection):Promise<CandidateType|null>{
 const stats=await pc.getStats();
 let pair:RTCIceCandidatePairStats|undefined;
 stats.forEach((report:RTCStats)=>{
  const candidate=report as RTCIceCandidatePairStats;
  if(report.type==='candidate-pair'&&candidate.nominated&&candidate.state==='succeeded')pair=candidate;
 });
 if(!pair)return null;
 const local=stats.get(pair.localCandidateId) as {candidateType?:CandidateType}|undefined;
 return local?.candidateType??null;
}

/** Caps outgoing video bitrate when the connection runs over TURN. Returns whether the cap was applied. */
export async function applyRelayBitrateCap(pc:RTCPeerConnection,maxKbps:number):Promise<boolean>{
 if((await getSelectedCandidateType(pc))!=='relay')return false;
 const senders=pc.getSenders().filter(s=>s.track?.kind==='video');
 await Promise.all(senders.map(sender=>{
  const params=sender.getParameters();
  const encodings=params.encodings?.length?params.encodings:[{}];
  params.encodings=encodings.map(e=>({...e,maxBitrate:maxKbps*1000}));
  return sender.setParameters(params);
 }));
 return senders.length>0;
}
