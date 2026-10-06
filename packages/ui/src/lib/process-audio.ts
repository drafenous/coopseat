import type { DesktopBridge } from '../platform';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAME_BYTES = CHANNELS * 2;
/** Behind the wall clock by more than this (the program went quiet), timestamps catch up. */
const MAX_LAG_US = 100_000;

/** Chromium's audio track generator (not in the DOM typings). */
type TrackGenerator = MediaStreamTrack & {
  writable: WritableStream<AudioData>;
};
type GeneratorCtor = new (init: { kind: 'audio' }) => TrackGenerator;

export type ProcessAudio = { track: MediaStreamTrack; stop(): void };

/**
 * A track carrying only a program's audio (a window's process, or everything but CoopSeat for a
 * screen), fed by the native core. Null when unavailable (no generator, old Windows, no native core),
 * so the caller can fall back to the system mix.
 */
export async function processAudio(
  b: DesktopBridge,
  sourceId: string,
): Promise<ProcessAudio | null> {
  const Generator = (
    globalThis as { MediaStreamTrackGenerator?: GeneratorCtor }
  ).MediaStreamTrackGenerator;
  const { audio, audioStop, onAudio } = b.screen;
  if (!Generator || !audio || !audioStop || !onAudio) return null;
  let session: number;
  try {
    session = await audio(sourceId);
  } catch {
    return null;
  }
  const generator = new Generator({ kind: 'audio' });
  const writer = generator.writable.getWriter();
  const origin = performance.now() * 1000;
  let timestamp = 0,
    stopped = false;
  const off = onAudio((from, pcm) => {
    if (stopped || from !== session) return;
    const frames = pcm.byteLength / FRAME_BYTES;
    if (!frames) return;
    const now = performance.now() * 1000 - origin;
    if (now - timestamp > MAX_LAG_US) timestamp = now;
    const data = new AudioData({
      format: 's16',
      sampleRate: SAMPLE_RATE,
      numberOfChannels: CHANNELS,
      numberOfFrames: frames,
      timestamp,
      data: pcm,
    });
    timestamp += (frames * 1e6) / SAMPLE_RATE;
    writer.write(data).catch(() => data.close());
  });
  const stop = () => {
    if (stopped) return;
    stopped = true;
    off();
    void audioStop(session).catch(() => {});
    writer.close().catch(() => {});
    generator.stop();
  };
  generator.addEventListener('ended', stop, { once: true });
  return { track: generator, stop };
}
