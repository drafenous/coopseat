const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveBff,
  resolveSignal,
  socketOrigin,
  ENVIRONMENTS,
  SIGNALS,
} = require('../electron/bff.cjs');

const environments = {
  development: 'http://localhost:3000',
  production: 'https://coopseat.com/',
  staging: 'https://preview.example',
};

test('development uses the local site and production uses coopseat.com', () => {
  assert.equal(
    resolveBff({ dev: true, environments }),
    'http://localhost:3000',
  );
  assert.equal(resolveBff({ environments }), 'https://coopseat.com');
  assert.equal(ENVIRONMENTS.development, 'http://localhost:3000');
  assert.equal(ENVIRONMENTS.production, 'https://coopseat.com');
});

test('COOPSEAT_ENV selects the environment and COOPSEAT_BFF_URL overrides it', () => {
  assert.equal(
    resolveBff({ dev: true, envName: 'production', environments }),
    'https://coopseat.com',
  );
  assert.equal(
    resolveBff({ dev: true, envName: 'staging', environments }),
    'https://preview.example',
  );
  assert.equal(
    resolveBff({
      dev: true,
      envName: 'production',
      override: 'http://127.0.0.1:4000/api',
      environments,
    }),
    'http://127.0.0.1:4000',
  );
});

test('the packaged app stays on production even if the environment says otherwise', () => {
  assert.equal(
    resolveBff({
      packaged: true,
      dev: true,
      envName: 'development',
      override: 'http://localhost:3000',
      environments,
    }),
    'https://coopseat.com',
  );
});

test('the signal Worker follows the same environment rules', () => {
  assert.equal(SIGNALS.development, 'http://localhost:8787');
  assert.equal(
    SIGNALS.production,
    'https://coopseat-signal.rodrigo-roberto-almeida.workers.dev',
  );
  assert.equal(resolveSignal({ dev: true }), 'http://localhost:8787');
  assert.equal(
    resolveSignal({ packaged: true, override: 'http://localhost:8787' }),
    'https://coopseat-signal.rodrigo-roberto-almeida.workers.dev',
  );
  assert.equal(
    resolveSignal({ dev: true, override: 'https://signal.preview.example/x' }),
    'https://signal.preview.example',
  );
  assert.equal(socketOrigin('http://localhost:8787'), 'ws://localhost:8787');
  assert.equal(
    socketOrigin('https://sinal.coopseat.com'),
    'wss://sinal.coopseat.com',
  );
});

test('rejects an unknown environment and a non-http address', () => {
  assert.throws(
    () => resolveBff({ envName: 'qa', environments }),
    /não existe/,
  );
  assert.throws(
    () => resolveBff({ override: 'file:///tmp/app', environments }),
    /http ou https/,
  );
});
