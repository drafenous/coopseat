import { SEND_MAX_FPS } from './encoding';

/** One slot of the send clock. A 60fps capture keeps every other frame. */
export const SEND_FRAME_US = Math.round(1_000_000 / SEND_MAX_FPS);
/** A frame this close to the slot is on time, not early. */
const EARLY_US = 2_000;

/**
 * Decides whether a captured frame is the next one to send.
 * `dueUs` of 0 means nothing has been sent yet. A burst whose timestamps sit inside one slot
 * emits once; the next real frame is sent alone, with no catch-up.
 */
export function takeFrame(
  clockUs: number,
  dueUs: number,
  slotUs = SEND_FRAME_US,
): { emit: boolean; dueUs: number } {
  if (!(slotUs > 0)) return { emit: false, dueUs };
  if (!(dueUs > 0))
    return { emit: true, dueUs: Math.max(0, clockUs) + slotUs };
  if (!(clockUs > 0)) return { emit: false, dueUs };
  if (clockUs + EARLY_US >= dueUs)
    return { emit: true, dueUs: clockUs + slotUs };
  return { emit: false, dueUs };
}

type Frame = VideoFrame;
type ProcessorCtor = new (init: { track: MediaStreamTrack }) => {
  readable: ReadableStream<Frame>;
};
type GeneratorCtor = new (init: { kind: 'video' }) => MediaStreamTrack & {
  writable: WritableStream<Frame>;
};

export type FrameGate = {
  track: MediaStreamTrack;
  stop(): void;
};

/**
 * A copy of `source` that forwards at most one frame per slot. The frame keeps its capture
 * timestamp, so audio stays aligned and a dump cannot play fast. The source track is left
 * running for the local preview.
 */
export function lockFrameRate(source: MediaStreamTrack): FrameGate | null {
  const g = globalThis as {
    MediaStreamTrackProcessor?: ProcessorCtor;
    MediaStreamTrackGenerator?: GeneratorCtor;
  };
  if (!g.MediaStreamTrackProcessor || !g.MediaStreamTrackGenerator) return null;
  const processor = new g.MediaStreamTrackProcessor({ track: source });
  const generator = new g.MediaStreamTrackGenerator({ kind: 'video' });
  try {
    generator.contentHint = 'motion';
  } catch {
    /* read-only in some engines */
  }
  const reader = processor.readable.getReader();
  const writer = generator.writable.getWriter();
  let stopped = false;
  let dueUs = 0;
  let lastTs = -1;
  let chain: Promise<void> = Promise.resolve();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    source.removeEventListener('ended', stop);
    void reader.cancel().catch(() => {});
    void writer.close().catch(() => {});
    try {
      generator.stop();
    } catch {
      /* already stopped */
    }
  };

  const write = (frame: Frame) => {
    chain = chain.then(
      () => (stopped ? undefined : writer.write(frame)),
      () => undefined,
    );
    void chain.then(
      () => {
        try {
          frame.close();
        } catch {
          /* already released */
        }
      },
      () => {
        try {
          frame.close();
        } catch {
          /* already released */
        }
      },
    );
  };

  void (async () => {
    try {
      while (!stopped) {
        const { done, value } = await reader.read();
        if (done || !value || stopped) {
          value?.close();
          break;
        }
        // A timestamp that does not advance cannot space frames, so the wall clock does.
        const clock =
          value.timestamp > lastTs
            ? value.timestamp
            : Math.round(performance.now() * 1000);
        if (value.timestamp > lastTs) lastTs = value.timestamp;
        const decision = takeFrame(clock, dueUs);
        dueUs = decision.dueUs;
        if (!decision.emit) {
          value.close();
          continue;
        }
        write(value);
      }
    } catch {
      /* reader cancelled */
    } finally {
      stop();
    }
  })();

  source.addEventListener('ended', stop);
  return { track: generator, stop };
}
