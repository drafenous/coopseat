import {useEffect,type RefObject} from 'react';
import {bridge} from '../platform';

export function useNativeBounds(screen:RefObject<HTMLElement|null>,active:boolean,hidden:boolean){
 useEffect(()=>{if(!active)return;let frame=0,last='';const tick=()=>{const el=screen.current;if(el){const r=el.getBoundingClientRect(),k=window.devicePixelRatio;const rect=hidden?{x:0,y:0,width:0,height:0}:{x:Math.round(r.left*k),y:Math.round(r.top*k),width:Math.round(r.width*k),height:Math.round(r.height*k)};const key=`${rect.x},${rect.y},${rect.width},${rect.height}`;if(key!==last){last=key;void bridge()?.bounds(rect);}}frame=requestAnimationFrame(tick);};tick();return()=>cancelAnimationFrame(frame);},[screen,active,hidden]);
}
