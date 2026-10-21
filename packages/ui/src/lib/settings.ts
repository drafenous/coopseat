import type { Devices, EffectIndex, SmoothingLevel } from '../types';
import { SETTINGS_KEY } from './storage';

export type Backend = 'native' | 'compat';
export const SMOOTHING = ['off', 'light', 'strong'] as const;
export type Smoothing = (typeof SMOOTHING)[number];
export const smoothingLevel = (s: Smoothing) =>
  SMOOTHING.indexOf(s) as SmoothingLevel;
export const EFFECTS = [
  'none',
  'crt',
  'crtFlat',
  'lcd',
  'vivid',
  'protanopia',
  'deuteranopia',
  'tritanopia',
] as const;
export type Effect = (typeof EFFECTS)[number];
export const effectIndex = (e: Effect) => EFFECTS.indexOf(e) as EffectIndex;
/** These effects redraw the pixel grid, so anti-aliasing is skipped under them. */
export const gridEffect = (e: Effect) =>
  e === 'crt' || e === 'crtFlat' || e === 'lcd';
export type Settings = {
  backend: Backend;
  video: string;
  audio: string;
  output: string;
  mode: number;
  resolution: string;
  fps: number;
  volume: number;
  vsync: boolean;
  smoothing: Smoothing;
  effect: Effect;
  autoFull: boolean;
  cinemaDelay: number;
};
export type Countdown = number | 'paused' | null;

/** Total idle seconds before cinema mode, countdown included. */
export const CINEMA_DELAYS = [1, 2, 3, 4, 5],
  COUNTDOWN_FROM = 3,
  PAUSE_MS = 3000;
export const defaults: Settings = {
  backend: 'native',
  video: '',
  audio: '',
  output: '',
  mode: -1,
  resolution: '1920x1080',
  fps: 60,
  volume: 0.75,
  vsync: false,
  smoothing: 'off',
  effect: 'none',
  autoFull: true,
  cinemaDelay: 5,
};
export const emptyDevices: Devices = { video: [], audio: [], output: [] };

export function sanitize(x: any): Settings {
  if (!x || typeof x !== 'object') return defaults;
  const volume = Number(x.volume ?? 0.75);
  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(x).filter(
        ([k, v]) =>
          k in defaults && typeof v === typeof defaults[k as keyof Settings],
      ),
    ),
    volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.75,
    cinemaDelay: CINEMA_DELAYS.includes(Number(x.cinemaDelay))
      ? Number(x.cinemaDelay)
      : defaults.cinemaDelay,
    smoothing: SMOOTHING.includes(x.smoothing)
      ? x.smoothing
      : defaults.smoothing,
    effect: EFFECTS.includes(x.effect) ? x.effect : defaults.effect,
  };
}

export function readSettings(): Settings {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch {
    return defaults;
  }
}
