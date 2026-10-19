const {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  safeStorage,
  screen,
  session,
  shell,
} = require('electron');
const { spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const readline = require('node:readline');
const {
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
} = require('./validation.cjs');
const { resolveBff } = require('./bff.cjs');
// Host candidates must be real LAN addresses. mDNS (.local) names fail to
// resolve here, so ICE falls through to a peer-reflexive path that drops.
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
/** The capture currently allowed to deliver one video frame to the page. */
let mediaPump = null;
ipcMain.on('native:media:ack', (event) => {
  const pump = mediaPump;
  if (!pump || event.sender !== pump.contents) return;
  pump.inFlight = false;
  pump.arm();
});
const { readMediaPrivacy } = require('./privacy.cjs');
const { createFrameParser } = require('./media-frames.cjs');
let win,
  core = null,
  audioCore = null,
  audioSession = 0;
const DONATE_URL =
  'https://www.paypal.com/donate/?hosted_button_id=GHM82LRFVH3A6';
const dev = !app.isPackaged && process.env.INPUT_DEV === '1';
const bffUrl = resolveBff({
  packaged: app.isPackaged,
  dev,
  envName: process.env.COOPSEAT_ENV,
  override: process.env.COOPSEAT_BFF_URL,
});
const bffOrigins = [bffUrl];
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
if (process.defaultApp) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
    path.resolve(process.argv[1] || '.'),
  ]);
  // Browsers name the handler after electron.exe unless the verb carries its own name.
  if (process.platform === 'win32')
    spawn(
      'reg',
      [
        'add',
        `HKCU\\Software\\Classes\\${PROTOCOL}\\shell\\open`,
        '/v',
        'FriendlyAppName',
        '/d',
        'CoopSeat',
        '/f',
      ],
      { stdio: 'ignore', windowsHide: true },
    ).on('error', () => {});
} else app.setAsDefaultProtocolClient(PROTOCOL);
let pendingLink = findDeepLink(process.argv) ?? null,
  rendererReady = false;
function deliverLink(raw) {
  const link = parseDeepLink(raw);
  if (!link) return;
  if (win && !win.isDestroyed() && rendererReady)
    win.webContents.send('auth:callback', link);
  else pendingLink = raw;
}
app.on('second-instance', (_e, argv) => {
  const raw = findDeepLink(argv);
  if (raw) deliverLink(raw);
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
const storeFile = () => path.join(app.getPath('userData'), 'secure-store.json');
function readStore() {
  try {
    const s = JSON.parse(readFileSync(storeFile(), 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}
function secureGet(key) {
  const v = readStore()[key];
  if (typeof v !== 'string' || !safeStorage.isEncryptionAvailable())
    return null;
  try {
    return safeStorage.decryptString(Buffer.from(v, 'base64'));
  } catch {
    return null;
  }
}
function secureSet(key, value) {
  const s = readStore();
  if (value === null) delete s[key];
  else {
    if (!safeStorage.isEncryptionAvailable())
      throw Error('Armazenamento seguro indisponível neste sistema.');
    s[key] = safeStorage.encryptString(value).toString('base64');
  }
  writeFileSync(storeFile(), JSON.stringify(s), { mode: 0o600 });
  return true;
}
const entry = dev
  ? 'http://127.0.0.1:5173/'
  : pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
const binary = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'native/InputCapture.exe')
    : path.join(__dirname, '../native/build/Release/InputCapture.exe');
const available = () => process.platform === 'win32' && existsSync(binary());
function trusted(url) {
  return typeof url === 'string' && url.split('#')[0] === entry;
}
function handle(name, fn) {
  ipcMain.handle(name, (e, ...args) => {
    if (e.sender !== win?.webContents || !trusted(e.senderFrame?.url))
      throw Error('Origem não autorizada');
    return fn(...args);
  });
}
let pointerTimer = null,
  lastPointer = '';
function watchPointer(on) {
  clearInterval(pointerTimer);
  pointerTimer = null;
  lastPointer = '';
  if (!on) return;
  pointerTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint(),
      key = `${p.x},${p.y}`;
    if (key === lastPointer) return;
    const first = !lastPointer;
    lastPointer = key;
    const b = win.getBounds();
    if (
      first ||
      p.x < b.x ||
      p.y < b.y ||
      p.x >= b.x + b.width ||
      p.y >= b.y + b.height
    )
      return;
    win.webContents.send('pointer:moved');
  }, 150);
}
// Screen/window sharing: the renderer lists sources, the user picks one in our own picker, and the
// next getDisplayMedia() call receives exactly that source. A pick is single-use and expires.
let listedSources = new Map(),
  picked = null;
async function listSources() {
  const own = win?.getMediaSourceId();
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: false,
  });
  listedSources = new Map(
    sources.filter((s) => s.id !== own).map((s) => [s.id, s]),
  );
  return [...listedSources.values()].map((s) => ({
    id: s.id,
    name: s.name.slice(0, 200),
    kind: s.id.startsWith('screen:') ? 'screen' : 'window',
    thumbnail: s.thumbnail.isEmpty() ? null : s.thumbnail.toDataURL(),
  }));
}
function pickSource(o) {
  const { id, audio } = validatePick(o);
  const source = listedSources.get(id);
  if (!source) throw Error('Fonte indisponível. Atualize a lista.');
  picked = {
    source,
    audio: audio && process.platform === 'win32',
    at: Date.now(),
  };
  return true;
}
// Process audio for a shared screen/window (native/loopback.hpp): raw 48 kHz stereo s16le PCM,
// forwarded to the renderer in whole frames. Each capture is a numbered session so a source being
// replaced can't stop (or receive) its successor's audio.
function stopAudio(session) {
  if (session !== undefined && session !== audioSession) return;
  const p = audioCore;
  audioCore = null;
  if (!p) return;
  // Killing it mid-capture leaves Windows' audio service stuck; ask first, kill only if it hangs.
  const timer = setTimeout(() => p.kill(), 3000);
  p.once('exit', () => clearTimeout(timer));
  p.stdin.end(JSON.stringify({ cmd: 'stop' }) + '\n');
}
function startAudio(id) {
  const request = validateAudioSource(id);
  if (!listedSources.has(id))
    throw Error('Fonte indisponível. Atualize a lista.');
  if (!available()) throw Error('Núcleo nativo indisponível.');
  stopAudio();
  const session = ++audioSession;
  const p = spawn(binary(), ['--loopback'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  audioCore = p;
  let rest = null;
  p.stdout.on('data', (chunk) => {
    if (audioCore !== p || !win || win.isDestroyed()) return;
    const buf = rest ? Buffer.concat([rest, chunk]) : chunk;
    const whole = buf.length - (buf.length % 4);
    rest = whole < buf.length ? Buffer.from(buf.subarray(whole)) : null;
    if (whole)
      win.webContents.send('screen:audio', session, buf.subarray(0, whole));
  });
  return new Promise((resolve, reject) => {
    const lines = readline.createInterface({ input: p.stderr });
    const fail = (e) => {
      clearTimeout(timer);
      if (audioCore === p) stopAudio();
      reject(e);
    };
    const timer = setTimeout(
      () => fail(Error('O áudio do programa não respondeu.')),
      6000,
    );
    lines.on('line', (line) => {
      try {
        const e = JSON.parse(line);
        if (e.type === 'started') {
          clearTimeout(timer);
          resolve(session);
        } else if (e.type === 'error') fail(Error(e.message));
      } catch {}
    });
    p.stdin.on('error', () => {});
    p.on('error', fail);
    p.on('exit', () => {
      if (audioCore === p) audioCore = null;
      lines.close();
      fail(Error('A captura de áudio foi encerrada.'));
    });
    p.stdin.write(JSON.stringify(request) + '\n');
  });
}
let eventsOpen = true;
function emit(event) {
  if (!eventsOpen || !win || win.isDestroyed()) return;
  const contents = win.webContents;
  if (contents.isDestroyed()) return;
  try {
    if (contents.mainFrame.isDestroyed()) {
      eventsOpen = false;
      return;
    }
    contents.send('native:event', event);
  } catch (e) {
    if (!/disposed/i.test(String(e?.message))) throw e;
    eventsOpen = false;
  }
}
function stop() {
  const p = core;
  if (!p) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => p.kill(), 1800);
    const done = () => {
      clearTimeout(timer);
      if (core === p) core = null;
      resolve();
    };
    p.once('exit', done);
    p.stdin.end(JSON.stringify({ cmd: 'stop' }) + '\n');
  });
}
function launch(query) {
  if (!available())
    throw Error(
      'Núcleo nativo não compilado. Use Compatibilidade ou compile o núcleo.',
    );
  return spawn(binary(), [query ? '--query' : '--preview'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
}
function query(request) {
  return new Promise((resolve, reject) => {
    const p = launch(true);
    let data = '',
      err = '';
    const timer = setTimeout(() => {
      p.kill();
      reject(Error('O dispositivo não respondeu em 15 segundos.'));
    }, 15000);
    p.stdout.on('data', (c) => {
      data += c;
      if (data.length > 4e6) {
        p.kill();
      }
    });
    p.stderr.on('data', (c) => {
      err = (err + c).slice(-8000);
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on('exit', (code) => {
      clearTimeout(timer);
      try {
        const obj = JSON.parse(data);
        if (code || obj.error) throw Error(obj.error || err);
        resolve(obj);
      } catch (e) {
        reject(Error(e.message || 'Resposta nativa inválida'));
      }
    });
    p.stdin.on('error', () => {});
    p.stdin.end(JSON.stringify(request) + '\n');
  });
}
app.whenReady().then(() => {
  if (!gotLock) return;
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 860,
    minHeight: 650,
    backgroundColor: '#0b1016',
    autoHideMenuBar: true,
    title: 'CoopSeat',
    icon: path.join(__dirname, dev ? '../public/icon.png' : '../dist/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  const PERMISSIONS = ['media', 'speaker-selection', 'display-capture'];
  session.defaultSession.setPermissionRequestHandler(
    (wc, permission, cb, details) =>
      cb(
        wc === win.webContents &&
          trusted(wc.getURL()) &&
          PERMISSIONS.includes(permission) &&
          (!details.requestingUrl || trusted(details.requestingUrl)),
      ),
  );
  session.defaultSession.setPermissionCheckHandler(
    (wc, permission) =>
      wc === win.webContents &&
      trusted(wc.getURL()) &&
      PERMISSIONS.includes(permission),
  );
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, cb) => {
      const choice = picked;
      picked = null;
      if (
        !trusted(request.frame?.url) ||
        !choice ||
        Date.now() - choice.at > 30000
      )
        return cb({});
      // Loopback is the whole system mix (Windows only); the renderer asks for it only when the user opts in.
      cb(
        choice.audio
          ? { video: choice.source, audio: 'loopback' }
          : { video: choice.source },
      );
    },
    { useSystemPicker: false },
  );
  if (!dev) win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!trusted(url)) event.preventDefault();
  });
  handle('info', () => ({
    native: available(),
    platform: process.platform,
    version: app.getVersion(),
    bffUrl,
  }));
  handle('privacy:media', () => readMediaPrivacy());
  handle('auth:open', (url) =>
    shell.openExternal(validateExternalUrl(url, bffOrigins)),
  );
  handle('auth:pending', () => {
    rendererReady = true;
    const raw = pendingLink;
    pendingLink = null;
    return raw ? parseDeepLink(raw) : null;
  });
  handle('secure:get', (key) => secureGet(validateSecureKey(key)));
  handle('secure:set', (key, value) =>
    secureSet(validateSecureKey(key), validateSecureValue(value)),
  );
  handle('secure:remove', (key) => secureSet(validateSecureKey(key), null));
  handle('native:query', (o) => {
    if (o?.cmd === 'devices') return query({ cmd: 'devices' });
    if (
      o?.cmd === 'modes' &&
      typeof o.device === 'string' &&
      o.device.length <= 8192
    )
      return query({ cmd: 'modes', device: o.device });
    throw Error('Consulta inválida');
  });
  handle('native:open', (config) => {
    config = validateOpen(config);
    if (core) throw Error('Pare a captura anterior primeiro.');
    const p = launch(false);
    core = p;
    let ready = false;
    const lines = readline.createInterface({ input: p.stdout });
    lines.on('line', (line) => {
      try {
        const e = JSON.parse(line);
        if (e.type === 'started') ready = true;
        emit(e);
      } catch {}
    });
    let mediaOpen = true;
    const contents = win.webContents;
    const pauseMedia = () => {
      mediaOpen = false;
      pump.quiet();
    };
    const resumeMedia = () => {
      mediaOpen = true;
      eventsOpen = true;
      pump.inFlight = false;
      pump.arm();
    };
    // Same slot as the native relay (one frame per 16 ms). Ack stays immediate.
    // Keep reading stderr while pacing: pausing the pipe stalled PCM behind video
    // and made party audio hitch. Excess pictures are dropped in the frame parser
    // (skipVideo) without copying; audio still reaches the page.
    const FRAME_MS = 16;
    const pump = {
      contents,
      inFlight: false,
      latest: null,
      quieted: false,
      width: 0,
      height: 0,
      nextSend: 0,
      pace: null,
      quiet() {
        if (this.quieted) return;
        this.quieted = true;
        p.stderr.pause();
      },
      listen() {
        if (!this.quieted || !mediaOpen) return;
        this.quieted = false;
        p.stderr.resume();
      },
      arm() {
        if (this.pace || !mediaOpen) return;
        const wait = this.nextSend - Date.now();
        if (wait <= 0) {
          this.listen();
          this.flush();
          return;
        }
        this.listen();
        this.pace = setTimeout(() => {
          this.pace = null;
          if (!mediaOpen) return;
          this.flush();
        }, wait);
      },
      flush() {
        if (this.inFlight || !this.latest || !mediaOpen) return;
        if (Date.now() < this.nextSend) {
          this.arm();
          return;
        }
        if (!win || win.isDestroyed() || contents.isDestroyed()) return;
        const frame = this.latest;
        this.latest = null;
        try {
          if (contents.mainFrame.isDestroyed()) {
            mediaOpen = false;
            eventsOpen = false;
            this.quiet();
            return;
          }
          this.inFlight = true;
          this.nextSend = Date.now() + FRAME_MS;
          contents.send('native:media', frame.meta, frame.data);
          // Do not pause stderr here — audio must keep flowing until the next slot.
          this.listen();
        } catch (e) {
          this.inFlight = false;
          mediaOpen = false;
          eventsOpen = false;
          this.quiet();
          if (!/disposed/i.test(String(e?.message))) throw e;
        }
      },
    };
    mediaPump = pump;
    contents.on('did-start-loading', pauseMedia);
    contents.on('did-finish-load', resumeMedia);
    contents.on('destroyed', pauseMedia);
    const releaseMedia = () => {
      contents.removeListener('did-start-loading', pauseMedia);
      contents.removeListener('did-finish-load', resumeMedia);
      contents.removeListener('destroyed', pauseMedia);
    };
    const parseMedia = createFrameParser(
      (frame) => {
        if (!mediaOpen || core !== p || !win || win.isDestroyed()) return;
        if (contents.isDestroyed()) return;
        if (frame.meta.kind === 'video') {
          pump.latest = frame;
          pump.width = frame.meta.width;
          pump.height = frame.meta.height;
          pump.flush();
          return;
        }
        try {
          if (contents.mainFrame.isDestroyed()) {
            mediaOpen = false;
            return;
          }
          contents.send('native:media', frame.meta, frame.data);
        } catch (e) {
          // send() logs this itself, then throws. Stop calling it until the page loads again.
          mediaOpen = false;
          if (!/disposed/i.test(String(e?.message))) throw e;
        }
      },
      {
        skipVideo: () =>
          pump.inFlight || Date.now() < pump.nextSend || Boolean(pump.latest),
      },
    );
    p.stderr.on('data', parseMedia);
    p.stdin.on('error', () => {});
    p.on('error', (e) => {
      if (core === p) core = null;
      emit({ type: 'error', message: e.message });
    });
    p.on('exit', (code) => {
      clearTimeout(pump.pace);
      if (mediaPump === pump) mediaPump = null;
      releaseMedia();
      if (core === p) {
        core = null;
        emit({
          type: 'stopped',
          message:
            code && !ready ? 'Falha ao iniciar o núcleo nativo.' : undefined,
        });
      }
      lines.close();
    });
    const parent = win.getNativeWindowHandle().readBigUInt64LE(0).toString();
    p.stdin.write(JSON.stringify({ ...config, parent, cmd: 'open' }) + '\n');
    return true;
  });
  handle('native:bounds', (rect) => {
    rect = validateBounds(rect);
    core?.stdin.write(JSON.stringify({ cmd: 'bounds', ...rect }) + '\n');
  });
  handle('native:stop', () => stop());
  handle('donate', () => shell.openExternal(DONATE_URL));
  handle('screen:sources', () => listSources());
  handle('screen:pick', (o) => pickSource(o));
  handle('screen:audio', (id) => startAudio(id));
  handle('screen:audioStop', (session) => {
    if (!Number.isInteger(session)) throw Error('Sessão inválida.');
    stopAudio(session);
  });
  // While sharing a screen, hide this window from captures so the party (chat, other streams) isn't re-broadcast.
  handle('screen:protect', (on) => {
    win.setContentProtection(on === true);
    return on === true;
  });
  handle('pointer:watch', (on) => watchPointer(on === true));
  handle('native:control', ({ key, value }) => {
    const levels = { smoothing: 2, effect: 7 };
    if (
      ![
        'volume',
        'vsync',
        'smoothing',
        'effect',
        'top',
        'fullscreen',
        'relay',
      ].includes(key)
    )
      throw Error('Comando inválido');
    if (
      key === 'volume'
        ? !bounded(value, 0, 1)
        : key in levels
          ? !(Number.isInteger(value) && bounded(value, 0, levels[key]))
          : typeof value !== 'boolean'
    )
      throw Error('Valor inválido');
    core?.stdin.write(JSON.stringify({ cmd: key, value }) + '\n');
  });
  handle('window', (action) => {
    if (action === 'fullscreen') {
      win.setFullScreen(!win.isFullScreen());
      return win.isFullScreen();
    } else if (action === 'exitFullscreen') win.setFullScreen(false);
    else if (action === 'top') {
      win.setAlwaysOnTop(!win.isAlwaysOnTop());
      return win.isAlwaysOnTop();
    }
  });
  win.webContents.on('did-start-loading', () => {
    rendererReady = false;
  });
  if (dev)
    console.log(
      `Ambiente: ${process.env.COOPSEAT_BFF_URL ? 'COOPSEAT_BFF_URL' : process.env.COOPSEAT_ENV || 'development'} | BFF: ${bffUrl}`,
    );
  win.loadURL(entry);
  win.on('closed', () => {
    watchPointer(false);
    stopAudio();
    stop();
    win = null;
    rendererReady = false;
  });
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  stopAudio();
  return stop();
});
