import type { MediaPrivacy } from './lib/media-access';
import type {
  AuthDeepLink,
  Devices,
  Mode,
  NativeEvent,
  OpenConfig,
  ScreenSource,
} from './types';

/** API exposed by the Electron preload as `window.input`. */
export type DesktopBridge = {
  info(): Promise<{
    native: boolean;
    platform: string;
    version: string;
    bffUrl?: string;
  }>;
  auth: {
    open(url: string): Promise<void>;
    pending(): Promise<AuthDeepLink | null>;
    onCallback(callback: (link: AuthDeepLink) => void): () => void;
  };
  secureStore: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<boolean>;
    remove(key: string): Promise<boolean>;
  };
  /** Windows camera/microphone consent for desktop apps. Unknown when it cannot be read. */
  mediaPrivacy(): Promise<MediaPrivacy>;
  devices(): Promise<Devices>;
  modes(device: string): Promise<{ modes: Mode[] }>;
  open(config: OpenConfig): Promise<boolean>;
  stop(): Promise<void>;
  control(key: string, value: number | boolean): Promise<void>;
  bounds(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    holes?: {
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
    }[];
    dim?: number;
  }): Promise<void>;
  window(action: string): Promise<boolean | void>;
  donate(): Promise<void>;
  watchPointer(on: boolean): Promise<void>;
  onPointer(callback: () => void): () => void;
  onNative(callback: (event: NativeEvent) => void): () => void;
  /** Frames of the open native capture, only while a party stream has asked for them. */
  onNativeMedia?(
    callback: (
      meta:
        | {
            kind: 'video';
            width: number;
            height: number;
            format: 'nv12' | 'bgra';
            stride: number;
          }
        | { kind: 'audio'; sampleRate: number; channels: number },
      data: Uint8Array<ArrayBuffer>,
    ) => void,
  ): () => void;
  /** `pick` arms the next getDisplayMedia() call with that source; `audio` adds system loopback (Windows). */
  screen: {
    sources(): Promise<ScreenSource[]>;
    pick(id: string, audio: boolean): Promise<boolean>;
    protect(on: boolean): Promise<boolean>;
    /**
     * Process audio for a source (Windows 10 2004+): a window's own program, or everything but this
     * app for a screen. Resolves with a session number once capturing; PCM (48 kHz, stereo, s16le)
     * for that session arrives on `onAudio`.
     */
    audio?(id: string): Promise<number>;
    audioStop?(session: number): Promise<void>;
    onAudio?(
      callback: (session: number, pcm: Uint8Array<ArrayBuffer>) => void,
    ): () => void;
  };
};

/**
 * - desktop: Electron, native capture and Bearer sessions kept in the OS secure store.
 * - web: browser only (Chromium capture). With `accounts`, the page is served by the BFF
 *   itself and the account rides on its same-origin httpOnly cookies. `cookiePreferences`
 *   opens the host's cookie consent dialog; omit it when the host sets no optional cookies.
 */
export type Platform =
  | { kind: 'desktop'; bridge: DesktopBridge }
  | { kind: 'web'; accounts: boolean; cookiePreferences?(): void };

let current: Platform = { kind: 'web', accounts: false };

/** Must run before the first render. */
export function configurePlatform(platform: Platform) {
  current = platform;
}
export const platform = () => current;
export const bridge = () =>
  current.kind === 'desktop' ? current.bridge : undefined;
