const { contextBridge, ipcRenderer } = require('electron');
let mediaCallback = null;
// Always acknowledge, so a frame sent before the page is listening cannot stall the rest.
ipcRenderer.on('native:media', (_, meta, data) => {
  if (mediaCallback) mediaCallback(meta, data);
  else if (meta?.kind === 'video') ipcRenderer.send('native:media:ack');
});
contextBridge.exposeInMainWorld('input', {
  info: () => ipcRenderer.invoke('info'),
  mediaPrivacy: () => ipcRenderer.invoke('privacy:media'),
  devices: () => ipcRenderer.invoke('native:query', { cmd: 'devices' }),
  modes: (device) =>
    ipcRenderer.invoke('native:query', { cmd: 'modes', device }),
  open: (config) => ipcRenderer.invoke('native:open', config),
  stop: () => ipcRenderer.invoke('native:stop'),
  control: (key, value) => ipcRenderer.invoke('native:control', { key, value }),
  bounds: (rect) => ipcRenderer.invoke('native:bounds', rect),
  window: (action) => ipcRenderer.invoke('window', action),
  donate: () => ipcRenderer.invoke('donate'),
  screen: {
    sources: () => ipcRenderer.invoke('screen:sources'),
    pick: (id, audio) => ipcRenderer.invoke('screen:pick', { id, audio }),
    protect: (on) => ipcRenderer.invoke('screen:protect', on),
    audio: (id) => ipcRenderer.invoke('screen:audio', id),
    audioStop: (session) => ipcRenderer.invoke('screen:audioStop', session),
    onAudio: (callback) => {
      const fn = (_, session, pcm) => callback(session, pcm);
      ipcRenderer.on('screen:audio', fn);
      return () => ipcRenderer.removeListener('screen:audio', fn);
    },
  },
  watchPointer: (on) => ipcRenderer.invoke('pointer:watch', on),
  onPointer: (callback) => {
    const fn = () => callback();
    ipcRenderer.on('pointer:moved', fn);
    return () => ipcRenderer.removeListener('pointer:moved', fn);
  },
  onNative: (callback) => {
    const fn = (_, event) => callback(event);
    ipcRenderer.on('native:event', fn);
    return () => ipcRenderer.removeListener('native:event', fn);
  },
  ackMedia: () => ipcRenderer.send('native:media:ack'),
  onNativeMedia: (callback) => {
    mediaCallback = callback;
    return () => {
      if (mediaCallback === callback) mediaCallback = null;
    };
  },
  auth: {
    open: (url) => ipcRenderer.invoke('auth:open', url),
    pending: () => ipcRenderer.invoke('auth:pending'),
    onCallback: (callback) => {
      const fn = (_, link) => callback(link);
      ipcRenderer.on('auth:callback', fn);
      return () => ipcRenderer.removeListener('auth:callback', fn);
    },
  },
  secureStore: {
    get: (key) => ipcRenderer.invoke('secure:get', key),
    set: (key, value) => ipcRenderer.invoke('secure:set', key, value),
    remove: (key) => ipcRenderer.invoke('secure:remove', key),
  },
});
