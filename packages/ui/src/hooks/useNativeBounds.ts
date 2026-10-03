import {useEffect,type RefObject} from 'react';
import {bridge} from '../platform';

type Hole={x:number;y:number;width:number;height:number;radius:number};

/** The native video is a separate OS window drawn above the page, so these are cut out of it to stay visible. */
const OVERLAYS='[role="dialog"],[role="menu"],[role="listbox"],[data-overlay]';
const MAX_HOLES=16;
/** Matches the modal backdrop's opacity. */
const BACKDROP_DIM=.8;

/**
 * Overlay areas over the screen, in device pixels relative to it. Their shadows are dropped meanwhile:
 * a shadow falls outside the cut-out, behind the video, and would show up chopped.
 */
function holes(r:DOMRect,k:number,shadowless:Set<HTMLElement>):Hole[]{
 const out:Hole[]=[],over=new Set<HTMLElement>();
 for(const el of document.querySelectorAll<HTMLElement>(OVERLAYS)){
  if(out.length===MAX_HOLES)break;
  const o=el.getBoundingClientRect();
  if(o.width<=0||o.height<=0||o.right<=r.left||o.left>=r.right||o.bottom<=r.top||o.top>=r.bottom)continue;
  // The whole element goes out, even past the screen edges, so its rounded corners land where they really are.
  const x=Math.floor((o.left-r.left)*k),y=Math.floor((o.top-r.top)*k);
  out.push({x,y,width:Math.ceil((o.right-r.left)*k)-x,height:Math.ceil((o.bottom-r.top)*k)-y,radius:Math.round((parseFloat(getComputedStyle(el).borderTopLeftRadius)||0)*k)});
  over.add(el);
 }
 for(const el of shadowless)if(!over.has(el)){el.style.boxShadow='';shadowless.delete(el);}
 for(const el of over)if(!shadowless.has(el)){el.style.boxShadow='none';shadowless.add(el);}
 return out;
}

export function useNativeBounds(screen:RefObject<HTMLElement|null>,active:boolean,dimmed:boolean){
 useEffect(()=>{if(!active)return;let frame=0,last='';const shadowless=new Set<HTMLElement>();
  const tick=()=>{const el=screen.current;if(el){const r=el.getBoundingClientRect(),k=window.devicePixelRatio;const rect={x:Math.round(r.left*k),y:Math.round(r.top*k),width:Math.round(r.width*k),height:Math.round(r.height*k),holes:holes(r,k,shadowless),dim:dimmed?BACKDROP_DIM:0};const key=JSON.stringify(rect);if(key!==last){last=key;void bridge()?.bounds(rect);}}frame=requestAnimationFrame(tick);};
  tick();return()=>{cancelAnimationFrame(frame);for(const el of shadowless)el.style.boxShadow='';};
 },[screen,active,dimmed]);
}
