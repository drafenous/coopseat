const {app,BrowserWindow,ipcMain,safeStorage,screen,session,shell} = require('electron');
const {spawn} = require('node:child_process');
const {existsSync,readFileSync,writeFileSync} = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const readline = require('node:readline');
const {validateOpen,validateBounds,bounded,parseDeepLink,findDeepLink,validateExternalUrl,validateSecureKey,validateSecureValue,PROTOCOL} = require('./validation.cjs');
const {resolveBff} = require('./bff.cjs');
let win, core=null;
const DONATE_URL = 'https://www.paypal.com/donate/?hosted_button_id=GHM82LRFVH3A6';
const dev = !app.isPackaged && process.env.INPUT_DEV === '1';
const bffUrl = resolveBff({packaged:app.isPackaged,dev,envName:process.env.COOPSEAT_ENV,override:process.env.COOPSEAT_BFF_URL});
const bffOrigins = [bffUrl];
const gotLock = app.requestSingleInstanceLock();
if(!gotLock) app.quit();
if(process.defaultApp) app.setAsDefaultProtocolClient(PROTOCOL,process.execPath,[path.resolve(process.argv[1]||'.')]);
else app.setAsDefaultProtocolClient(PROTOCOL);
let pendingLink = findDeepLink(process.argv) ?? null, rendererReady = false;
function deliverLink(raw) {
  const link = parseDeepLink(raw); if(!link) return;
  if(win && !win.isDestroyed() && rendererReady) win.webContents.send('auth:callback',link); else pendingLink = raw;
}
app.on('second-instance',(_e,argv)=>{const raw=findDeepLink(argv);if(raw)deliverLink(raw);if(win){if(win.isMinimized())win.restore();win.focus();}});
const storeFile = () => path.join(app.getPath('userData'),'secure-store.json');
function readStore() { try { const s=JSON.parse(readFileSync(storeFile(),'utf8')); return s && typeof s==='object' ? s : {}; } catch { return {}; } }
function secureGet(key) {
  const v = readStore()[key];
  if(typeof v!=='string' || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(v,'base64')); } catch { return null; }
}
function secureSet(key,value) {
  const s = readStore();
  if(value===null) delete s[key];
  else { if(!safeStorage.isEncryptionAvailable()) throw Error('Armazenamento seguro indisponível neste sistema.'); s[key]=safeStorage.encryptString(value).toString('base64'); }
  writeFileSync(storeFile(),JSON.stringify(s),{mode:0o600}); return true;
}
const entry = dev ? 'http://127.0.0.1:5173/' : pathToFileURL(path.join(__dirname,'../dist/index.html')).href;
const binary = () => app.isPackaged ? path.join(process.resourcesPath,'native/InputCapture.exe') : path.join(__dirname,'../native/build/Release/InputCapture.exe');
const available = () => process.platform === 'win32' && existsSync(binary());
function trusted(url) { return typeof url==='string' && url.split('#')[0]===entry; }
function handle(name,fn) { ipcMain.handle(name,(e,...args)=>{if(e.sender!==win?.webContents || !trusted(e.senderFrame?.url)) throw Error('Origem não autorizada');return fn(...args);}); }
let pointerTimer=null, lastPointer='';
function watchPointer(on) {
  clearInterval(pointerTimer); pointerTimer=null; lastPointer='';
  if(!on) return;
  pointerTimer=setInterval(()=>{
    if(!win || win.isDestroyed()) return;
    const p=screen.getCursorScreenPoint(), key=`${p.x},${p.y}`;
    if(key===lastPointer) return;
    const first=!lastPointer; lastPointer=key;
    const b=win.getBounds();
    if(first || p.x<b.x || p.y<b.y || p.x>=b.x+b.width || p.y>=b.y+b.height) return;
    win.webContents.send('pointer:moved');
  },150);
}
function emit(event) { if(win && !win.isDestroyed()) win.webContents.send('native:event',event); }
function stop() { const p=core; if(!p)return Promise.resolve(); return new Promise(resolve=>{const timer=setTimeout(()=>p.kill(),1800);const done=()=>{clearTimeout(timer);if(core===p)core=null;resolve();};p.once('exit',done);p.stdin.end(JSON.stringify({cmd:'stop'})+'\n');}); }
function launch(query) {
  if(!available()) throw Error('Núcleo nativo não compilado. Use Compatibilidade ou compile o núcleo.');
  return spawn(binary(),[query ? '--query' : '--preview'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
}
function query(request) {
  return new Promise((resolve,reject)=>{const p=launch(true);let data='',err=''; const timer=setTimeout(()=>{p.kill();reject(Error('O dispositivo não respondeu em 15 segundos.'));},15000);
    p.stdout.on('data',c=>{data+=c;if(data.length>4e6){p.kill();}});p.stderr.on('data',c=>{err=(err+c).slice(-8000);});
    p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('exit',code=>{clearTimeout(timer);try{const obj=JSON.parse(data);if(code || obj.error)throw Error(obj.error||err);resolve(obj);}catch(e){reject(Error(e.message||'Resposta nativa inválida'));}});
    p.stdin.on('error',()=>{});p.stdin.end(JSON.stringify(request)+'\n');
  });
}
app.whenReady().then(()=>{
  if(!gotLock) return;
  win = new BrowserWindow({width:1240,height:820,minWidth:860,minHeight:650,backgroundColor:'#0b1016',autoHideMenuBar:true,title:'CoopSeat',icon:path.join(__dirname,dev?'../public/icon.png':'../dist/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  session.defaultSession.setPermissionRequestHandler((wc,permission,cb,details)=>cb(wc===win.webContents && trusted(wc.getURL()) && ['media','speaker-selection'].includes(permission) && (!details.requestingUrl || trusted(details.requestingUrl))));
  session.defaultSession.setPermissionCheckHandler((wc,permission)=>wc===win.webContents && trusted(wc.getURL()) && ['media','speaker-selection'].includes(permission));
  if(!dev)win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
  handle('info',()=>({native:available(),platform:process.platform,version:app.getVersion(),bffUrl}));
  handle('auth:open',url=>shell.openExternal(validateExternalUrl(url,bffOrigins)));
  handle('auth:pending',()=>{rendererReady=true;const raw=pendingLink;pendingLink=null;return raw?parseDeepLink(raw):null;});
  handle('secure:get',key=>secureGet(validateSecureKey(key)));
  handle('secure:set',(key,value)=>secureSet(validateSecureKey(key),validateSecureValue(value)));
  handle('secure:remove',key=>secureSet(validateSecureKey(key),null));
  handle('native:query',o=>{if(o?.cmd==='devices')return query({cmd:'devices'});if(o?.cmd==='modes' && typeof o.device==='string' && o.device.length<=8192)return query({cmd:'modes',device:o.device});throw Error('Consulta inválida');});
  handle('native:open',config=>{config=validateOpen(config);if(core)throw Error('Pare a captura anterior primeiro.');const p=launch(false);core=p;let ready=false;
    const lines=readline.createInterface({input:p.stdout});lines.on('line',line=>{try{const e=JSON.parse(line);if(e.type==='started')ready=true;emit(e);}catch{}});
    p.stderr.on('data',()=>{});p.stdin.on('error',()=>{});
    p.on('error',e=>{if(core===p)core=null;emit({type:'error',message:e.message});});
    p.on('exit',code=>{if(core===p){core=null;emit({type:'stopped',message:code && !ready?'Falha ao iniciar o núcleo nativo.':undefined});}lines.close();});
    const parent=win.getNativeWindowHandle().readBigUInt64LE(0).toString();
    p.stdin.write(JSON.stringify({...config,parent,cmd:'open'})+'\n'); return true;
  });
  handle('native:bounds',rect=>{rect=validateBounds(rect);core?.stdin.write(JSON.stringify({cmd:'bounds',...rect})+'\n');});
  handle('native:stop',()=>stop());
  handle('donate',()=>shell.openExternal(DONATE_URL));
  handle('pointer:watch',on=>watchPointer(on===true));
  handle('native:control',({key,value})=>{const levels={smoothing:2,effect:7};if(!['volume','vsync','smoothing','effect','top','fullscreen'].includes(key))throw Error('Comando inválido');if(key==='volume'?!bounded(value,0,1):key in levels?!(Number.isInteger(value)&&bounded(value,0,levels[key])):typeof value!=='boolean')throw Error('Valor inválido');core?.stdin.write(JSON.stringify({cmd:key,value})+'\n');});
  handle('window',action=>{if(action==='fullscreen'){win.setFullScreen(!win.isFullScreen());return win.isFullScreen();}else if(action==='exitFullscreen')win.setFullScreen(false);else if(action==='top'){win.setAlwaysOnTop(!win.isAlwaysOnTop());return win.isAlwaysOnTop();}});
  win.webContents.on('did-start-loading',()=>{rendererReady=false;});
  if(dev) console.log(`Ambiente: ${process.env.COOPSEAT_BFF_URL ? 'COOPSEAT_BFF_URL' : (process.env.COOPSEAT_ENV || 'development')} | BFF: ${bffUrl}`);
  win.loadURL(entry);win.on('closed',()=>{watchPointer(false);stop();win=null;rendererReady=false;});
});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',stop);
