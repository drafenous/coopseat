const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseConsent,
  combineConsent,
  readMediaPrivacy,
} = require('../electron/privacy.cjs');

const sample = (value) =>
  [
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam',
    `    Value    REG_SZ    ${value}`,
    '',
  ].join('\r\n');

test('reads Allow and Deny from reg query output', () => {
  assert.equal(parseConsent(sample('Allow')), 'allow');
  assert.equal(parseConsent(sample('Deny')), 'deny');
  assert.equal(
    parseConsent(
      'ERROR: The system was unable to find the specified registry key.',
    ),
    'unknown',
  );
  assert.equal(parseConsent(''), 'unknown');
});

test('treats either Windows toggle as a block', () => {
  assert.equal(combineConsent('deny', 'allow'), 'deny');
  assert.equal(combineConsent('allow', 'deny'), 'deny');
  assert.equal(combineConsent('allow', 'unknown'), 'allow');
  assert.equal(combineConsent('unknown', 'allow'), 'allow');
  assert.equal(combineConsent('unknown', 'unknown'), 'unknown');
});

test('reports camera and microphone consent without throwing', async () => {
  const privacy = await readMediaPrivacy();
  for (const key of ['camera', 'microphone'])
    assert.ok(['allow', 'deny', 'unknown'].includes(privacy[key]));
});
