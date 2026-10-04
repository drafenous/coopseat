const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('input', {
  info: () => ipcRenderer.invoke('info'),
  devices: () => ipcRenderer.invoke('native:query',{cmd:'devices'}),
  modes: device => ipcRenderer.invoke('native:query',{cmd:'modes',device}),
  open: config => ipcRenderer.invoke('native:open',config),
  stop: () => ipcRenderer.invoke('native:stop'),
  control: (key,value) => ipcRenderer.invoke('native:control',{key,value}),
  bounds: rect => ipcRenderer.invoke('native:bounds',rect),
  window: action => ipcRenderer.invoke('window',action),
  donate: () => ipcRenderer.invoke('donate'),
  screen: {
    sources: () => ipcRenderer.invoke('screen:sources'),
    pick: (id,audio) => ipcRenderer.invoke('screen:pick',{id,audio}),
    protect: on => ipcRenderer.invoke('screen:protect',on)
  },
  watchPointer: on => ipcRenderer.invoke('pointer:watch',on),
  onPointer: callback => { const fn=()=>callback(); ipcRenderer.on('pointer:moved',fn); return ()=>ipcRenderer.removeListener('pointer:moved',fn); },
  onNative: callback => { const fn=(_,event)=>callback(event); ipcRenderer.on('native:event',fn); return ()=>ipcRenderer.removeListener('native:event',fn); },
  auth: {
    open: url => ipcRenderer.invoke('auth:open',url),
    pending: () => ipcRenderer.invoke('auth:pending'),
    onCallback: callback => { const fn=(_,link)=>callback(link); ipcRenderer.on('auth:callback',fn); return ()=>ipcRenderer.removeListener('auth:callback',fn); }
  },
  secureStore: {
    get: key => ipcRenderer.invoke('secure:get',key),
    set: (key,value) => ipcRenderer.invoke('secure:set',key,value),
    remove: key => ipcRenderer.invoke('secure:remove',key)
  }
});
