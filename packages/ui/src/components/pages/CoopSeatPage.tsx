import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useCapture} from '../../hooks/useCapture';
import {useCinema} from '../../hooks/useCinema';
import {useKeyboardShortcuts} from '../../hooks/useKeyboardShortcuts';
import {useNativeBounds} from '../../hooks/useNativeBounds';
import {usePictureInPicture} from '../../hooks/usePictureInPicture';
import {usePresets} from '../../hooks/usePresets';
import {useSettings} from '../../hooks/useSettings';
import {useToasts} from '../../hooks/useToasts';
import {openDonation} from '../../lib/donate';
import {errorText} from '../../lib/errors';
import {effectIndex,smoothingLevel} from '../../lib/settings';
import {setTelemetryConsent,track,useTelemetryConsent} from '../../lib/telemetry';
import {bridge} from '../../platform';
import {I18nProvider,useT,type UiLocale} from '../../i18n';
import {LAST_VOLUME_KEY,ONBOARDED_KEY,PANEL_COLLAPSED_KEY,PANEL_SIDE_KEY,STATS_KEY} from '../../lib/storage';
import {AccountCta,AccountModal,AppFooter,AppHeader,AuthModal,CaptureViewer,HelpModal,MetricsBar,NicknameStep,PreferencesModal,PresetPicker,SavePresetModal,SettingsPanel,TelemetryModal,ToastStack,TransportBar,TroubleshootModal,ViewerEmptyState} from '../organisms';
import {MainLayout,type PanelSide} from '../templates/MainLayout';

/** `locale` is set by hosts that already know the language (the site passes its cookie). */
export function CoopSeatPage({locale}:{locale?:UiLocale}={}){
 return <I18nProvider locale={locale}><CoopSeat/></I18nProvider>;
}

function CoopSeat(){
 const t=useT();
 const {settings:s,setSettings,change}=useSettings();
 const {error,setError,notice,setNotice}=useToasts();
 const [top,setTop]=useState(false);
 const capture=useCapture({settings:s,setSettings,top,setError,setNotice});
 const presets=usePresets({settings:s,setSettings,native:capture.native,resetDevices:capture.resetDevices,setError,setNotice});
 const [help,setHelp]=useState(()=>!localStorage.getItem(ONBOARDED_KEY)),[saving,setSaving]=useState(false),[presetMenu,setPresetMenu]=useState(false),[cinemaMenu,setCinemaMenu]=useState(false),[troubleshoot,setTroubleshoot]=useState(false),[preferences,setPreferences]=useState(false);
 const [showStats,setShowStats]=useState(()=>localStorage.getItem(STATS_KEY)==='1');
 useEffect(()=>{localStorage.setItem(STATS_KEY,showStats?'1':'0');},[showStats]);
 const [panelSide,setPanelSide]=useState<PanelSide>(()=>localStorage.getItem(PANEL_SIDE_KEY)==='left'?'left':'right');
 const [panelCollapsed,setPanelCollapsed]=useState(()=>localStorage.getItem(PANEL_COLLAPSED_KEY)==='1');
 useEffect(()=>{localStorage.setItem(PANEL_SIDE_KEY,panelSide);},[panelSide]);
 useEffect(()=>{localStorage.setItem(PANEL_COLLAPSED_KEY,panelCollapsed?'1':'0');},[panelCollapsed]);

 const auth=useAuth({setError,setNotice});
 const [authOpen,setAuthOpen]=useState(false),[accountOpen,setAccountOpen]=useState(false),[nicknameOpen,setNicknameOpen]=useState(false),[nicknameSkipped,setNicknameSkipped]=useState(false);
 const askNickname=nicknameOpen||(auth.status==='signedIn'&&auth.account!==null&&!auth.account.nickname&&!nicknameSkipped&&!help);

 const telemetry=useTelemetryConsent(),askTelemetry=Boolean(bridge())&&telemetry===null&&!help;
 const opened=useRef(false);
 useEffect(()=>{if(telemetry==='granted'&&!opened.current){opened.current=true;track({event:'app_open'});}},[telemetry]);

 const {devices,modes,running,busy,stats,loaded}=capture;
 useEffect(()=>{if(running)track({event:'capture_start',backend:s.backend});},[running]);
 const modalOpen=help||troubleshoot||preferences||saving||authOpen||accountOpen||askNickname||askTelemetry;
 const cinema=useCinema({running,backend:s.backend,autoFull:s.autoFull,cinemaDelay:s.cinemaDelay,blocked:modalOpen||presetMenu||cinemaMenu});
 useNativeBounds(capture.screenRef,running&&s.backend==='native',modalOpen);
 const pip=usePictureInPicture({videoRef:capture.videoRef,enabled:running&&s.backend==='compat',setError});
 const lastVolume=useRef(0);
 if(!lastVolume.current){const saved=Number(localStorage.getItem(LAST_VOLUME_KEY));lastVolume.current=saved>0&&saved<=1?saved:.75;}
 useEffect(()=>{if(s.volume>0){lastVolume.current=s.volume;localStorage.setItem(LAST_VOLUME_KEY,String(s.volume));}},[s.volume]);
 const toggleMute=useCallback(()=>setSettings(x=>({...x,volume:x.volume?0:lastVolume.current})),[setSettings]);
 useKeyboardShortcuts({onFullscreen:()=>void cinema.fullscreen(),onExit:cinema.exit,onMute:toggleMute});

 const closeHelp=useCallback(()=>{setHelp(false);localStorage.setItem(ONBOARDED_KEY,'1');},[]);
 const closeSave=useCallback(()=>setSaving(false),[]);
 const closeTroubleshoot=useCallback(()=>setTroubleshoot(false),[]);
 const closePreferences=useCallback(()=>setPreferences(false),[]);
 const closeAuth=useCallback(()=>setAuthOpen(false),[]);
 const closeAccount=useCallback(()=>setAccountOpen(false),[]);
 const closeNickname=useCallback(()=>{setNicknameOpen(false);setNicknameSkipped(true);},[]);
 const login=()=>auth.web?auth.openSignIn():setAuthOpen(true);
 const signUp=()=>void auth.openSignUp().catch(e=>setError(errorText(e)));
 const pin=async()=>setTop(Boolean(await bridge()?.window('top')));
 const disableAutoCinema=()=>{change('autoFull',false);setNotice(t.page.autoCinemaOff);};
 const start=()=>void capture.start(),stop=()=>void capture.stop(),permit=()=>void capture.permit();

 const videoName=devices.video.find(d=>d.id===s.video)?.name,audioName=devices.audio.find(d=>d.id===s.audio)?.name;
 const currentMode=modes.find(m=>m.index===s.mode);
 const formatLabel=s.backend==='native'?(currentMode?`${currentMode.width} × ${currentMode.height} · ${currentMode.fps.toFixed(0)} fps`:''):`${s.resolution.replace('x',' × ')} · ${s.fps} fps`;
 const canStart=loaded&&Boolean(s.video)&&(s.backend!=='native'||modes.length>0);
 const needsPermission=s.backend==='compat'&&!devices.video.length,canPermit=needsPermission||(s.backend==='compat'&&capture.locked);

 return <MainLayout
  immersive={cinema.chromeHidden}
  panelSide={panelSide}
  panelCollapsed={panelCollapsed}
  header={<AppHeader status={running?'live':busy?'busy':'idle'} auth={auth} onHelp={()=>setHelp(true)} onTroubleshoot={()=>setTroubleshoot(true)} onPreferences={()=>setPreferences(true)} onLogin={login} onAccount={()=>setAccountOpen(true)}/>}
  viewer={<CaptureViewer backend={s.backend} running={running} stats={stats} smoothing={smoothingLevel(s.smoothing)} effect={effectIndex(s.effect)} cinemaHint={cinema.cinemaHint} screenRef={capture.screenRef} videoRef={capture.videoRef} audioRef={capture.audioRef}
   emptyState={!running&&<ViewerEmptyState busy={busy} hasDevices={devices.video.length>0} videoName={videoName} audioName={audioName} formatLabel={formatLabel} needsPermission={needsPermission} canStart={canStart} onStart={start} onStop={stop} onPermit={permit}/>}
   transport={<TransportBar panelSide={panelSide} panelOpen={!panelCollapsed} onTogglePanel={()=>setPanelCollapsed(x=>!x)} volume={s.volume} onVolume={v=>change('volume',v)} onToggleMute={toggleMute} showStats={showStats} onToggleStats={()=>setShowStats(x=>!x)} top={top} canPin={Boolean(bridge())} onPin={()=>void pin()} pipActive={pip.active} canPip={pip.supported&&running&&s.backend==='compat'} onPip={pip.toggle} cinemaActive={cinema.chromeHidden} canCinema={running} onCinema={cinema.enterCinema} autoCinema={s.autoFull} cinemaDelay={s.cinemaDelay} cinemaMenu={cinemaMenu} onCinemaMenu={setCinemaMenu} onAutoCinema={v=>change('autoFull',v)} onCinemaDelay={v=>change('cinemaDelay',v)} onFullscreen={()=>void cinema.fullscreen()}/>}/>}
  panelTop={auth.available&&auth.status==='signedOut'&&<AccountCta onSignUp={signUp} onSignIn={login}/>}
  panel={<SettingsPanel side={panelSide} onSwapSide={()=>setPanelSide(x=>x==='right'?'left':'right')} onCollapse={()=>setPanelCollapsed(true)} settings={s} change={change} devices={devices} modes={modes} native={capture.native} running={running} busy={busy} canStart={canStart} needsPermission={canPermit}
   presetPicker={<PresetPicker presets={presets.presets} selected={presets.selectedPreset} defaultPreset={presets.defaultPreset} locked={running||busy} menuOpen={presetMenu} onMenuOpenChange={setPresetMenu} onApply={presets.applyPreset} onSaveNew={()=>setSaving(true)} onUpdate={presets.savePreset} onToggleDefault={presets.toggleDefaultPreset} onDelete={presets.deletePreset}/>}
   onRefresh={()=>void capture.refresh()} onPermit={permit} onSelectDevice={capture.selectDevice} onBackendChange={capture.changeBackend} onStart={start} onStop={stop}/>}
  toasts={<ToastStack countdown={cinema.countdown} onEnterCinema={cinema.enterCinema} onDisableAutoCinema={disableAutoCinema} error={error} onCloseError={()=>setError('')} onTroubleshoot={()=>setTroubleshoot(true)} notice={notice} onCloseNotice={()=>setNotice('')}/>}
  metrics={showStats&&<MetricsBar stats={stats} backend={s.backend} running={running}/>}
  footer={<AppFooter onDonate={openDonation}/>}
  modals={<>
   {help&&<HelpModal onClose={closeHelp}/>}
   {troubleshoot&&<TroubleshootModal desktop={Boolean(bridge())} onClose={closeTroubleshoot}/>}
   {preferences&&<PreferencesModal onClose={closePreferences}/>}
   {saving&&<SavePresetModal existingNames={presets.presets.map(p=>p.name)} onSave={presets.savePreset} onClose={closeSave}/>}
   {authOpen&&<AuthModal auth={auth} onClose={closeAuth}/>}
   {accountOpen&&!askNickname&&<AccountModal auth={auth} onClose={closeAccount} onNickname={()=>setNicknameOpen(true)}/>}
   {askNickname&&!authOpen&&<NicknameStep auth={auth} onClose={closeNickname}/>}
   {askTelemetry&&!askNickname&&<TelemetryModal onChoose={g=>setTelemetryConsent(g?'granted':'denied')}/>}
  </>}
 />;
}
