const bounded = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
function validateOpen(o) {
  if (!o || typeof o.device !== 'string' || !o.device || o.device.length > 8192)
    throw Error('Dispositivo inválido.');
  if (!Number.isInteger(o.mode) || !bounded(o.mode, 0, 65535))
    throw Error('Modo inválido.');
  for (const key of ['audio', 'output'])
    if (typeof o[key] !== 'string' || o[key].length > 8192)
      throw Error('Áudio inválido.');
  if (
    !bounded(o.volume, 0, 1) ||
    typeof o.vsync !== 'boolean' ||
    typeof o.top !== 'boolean' ||
    !Number.isInteger(o.smoothing) ||
    !bounded(o.smoothing, 0, 2) ||
    !Number.isInteger(o.effect) ||
    !bounded(o.effect, 0, 7)
  )
    throw Error('Configuração inválida.');
  return {
    device: o.device,
    mode: o.mode,
    audio: o.audio,
    output: o.output,
    volume: o.volume,
    vsync: o.vsync,
    smoothing: o.smoothing,
    effect: o.effect,
    top: o.top,
  };
}
const MAX_HOLES = 16;
const rect = (o) => {
  if (
    !o ||
    ![o.x, o.y].every(
      (v) => Number.isInteger(v) && bounded(v, -32768, 32767),
    ) ||
    ![o.width, o.height].every(
      (v) => Number.isInteger(v) && bounded(v, 0, 16384),
    )
  )
    throw Error('Área de vídeo inválida.');
  return { x: o.x, y: o.y, width: o.width, height: o.height };
};
/** `holes` are areas cut out of the video, relative to it, where page overlays show through; `dim` darkens it (0–1) under a backdrop. */
function validateBounds(o) {
  const r = rect(o);
  if (o.holes !== undefined) {
    if (!Array.isArray(o.holes) || o.holes.length > MAX_HOLES)
      throw Error('Área de vídeo inválida.');
    r.holes = o.holes.map((h) => {
      const hole = rect(h);
      if (h.radius !== undefined) {
        if (!Number.isInteger(h.radius) || !bounded(h.radius, 0, 1024))
          throw Error('Área de vídeo inválida.');
        hole.radius = h.radius;
      }
      return hole;
    });
  }
  if (o.dim !== undefined) {
    if (!bounded(o.dim, 0, 1)) throw Error('Área de vídeo inválida.');
    r.dim = o.dim;
  }
  return r;
}

const PROTOCOL = 'coopseat';
const TICKET = /^[A-Za-z0-9_-]{43}$/;
/** Parses coopseat:// deep links. Anything other than the known auth routes is ignored. */
function parseDeepLink(raw) {
  if (
    typeof raw !== 'string' ||
    raw.length > 512 ||
    !raw.startsWith(`${PROTOCOL}://`)
  )
    return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const route = `${url.hostname}${url.pathname}`.replace(/\/+$/, '');
  if (route === 'auth/callback') {
    const ticket = url.searchParams.get('ticket');
    return ticket && TICKET.test(ticket) ? { kind: 'callback', ticket } : null;
  }
  if (route === 'auth/linked') return { kind: 'linked' };
  if (route === 'auth/confirmed') return { kind: 'confirmed' };
  if (route === 'auth/verified') return { kind: 'verified' };
  const party = /^party\/([A-Za-z0-9_]{3,20})$/.exec(route);
  if (party) return { kind: 'party', nickname: party[1] };
  return null;
}

/** desktopCapturer ids look like `screen:0:0` or `window:123456:0`. */
const SOURCE_ID = /^(screen|window):\d{1,20}:\d{1,10}$/;
function validatePick(o) {
  if (
    !o ||
    typeof o.id !== 'string' ||
    !SOURCE_ID.test(o.id) ||
    typeof o.audio !== 'boolean'
  )
    throw Error('Fonte inválida.');
  return { id: o.id, audio: o.audio };
}
/** Process audio: `system` is everything but this app; `window` is that window's own process. */
function validateAudioSource(id, mode) {
  if (typeof id !== 'string' || !SOURCE_ID.test(id))
    throw Error('Fonte inválida.');
  if (mode !== 'system' && mode !== 'window')
    throw Error('Modo de áudio inválido.');
  const [kind, handle] = id.split(':');
  if (mode === 'window') {
    if (kind !== 'window') throw Error('Fonte inválida.');
    return { cmd: 'loopback', window: handle };
  }
  return { cmd: 'loopback', exclude: process.pid };
}
function findDeepLink(argv) {
  return Array.isArray(argv)
    ? argv.find((a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`))
    : undefined;
}

// KYC vendors the account flow may send the user to (exact host or subdomain).
const KYC_HOSTS = [
  'didit.me',
  'veriff.me',
  'veriff.com',
  'unico.io',
  'unico.app',
  'idwall.co',
];
/** Only the CoopSeat BFF and known KYC vendors may be opened in the system browser. */
function validateExternalUrl(raw, bffOrigins) {
  if (typeof raw !== 'string' || raw.length > 4096)
    throw Error('Endereço inválido.');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Error('Endereço inválido.');
  }
  if (bffOrigins.includes(url.origin)) return url.toString();
  if (
    url.protocol === 'https:' &&
    KYC_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  )
    return url.toString();
  throw Error('Endereço não permitido.');
}

const SECURE_KEYS = new Set(['auth.session']);
function validateSecureKey(key) {
  if (!SECURE_KEYS.has(key)) throw Error('Chave inválida.');
  return key;
}
function validateSecureValue(value) {
  if (typeof value !== 'string' || value.length > 16384)
    throw Error('Valor inválido.');
  return value;
}

module.exports = {
  validateOpen,
  validateBounds,
  bounded,
  parseDeepLink,
  findDeepLink,
  validateExternalUrl,
  validateSecureKey,
  validateSecureValue,
  validatePick,
  validateAudioSource,
  PROTOCOL,
};
