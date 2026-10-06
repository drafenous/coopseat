const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore';
const CAPABILITIES = { camera: 'webcam', microphone: 'microphone' };

function parseConsent(text) {
  const match = /(?:^|\s)Value\s+REG_SZ\s+(Allow|Deny)\b/i.exec(String(text));
  if (!match) return 'unknown';
  return match[1].toLowerCase() === 'allow' ? 'allow' : 'deny';
}

/** Desktop apps need both the capability and the NonPackaged toggle. Deny wins. */
function combineConsent(globalConsent, desktopConsent) {
  if (globalConsent === 'deny' || desktopConsent === 'deny') return 'deny';
  if (globalConsent === 'allow' || desktopConsent === 'allow') return 'allow';
  return 'unknown';
}

function regExe() {
  return process.env.SystemRoot
    ? path.join(process.env.SystemRoot, 'System32', 'reg.exe')
    : 'reg.exe';
}

function queryConsent(key) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const child = spawn(regExe(), ['query', key, '/v', 'Value'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let out = '';
    const timer = setTimeout(() => {
      child.kill();
      finish('unknown');
    }, 3000);
    child.stdout.on('data', (chunk) => {
      if (out.length < 4000) out += chunk;
    });
    child.on('error', () => finish('unknown'));
    child.on('close', () => finish(parseConsent(out)));
  });
}

async function readCapability(name) {
  const base = `${ROOT}\\${CAPABILITIES[name]}`;
  const [globalConsent, desktopConsent] = await Promise.all([
    queryConsent(base),
    queryConsent(`${base}\\NonPackaged`),
  ]);
  return combineConsent(globalConsent, desktopConsent);
}

async function readMediaPrivacy() {
  if (process.platform !== 'win32')
    return { camera: 'unknown', microphone: 'unknown' };
  const [camera, microphone] = await Promise.all([
    readCapability('camera'),
    readCapability('microphone'),
  ]);
  return { camera, microphone };
}

module.exports = { parseConsent, combineConsent, readMediaPrivacy };
