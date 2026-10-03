const { readFileSync } = require('node:fs');
const path = require('node:path');

const ENVIRONMENTS = Object.freeze(JSON.parse(readFileSync(path.join(__dirname, 'environments.json'), 'utf8')));

function origin(raw) {
  let url;
  try { url = new URL(raw); } catch { throw Error(`Endereço do CoopSeat inválido: ${raw}`); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw Error('O endereço do CoopSeat precisa ser http ou https.');
  return url.origin;
}

/**
 * The packaged app always uses production and ignores the machine environment.
 * Unpackaged, COOPSEAT_BFF_URL wins; otherwise COOPSEAT_ENV; otherwise development while `npm run dev` is running.
 */
function resolveBff({ packaged = false, dev = false, envName, override, environments = ENVIRONMENTS } = {}) {
  if (packaged) return origin(environments.production);
  if (override) return origin(override);
  const name = envName || (dev ? 'development' : 'production');
  if (!Object.hasOwn(environments, name)) throw Error(`Ambiente "${name}" não existe. Use: ${Object.keys(environments).join(', ')}.`);
  return origin(environments[name]);
}

module.exports = { ENVIRONMENTS, resolveBff };
