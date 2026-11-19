const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  state: () => ipcRenderer.invoke('state'),
  set: (k, v) => ipcRenderer.invoke('set', k, v),
  profiles: () => ipcRenderer.invoke('profiles'),
  saveProfile: (n, c) => ipcRenderer.invoke('saveProfile', n, c),
  fullscreen: () => ipcRenderer.invoke('fullscreen'),
  onRefresh: cb => ipcRenderer.on('refresh', cb),
});
