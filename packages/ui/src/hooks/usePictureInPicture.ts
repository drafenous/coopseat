import {useCallback,useEffect,useState,type RefObject} from 'react';
import {useT} from '../i18n';

type Options={videoRef:RefObject<HTMLVideoElement|null>;enabled:boolean;setError(message:string):void};

export function usePictureInPicture({videoRef,enabled,setError}:Options){
 const t=useT();
 const supported=typeof document!=='undefined'&&Boolean(document.pictureInPictureEnabled);
 const [active,setActive]=useState(false);

 const enter=useCallback(async()=>{const v=videoRef.current;if(!v||!supported||document.pictureInPictureElement===v)return;
  try{await v.requestPictureInPicture();}catch(e){setError(t.capture.pipFailed(e instanceof Error?e.message:String(e)));}
 },[videoRef,supported,setError,t]);
 const exit=useCallback(async()=>{if(document.pictureInPictureElement)await document.exitPictureInPicture().catch(()=>{});},[]);
 const toggle=useCallback(()=>void(document.pictureInPictureElement?exit():enter()),[enter,exit]);

 useEffect(()=>{const v=videoRef.current;if(!v)return;
  const on=()=>setActive(true),off=()=>setActive(false);
  v.addEventListener('enterpictureinpicture',on);v.addEventListener('leavepictureinpicture',off);
  return()=>{v.removeEventListener('enterpictureinpicture',on);v.removeEventListener('leavepictureinpicture',off);};
 },[videoRef]);

 useEffect(()=>{if(!enabled)void exit();},[enabled,exit]);

 return {supported,active,toggle};
}
