const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isNewer, parseReleaseVersion } = require('../electron/updates.cjs');

test('a higher patch, minor or major is a newer release', () => {
  assert.equal(isNewer('0.4.0', '0.4.1'), true);
  assert.equal(isNewer('0.4.0', '0.5.0'), true);
  assert.equal(isNewer('0.9.0', '0.10.0'), true);
  assert.equal(isNewer('0.4.1', '0.4.0'), false);
  assert.equal(isNewer('0.4.0', '0.4.0'), false);
});

test('pre-release suffixes do not count as a different version', () => {
  assert.equal(isNewer('0.4.0', '0.4.0-beta'), false);
  assert.equal(isNewer('0.4.0-beta', '0.4.1'), true);
});

test('the release body must carry a numeric version', () => {
  assert.equal(parseReleaseVersion({ version: '0.4.1' }), '0.4.1');
  assert.equal(parseReleaseVersion({ version: 'desktop-v0.4.1' }), null);
  assert.equal(parseReleaseVersion({}), null);
  assert.equal(parseReleaseVersion(null), null);
  assert.equal(isNewer('0.4.0', parseReleaseVersion({ version: 'nope' })), false);
});
