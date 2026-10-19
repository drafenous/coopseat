import type { DesktopBridge } from '../platform';

type VideoGenerator = MediaStreamTrack & {
  writable: WritableStream<VideoFrame>;
};
type AudioGenerator = MediaStreamTrack & {
  writable: WritableStream<AudioData>;
};
type GeneratorCtor = new (init: {
  kind: 'video' | 'audio';
}) => VideoGenerator | AudioGenerator;

export type NativeFeed = {
  stream: MediaStream;
  stop(): void;
};

/**
 * A MediaStream of the capture the native core already has open. Video frames are the card's pictures;
 * audio is the same mix playing locally. Nothing flows until the core is told to relay.
 *
 * The preview draws in the native process. This track is a copy written as each buffer arrives.
 * Video timestamps step by arrival gaps. Audio is re-packetized to ~10 ms frames with wall-clock
 * timestamps (same pattern as process-audio), so WebRTC/Opus does not underrun on bursty IPC.
 */
const FIRST_FRAME_US = 33_333;
const MIN_FRAME_US = 1_000;
const MAX_FRAME_US = 100_000;
const AUDIO_CHANNELS = 2;
const AUDIO_FRAME_BYTES = AUDIO_CHANNELS * 2;
/** Opus/WebRTC-friendly packet (~10 ms). */
const AUDIO_PACKET_MS = 10;
/** Behind the wall clock by more than this, timestamps catch up (stream went quiet / backlog). */
const MAX_AUDIO_LAG_US = 100_000;
/** Cap queued PCM (~0.5–1 s of stereo s16 @ 48 kHz). */
const MAX_AUDIO_PENDING_BYTES = 192 * 1024;

export async function openNativeMedia(b: DesktopBridge): Promise<NativeFeed> {
  const Generator = (
    globalThis as { MediaStreamTrackGenerator?: GeneratorCtor }
  ).MediaStreamTrackGenerator;
  if (!Generator || !b.onNativeMedia)
    throw Error('Este sistema não consegue transmitir a captura nativa.');
  const video = new Generator({ kind: 'video' }) as VideoGenerator;
  const audio = new Generator({ kind: 'audio' }) as AudioGenerator;
  video.contentHint = 'motion';
  audio.contentHint = 'music';
  const videoWriter = video.writable.getWriter();
  const audioWriter = audio.writable.getWriter();
  let stopped = false,
    videoBusy = false,
    audioBusy = false,
    videoTs = 1,
    lastArrival: number | null = null;
  const audioOriginUs = performance.now() * 1000;
  let audioTs = 0;
  let audioRate = 48_000;
  let audioPending = new Uint8Array(0);

  const videoDuration = (now: number) => {
    if (lastArrival === null) return FIRST_FRAME_US;
    const gap = Math.round((now - lastArrival) * 1000);
    if (!Number.isFinite(gap)) return FIRST_FRAME_US;
    return Math.min(MAX_FRAME_US, Math.max(MIN_FRAME_US, gap));
  };

  const writeCopied = (
    item: {
      meta: {
        kind: 'video';
        width: number;
        height: number;
        format: 'nv12' | 'bgra';
        stride: number;
      };
      bytes: Uint8Array;
    },
    timestamp: number,
    duration: number,
  ) => {
    let frame: VideoFrame;
    try {
      frame =
        item.meta.format === 'nv12'
          ? new VideoFrame(item.bytes, {
              format: 'NV12',
              codedWidth: item.meta.width,
              codedHeight: item.meta.height,
              timestamp,
              duration,
              layout: [
                { offset: 0, stride: item.meta.stride },
                {
                  offset: item.meta.stride * item.meta.height,
                  stride: item.meta.stride,
                },
              ],
            })
          : new VideoFrame(item.bytes, {
              format: 'BGRA',
              codedWidth: item.meta.width,
              codedHeight: item.meta.height,
              timestamp,
              duration,
              layout: [{ offset: 0, stride: item.meta.stride }],
            });
    } catch {
      return false;
    }
    videoTs = timestamp + duration;
    videoBusy = true;
    videoWriter.write(frame).then(
      () => {
        try {
          frame.close();
        } catch {
          /* already released */
        }
        videoBusy = false;
      },
      () => {
        try {
          frame.close();
        } catch {
          /* already released */
        }
        videoBusy = false;
      },
    );
    return true;
  };

  const packetBytes = (rate: number) => {
    const frames = Math.max(1, Math.round((rate * AUDIO_PACKET_MS) / 1000));
    return frames * AUDIO_FRAME_BYTES;
  };

  const trimAudioPending = () => {
    if (audioPending.length <= MAX_AUDIO_PENDING_BYTES) return;
    let drop = audioPending.length - MAX_AUDIO_PENDING_BYTES;
    drop -= drop % AUDIO_FRAME_BYTES;
    if (drop > 0) audioPending = audioPending.subarray(drop);
  };

  const canAcceptAudio = () =>
    !audioBusy &&
    (audioWriter.desiredSize === null || audioWriter.desiredSize > 0);

  const writeAudioPacket = (pcm: Uint8Array, rate: number): boolean => {
    const frames = pcm.byteLength / AUDIO_FRAME_BYTES;
    if (!Number.isInteger(frames) || frames <= 0) return false;
    const wall = performance.now() * 1000 - audioOriginUs;
    if (wall - audioTs > MAX_AUDIO_LAG_US) audioTs = wall;
    const timestamp = audioTs;
    let chunk: AudioData;
    try {
      chunk = new AudioData({
        format: 's16',
        sampleRate: rate,
        numberOfChannels: AUDIO_CHANNELS,
        numberOfFrames: frames,
        timestamp,
        data: pcm.slice(),
      });
    } catch {
      return false;
    }
    audioTs = timestamp + (frames * 1e6) / rate;
    audioBusy = true;
    audioWriter.write(chunk).then(
      () => {
        try {
          chunk.close();
        } catch {
          /* already released */
        }
        audioBusy = false;
        drainAudio();
      },
      () => {
        try {
          chunk.close();
        } catch {
          /* already released */
        }
        audioBusy = false;
        drainAudio();
      },
    );
    return true;
  };

  const drainAudio = () => {
    const want = packetBytes(audioRate);
    while (!stopped && canAcceptAudio() && audioPending.length >= want) {
      const next = audioPending.slice(0, want);
      audioPending = audioPending.subarray(want);
      if (!writeAudioPacket(next, audioRate)) continue;
      break;
    }
  };

  const acceptAudio = (pcm: Uint8Array, rate: number) => {
    if (stopped || rate < 8_000 || rate > 192_000) return;
    if (rate !== audioRate) {
      audioPending = new Uint8Array(0);
      audioRate = rate;
    }
    const merged = new Uint8Array(audioPending.length + pcm.byteLength);
    merged.set(audioPending);
    merged.set(pcm, audioPending.length);
    audioPending = merged;
    trimAudioPending();
    drainAudio();
  };

  const off = b.onNativeMedia((meta, data) => {
    if (meta.kind === 'video') {
      // Confirm now. Waiting for the generator pauses the pipe and blacks the preview.
      b.ackMedia?.();
      if (stopped) return;
      if (
        videoBusy ||
        (videoWriter.desiredSize !== null && videoWriter.desiredSize <= 0)
      )
        return;
      const now = performance.now();
      const duration = videoDuration(now);
      if (writeCopied({ meta, bytes: data }, videoTs, duration))
        lastArrival = now;
      return;
    }
    if (stopped) return;
    if (meta.channels !== 2) return;
    acceptAudio(data, meta.sampleRate);
  });
  const stop = () => {
    if (stopped) return;
    stopped = true;
    off();
    audioPending = new Uint8Array(0);
    videoWriter.close().catch(() => {});
    audioWriter.close().catch(() => {});
    video.stop();
    audio.stop();
  };
  video.addEventListener('ended', stop, { once: true });
  return { stream: new MediaStream([video, audio]), stop };
}
