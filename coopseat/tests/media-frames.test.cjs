const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFrameParser, MAGIC, HEADER } = require('../electron/media-frames.cjs');

function header(kind, a, b, c, d, size) {
  const buf = Buffer.alloc(HEADER);
  buf.writeUInt32LE(MAGIC, 0);
  buf.writeUInt32LE(kind, 4);
  buf.writeUInt32LE(a, 8);
  buf.writeUInt32LE(b, 12);
  buf.writeUInt32LE(c, 16);
  buf.writeUInt32LE(d, 20);
  buf.writeUInt32LE(size, 24);
  return buf;
}

test('reads a video frame split across chunks and the audio after it', () => {
  const video = Buffer.from([1, 2, 3, 4]);
  const audio = Buffer.from([9, 8]);
  const bytes = Buffer.concat([
    header(1, 2, 2, 1, 2, video.length),
    video,
    header(2, 48000, 2, 0, 0, audio.length),
    audio,
  ]);
  const frames = [];
  const parse = createFrameParser((frame) => frames.push(frame));
  parse(bytes.subarray(0, 10));
  parse(bytes.subarray(10, 20));
  parse(bytes.subarray(20));
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0].meta, {
    kind: 'video',
    width: 2,
    height: 2,
    format: 'nv12',
    stride: 2,
  });
  assert.deepEqual([...frames[0].data], [...video]);
  assert.deepEqual(frames[1].meta, {
    kind: 'audio',
    sampleRate: 48000,
    channels: 2,
  });
  assert.deepEqual([...frames[1].data], [...audio]);
});

test('skips a stray byte and still reads the next frame', () => {
  const payload = Buffer.from([7]);
  const frames = [];
  const parse = createFrameParser((frame) => frames.push(frame));
  parse(
    Buffer.concat([
      Buffer.from([0xff]),
      header(1, 4, 4, 3, 16, payload.length),
      payload,
    ]),
  );
  assert.equal(frames.length, 1);
  assert.equal(frames[0].meta.format, 'bgra');
  assert.deepEqual([...frames[0].data], [7]);
});

test('a busy video frame is skipped without hiding the audio after it', () => {
  const video = Buffer.from([1, 2, 3, 4]);
  const audio = Buffer.from([9, 8]);
  const frames = [];
  let busy = true;
  const parse = createFrameParser((frame) => frames.push(frame), {
    skipVideo: () => busy,
  });
  parse(
    Buffer.concat([
      header(1, 2, 2, 1, 2, video.length),
      video,
      header(2, 48000, 2, 0, 0, audio.length),
      audio,
    ]),
  );
  assert.equal(frames.length, 1);
  assert.equal(frames[0].meta.kind, 'audio');
  busy = false;
  parse(Buffer.concat([header(1, 2, 2, 1, 2, video.length), video]));
  assert.equal(frames.length, 2);
  assert.equal(frames[1].meta.kind, 'video');
});
