import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTDOWN_FROM,
  PAUSE_MS,
  type Backend,
  type Countdown,
} from '../lib/settings';
import { bridge } from '../platform';

const countdownFrom = (delay: number) => Math.min(COUNTDOWN_FROM, delay);

type Options = {
  running: boolean;
  backend: Backend;
  autoFull: boolean;
  cinemaDelay: number;
  blocked: boolean;
};

export function useCinema(options: Options) {
  const { running, backend, autoFull, cinemaDelay } = options;
  const [cinema, setCinema] = useState(false),
    [chromeRevealed, setChromeRevealed] = useState(false),
    [countdown, setCountdownState] = useState<Countdown>(null),
    [cinemaHint, setCinemaHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    countdownTimer = useRef<ReturnType<typeof setInterval> | undefined>(
      undefined,
    ),
    grace = useRef(0),
    countdownRef = useRef<Countdown>(null),
    cinemaRef = useRef(false),
    chromeRef = useRef(false),
    live = useRef(options);
  live.current = options;
  cinemaRef.current = cinema;
  chromeRef.current = chromeRevealed;

  const setCountdown = useCallback((v: Countdown) => {
    countdownRef.current = v;
    setCountdownState(v);
  }, []);
  const clearCinemaTimers = useCallback(() => {
    clearTimeout(timer.current);
    clearInterval(countdownTimer.current);
  }, []);
  const cancelAutoFull = useCallback(() => {
    clearCinemaTimers();
    setCountdown(null);
  }, [clearCinemaTimers, setCountdown]);
  const enterCinema = useCallback(() => {
    if (!live.current.running) return;
    cancelAutoFull();
    grace.current = Date.now() + 1200;
    setCinema(true);
    setChromeRevealed(false);
  }, [cancelAutoFull]);
  const exitCinema = useCallback(() => {
    cancelAutoFull();
    setCinema(false);
    setChromeRevealed(false);
  }, [cancelAutoFull]);

  /** Silently hide overlay chrome after the idle delay while cinema stays on. */
  const scheduleHideChrome = useCallback(() => {
    clearTimeout(timer.current);
    const o = live.current;
    if (!o.running || o.blocked || !cinemaRef.current || !chromeRef.current)
      return;
    timer.current = setTimeout(() => {
      if (!cinemaRef.current) return;
      grace.current = Date.now() + 400;
      setChromeRevealed(false);
    }, o.cinemaDelay * 1000);
  }, []);

  const startCountdown = useCallback(() => {
    clearCinemaTimers();
    const o = live.current;
    if (!o.running || !o.autoFull || o.blocked || cinemaRef.current) {
      setCountdown(null);
      return;
    }
    let n = countdownFrom(o.cinemaDelay);
    setCountdown(n);
    countdownTimer.current = setInterval(() => {
      n--;
      if (n > 0) {
        setCountdown(n);
        return;
      }
      clearInterval(countdownTimer.current);
      setCountdown(null);
      grace.current = Date.now() + 400;
      setCinema(true);
      setChromeRevealed(false);
    }, 1000);
  }, [clearCinemaTimers, setCountdown]);

  const scheduleAutoEnter = useCallback(() => {
    cancelAutoFull();
    const o = live.current;
    if (!o.running || !o.autoFull || o.blocked || cinemaRef.current) return;
    timer.current = setTimeout(
      startCountdown,
      (o.cinemaDelay - countdownFrom(o.cinemaDelay)) * 1000,
    );
  }, [cancelAutoFull, startCountdown]);

  const wake = useCallback(() => {
    if (Date.now() < grace.current) return;
    if (countdownRef.current !== null) {
      clearCinemaTimers();
      setCountdown('paused');
      timer.current = setTimeout(startCountdown, PAUSE_MS);
      return;
    }
    if (cinemaRef.current) {
      setChromeRevealed(true);
      chromeRef.current = true;
      scheduleHideChrome();
      return;
    }
    scheduleAutoEnter();
  }, [
    clearCinemaTimers,
    setCountdown,
    startCountdown,
    scheduleHideChrome,
    scheduleAutoEnter,
  ]);

  const fullscreen = useCallback(async () => {
    const b = bridge();
    if (b) await b.window('fullscreen');
    else if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }, []);
  const exit = useCallback(() => {
    void bridge()?.window('exitFullscreen');
    if (document.fullscreenElement) void document.exitFullscreen();
    exitCinema();
  }, [exitCinema]);

  const blocked = options.blocked;
  useEffect(() => {
    if (!running) {
      cancelAutoFull();
      setCinema(false);
      setChromeRevealed(false);
      return;
    }
    if (blocked) {
      cancelAutoFull();
      return;
    }
    if (cinema && chromeRevealed) scheduleHideChrome();
    else if (!cinema && autoFull) scheduleAutoEnter();
    else cancelAutoFull();
  }, [
    running,
    blocked,
    autoFull,
    cinemaDelay,
    cinema,
    chromeRevealed,
    scheduleHideChrome,
    scheduleAutoEnter,
    cancelAutoFull,
  ]);
  useEffect(() => {
    if (!cinema || backend !== 'compat') {
      setCinemaHint(false);
      return;
    }
    setCinemaHint(true);
    const t = setTimeout(() => setCinemaHint(false), 2500);
    return () => clearTimeout(t);
  }, [cinema, backend]);
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'wheel', 'keydown'] as const;
    events.forEach((n) => window.addEventListener(n, wake, { passive: true }));
    return () => events.forEach((n) => window.removeEventListener(n, wake));
  }, [wake]);
  const watchingPointer =
    running && backend === 'native' && (autoFull || cinema);
  useEffect(() => {
    const b = bridge();
    if (!watchingPointer || !b) return;
    void b.watchPointer(true);
    const off = b.onPointer(wake);
    return () => {
      off();
      void b.watchPointer(false);
    };
  }, [watchingPointer, wake]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearInterval(countdownTimer.current);
    },
    [],
  );

  return {
    cinema,
    chromeRevealed,
    countdown,
    cinemaHint,
    enterCinema,
    exitCinema,
    fullscreen,
    exit,
  };
}
