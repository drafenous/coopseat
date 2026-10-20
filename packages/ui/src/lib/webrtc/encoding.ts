import type { Quality } from '../../party/protocol';
import { bridge } from '../../platform';

export type VideoProfile = {
  maxKbps: number;
  maxFramerate: number;
  scaleResolutionDownBy: number;
};

/** Game streams: keep the picture sharp. A tight link may shed a few frames before it softens the image. */
export const VIDEO_PROFILES: Record<
  Exclude<Quality, 'paused'>,
  VideoProfile
> = {
  high: { maxKbps: 6000, maxFramerate: 60, scaleResolutionDownBy: 1 },
  low: { maxKbps: 1200, maxFramerate: 30, scaleResolutionDownBy: 2 },
};
/**
 * A browser encode of 1080p60 sits on the cap and sheds frames in clumps. A fixed 30 fps at
 * 4500 kbps is a rate it can actually hold.
 */
export const BROWSER_MAX_KBPS = 4_500;
export const BROWSER_MAX_FPS = 30;
/**
 * What the live room actually sends. The capture and the local preview stay at their own size;
 * each video sender is scaled to fit inside this box at 30 fps.
 */
export const SEND_MAX_WIDTH = 1280;
export const SEND_MAX_HEIGHT = 720;
export const SEND_MAX_FPS = 30;
/** Upper end of a 720p30 game picture. A quiet scene uses less. */
export const SEND_MAX_KBPS = 2_500;
export const MIN_VIDEO_KBPS = 300;
export const AUDIO_KBPS = 128;
/** Mesh: the streamer uploads one copy per viewer, so the total is split between them. */
export const DEFAULT_UPLOAD_BUDGET_KBPS = 20_000;
const CODEC_ORDER = ['video/H264', 'video/AV1', 'video/VP9', 'video/VP8'];

/** How far to shrink a frame so it fits inside 1280×720. A smaller frame stays at 1. */
export function sendScale(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  return Math.max(width / SEND_MAX_WIDTH, height / SEND_MAX_HEIGHT, 1);
}

export function trackPixelSize(
  track: MediaStreamTrack,
): { width: number; height: number } | null {
  const s = track.getSettings?.();
  const width = s?.width ?? 0;
  const height = s?.height ?? 0;
  if (width > 0 && height > 0) return { width, height };
  return null;
}

/** Encoder cap for one video sender. Does nothing to the track the preview is showing. */
export async function capVideoSender(sender: RTCRtpSender, scale: number) {
  const params = sender.getParameters() as RTCRtpSendParameters & {
    degradationPreference?: string;
  };
  const encodings = params.encodings?.length
    ? params.encodings
    : [{} as RTCRtpEncodingParameters];
  params.encodings = encodings.map((e) => ({
    ...e,
    active: true,
    maxBitrate: SEND_MAX_KBPS * 1000,
    maxFramerate: SEND_MAX_FPS,
    scaleResolutionDownBy: scale,
  }));
  params.degradationPreference = 'maintain-framerate';
  try {
    await sender.setParameters(params);
  } catch {
    /* encodings are not writable yet; the next offer retries */
  }
}

export function prepareTrack(track: MediaStreamTrack) {
  try {
    track.contentHint = track.kind === 'video' ? 'motion' : 'music';
  } catch {
    /* read-only in some engines */
  }
}

/** Hardware-friendly codecs first; keeps RTX/RED/FEC entries at the end. */
export function preferVideoCodecs(transceiver: RTCRtpTransceiver) {
  const caps =
    typeof RTCRtpSender !== 'undefined' &&
    RTCRtpSender.getCapabilities?.('video');
  if (!caps || !transceiver.setCodecPreferences) return;
  const rank = (c: RTCRtpCodec) => {
    const i = CODEC_ORDER.indexOf(c.mimeType);
    return i < 0 ? CODEC_ORDER.length : i;
  };
  try {
    transceiver.setCodecPreferences(
      [...caps.codecs].sort((a, b) => rank(a) - rank(b)),
    );
  } catch {
    /* unsupported codec list */
  }
}

/**
 * Splits the upload budget across viewers: low viewers get their fixed profile, high viewers share
 * what is left, never below MIN_VIDEO_KBPS. Paused viewers cost nothing.
 */
export function allocateBitrates(
  viewers: Record<string, Quality>,
  budgetKbps = DEFAULT_UPLOAD_BUDGET_KBPS,
): Record<string, number> {
  const out: Record<string, number> = {};
  const ids = Object.keys(viewers).filter((id) => viewers[id] !== 'paused');
  if (!ids.length) return out;
  const audio = AUDIO_KBPS * ids.length;
  const low = ids.filter((id) => viewers[id] === 'low'),
    high = ids.filter((id) => viewers[id] === 'high');
  let video = Math.max(0, budgetKbps - audio);
  const lowEach = Math.max(
    MIN_VIDEO_KBPS,
    Math.min(VIDEO_PROFILES.low.maxKbps, Math.floor(video / ids.length)),
  );
  for (const id of low) {
    out[id] = lowEach;
    video -= lowEach;
  }
  const highEach = high.length
    ? Math.max(
        MIN_VIDEO_KBPS,
        Math.min(VIDEO_PROFILES.high.maxKbps, Math.floor(video / high.length)),
      )
    : 0;
  for (const id of high) out[id] = highEach;
  return out;
}

export type SenderTuning = {
  quality: Exclude<Quality, 'paused'>;
  maxKbps: number;
};

export function senderLimits(
  quality: Exclude<Quality, 'paused'>,
  maxKbps: number,
  browser: boolean,
) {
  const profile = VIDEO_PROFILES[quality];
  return {
    maxKbps: Math.min(
      maxKbps,
      profile.maxKbps,
      browser ? BROWSER_MAX_KBPS : profile.maxKbps,
    ),
    maxFramerate: browser
      ? Math.min(profile.maxFramerate, BROWSER_MAX_FPS)
      : profile.maxFramerate,
    scaleResolutionDownBy: profile.scaleResolutionDownBy,
    /** Browser keeps the frame clock. Desktop keeps resolution and may shed a few frames. */
    degradationPreference: browser
      ? ('maintain-framerate' as const)
      : ('balanced' as const),
  };
}

export async function tuneVideoSender(
  sender: RTCRtpSender,
  { quality, maxKbps }: SenderTuning,
) {
  const limits = senderLimits(
    quality,
    maxKbps,
    typeof navigator !== 'undefined' && !bridge(),
  );
  const params = sender.getParameters() as RTCRtpSendParameters & {
    degradationPreference?: string;
  };
  if (!params.encodings?.length) return;
  params.encodings = params.encodings.map((e) => ({
    ...e,
    active: true,
    maxBitrate: Math.round(limits.maxKbps * 1000),
    maxFramerate: limits.maxFramerate,
    scaleResolutionDownBy: limits.scaleResolutionDownBy,
  }));
  params.degradationPreference = limits.degradationPreference;
  try {
    await sender.setParameters(params);
  } catch {
    /* parameters changed concurrently; the next tick retries */
  }
}

export async function tuneAudioSender(sender: RTCRtpSender) {
  const params = sender.getParameters();
  if (!params.encodings?.length) return;
  params.encodings = params.encodings.map((e) => ({
    ...e,
    maxBitrate: AUDIO_KBPS * 1000,
  }));
  try {
    await sender.setParameters(params);
  } catch {
    /* ignored */
  }
}

/** Asks the remote Opus encoder for stereo at 128 kbps; applied to the description we receive. */
export function withStereoOpus(sdp: string): string {
  const pt = /a=rtpmap:(\d+) opus\/48000\/2/i.exec(sdp)?.[1];
  if (!pt) return sdp;
  const fmtp = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  const extra = `stereo=1;sprop-stereo=1;maxaveragebitrate=${AUDIO_KBPS * 1000}`;
  if (!fmtp.test(sdp))
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt} [^\\r\\n]*\\r?\\n)`),
      `$1a=fmtp:${pt} ${extra}\r\n`,
    );
  return sdp.replace(fmtp, (_, params: string) => {
    const kept = params
      .split(';')
      .filter(
        (p) => !/^(stereo|sprop-stereo|maxaveragebitrate)=/.test(p.trim()),
      );
    return `a=fmtp:${pt} ${[...kept, extra].join(';')}`;
  });
}
