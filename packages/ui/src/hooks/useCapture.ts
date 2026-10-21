import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Devices, Mode, NativeEvent } from '../types';
import { matchingAudio } from '../lib/devices';
import { errorText, niceError } from '../lib/errors';
import {
  MEDIA_WAIT_MS,
  nativeAccessFailure,
  resolveMediaAccess,
  type MediaAccessHint,
  type MediaKind,
} from '../lib/media-access';
import {
  effectIndex,
  emptyDevices,
  smoothingLevel,
  type Settings,
} from '../lib/settings';
import { getT, useT } from '../i18n';
import { bridge } from '../platform';
import { openNativeMedia, type NativeFeed } from '../lib/native-media';

function accessHintText(hint: MediaAccessHint, fallback: string) {
  const access = getT().capture.access;
  switch (hint.kind) {
    case 'waiting-external':
      return access.waitingExternal;
    case 'waiting':
      return access.waiting;
    case 'browser-prompt':
      return access.browserPrompt;
    case 'windows-privacy':
      return access.windowsPrivacy(hint.device);
    case 'external-block':
      return access.externalBlock;
    case 'external-block-web':
      return access.externalBlockWeb;
    case 'browser-denied':
      return access.browserDenied;
    default:
      return fallback;
  }
}

async function mediaText(
  device: MediaKind,
  options: { pending: boolean; errorName?: string; fallback: string },
) {
  try {
    const hint = await resolveMediaAccess({
      pending: options.pending,
      device,
      errorName: options.errorName,
    });
    return accessHintText(hint, options.fallback);
  } catch {
    return options.fallback;
  }
}

async function failureText(error: unknown, device: MediaKind) {
  const name = error instanceof Error ? error.name : '';
  return mediaText(device, {
    pending: false,
    errorName: name,
    fallback: niceError(error),
  });
}

type Options = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  top: boolean;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: (message: string) => void;
};
export type DeviceKey = 'video' | 'audio' | 'output';

export function useCapture({
  settings: s,
  setSettings: setS,
  top,
  setError,
  setNotice,
}: Options) {
  const t = useT(),
    tRef = useRef(t);
  tRef.current = t;
  const [devices, setDevices] = useState<Devices>(emptyDevices),
    [modes, setModes] = useState<Mode[]>([]),
    [native, setNative] = useState(false),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [running, setRunning] = useState(false),
    [stats, setStats] = useState<NativeEvent | null>(null),
    [locked, setLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null),
    audioRef = useRef<HTMLAudioElement>(null),
    screenRef = useRef<HTMLDivElement>(null),
    stream = useRef<MediaStream | null>(null),
    audioStream = useRef<MediaStream | null>(null),
    nativeFeed = useRef<NativeFeed | null>(null),
    relayHolds = useRef(0),
    generation = useRef(0),
    current = useRef(s),
    runningRef = useRef(false);
  current.current = s;
  runningRef.current = running;
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    waitGen = useRef(0),
    accessNote = useRef(false),
    activeWait = useRef(0);
  const cancelWait = useCallback((id: number) => {
    if (waitGen.current !== id) return;
    if (waitTimer.current !== null) clearTimeout(waitTimer.current);
    waitTimer.current = null;
    waitGen.current++;
  }, []);
  const finishWait = useCallback(
    (id: number) => {
      if (waitGen.current !== id) return;
      cancelWait(id);
      if (!accessNote.current) return;
      accessNote.current = false;
      setError('');
    },
    [cancelWait, setError],
  );
  const armWait = useCallback(
    (token: number, device: MediaKind) => {
      if (waitTimer.current !== null) clearTimeout(waitTimer.current);
      const id = ++waitGen.current;
      activeWait.current = id;
      waitTimer.current = setTimeout(() => {
        waitTimer.current = null;
        void mediaText(device, { pending: true, fallback: '' }).then(
          (message) => {
            if (
              waitGen.current !== id ||
              generation.current !== token ||
              !message
            )
              return;
            accessNote.current = true;
            setError(message);
          },
        );
      }, MEDIA_WAIT_MS);
      return id;
    },
    [setError],
  );
  const waitApi = useRef({ finishWait, cancelWait });
  waitApi.current = { finishWait, cancelWait };

  const release = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    audioStream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    audioStream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);
  const stop = useCallback(async () => {
    generation.current++;
    cancelWait(activeWait.current);
    if (accessNote.current) {
      accessNote.current = false;
      setError('');
    }
    release();
    relayHolds.current = 0;
    nativeFeed.current?.stop();
    nativeFeed.current = null;
    await bridge()?.stop();
    setRunning(false);
    setBusy(false);
    setStats(null);
  }, [cancelWait, release, setError]);

  useEffect(() => {
    let alive = true;
    bridge()
      ?.info()
      .then((info) => {
        if (!alive) return;
        setNative(info.native);
        setS((x) => ({ ...x, backend: info.native ? 'native' : 'compat' }));
        setLoaded(true);
      })
      .catch((e) => {
        setError(errorText(e));
        setLoaded(true);
      });
    if (!bridge()) {
      setLoaded(true);
      setS((x) => ({ ...x, backend: 'compat' }));
    }
    return () => {
      alive = false;
      waitGen.current++;
      if (waitTimer.current !== null) clearTimeout(waitTimer.current);
      release();
    };
  }, [release]);
  useEffect(
    () =>
      bridge()?.onNative((e) => {
        if (e.type === 'started') {
          waitApi.current.finishWait(activeWait.current);
          setBusy(false);
          setRunning(true);
          setStats(e);
        } else if (e.type === 'stats') setStats((x) => ({ ...x, ...e }));
        else if (e.type === 'error') {
          const seen = generation.current;
          waitApi.current.cancelWait(activeWait.current);
          accessNote.current = false;
          const raw = e.message || tRef.current.capture.nativeFailure;
          const device = nativeAccessFailure(raw);
          void stop();
          if (!device) {
            setError(raw);
            return;
          }
          void mediaText(device, {
            pending: false,
            errorName: 'NotReadableError',
            fallback: raw,
          }).then((message) => {
            if (generation.current > seen + 1) return;
            setError(message);
          });
        } else if (e.type === 'warning') {
          const raw = e.message || '';
          const device = nativeAccessFailure(raw);
          if (!device) {
            setNotice(raw);
            return;
          }
          void mediaText(device, {
            pending: false,
            errorName: 'NotReadableError',
            fallback: raw,
          }).then((message) =>
            setNotice(
              raw.startsWith('Vídeo sem áudio') && message !== raw
                ? tRef.current.capture.audioFailed(message)
                : message,
            ),
          );
        } else if (e.type === 'stopped') {
          waitApi.current.cancelWait(activeWait.current);
          setRunning(false);
          setBusy(false);
          setStats(null);
          if (e.message) {
            const replace = accessNote.current;
            accessNote.current = false;
            setError((previous) =>
              replace ? e.message! : previous || e.message!,
            );
          } else if (accessNote.current) {
            accessNote.current = false;
            setError('');
          }
        }
      }),
    [stop],
  );

  const refresh = useCallback(async () => {
    setError('');
    try {
      let d: Devices;
      const backend = current.current.backend;
      if (backend === 'native') d = await bridge()!.devices();
      else {
        if (!navigator.mediaDevices)
          throw Error(tRef.current.capture.openInApp);
        const all = await navigator.mediaDevices.enumerateDevices();
        const to = (kind: MediaDeviceKind) =>
          all
            .filter((x) => x.kind === kind && x.deviceId)
            .map((x, i) => ({
              id: x.deviceId,
              name: x.label || tRef.current.capture.device(i + 1),
            }));
        d = {
          video: to('videoinput'),
          audio: to('audioinput'),
          output: to('audiooutput'),
        };
        setLocked(
          all.some(
            (x) =>
              (x.kind === 'videoinput' || x.kind === 'audioinput') &&
              !x.deviceId,
          ),
        );
      }
      if (current.current.backend !== backend) return;
      setDevices(d);
      setS((x) => {
        const keepVideo = d.video.some((v) => v.id === x.video),
          video = keepVideo
            ? x.video
            : (
                d.video.find((v) => /fifine|capture|usb video/i.test(v.name)) ||
                d.video[0]
              )?.id || '';
        const keepAudio =
          keepVideo &&
          (x.audio === '' || d.audio.some((a) => a.id === x.audio));
        return {
          ...x,
          video,
          audio: keepAudio
            ? x.audio
            : matchingAudio(
                d.video.find((v) => v.id === video),
                d.audio,
              ),
          output: d.output.some((a) => a.id === x.output) ? x.output : '',
        };
      });
    } catch (e) {
      setError(niceError(e));
    }
  }, []);
  useEffect(() => {
    if (loaded) void refresh();
  }, [s.backend, loaded, refresh]);
  useEffect(() => {
    let alive = true;
    setModes([]);
    if (s.backend === 'native' && s.video)
      bridge()!
        .modes(s.video)
        .then(({ modes: m }) => {
          if (!alive) return;
          const supported = m.filter((x) => x.supported);
          setModes(supported);
          setS((x) => ({
            ...x,
            mode: supported.some((v) => v.index === x.mode)
              ? x.mode
              : (supported
                  .slice()
                  .sort(
                    (a, b) =>
                      Math.abs(a.fps - 60) - Math.abs(b.fps - 60) ||
                      Math.abs(a.width - 1920) - Math.abs(b.width - 1920) ||
                      ['NV12', 'YUY2', 'MJPG'].indexOf(a.format) -
                        ['NV12', 'YUY2', 'MJPG'].indexOf(b.format),
                  )[0]?.index ?? 0),
          }));
        })
        .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [s.video, s.backend]);
  useEffect(() => {
    const fn = () => {
      if (runningRef.current) {
        setNotice(tRef.current.capture.devicesChanged);
      } else void refresh();
    };
    navigator.mediaDevices?.addEventListener('devicechange', fn);
    return () =>
      navigator.mediaDevices?.removeEventListener('devicechange', fn);
  }, [refresh]);

  const start = useCallback(async () => {
    const cfg = current.current;
    cancelWait(activeWait.current);
    accessNote.current = false;
    setError('');
    setNotice('');
    setBusy(true);
    setStats(null);
    const token = ++generation.current;
    const openDevice = async (
      device: MediaKind,
      run: () => Promise<MediaStream>,
    ) => {
      const id = armWait(token, device);
      try {
        const opened = await run();
        finishWait(id);
        return opened;
      } catch (e) {
        cancelWait(id);
        accessNote.current = false;
        throw Error(await failureText(e, device));
      }
    };
    try {
      if (!cfg.video) throw Error(tRef.current.capture.selectCard);
      if (cfg.backend === 'native') {
        const id = armWait(token, 'both');
        try {
          await bridge()!.open({
            device: cfg.video,
            mode: cfg.mode,
            audio: cfg.audio,
            output: cfg.output,
            volume: cfg.volume,
            vsync: cfg.vsync,
            smoothing: smoothingLevel(cfg.smoothing),
            effect: effectIndex(cfg.effect),
            top,
          });
        } catch (e) {
          cancelWait(id);
          accessNote.current = false;
          throw e;
        }
        return true;
      }
      const [width, height] = cfg.resolution.split('x').map(Number);
      const v = await openDevice('camera', () =>
        navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: cfg.video },
            width: { exact: width },
            height: { exact: height },
            frameRate: { ideal: cfg.fps, max: cfg.fps },
          },
          audio: false,
        }),
      );
      if (token !== generation.current) {
        v.getTracks().forEach((t) => t.stop());
        return false;
      }
      stream.current = v;
      const track = v.getVideoTracks()[0];
      track.addEventListener(
        'ended',
        () => {
          setError(tRef.current.capture.disconnected);
          void stop();
        },
        { once: true },
      );
      if (videoRef.current) {
        videoRef.current.srcObject = v;
        await videoRef.current.play();
      }
      if (cfg.audio) {
        try {
          const a = await openDevice('microphone', () =>
            navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                deviceId: { exact: cfg.audio },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: { ideal: 2 },
                sampleRate: { ideal: 48000 },
              },
            }),
          );
          if (token !== generation.current) {
            a.getTracks().forEach((t) => t.stop());
            return false;
          }
          audioStream.current = a;
          if (audioRef.current) {
            audioRef.current.srcObject = a;
            audioRef.current.volume = cfg.volume;
            const el = audioRef.current as HTMLAudioElement & {
              setSinkId?: (id: string) => Promise<void>;
            };
            if (cfg.output && el.setSinkId) await el.setSinkId(cfg.output);
            await el.play();
          }
        } catch (e) {
          audioStream.current?.getTracks().forEach((t) => t.stop());
          audioStream.current = null;
          if (token !== generation.current) return false;
          setNotice(
            tRef.current.capture.audioFailed(
              e instanceof Error ? e.message : niceError(e),
            ),
          );
        }
      }
      if (token !== generation.current) return false;
      const actual = track.getSettings();
      setStats({
        type: 'started',
        width: actual.width,
        height: actual.height,
        fps: actual.frameRate,
        format: 'Chromium',
      });
      setRunning(true);
      setBusy(false);
      return true;
    } catch (e) {
      if (token !== generation.current) return false;
      accessNote.current = false;
      release();
      setBusy(false);
      setRunning(false);
      setError(niceError(e));
      return false;
    }
  }, [armWait, cancelWait, finishWait, release, stop, top]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = s.volume;
    if (s.backend === 'native' && running)
      void bridge()?.control('volume', s.volume);
  }, [s.volume, running, s.backend]);
  useEffect(() => {
    if (s.backend === 'native' && running)
      void bridge()?.control('vsync', s.vsync);
  }, [s.vsync, running, s.backend]);
  useEffect(() => {
    if (s.backend === 'native' && running)
      void bridge()?.control('smoothing', smoothingLevel(s.smoothing));
  }, [s.smoothing, running, s.backend]);
  useEffect(() => {
    if (s.backend === 'native' && running)
      void bridge()?.control('effect', effectIndex(s.effect));
  }, [s.effect, running, s.backend]);

  // Browsers hide device ids and labels until each kind is granted, so the card's audio input needs the microphone too.
  const permit = async () => {
    const token = generation.current;
    const open = async (device: MediaKind, audio: boolean) => {
      const id = armWait(token, device);
      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio,
        });
        finishWait(id);
        return opened;
      } catch (e) {
        cancelWait(id);
        accessNote.current = false;
        throw Error(await failureText(e, device));
      }
    };
    try {
      let v: MediaStream;
      try {
        v = await open('both', true);
      } catch (e) {
        v = await open('camera', false);
        setNotice(
          tRef.current.capture.micDenied(
            e instanceof Error ? e.message : niceError(e),
          ),
        );
      }
      v.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : niceError(e));
    }
  };
  const pairedAudio = (x: Settings, video: string) => {
    const match = matchingAudio(
      devices.video.find((v) => v.id === video),
      devices.audio,
    );
    if (match) return match;
    const wasPaired =
      x.audio !== '' &&
      x.audio ===
        matchingAudio(
          devices.video.find((v) => v.id === x.video),
          devices.audio,
        );
    return wasPaired ? '' : x.audio;
  };
  const selectDevice = (key: DeviceKey, value: string) =>
    setS((x) => ({
      ...x,
      [key]: value,
      ...(key === 'video' ? { mode: -1, audio: pairedAudio(x, value) } : {}),
    }));

  /** Live card tracks. Native and compatibility both come from the capture that is already running. */
  const mediaStream = useCallback(async () => {
    if (current.current.backend === 'native') {
      const b = bridge();
      if (!b?.onNativeMedia) return null;
      if (!nativeFeed.current) nativeFeed.current = await openNativeMedia(b);
      relayHolds.current++;
      try {
        if (relayHolds.current === 1) await b.control('relay', true);
      } catch (e) {
        relayHolds.current = Math.max(0, relayHolds.current - 1);
        throw e;
      }
      return nativeFeed.current.stream;
    }
    const tracks = [
      ...(stream.current?.getTracks() ?? []),
      ...(audioStream.current?.getTracks() ?? []),
    ].filter((t) => t.readyState === 'live');
    return tracks.length ? new MediaStream(tracks) : null;
  }, []);
  const releaseStream = useCallback(() => {
    if (current.current.backend !== 'native') return;
    relayHolds.current = Math.max(0, relayHolds.current - 1);
    if (!relayHolds.current) void bridge()?.control('relay', false);
  }, []);
  return {
    devices,
    modes,
    native,
    loaded,
    busy,
    running,
    stats,
    locked,
    videoRef,
    audioRef,
    screenRef,
    start,
    stop,
    refresh,
    permit,
    selectDevice,
    mediaStream,
    releaseStream,
  };
}
