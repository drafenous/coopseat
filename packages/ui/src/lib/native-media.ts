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
 */
export async function openNativeMedia(b: DesktopBridge): Promise<NativeFeed> {
  const Generator = (
    globalThis as { MediaStreamTrackGenerator?: GeneratorCtor }
  ).MediaStreamTrackGenerator;
  if (!Generator || !b.onNativeMedia)
    throw Error('Este sistema não consegue transmitir a captura nativa.');
  const video = new Generator({ kind: 'video' }) as VideoGenerator;
  const audio = new Generator({ kind: 'audio' }) as AudioGenerator;
  video.contentHint = 'motion';
  const videoWriter = video.writable.getWriter();
  const audioWriter = audio.writable.getWriter();
  let stopped = false,
    videoBusy = false,
    audioBusy = false,
    videoTs = 0,
    audioTs = 0;
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
              layout: [{ offset: 0, stride: item.meta.stride }],
            });
    } catch {
      return;
    }
    videoBusy = true;
    videoWriter.write(frame).then(
      () => {
        videoBusy = false;
      },
      () => {
        frame.close();
        videoBusy = false;
      },
    );
  };
  const off = b.onNativeMedia((meta, data) => {
    if (stopped) return;
    if (meta.kind === 'video') {
      const bytes = new Uint8Array(data.byteLength);
      bytes.set(data);
      const nowUs = Math.round(performance.now() * 1000);
      videoTs = nowUs <= videoTs ? videoTs + 1 : nowUs;
      writeCopied({ meta, bytes }, videoTs);
      return;
    }
    if (audioBusy || meta.channels !== 2) return;
    const frames = data.byteLength / 4;
    if (!Number.isInteger(frames) || frames <= 0) return;
    if (!audioTs) audioTs = Math.round(performance.now() * 1000) || 1;
    let chunk: AudioData;
    try {
      chunk = new AudioData({
        format: 's16',
        sampleRate: meta.sampleRate,
        numberOfChannels: 2,
        numberOfFrames: frames,
        timestamp: audioTs,
        data: new Uint8Array(data),
      });
    } catch {
      return;
    }
    audioTs += (frames * 1_000_000) / meta.sampleRate;
    audioBusy = true;
    audioWriter.write(chunk).then(
      () => {
        audioBusy = false;
      },
      () => {
        chunk.close();
        audioBusy = false;
      },
    );
  });
  const stop = () => {
    if (stopped) return;
    stopped = true;
    off();
    videoWriter.close().catch(() => {});
    audioWriter.close().catch(() => {});
    video.stop();
    audio.stop();
  };
  video.addEventListener('ended', stop, { once: true });
  return { stream: new MediaStream([video, audio]), stop };
}
