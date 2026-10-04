import {useCallback,useEffect,useRef,useState} from 'react';
import type {ClientMessage,Quality,ServerMessage} from '../party/protocol';
import {fetchIceConfig,PeerMesh,type InboundMetrics,type LinkState} from '../lib/webrtc';

type Options={selfId:string|null;active:boolean;token():string|null;send(msg:ClientMessage):void};

/** Owns the PeerMesh for a live session and exposes remote streams as React state. */
export function usePeerMesh({selfId,active,token,send}:Options){
 const mesh=useRef<PeerMesh|null>(null);
 const [streams,setStreams]=useState<Record<string,MediaStream>>({});
 const [links,setLinks]=useState<Record<string,LinkState>>({});
 const [metrics,setMetrics]=useState<Record<string,InboundMetrics>>({});
 const sendRef=useRef(send),tokenRef=useRef(token);sendRef.current=send;tokenRef.current=token;

 useEffect(()=>{
  if(!active||!selfId)return;
  const m=new PeerMesh({
   selfId,
   send:msg=>sendRef.current(msg),
   getIceConfig:()=>{const t=tokenRef.current();if(!t)return Promise.reject(Error('no_token'));return fetchIceConfig(t);},
   onRemoteStream:(id,stream)=>setStreams(x=>{const next={...x};if(stream)next[id]=stream;else delete next[id];return next;}),
   onLinkState:(id,state)=>setLinks(x=>({...x,[id]:state})),
   onMetrics:(id,value)=>setMetrics(x=>({...x,[id]:value})),
  });
  mesh.current=m;
  return()=>{m.close();mesh.current=null;setStreams({});setLinks({});setMetrics({});};
 },[active,selfId]);

 /** Routes the signaling messages the mesh cares about. */
 const handle=useCallback((msg:ServerMessage)=>{
  const m=mesh.current;if(!m)return;
  if(msg.t==='subscribe')void m.onSubscribe(msg.from,msg.quality);
  else if(msg.t==='unsubscribe')m.dropViewer(msg.from);
  else if(msg.t==='signal')void m.onSignal(msg.from,msg.data);
  else if(msg.t==='stream_reset')void m.restartIncoming(msg.id);
  else if(msg.t==='left')m.onPeerGone(msg.id);
  else if(msg.t==='presence'&&!msg.peer.streaming)m.onPeerGone(msg.peer.id,{stoppedStreaming:true});
 },[]);

 const setLocalStream=useCallback((stream:MediaStream|null)=>mesh.current?.setLocalStream(stream),[]);
 const resetOutgoing=useCallback(()=>mesh.current?.resetOutgoing(),[]);
 /** Applies tile visibility: visible streamers are watched at their quality, the rest are paused. */
 const applyVisibility=useCallback((wanted:Record<string,Exclude<Quality,'paused'>|null>)=>{
  const m=mesh.current;if(!m)return;
  for(const [id,quality] of Object.entries(wanted)){
   if(quality)void m.watch(id,quality);
   else if(m.isWatching(id))m.hide(id);
  }
 },[]);

 return {streams,links,metrics,handle,setLocalStream,resetOutgoing,applyVisibility,viewerCount:()=>mesh.current?.viewerCount??0};
}
