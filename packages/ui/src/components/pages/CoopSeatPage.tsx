import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useCapture} from '../../hooks/useCapture';
import {useCinema} from '../../hooks/useCinema';
import {useKeyboardShortcuts} from '../../hooks/useKeyboardShortcuts';
import {useNativeBounds} from '../../hooks/useNativeBounds';
import {useParty} from '../../hooks/useParty';
import {usePictureInPicture} from '../../hooks/usePictureInPicture';
import {usePresets} from '../../hooks/usePresets';
import {useSettings} from '../../hooks/useSettings';
import {useToasts} from '../../hooks/useToasts';
import {openDonation} from '../../lib/donate';
import {errorText} from '../../lib/errors';
import {effectIndex,smoothingLevel} from '../../lib/settings';
import {cardSource,type StreamSource} from '../../lib/stream-source';
import {setTelemetryConsent,track,useTelemetryConsent} from '../../lib/telemetry';
import {bridge} from '../../platform';
import {I18nProvider,useT,type UiLocale} from '../../i18n';
import {LAST_VOLUME_KEY,ONBOARDED_KEY,PANEL_COLLAPSED_KEY,PANEL_SIDE_KEY,PARTY_PANEL_KEY,STATS_KEY} from '../../lib/storage';
import {AccountCta,AppFooter,AppHeader,AuthModal,CaptureViewer,HelpModal,MetricsBar,NicknameStep,PartyGate,PreferencesModal,PresetPicker,RoomPanel,SavePresetModal,ScreenSourcePicker,SettingsPanel,StreamStage,TelemetryModal,ToastStack,TransportBar,TroubleshootModal,ViewerEmptyState} from '../organisms';
import {MainLayout,type PanelSide} from '../templates/MainLayout';

/**
 * `locale` is set by hosts that already know the language (the site passes its cookie). `party` opens
 * a Gaming-Party room (the site's /party/{nickname}); on desktop rooms open from deep links or "My room".
 */
export function CoopSeatPage({locale,party}:{locale?:UiLocale;party?:string}={}){
 return <I18nProvider locale={locale}><CoopSeat initialParty={party??null}/></I18nProvider>;
}

function CoopSeat({initialParty}:{initialParty:string|null}){
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

 const [partyNick,setPartyNick]=useState<string|null>(initialParty);
 const auth=useAuth({setError,setNotice,onPartyLink:setPartyNick});
 const signedIn=auth.status==='signedIn';
 const party=useParty({nickname:partyNick??'',enabled:Boolean(partyNick)&&signedIn,setError,setNotice});
 const [picker,setPicker]=useState(false);
 const [roomCollapsed,setRoomCollapsed]=useState(()=>localStorage.getItem(PARTY_PANEL_KEY)==='1');
 useEffect(()=>{localStorage.setItem(PARTY_PANEL_KEY,roomCollapsed?'1':'0');},[roomCollapsed]);
 const [authOpen,setAuthOpen]=useState(false),[nicknameOpen,setNicknameOpen]=useState(false),[nicknameSkipped,setNicknameSkipped]=useState(false);
 const askNickname=nicknameOpen||(auth.status==='signedIn'&&auth.account!==null&&!auth.account.nickname&&!nicknameSkipped&&!help);

 const telemetry=useTelemetryConsent(),askTelemetry=Boolean(bridge())&&telemetry===null&&!help;
 const opened=useRef(false);
 useEffect(()=>{if(telemetry==='granted'&&!opened.current){opened.current=true;track({event:'app_open'});}},[telemetry]);

 const {devices,modes,running,busy,stats,loaded}=capture;
 useEffect(()=>{if(running)track({event:'capture_start',backend:s.backend});},[running]);
 const partyMode=Boolean(partyNick);
 // The native core draws its own window over the viewer, which party mode doesn't show.
 useEffect(()=>{if(partyMode&&s.backend==='native'&&running)void capture.stop();},[partyMode,s.backend,running]);
 const modalOpen=help||troubleshoot||preferences||saving||authOpen||askNickname||askTelemetry||picker;
 // In a party the "player" is the stage: something is on screen once a streamer has a tile.
 const watching=partyMode&&party.phase==='live'&&party.slots.main.length>0;
 // Auto cinema would hide the room chat while people just watch and read, so parties only get the manual one.
 const cinema=useCinema({running:partyMode?watching:running,backend:partyMode?'compat':s.backend,autoFull:!partyMode&&s.autoFull,cinemaDelay:s.cinemaDelay,blocked:modalOpen||presetMenu||cinemaMenu});
 useNativeBounds(capture.screenRef,running&&s.backend==='native',modalOpen);
 const pip=usePictureInPicture({videoRef:capture.videoRef,enabled:!partyMode&&running&&s.backend==='compat',setError});
 const stageVideoRef=useRef<HTMLVideoElement|null>(null);
 const stagePip=usePictureInPicture({videoRef:stageVideoRef,enabled:watching,setError});
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
 const closeNickname=useCallback(()=>{setNicknameOpen(false);setNicknameSkipped(true);},[]);
 const closePicker=useCallback(()=>setPicker(false),[]);
 const login=()=>auth.web?auth.openSignIn():setAuthOpen(true);
 const signUp=()=>void auth.openSignUp().catch(e=>setError(errorText(e)));
 const myAccount=()=>void auth.openWeb('/account').catch(e=>setError(errorText(e)));
 const myNick=auth.account?.nickname??null;
 const myRoom=myNick?()=>{if(auth.web)location.assign(`/party/${encodeURIComponent(myNick)}`);else setPartyNick(myNick);}:undefined;
 const leaveParty=()=>{party.leave();if(auth.web)location.assign('/play');else setPartyNick(null);};
 const shareUrl=partyNick?`${auth.web?location.origin:'https://coopseat.com'}/party/${encodeURIComponent(party.access?.room.owner??partyNick)}`:'';
 const pickSource=(source:StreamSource)=>{setPicker(false);resumeCard.current=false;if(party.source&&party.streaming)party.switchSource(source);else void party.startStreaming(source);};
 // The card source clones the capture's tracks, so stopping the capture doesn't end it by itself.
 const resumeCard=useRef(false);
 useEffect(()=>{
  if(running||party.source?.kind!=='card')return;
  resumeCard.current=party.isOwner;
  party.source.end();
 },[running,party.source,party.isOwner]);
 // The owner restarting the capture (e.g. to change its format) resumes the room's stream.
 useEffect(()=>{
  if(!resumeCard.current||!running||s.backend!=='compat'||party.phase!=='live'||party.source||party.busy)return;
  const preview=capture.mediaStream();
  if(!preview)return;
  resumeCard.current=false;
  void party.startStreaming(cardSource(preview,devices.video.find(d=>d.id===s.video)?.name??''));
 },[running,s.backend,s.video,devices.video,party.phase,party.source,party.busy,party.startStreaming,capture.mediaStream]);
 const signOut=()=>void auth.logout().catch(e=>setError(errorText(e)));
 const pin=async()=>setTop(Boolean(await bridge()?.window('top')));
 const disableAutoCinema=()=>{change('autoFull',false);setNotice(t.page.autoCinemaOff);};
 const start=()=>void capture.start(),stop=()=>void capture.stop(),permit=()=>void capture.permit();

 const videoName=devices.video.find(d=>d.id===s.video)?.name,audioName=devices.audio.find(d=>d.id===s.audio)?.name;
 const currentMode=modes.find(m=>m.index===s.mode);
 const formatLabel=s.backend==='native'?(currentMode?`${currentMode.width} × ${currentMode.height} · ${currentMode.fps.toFixed(0)} fps`:''):`${s.resolution.replace('x',' × ')} · ${s.fps} fps`;
 const canStart=loaded&&Boolean(s.video)&&(s.backend!=='native'||modes.length>0);
 const needsPermission=s.backend==='compat'&&!devices.video.length,canPermit=needsPermission||(s.backend==='compat'&&capture.locked);

 const settingsPanel=<SettingsPanel side={panelSide} onSwapSide={()=>setPanelSide(x=>x==='right'?'left':'right')} onCollapse={()=>setPanelCollapsed(true)} settings={s} change={change} devices={devices} modes={modes} native={capture.native} running={running} busy={busy} canStart={canStart} needsPermission={canPermit}
   presetPicker={<PresetPicker presets={presets.presets} selected={presets.selectedPreset} defaultPreset={presets.defaultPreset} locked={running||busy} menuOpen={presetMenu} onMenuOpenChange={setPresetMenu} onApply={presets.applyPreset} onSaveNew={()=>setSaving(true)} onUpdate={presets.savePreset} onToggleDefault={presets.toggleDefaultPreset} onDelete={presets.deletePreset}/>}
   onRefresh={()=>void capture.refresh()} onPermit={permit} onSelectDevice={capture.selectDevice} onBackendChange={capture.changeBackend} onStart={start} onStop={stop}/>;
 const gated=!signedIn||party.phase!=='live';
 // Capture settings are only useful to whoever may stream.
 const streamer=party.isOwner||party.canStream;
 const roomSide:PanelSide=panelSide==='right'&&streamer&&!panelCollapsed?'left':panelSide;
 const activePip=partyMode?stagePip:pip;
 const transport=<TransportBar
  panelSide={partyMode?roomSide:panelSide} panelOpen={partyMode?!roomCollapsed:!panelCollapsed} onTogglePanel={()=>partyMode?setRoomCollapsed(x=>!x):setPanelCollapsed(x=>!x)}
  volume={s.volume} onVolume={v=>change('volume',v)} onToggleMute={toggleMute} showStats={showStats} onToggleStats={()=>setShowStats(x=>!x)}
  top={top} canPin={Boolean(bridge())} onPin={()=>void pin()}
  pipActive={activePip.active} canPip={activePip.supported&&(partyMode?watching:running&&s.backend==='compat')} onPip={activePip.toggle}
  cinemaActive={cinema.chromeHidden} canCinema={partyMode?watching:running} onCinema={cinema.enterCinema} autoCinema={!partyMode&&s.autoFull} cinemaDelay={s.cinemaDelay} cinemaMenu={cinemaMenu} onCinemaMenu={setCinemaMenu} onAutoCinema={v=>change('autoFull',v)} onCinemaDelay={v=>change('cinemaDelay',v)}
  onFullscreen={()=>void cinema.fullscreen()}/>;

 return <MainLayout
  immersive={cinema.chromeHidden}
  panelSide={panelSide}
  panelCollapsed={panelCollapsed}
  header={<AppHeader status={running?'live':busy?'busy':'idle'} auth={auth} onHelp={()=>setHelp(true)} onTroubleshoot={()=>setTroubleshoot(true)} onPreferences={()=>setPreferences(true)} onLogin={login} onMyAccount={myAccount} onMyRoom={myRoom} onSignOut={signOut}/>}
  viewer={partyMode
   ?<StreamStage party={party} panelOpen={!roomCollapsed&&signedIn} onOpenPanel={()=>setRoomCollapsed(false)} onPickSource={()=>setPicker(true)} onLeave={leaveParty}
    transport={transport} volume={s.volume} showMetrics={showStats} mainVideoRef={stageVideoRef}
    gate={gated?<PartyGate party={party} signedIn={signedIn||auth.status==='loading'} onSignIn={login} onOpenAccount={myAccount} onStart={()=>setPicker(true)}/>:undefined}/>
   :<CaptureViewer backend={s.backend} running={running} stats={stats} smoothing={smoothingLevel(s.smoothing)} effect={effectIndex(s.effect)} cinemaHint={cinema.cinemaHint} screenRef={capture.screenRef} videoRef={capture.videoRef} audioRef={capture.audioRef}
   emptyState={!running&&<ViewerEmptyState busy={busy} hasDevices={devices.video.length>0} videoName={videoName} audioName={audioName} formatLabel={formatLabel} needsPermission={needsPermission} canStart={canStart} onStart={start} onStop={stop} onPermit={permit}/>}
   transport={transport}/>}
  panelTop={!partyMode&&auth.available&&auth.status==='signedOut'&&<AccountCta onSignUp={signUp} onSignIn={login}/>}
  panel={!partyMode||streamer?settingsPanel:undefined}
  roomPanel={partyMode&&signedIn&&!roomCollapsed?<RoomPanel party={party} side={roomSide} shareUrl={shareUrl} onCollapse={()=>setRoomCollapsed(true)} setError={setError} setNotice={setNotice}/>:undefined}
  toasts={<ToastStack countdown={cinema.countdown} onEnterCinema={cinema.enterCinema} onDisableAutoCinema={disableAutoCinema} error={error} onCloseError={()=>setError('')} onTroubleshoot={()=>setTroubleshoot(true)} notice={notice} onCloseNotice={()=>setNotice('')}/>}
  metrics={showStats&&!partyMode&&<MetricsBar stats={stats} backend={s.backend} running={running}/>}
  footer={<AppFooter onDonate={openDonation}/>}
  modals={<>
   {help&&<HelpModal onClose={closeHelp}/>}
   {troubleshoot&&<TroubleshootModal desktop={Boolean(bridge())} onClose={closeTroubleshoot}/>}
   {preferences&&<PreferencesModal onClose={closePreferences}/>}
   {saving&&<SavePresetModal existingNames={presets.presets.map(p=>p.name)} onSave={presets.savePreset} onClose={closeSave}/>}
   {authOpen&&<AuthModal auth={auth} onClose={closeAuth}/>}
   {askNickname&&!authOpen&&<NicknameStep auth={auth} onClose={closeNickname}/>}
   {askTelemetry&&!askNickname&&<TelemetryModal onChoose={g=>setTelemetryConsent(g?'granted':'denied')}/>}
   {picker&&<ScreenSourcePicker cardStream={s.backend==='compat'&&running?capture.mediaStream():null} cardLabel={videoName??''} onPick={pickSource} onClose={closePicker}/>}
  </>}
 />;
}
