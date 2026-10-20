const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateOpen, validateBounds } = require('../electron/validation.cjs');
const valid = {
  device: 'usb camera',
  mode: 3,
  audio: 'usb audio',
  output: '',
  volume: 0.5,
  vsync: false,
  smoothing: 1,
  effect: 4,
  top: false,
};
test('accepts explicit device and silent capture', () => {
  assert.deepEqual(validateOpen(valid), valid);
  assert.equal(validateOpen({ ...valid, audio: '' }).audio, '');
});
test('rejects renderer input outside native protocol limits', () => {
  for (const change of [
    { mode: -1 },
    { mode: 1.5 },
    { volume: NaN },
    { volume: 2 },
    { device: '' },
    { device: 'x'.repeat(8193) },
    { vsync: 'false' },
    { smoothing: 3 },
    { smoothing: 1.5 },
    { smoothing: undefined },
    { effect: 8 },
    { effect: -1 },
    { effect: 'crt' },
    { audio: null },
  ])
    assert.throws(() => validateOpen({ ...valid, ...change }));
});
test('removes unsupported fields before forwarding to native code', () => {
  assert.equal(
    validateOpen({ ...valid, executable: 'C:\\malicious.exe' }).executable,
    undefined,
  );
});
test('accepts embedded video bounds and strips the parent window field', () => {
  const rect = { x: 40, y: -12, width: 1280, height: 720 };
  assert.deepEqual(validateBounds({ ...rect, parent: '123' }), rect);
  assert.deepEqual(validateBounds({ x: 0, y: 0, width: 0, height: 0 }), {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
});
test('rejects embedded video bounds outside window limits', () => {
  const rect = { x: 0, y: 0, width: 640, height: 360 };
  for (const change of [
    { x: 1.5 },
    { y: NaN },
    { width: -1 },
    { height: 16385 },
    { x: 40000 },
    { width: '640' },
  ])
    assert.throws(() => validateBounds({ ...rect, ...change }));
  assert.throws(() => validateBounds(null));
});
test('accepts overlay holes cut out of the video and rejects malformed ones', () => {
  const rect = { x: 0, y: 0, width: 640, height: 360 },
    hole = { x: 10, y: 20, width: 100, height: 50 };
  assert.deepEqual(
    validateBounds({ ...rect, holes: [{ ...hole, extra: 1 }] }),
    { ...rect, holes: [hole] },
  );
  for (const holes of [
    'x',
    [{ ...hole, width: -1 }],
    [null],
    Array(17).fill(hole),
  ])
    assert.throws(() => validateBounds({ ...rect, holes }));
});
test('accepts rounded overlay holes and rejects invalid radii', () => {
  const rect = { x: 0, y: 0, width: 640, height: 360 },
    hole = { x: 10, y: 20, width: 100, height: 50 };
  assert.equal(
    validateBounds({ ...rect, holes: [{ ...hole, radius: 12 }] }).holes[0]
      .radius,
    12,
  );
  for (const radius of [-1, 1.5, 2000, '8'])
    assert.throws(() =>
      validateBounds({ ...rect, holes: [{ ...hole, radius }] }),
    );
});
test('accepts a backdrop dim between 0 and 1', () => {
  const rect = { x: 0, y: 0, width: 640, height: 360 };
  assert.equal(validateBounds({ ...rect, dim: 0.8 }).dim, 0.8);
  for (const dim of [-0.1, 1.1, NaN, '0.5'])
    assert.throws(() => validateBounds({ ...rect, dim }));
});
test('portable packaging retains native core and renderer files', () => {
  const config = require('../portable.config.cjs');
  assert.equal(config.directories.output, 'release');
  assert.ok(
    config.extraResources.some((r) => r.to === 'native/InputCapture.exe'),
  );
  assert.ok(config.files.includes('dist/**/*'));
});
test('compatibility packaging retains app files and omits native resources', () => {
  const config = require('../electron-builder.compat.cjs');
  assert.ok(config.files.includes('electron/**/*'));
  assert.deepEqual(config.extraResources, []);
});
