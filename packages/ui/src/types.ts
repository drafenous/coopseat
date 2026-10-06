export type Device = { id: string; name: string; hardware?: string };
export type Mode = {
  index: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  supported: boolean;
};
export type Devices = { video: Device[]; audio: Device[]; output: Device[] };
export type NativeEvent = {
  type: string;
  message?: string;
  width?: number;
  height?: number;
  fps?: number;
  format?: string;
  dropped?: number;
  queueMs?: number;
  audioMs?: number;
};
/** 0 off, 1 anti-aliasing (FXAA), 2 anti-aliasing plus sharpening (CAS). */
export type SmoothingLevel = 0 | 1 | 2;
/** 0 none, 1 curved CRT, 2 flat CRT, 3 handheld LCD, 4 vivid colors, 5 protanopia, 6 deuteranopia, 7 tritanopia. */
export type EffectIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type OpenConfig = {
  device: string;
  mode: number;
  audio: string;
  output: string;
  volume: number;
  vsync: boolean;
  smoothing: SmoothingLevel;
  effect: EffectIndex;
  top: boolean;
};
export type AuthDeepLink =
  | { kind: 'callback'; ticket: string }
  | { kind: 'linked' }
  | { kind: 'confirmed' }
  | { kind: 'verified' }
  | { kind: 'party'; nickname: string };
/** A screen or window offered by Electron's desktopCapturer. */
export type ScreenSource = {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnail: string | null;
};
