import {useCallback,useEffect,useRef,useState} from 'react';
import {COUNTDOWN_FROM,PAUSE_MS,type Backend,type Countdown} from '../lib/settings';

type Options={running:boolean;backend:Backend;autoFull:boolean;cinemaDelay:number;blocked:boolean};

export function useCinema(options:Options){
 const {running,backend,autoFull,cinemaDelay}=options;
 const [chromeHidden,setChromeHidden]=useState(false),[countdown,setCountdownState]=useState<Countdown>(null),[cinemaHint,setCinemaHint]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),countdownTimer=useRef<ReturnType<typeof setInterval>|undefined>(undefined),pinned=useRef(false),grace=useRef(0),countdownRef=useRef<Countdown>(null),live=useRef(options);
 live.current=options;

 const setCountdown=useCallback((v:Countdown)=>{countdownRef.current=v;setCountdownState(v);},[]);
 const clearCinemaTimers=useCallback(()=>{clearTimeout(timer.current);clearInterval(countdownTimer.current);},[]);
 const cancelAutoFull=useCallback(()=>{clearCinemaTimers();setCountdown(null);},[clearCinemaTimers,setCountdown]);
 const enterCinema=useCallback(()=>{if(!live.current.running)return;cancelAutoFull();grace.current=Date.now()+1200;setChromeHidden(true);},[cancelAutoFull]);
 const startCountdown=useCallback(()=>{clearCinemaTimers();const o=live.current;if(!o.running||!o.autoFull||o.blocked||pinned.current){setCountdown(null);return;}
  let n=COUNTDOWN_FROM;setCountdown(n);countdownTimer.current=setInterval(()=>{n--;if(n>0){setCountdown(n);return;}clearInterval(countdownTimer.current);setCountdown(null);grace.current=Date.now()+400;setChromeHidden(true);},1000);},[clearCinemaTimers,setCountdown]);
 const scheduleAutoFull=useCallback(()=>{cancelAutoFull();const o=live.current;if(!o.running||!o.autoFull||o.blocked)return;timer.current=setTimeout(startCountdown,(o.cinemaDelay-COUNTDOWN_FROM)*1000);},[cancelAutoFull,startCountdown]);
 const wake=useCallback(()=>{if(pinned.current||Date.now()<grace.current)return;
  if(countdownRef.current!==null){clearCinemaTimers();setCountdown('paused');timer.current=setTimeout(startCountdown,PAUSE_MS);return;}
  setChromeHidden(false);scheduleAutoFull();},[clearCinemaTimers,setCountdown,startCountdown,scheduleAutoFull]);

 const fullscreen=useCallback(async()=>{if(live.current.backend==='native'&&live.current.running){const on=Boolean(await window.input?.window('fullscreen'));pinned.current=on;setChromeHidden(on);}else if(window.input)await window.input.window('fullscreen');else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();},[]);
 const exit=useCallback(()=>{pinned.current=false;void window.input?.window('exitFullscreen');setChromeHidden(false);},[]);

 useEffect(()=>{if(running&&autoFull)scheduleAutoFull();else{cancelAutoFull();if(!running){pinned.current=false;setChromeHidden(false);}}},[running,autoFull,cinemaDelay,scheduleAutoFull,cancelAutoFull]);
 useEffect(()=>{if(!chromeHidden||backend!=='compat'){setCinemaHint(false);return;}setCinemaHint(true);const t=setTimeout(()=>setCinemaHint(false),2500);return()=>clearTimeout(t);},[chromeHidden,backend]);
 useEffect(()=>{const events=['mousemove','mousedown','wheel','keydown'] as const;events.forEach(n=>window.addEventListener(n,wake,{passive:true}));return()=>events.forEach(n=>window.removeEventListener(n,wake));},[wake]);
 const watchingPointer=running&&backend==='native'&&(autoFull||chromeHidden);
 useEffect(()=>{if(!watchingPointer||!window.input)return;void window.input.watchPointer(true);const off=window.input.onPointer(wake);return()=>{off();void window.input?.watchPointer(false);};},[watchingPointer,wake]);
 useEffect(()=>()=>{clearTimeout(timer.current);clearInterval(countdownTimer.current);},[]);

 return {chromeHidden,countdown,cinemaHint,enterCinema,fullscreen,exit};
}
