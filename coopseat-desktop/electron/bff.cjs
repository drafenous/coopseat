const { readFileSync } = require('node:fs');
const path = require('node:path');

const load = (file) =>
  Object.freeze(JSON.parse(readFileSync(path.join(__dirname, file), 'utf8')));
const ENVIRONMENTS = load('environments.json');
/** coopseat-signal per environment; must match the site's PARTY_SIGNAL_URL there. */
const SIGNALS = load('signals.json');

function origin(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Error(`Endereço do CoopSeat inválido: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw Error('O endereço do CoopSeat precisa ser http ou https.');
  return url.origin;
}

/**
 * The packaged app always uses production and ignores the machine environment.
 * Unpackaged, COOPSEAT_BFF_URL wins; otherwise COOPSEAT_ENV; otherwise development while `npm run dev` is running.
 */
function resolveBff({
  packaged = false,
  dev = false,
  envName,
  override,
  environments = ENVIRONMENTS,
} = {}) {
  if (packaged) return origin(environments.production);
  if (override) return origin(override);
  const name = envName || (dev ? 'development' : 'production');
  if (!Object.hasOwn(environments, name))
    throw Error(
      `Ambiente "${name}" não existe. Use: ${Object.keys(environments).join(', ')}.`,
    );
  return origin(environments[name]);
}

/** Same rules as resolveBff, for the party signal Worker (COOPSEAT_SIGNAL_URL overrides it). */
const resolveSignal = ({ environments = SIGNALS, ...input } = {}) =>
  resolveBff({ ...input, environments });

/** WebSocket origin of an http(s) origin, for the CSP's connect-src. */
const socketOrigin = (httpOrigin) => httpOrigin.replace(/^http/, 'ws');

module.exports = {
  ENVIRONMENTS,
  SIGNALS,
  resolveBff,
  resolveSignal,
  socketOrigin,
};
