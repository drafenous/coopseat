const bounded = (v,min,max) => Number.isFinite(v) && v >= min && v <= max;
function validateOpen(o) {
  if (!o || typeof o.device !== 'string' || !o.device || o.device.length > 8192) throw Error('Dispositivo inválido.');
  if (!Number.isInteger(o.mode) || !bounded(o.mode,0,65535)) throw Error('Modo inválido.');
  for (const key of ['audio','output']) if (typeof o[key] !== 'string' || o[key].length > 8192) throw Error('Áudio inválido.');
  if (!bounded(o.volume,0,1) || typeof o.vsync !== 'boolean' || typeof o.top !== 'boolean') throw Error('Configuração inválida.');
  return {device:o.device,mode:o.mode,audio:o.audio,output:o.output,volume:o.volume,vsync:o.vsync,top:o.top};
}
function validateBounds(o) {
  if (!o || ![o.x,o.y].every(v=>Number.isInteger(v) && bounded(v,-32768,32767)) || ![o.width,o.height].every(v=>Number.isInteger(v) && bounded(v,0,16384))) throw Error('Área de vídeo inválida.');
  return {x:o.x,y:o.y,width:o.width,height:o.height};
}

const PROTOCOL = 'coopseat';
const TICKET = /^[A-Za-z0-9_-]{43}$/;
/** Parses coopseat:// deep links. Anything other than the known auth routes is ignored. */
function parseDeepLink(raw) {
  if (typeof raw !== 'string' || raw.length > 512 || !raw.startsWith(`${PROTOCOL}://`)) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  const route = `${url.hostname}${url.pathname}`.replace(/\/+$/,'');
  if (route === 'auth/callback') {
    const ticket = url.searchParams.get('ticket');
    return ticket && TICKET.test(ticket) ? {kind:'callback',ticket} : null;
  }
  if (route === 'auth/linked') return {kind:'linked'};
  if (route === 'auth/confirmed') return {kind:'confirmed'};
  if (route === 'auth/verified') return {kind:'verified'};
  return null;
}
function findDeepLink(argv) {
  return Array.isArray(argv) ? argv.find(a => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`)) : undefined;
}

// KYC vendors the account flow may send the user to (exact host or subdomain).
const KYC_HOSTS = ['veriff.me','veriff.com','unico.io','unico.app','idwall.co'];
/** Only the CoopSeat BFF and known KYC vendors may be opened in the system browser. */
function validateExternalUrl(raw, bffOrigins) {
  if (typeof raw !== 'string' || raw.length > 4096) throw Error('Endereço inválido.');
  let url;
  try { url = new URL(raw); } catch { throw Error('Endereço inválido.'); }
  if (bffOrigins.includes(url.origin)) return url.toString();
  if (url.protocol === 'https:' && KYC_HOSTS.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`))) return url.toString();
  throw Error('Endereço não permitido.');
}

const SECURE_KEYS = new Set(['auth.session']);
function validateSecureKey(key) {
  if (!SECURE_KEYS.has(key)) throw Error('Chave inválida.');
  return key;
}
function validateSecureValue(value) {
  if (typeof value !== 'string' || value.length > 16384) throw Error('Valor inválido.');
  return value;
}

module.exports = {validateOpen,validateBounds,bounded,parseDeepLink,findDeepLink,validateExternalUrl,validateSecureKey,validateSecureValue,PROTOCOL};
