import {useCallback,useEffect,useState} from 'react';
import {AppWindow,Monitor,RefreshCw,Usb} from 'lucide-react';
import type {ScreenSource} from '../../types';
import {cx} from '../../lib/cx';
import {errorText} from '../../lib/errors';
import {cardSource,displaySource,type StreamSource,type StreamSourceKind} from '../../lib/stream-source';
import {bridge} from '../../platform';
import {Button,IconButton} from '../atoms';
import {Alert,Modal,ModalActions,ToggleField} from '../molecules';
import {useT} from '../../i18n';

type Props={cardStream:MediaStream|null;cardLabel:string;onPick(source:StreamSource):void;onClose():void};

const KINDS:{kind:StreamSourceKind;icon:typeof Usb}[]=[{kind:'card',icon:Usb},{kind:'screen',icon:Monitor},{kind:'window',icon:AppWindow}];

/** Chooses what to stream. On desktop screens/windows are listed with thumbnails; browsers show their own picker. */
export function ScreenSourcePicker({cardStream,cardLabel,onPick,onClose}:Props){
 const t=useT().party.source;
 const desktop=Boolean(bridge());
 const [kind,setKind]=useState<StreamSourceKind>(cardStream?'card':'screen');
 const [sources,setSources]=useState<ScreenSource[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [audio,setAudio]=useState(true);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 const refresh=useCallback(async()=>{
  const b=bridge();if(!b)return;
  try{setError('');setSources(await b.screen.sources());}catch(e){setError(errorText(e));}
 },[]);
 useEffect(()=>{if(desktop&&kind!=='card')void refresh();},[desktop,kind,refresh]);

 const visible=sources.filter(s=>s.kind===kind);
 const canShare=kind==='card'?Boolean(cardStream):desktop?visible.some(s=>s.id===selected):true;

 const share=async()=>{
  setBusy(true);setError('');
  try{
   if(kind==='card'){if(cardStream)onPick(cardSource(cardStream,cardLabel));return;}
   const src=visible.find(s=>s.id===selected);
   onPick(await displaySource({kind,sourceId:src?.id,label:src?.name,audio}));
  }catch(e){if((e as DOMException)?.name!=='NotAllowedError'||desktop)setError(errorText(e));}
  finally{setBusy(false);}
 };

 return <Modal labelledBy="source-title" closeButton onClose={onClose}>
  <h2 id="source-title">{t.title}</h2>
  <div role="tablist" className="mb-4 grid grid-cols-3 gap-2">
   {KINDS.map(({kind:k,icon:Icon})=><button key={k} type="button" role="tab" aria-selected={kind===k} onClick={()=>{setKind(k);setSelected(null);}}
    className={cx('flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[13px] font-semibold',kind===k?'border-accent-border bg-[#a8f0cb12] text-accent':'border-line-soft text-[#c3d0dd] hover:bg-[#ffffff08]')}>
    <Icon size={20}/>{t[k]}
   </button>)}
  </div>

  {kind==='card'&&(cardStream?<p className="text-[13px] text-[#a5b2c3]">{t.cardHint}{cardLabel?` · ${cardLabel}`:''}</p>:<Alert tone="info">{t.cardNeedsCompat}</Alert>)}

  {kind!=='card'&&(desktop
   ?<>
    <div className="mb-2 flex justify-end"><IconButton size="sm" label={t.refresh} onClick={()=>void refresh()}><RefreshCw size={15}/></IconButton></div>
    {!visible.length&&<p className="py-6 text-center text-[13px] text-[#8494a5]">{t.empty}</p>}
    <div role="listbox" aria-label={t[kind]} className="grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
     {visible.map(s=><button key={s.id} type="button" role="option" aria-selected={selected===s.id} onClick={()=>setSelected(s.id)} onDoubleClick={()=>{setSelected(s.id);void share();}}
      className={cx('flex flex-col gap-1.5 rounded-lg border p-1.5 text-left',selected===s.id?'border-accent-border bg-[#a8f0cb12]':'border-line-soft hover:bg-[#ffffff08]')}>
      {s.thumbnail?<img src={s.thumbnail} alt="" className="aspect-video w-full rounded bg-black object-contain"/>:<span className="aspect-video w-full rounded bg-black"/>}
      <span className="truncate text-[12px] text-[#c3d0dd]">{s.name}</span>
     </button>)}
    </div>
   </>
   :<p className="text-[13px] text-[#a5b2c3]">{t.browserPicker}</p>)}

  {kind!=='card'&&<div className="mt-4"><ToggleField label={t.audio} hint={t.audioHint} checked={audio} onChange={setAudio}/></div>}
  {error&&<div className="mt-3"><Alert>{error}</Alert></div>}
  <ModalActions><Button inline disabled={!canShare||busy} onClick={()=>void share()}>{t.share}</Button></ModalActions>
 </Modal>;
}
