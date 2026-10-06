const MAGIC = 0x52465343;
const HEADER = 28;
const MAX_PAYLOAD = 32 * 1024 * 1024;

/**
 * Reads the frames the native core writes to stderr while a party stream is on.
 * Bytes stay in one buffer; a lost byte resyncs to the next header instead of ending the stream.
 */
function createFrameParser(onFrame) {
  let buf = Buffer.allocUnsafe(64 * 1024);
  let start = 0;
  let end = 0;
  const compact = () => {
    if (!start) return;
    buf.copy(buf, 0, start, end);
    end -= start;
    start = 0;
  };
  const ensure = (extra) => {
    if (end + extra <= buf.length) return;
    compact();
    if (end + extra <= buf.length) return;
    let size = buf.length;
    while (size < end + extra) size *= 2;
    const next = Buffer.allocUnsafe(size);
    buf.copy(next, 0, 0, end);
    buf = next;
  };
  return (chunk) => {
    ensure(chunk.length);
    chunk.copy(buf, end);
    end += chunk.length;
    while (end - start >= HEADER) {
      if (buf.readUInt32LE(start) !== MAGIC) {
        const next = buf.subarray(start + 1, end).indexOf('CSFR', 0, 'latin1');
        if (next < 0) {
          const keep = Math.min(3, end - start);
          start = end - keep;
          break;
        }
        start += 1 + next;
        continue;
      }
      const size = buf.readUInt32LE(start + 24);
      if (size > MAX_PAYLOAD) {
        start += 4;
        continue;
      }
      if (end - start < HEADER + size) break;
      const kind = buf.readUInt32LE(start + 4);
      const a = buf.readUInt32LE(start + 8);
      const b = buf.readUInt32LE(start + 12);
      const c = buf.readUInt32LE(start + 16);
      const d = buf.readUInt32LE(start + 20);
      const payload = Buffer.from(
        buf.subarray(start + HEADER, start + HEADER + size),
      );
      start += HEADER + size;
      if (kind === 1 && (c === 1 || c === 3) && a > 0 && b > 0)
        onFrame({
          meta: {
            kind: 'video',
            width: a,
            height: b,
            format: c === 1 ? 'nv12' : 'bgra',
            stride: d,
          },
          data: payload,
        });
      else if (kind === 2 && a > 0 && b > 0)
        onFrame({
          meta: { kind: 'audio', sampleRate: a, channels: b },
          data: payload,
        });
    }
    if (end - start > MAX_PAYLOAD) start = end = 0;
    else if (start > 1 << 20) compact();
  };
}

module.exports = { createFrameParser, MAGIC, HEADER };
