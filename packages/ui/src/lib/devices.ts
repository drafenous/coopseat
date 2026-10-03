import type {Device} from '../types';

// Browser labels end in "(3142:0003)"; native ids and audio adapter paths contain "vid_3142&pid_0003".
export function hardwareKey(d:Device){
 const text=`${d.name} ${d.id} ${d.hardware??''}`;
 const m=text.match(/vid_([0-9a-f]{4})&pid_([0-9a-f]{4})/i)??text.match(/\(([0-9a-f]{4}):([0-9a-f]{4})\)/i);
 return m?`${m[1]}:${m[2]}`.toLowerCase():'';
}

const GENERIC=new Set(['video','audio','áudio','capture','captura','interface','digital','usb','device','dispositivo','input','entrada','microfone','microphone','mic','camera','câmera','webcam','hd','pro','virtual','windows','de','do','da']);
const words=(name:string)=>new Set(name.toLowerCase().replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/g,'').split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>1&&!GENERIC.has(w)));
const isAlias=(a:Device)=>a.id==='default'||a.id==='communications'||/^(default|communications) - /i.test(a.name);

export function matchingAudio(video:Device|undefined,audio:Device[]){
 if(!video)return '';
 const candidates=audio.filter(a=>!isAlias(a)),key=hardwareKey(video);
 if(key&&candidates.some(a=>hardwareKey(a)))return candidates.find(a=>hardwareKey(a)===key)?.id??'';
 const target=words(video.name);let best='',score=0;
 for(const a of candidates){const n=[...words(a.name)].filter(w=>target.has(w)).length;if(n>score){score=n;best=a.id;}}
 return best;
}
