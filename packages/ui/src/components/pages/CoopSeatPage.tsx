import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCapture } from '../../hooks/useCapture';
import { useCinema } from '../../hooks/useCinema';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNativeBounds } from '../../hooks/useNativeBounds';
import { useOwnerRoomSettings } from '../../hooks/useOwnerRoomSettings';
import { useParty } from '../../hooks/useParty';
import { usePictureInPicture } from '../../hooks/usePictureInPicture';
import { usePresets } from '../../hooks/usePresets';
import { useSettings } from '../../hooks/useSettings';
import { useStreamPicker } from '../../hooks/useStreamPicker';
import { useToasts } from '../../hooks/useToasts';
import { useUpdateNotice } from '../../hooks/useUpdateNotice';
import { openDonation } from '../../lib/donate';
import { errorText } from '../../lib/errors';
import type { BanEntry } from '../../lib/party/api';
import { effectIndex, smoothingLevel } from '../../lib/settings';
import { cardSource } from '../../lib/stream-source';
import {
  setTelemetryConsent,
  track,
  useTelemetryConsent,
} from '../../lib/telemetry';
import { bridge } from '../../platform';
import { I18nProvider, useT, type UiLocale } from '../../i18n';
import {
  LAST_VOLUME_KEY,
  ONBOARDED_KEY,
  PANEL_COLLAPSED_KEY,
  PANEL_SIDE_KEY,
  PARTY_PANEL_KEY,
  STATS_KEY,
} from '../../lib/storage';
import { PanelRail } from '../molecules';
import {
  AccountCta,
  AppFooter,
  AppHeader,
  AuthModal,
  CaptureViewer,
  HelpModal,
  MetricsBar,
  NicknameStep,
  PartyGate,
  PreferencesModal,
  PresetPicker,
  RoomPanel,
  SavePresetModal,
  SettingsPanel,
  StreamSourceSettings,
  StreamStage,
  TelemetryModal,
  ToastStack,
  TransportBar,
  TroubleshootModal,
  UpdateNotice,
  ViewerEmptyState,
} from '../organisms';
import { MainLayout, type PanelSide } from '../templates/MainLayout';

/**
 * `locale` is set by hosts that already know the language (the site passes the URL locale). `party` opens
 * a Gaming-Party room (the site's /party/{nickname}); on desktop rooms open from deep links or "My room".
 */
export function CoopSeatPage({
  locale,
  party,
}: { locale?: UiLocale; party?: string } = {}) {
  return (
    <I18nProvider locale={locale}>
      <CoopSeat initialParty={party ?? null} />
    </I18nProvider>
  );
}

function CoopSeat({ initialParty }: { initialParty: string | null }) {
  const t = useT();
  const update = useUpdateNotice();
  const { settings: s, setSettings, change } = useSettings();
  const { error, setError, notice, setNotice } = useToasts();
  const [top, setTop] = useState(false);
  const capture = useCapture({
    settings: s,
    setSettings,
    top,
    setError,
    setNotice,
  });
  const presets = usePresets({
    settings: s,
    setSettings,
    native: capture.native,
    setError,
    setNotice,
  });
  const [help, setHelp] = useState(() => !localStorage.getItem(ONBOARDED_KEY)),
    [saving, setSaving] = useState(false),
    [presetMenu, setPresetMenu] = useState(false),
    [cinemaMenu, setCinemaMenu] = useState(false),
    [troubleshoot, setTroubleshoot] = useState(false),
    [preferences, setPreferences] = useState(false);
  const [showStats, setShowStats] = useState(
    () => localStorage.getItem(STATS_KEY) === '1',
  );
  useEffect(() => {
    localStorage.setItem(STATS_KEY, showStats ? '1' : '0');
  }, [showStats]);
  const [panelSide] = useState<PanelSide>(() =>
    localStorage.getItem(PANEL_SIDE_KEY) === 'left' ? 'left' : 'right',
  );
  const [panelCollapsed, setPanelCollapsed] = useState(
    () => localStorage.getItem(PANEL_COLLAPSED_KEY) === '1',
  );
  useEffect(() => {
    localStorage.setItem(PANEL_COLLAPSED_KEY, panelCollapsed ? '1' : '0');
  }, [panelCollapsed]);

  const [partyNick, setPartyNick] = useState<string | null>(initialParty);
  const auth = useAuth({ setError, setNotice, onPartyLink: setPartyNick });
  const signedIn = auth.status === 'signedIn';
  const setBansRef = useRef<(bans: BanEntry[]) => void>(() => {});
  const party = useParty({
    nickname: partyNick ?? '',
    enabled: Boolean(partyNick) && signedIn,
    setError,
    setNotice,
    smoothing: smoothingLevel(s.smoothing),
    effect: effectIndex(s.effect),
    onBansChange: (bans) => setBansRef.current(bans),
  });
  const ownerSettings = useOwnerRoomSettings(
    partyNick,
    Boolean(partyNick) && signedIn && party.isOwner,
    setError,
  );
  setBansRef.current = ownerSettings.setBans;
  const [roomCollapsed, setRoomCollapsed] = useState(
    () => localStorage.getItem(PARTY_PANEL_KEY) === '1',
  );
  useEffect(() => {
    localStorage.setItem(PARTY_PANEL_KEY, roomCollapsed ? '1' : '0');
  }, [roomCollapsed]);
  const [authOpen, setAuthOpen] = useState(false),
    [nicknameOpen, setNicknameOpen] = useState(false),
    [nicknameSkipped, setNicknameSkipped] = useState(false);
  const askNickname =
    nicknameOpen ||
    (auth.status === 'signedIn' &&
      auth.account !== null &&
      !auth.account.nickname &&
      !nicknameSkipped &&
      !help);

  const telemetry = useTelemetryConsent(),
    askTelemetry = Boolean(bridge()) && telemetry === null && !help;
  const opened = useRef(false);
  useEffect(() => {
    if (telemetry === 'granted' && !opened.current) {
      opened.current = true;
      track({ event: 'app_open' });
    }
  }, [telemetry]);

  const { devices, modes, running, busy, stats, loaded } = capture;
  useEffect(() => {
    if (running) track({ event: 'capture_start', backend: s.backend });
  }, [running]);
  const partyMode = Boolean(partyNick);
  const modalOpen =
    help ||
    troubleshoot ||
    preferences ||
    saving ||
    authOpen ||
    askNickname ||
    askTelemetry;
  // In a party the "player" is the stage: something is on screen once a streamer has a tile.
  const watching =
    partyMode && party.phase === 'live' && party.slots.main.length > 0;
  // Auto cinema would hide the room chat while people just watch and read, so parties only get the manual one.
  const cinema = useCinema({
    running: partyMode ? watching : running,
    backend: partyMode ? 'compat' : s.backend,
    autoFull: !partyMode && s.autoFull,
    cinemaDelay: s.cinemaDelay,
    blocked: modalOpen || presetMenu || cinemaMenu,
  });
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);
  const nativeSlotRef = useRef<HTMLElement | null>(null);
  const nativeOnSlot =
    running &&
    s.backend === 'native' &&
    partyMode &&
    !!party.self?.id &&
    party.slots.main.includes(party.self.id);
  useNativeBounds(
    nativeOnSlot ? nativeSlotRef : capture.screenRef,
    running &&
      s.backend === 'native' &&
      (!partyMode || party.slots.main.length === 0 || nativeOnSlot),
    modalOpen,
  );
  const pip = usePictureInPicture({
    videoRef: capture.videoRef,
    enabled: !partyMode && running && s.backend === 'compat',
    setError,
  });
  const stagePip = usePictureInPicture({
    videoRef: stageVideoRef,
    enabled: watching,
    setError,
  });
  const lastVolume = useRef(0);
  if (!lastVolume.current) {
    const saved = Number(localStorage.getItem(LAST_VOLUME_KEY));
    lastVolume.current = saved > 0 && saved <= 1 ? saved : 0.75;
  }
  useEffect(() => {
    if (s.volume > 0) {
      lastVolume.current = s.volume;
      localStorage.setItem(LAST_VOLUME_KEY, String(s.volume));
    }
  }, [s.volume]);
  const toggleMute = useCallback(
    () =>
      setSettings((x) => ({ ...x, volume: x.volume ? 0 : lastVolume.current })),
    [setSettings],
  );
  useKeyboardShortcuts({
    onFullscreen: () => void cinema.fullscreen(),
    onExit: cinema.exit,
    onMute: toggleMute,
  });

  const closeHelp = useCallback(() => {
    setHelp(false);
    localStorage.setItem(ONBOARDED_KEY, '1');
  }, []);
  const closeSave = useCallback(() => setSaving(false), []);
  const closeTroubleshoot = useCallback(() => setTroubleshoot(false), []);
  const closePreferences = useCallback(() => setPreferences(false), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const closeNickname = useCallback(() => {
    setNicknameOpen(false);
    setNicknameSkipped(true);
  }, []);
  const login = () => (auth.web ? auth.openSignIn() : setAuthOpen(true));
  const signUp = () =>
    void auth.openSignUp().catch((e) => setError(errorText(e)));
  const myAccount = () =>
    void auth.openWeb('/account').catch((e) => setError(errorText(e)));
  const myNick = auth.account?.nickname ?? null;
  const myRoom = myNick
    ? () => {
        if (auth.web) location.assign(`/party/${encodeURIComponent(myNick)}`);
        else setPartyNick(myNick);
      }
    : undefined;
  const partyHref = myNick
    ? `/party/${encodeURIComponent(myNick)}`
    : auth.available && auth.status === 'signedOut'
      ? '/signup'
      : undefined;
  const leaveParty = () => {
    party.leave();
    if (auth.web) location.assign('/play');
    else setPartyNick(null);
  };
  const shareUrl = partyNick
    ? `${auth.web ? location.origin : 'https://coopseat.com'}/party/${encodeURIComponent(party.access?.room.owner ?? partyNick)}`
    : '';
  // Capture settings are only useful to whoever may stream.
  const streamer = party.isOwner || party.canStream;
  const videoName = devices.video.find((d) => d.id === s.video)?.name,
    audioName = devices.audio.find((d) => d.id === s.audio)?.name;
  const streamPicker = useStreamPicker({
    party,
    enabled: partyMode && streamer && !panelCollapsed,
    cardReady: running,
    ensureCard: capture.start,
    cardStream: capture.mediaStream,
    cardLabel: videoName ?? '',
    onCardStop: capture.releaseStream,
    setError,
    onUse: () => {
      resumeCard.current = false;
    },
  });
  // The card source clones the capture's tracks, so stopping the capture doesn't end it by itself.
  const resumeCard = useRef(false);
  useEffect(() => {
    if (running || party.source?.kind !== 'card') return;
    resumeCard.current = true;
    party.source.end();
  }, [running, party.source]);
  // Restarting the capture (for example to change its format) resumes whoever was streaming it.
  useEffect(() => {
    if (
      !resumeCard.current ||
      !running ||
      party.phase !== 'live' ||
      party.source ||
      party.busy
    )
      return;
    let cancel = false;
    void (async () => {
      try {
        const preview = await capture.mediaStream();
        if (cancel || !preview) {
          if (preview) capture.releaseStream();
          return;
        }
        resumeCard.current = false;
        await party.startStreaming(
          cardSource(
            preview,
            devices.video.find((d) => d.id === s.video)?.name ?? '',
            capture.releaseStream,
          ),
        );
      } catch (e) {
        if (!cancel) setError(errorText(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [
    running,
    s.backend,
    s.video,
    devices.video,
    party.phase,
    party.source,
    party.busy,
    party.startStreaming,
    capture.mediaStream,
    capture.releaseStream,
    setError,
  ]);
  const signOut = () => void auth.logout().catch((e) => setError(errorText(e)));
  const pin = async () => setTop(Boolean(await bridge()?.window('top')));
  const disableAutoCinema = () => {
    change('autoFull', false);
    setNotice(t.page.autoCinemaOff);
  };
  const start = () => void capture.start(),
    stop = () => void capture.stop(),
    permit = () => void capture.permit();
  const stopTransmit = () => {
    resumeCard.current = false;
    party.stopStreaming();
    if (streamPicker.kind === 'card') void capture.stop();
  };

  const currentMode = modes.find((m) => m.index === s.mode);
  const formatLabel =
    s.backend === 'native'
      ? currentMode
        ? `${currentMode.width} × ${currentMode.height} · ${currentMode.fps.toFixed(0)} fps`
        : ''
      : `${s.resolution.replace('x', ' × ')} · ${s.fps} fps`;
  const canStart =
    loaded && Boolean(s.video) && (s.backend !== 'native' || modes.length > 0);
  const needsPermission = s.backend === 'compat' && !devices.video.length,
    canPermit = needsPermission || (s.backend === 'compat' && capture.locked);
  const roomSide: PanelSide = 'right';
  const settingsSide: PanelSide = partyMode && streamer ? 'right' : panelSide;

  const settingsPanel = (
    <SettingsPanel
      side={settingsSide}
      onCollapse={() => setPanelCollapsed(true)}
      settings={s}
      change={change}
      devices={devices}
      modes={modes}
      running={running}
      busy={busy}
      canStart={canStart}
      needsPermission={canPermit}
      presetPicker={
        <PresetPicker
          presets={presets.presets}
          selected={presets.selectedPreset}
          defaultPreset={presets.defaultPreset}
          locked={
            running ||
            busy ||
            (partyMode && (Boolean(party.source) || party.busy))
          }
          menuOpen={presetMenu}
          onMenuOpenChange={setPresetMenu}
          onApply={presets.applyPreset}
          onSaveNew={() => setSaving(true)}
          onUpdate={presets.savePreset}
          onToggleDefault={presets.toggleDefaultPreset}
          onDelete={presets.deletePreset}
        />
      }
      sourcePicker={
        partyMode ? (
          <StreamSourceSettings
            picker={streamPicker}
            locked={running || busy || Boolean(party.source) || party.busy}
          />
        ) : undefined
      }
      devicesHidden={partyMode && streamPicker.kind !== 'card'}
      onRefresh={() => void capture.refresh()}
      onPermit={permit}
      onSelectDevice={capture.selectDevice}
      onStart={start}
      onStop={stop}
      transmit={
        partyMode
          ? {
              streaming: Boolean(party.source),
              busy: party.busy || busy,
              canStart:
                streamPicker.kind === 'card' ? canStart : !streamPicker.blocked,
              blocked: streamPicker.blocked,
              onStart: streamPicker.start,
              onStop: stopTransmit,
            }
          : undefined
      }
    />
  );
  const gated = !signedIn || party.phase !== 'live';
  // Prefer inbound stats for whoever is on the main tile; when that is us, use send-side stats.
  const mainTileId = party.slots.main[0];
  const partyMetrics =
    mainTileId && mainTileId !== party.self?.id
      ? (party.metrics[mainTileId] ?? null)
      : (party.outbound ?? null);
  const partyStatsActive = Boolean(
    (mainTileId && mainTileId !== party.self?.id) || party.source,
  );
  const activePip = partyMode ? stagePip : pip;
  const transport = (
    <TransportBar
      volume={s.volume}
      onVolume={(v) => change('volume', v)}
      onToggleMute={toggleMute}
      showStats={showStats}
      onToggleStats={() => setShowStats((x) => !x)}
      top={top}
      canPin={Boolean(bridge())}
      onPin={() => void pin()}
      pipActive={activePip.active}
      canPip={
        activePip.supported &&
        (partyMode ? watching : running && s.backend === 'compat')
      }
      onPip={activePip.toggle}
      cinemaActive={cinema.chromeHidden}
      canCinema={partyMode ? watching : running}
      onCinema={cinema.enterCinema}
      autoCinema={!partyMode && s.autoFull}
      cinemaDelay={s.cinemaDelay}
      cinemaMenu={cinemaMenu}
      onCinemaMenu={setCinemaMenu}
      onAutoCinema={(v) => change('autoFull', v)}
      onCinemaDelay={(v) => change('cinemaDelay', v)}
      onFullscreen={() => void cinema.fullscreen()}
    />
  );

  return (
    <MainLayout
      immersive={cinema.chromeHidden}
      panelSide={panelSide}
      panelCollapsed={panelCollapsed}
      roomCollapsed={roomCollapsed}
      header={
        <>
          <AppHeader
            auth={auth}
            onHelp={() => setHelp(true)}
            onTroubleshoot={() => setTroubleshoot(true)}
            onPreferences={() => setPreferences(true)}
            onLogin={login}
            onMyAccount={myAccount}
            onMyRoom={myRoom}
            onSignOut={signOut}
          />
          {update.version ? (
            <UpdateNotice
              version={update.version}
              onDownload={update.download}
              onDismiss={update.dismiss}
            />
          ) : null}
        </>
      }
      viewer={
        partyMode ? (
          <StreamStage
            party={party}
            onLeave={leaveParty}
            transport={transport}
            volume={s.volume}
            showMetrics={showStats}
            mainVideoRef={stageVideoRef}
            previewRef={
              s.backend === 'native' && running && party.slots.main.length === 0
                ? capture.screenRef
                : undefined
            }
            nativeSlotRef={nativeOnSlot ? nativeSlotRef : undefined}
            gate={
              gated ? (
                <PartyGate
                  party={party}
                  signedIn={signedIn || auth.status === 'loading'}
                  onSignIn={login}
                  onOpenAccount={myAccount}
                  onStart={streamPicker.start}
                  busy={busy}
                  startBlocked={streamPicker.blocked}
                />
              ) : undefined
            }
          />
        ) : (
          <CaptureViewer
            backend={s.backend}
            running={running}
            stats={stats}
            smoothing={smoothingLevel(s.smoothing)}
            effect={effectIndex(s.effect)}
            cinemaHint={cinema.cinemaHint}
            screenRef={capture.screenRef}
            videoRef={capture.videoRef}
            audioRef={capture.audioRef}
            emptyState={
              !running && (
                <ViewerEmptyState
                  busy={busy}
                  hasDevices={devices.video.length > 0}
                  videoName={videoName}
                  audioName={audioName}
                  formatLabel={formatLabel}
                  needsPermission={needsPermission}
                  canStart={canStart}
                  onStart={start}
                  onStop={stop}
                  onPermit={permit}
                />
              )
            }
            transport={transport}
            partyHref={partyHref}
            onPartyClick={
              auth.web
                ? undefined
                : (e) => {
                    e.preventDefault();
                    if (myNick) setPartyNick(myNick);
                    else signUp();
                  }
            }
          />
        )
      }
      panelTop={
        !partyMode &&
        auth.available &&
        auth.status === 'signedOut' && (
          <AccountCta onSignUp={signUp} onSignIn={login} />
        )
      }
      panel={
        !partyMode || streamer ? (
          panelCollapsed ? (
            <PanelRail
              label={t.settings.title}
              expandLabel={t.settings.expand}
              side={settingsSide}
              onExpand={() => setPanelCollapsed(false)}
            />
          ) : (
            settingsPanel
          )
        ) : undefined
      }
      roomPanel={
        partyMode && signedIn ? (
          roomCollapsed ? (
            <PanelRail
              label={t.party.tabs.chat}
              expandLabel={t.party.stage.openPanel}
              side={roomSide}
              onExpand={() => setRoomCollapsed(false)}
              badge={party.chat.unread || undefined}
            />
          ) : (
            <RoomPanel
              party={party}
              side={roomSide}
              shareUrl={shareUrl}
              ownerSettings={party.isOwner ? ownerSettings : null}
              onCollapse={() => setRoomCollapsed(true)}
              setError={setError}
              setNotice={setNotice}
            />
          )
        ) : undefined
      }
      toasts={
        <ToastStack
          countdown={cinema.countdown}
          onEnterCinema={cinema.enterCinema}
          onDisableAutoCinema={disableAutoCinema}
          error={error}
          onCloseError={() => setError('')}
          onTroubleshoot={() => setTroubleshoot(true)}
          notice={notice}
          onCloseNotice={() => setNotice('')}
        />
      }
      metrics={
        showStats &&
        (partyMode ? (
          <MetricsBar
            kind="stream"
            metrics={partyMetrics}
            active={partyStatsActive}
          />
        ) : (
          <MetricsBar stats={stats} backend={s.backend} running={running} />
        ))
      }
      footer={<AppFooter onDonate={openDonation} />}
      modals={
        <>
          {help && <HelpModal onClose={closeHelp} />}
          {troubleshoot && (
            <TroubleshootModal
              desktop={Boolean(bridge())}
              onClose={closeTroubleshoot}
            />
          )}
          {preferences && <PreferencesModal onClose={closePreferences} />}
          {saving && (
            <SavePresetModal
              existingNames={presets.presets.map((p) => p.name)}
              onSave={presets.savePreset}
              onClose={closeSave}
            />
          )}
          {authOpen && <AuthModal auth={auth} onClose={closeAuth} />}
          {askNickname && !authOpen && (
            <NicknameStep auth={auth} onClose={closeNickname} />
          )}
          {askTelemetry && !askNickname && (
            <TelemetryModal
              onChoose={(g) => setTelemetryConsent(g ? 'granted' : 'denied')}
            />
          )}
        </>
      }
    />
  );
}
