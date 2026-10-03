const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveBff, ENVIRONMENTS } = require('../electron/bff.cjs');

const environments = { development: 'http://localhost:3000', production: 'https://coopseat.com/', staging: 'https://preview.example' };

test('development uses the local site and production uses coopseat.com', () => {
  assert.equal(resolveBff({ dev: true, environments }), 'http://localhost:3000');
  assert.equal(resolveBff({ environments }), 'https://coopseat.com');
  assert.equal(ENVIRONMENTS.development, 'http://localhost:3000');
  assert.equal(ENVIRONMENTS.production, 'https://coopseat.com');
});

test('COOPSEAT_ENV selects the environment and COOPSEAT_BFF_URL overrides it', () => {
  assert.equal(resolveBff({ dev: true, envName: 'production', environments }), 'https://coopseat.com');
  assert.equal(resolveBff({ dev: true, envName: 'staging', environments }), 'https://preview.example');
  assert.equal(resolveBff({ dev: true, envName: 'production', override: 'http://127.0.0.1:4000/api', environments }), 'http://127.0.0.1:4000');
});

test('the packaged app stays on production even if the environment says otherwise', () => {
  assert.equal(resolveBff({ packaged: true, dev: true, envName: 'development', override: 'http://localhost:3000', environments }), 'https://coopseat.com');
});

test('rejects an unknown environment and a non-http address', () => {
  assert.throws(() => resolveBff({ envName: 'qa', environments }), /não existe/);
  assert.throws(() => resolveBff({ override: 'file:///tmp/app', environments }), /http ou https/);
});
