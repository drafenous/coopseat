import {useCallback,useEffect,useRef,useState} from 'react';
import type {StreamSource} from '../lib/stream-source';

/** The one source a streamer is sending. Replacing it stops the previous one. */
export function useStreamSource(onEnded:()=>void){
 const [source,setSource]=useState<StreamSource|null>(null);
 const current=useRef<StreamSource|null>(null);
 const endedRef=useRef(onEnded);endedRef.current=onEnded;

 const stop=useCallback(()=>{current.current?.stop();current.current=null;setSource(null);},[]);
 const use=useCallback((next:StreamSource)=>{
  current.current?.stop();
  current.current=next;setSource(next);
  next.onEnded(()=>{if(current.current===next){current.current=null;setSource(null);endedRef.current();}});
 },[]);
 useEffect(()=>()=>current.current?.stop(),[]);
 return {source,use,stop};
}
