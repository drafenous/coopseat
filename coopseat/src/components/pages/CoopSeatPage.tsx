import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useCapture} from '../../hooks/useCapture';
import {useCinema} from '../../hooks/useCinema';
import {useKeyboardShortcuts} from '../../hooks/useKeyboardShortcuts';
import {useNativeBounds} from '../../hooks/useNativeBounds';
import {usePresets} from '../../hooks/usePresets';
import {useSettings} from '../../hooks/useSettings';
import {useToasts} from '../../hooks/useToasts';
import {openDonation} from '../../lib/donate';
import {ONBOARDED_KEY,STATS_KEY} from '../../lib/storage';
import {AccountModal,AppFooter,AppHeader,AuthModal,CaptureViewer,HelpModal,MetricsBar,NicknameStep,PresetPicker,SavePresetModal,SettingsPanel,ToastStack,TransportBar,ViewerEmptyState} from '../organisms';
import {MainLayout} from '../templates/MainLayout';

export function CoopSeatPage(){
 const {settings:s,setSettings,change}=useSettings();
 const {error,setError,notice,setNotice}=useToasts();
 const [top,setTop]=useState(false);
 const capture=useCapture({settings:s,setSettings,top,setError,setNotice});
 const presets=usePresets({settings:s,setSettings,native:capture.native,resetDevices:capture.resetDevices,setError,setNotice});
 const [help,setHelp]=useState(()=>!localStorage.getItem(ONBOARDED_KEY)),[saving,setSaving]=useState(false),[presetMenu,setPresetMenu]=useState(false);
 const [showStats,setShowStats]=useState(()=>localStorage.getItem(STATS_KEY)==='1');
 useEffect(()=>{localStorage.setItem(STATS_KEY,showStats?'1':'0');},[showStats]);

 const auth=useAuth({setError,setNotice});
 const [authOpen,setAuthOpen]=useState(false),[accountOpen,setAccountOpen]=useState(false),[nicknameOpen,setNicknameOpen]=useState(false),[nicknameSkipped,setNicknameSkipped]=useState(false);
 const askNickname=nicknameOpen||(auth.status==='signedIn'&&auth.account!==null&&!auth.account.nickname&&!nicknameSkipped&&!help);

 const {devices,modes,running,busy,stats,loaded}=capture;
 const modalOpen=help||saving||authOpen||accountOpen||askNickname;
 const cinema=useCinema({running,backend:s.backend,autoFull:s.autoFull,cinemaDelay:s.cinemaDelay,blocked:modalOpen||presetMenu});
 useNativeBounds(capture.screenRef,running&&s.backend==='native',modalOpen);
 useKeyboardShortcuts({onFullscreen:()=>void cinema.fullscreen(),onExit:cinema.exit,onMute:()=>setSettings(x=>({...x,volume:x.volume?0:.75}))});

 const closeHelp=useCallback(()=>{setHelp(false);localStorage.setItem(ONBOARDED_KEY,'1');},[]);
 const closeSave=useCallback(()=>setSaving(false),[]);
 const closeAuth=useCallback(()=>setAuthOpen(false),[]);
 const closeAccount=useCallback(()=>setAccountOpen(false),[]);
 const closeNickname=useCallback(()=>{setNicknameOpen(false);setNicknameSkipped(true);},[]);
 const pin=async()=>setTop(Boolean(await window.input?.window('top')));
 const disableAutoCinema=()=>{change('autoFull',false);setNotice('Modo cinema automático desativado. Você pode reativar em Exibição, no painel.');};
 const start=()=>void capture.start(),stop=()=>void capture.stop(),permit=()=>void capture.permit();

 const videoName=devices.video.find(d=>d.id===s.video)?.name,audioName=devices.audio.find(d=>d.id===s.audio)?.name;
 const currentMode=modes.find(m=>m.index===s.mode);
 const formatLabel=s.backend==='native'?(currentMode?`${currentMode.width} × ${currentMode.height} · ${currentMode.fps.toFixed(0)} fps`:''):`${s.resolution.replace('x',' × ')} · ${s.fps} fps`;
 const canStart=loaded&&Boolean(s.video)&&(s.backend!=='native'||modes.length>0);
 const needsPermission=s.backend==='compat'&&!devices.video.length;

 return <MainLayout
  immersive={cinema.chromeHidden}
  header={<AppHeader status={running?'live':busy?'busy':'idle'} auth={auth} onHelp={()=>setHelp(true)} onLogin={()=>setAuthOpen(true)} onAccount={()=>setAccountOpen(true)}/>}
  viewer={<CaptureViewer backend={s.backend} running={running} stats={stats} cinemaHint={cinema.cinemaHint} screenRef={capture.screenRef} videoRef={capture.videoRef} audioRef={capture.audioRef}
   emptyState={!running&&<ViewerEmptyState busy={busy} hasDevices={devices.video.length>0} videoName={videoName} audioName={audioName} formatLabel={formatLabel} needsPermission={needsPermission} canStart={canStart} onStart={start} onStop={stop} onPermit={permit}/>}
   transport={<TransportBar volume={s.volume} onVolume={v=>change('volume',v)} showStats={showStats} onToggleStats={()=>setShowStats(x=>!x)} top={top} canPin={Boolean(window.input)} onPin={()=>void pin()} cinemaActive={cinema.chromeHidden} canCinema={running} onCinema={cinema.enterCinema} onFullscreen={()=>void cinema.fullscreen()}/>}/>}
  panel={<SettingsPanel settings={s} change={change} devices={devices} modes={modes} native={capture.native} running={running} busy={busy} canStart={canStart} needsPermission={needsPermission}
   presetPicker={<PresetPicker presets={presets.presets} selected={presets.selectedPreset} defaultPreset={presets.defaultPreset} locked={running||busy} menuOpen={presetMenu} onMenuOpenChange={setPresetMenu} onApply={presets.applyPreset} onSaveNew={()=>setSaving(true)} onUpdate={presets.savePreset} onToggleDefault={presets.toggleDefaultPreset} onDelete={presets.deletePreset}/>}
   onRefresh={()=>void capture.refresh()} onPermit={permit} onSelectDevice={capture.selectDevice} onBackendChange={capture.changeBackend} onStart={start} onStop={stop}/>}
  toasts={<ToastStack countdown={cinema.countdown} onEnterCinema={cinema.enterCinema} onDisableAutoCinema={disableAutoCinema} error={error} onCloseError={()=>setError('')} notice={notice} onCloseNotice={()=>setNotice('')}/>}
  metrics={showStats&&<MetricsBar stats={stats} backend={s.backend} running={running}/>}
  footer={<AppFooter onDonate={openDonation}/>}
  modals={<>
   {help&&<HelpModal onClose={closeHelp}/>}
   {saving&&<SavePresetModal existingNames={presets.presets.map(p=>p.name)} onSave={presets.savePreset} onClose={closeSave}/>}
   {authOpen&&<AuthModal auth={auth} onClose={closeAuth}/>}
   {accountOpen&&!askNickname&&<AccountModal auth={auth} onClose={closeAccount} onNickname={()=>setNicknameOpen(true)}/>}
   {askNickname&&!authOpen&&<NicknameStep auth={auth} onClose={closeNickname}/>}
  </>}
 />;
}
