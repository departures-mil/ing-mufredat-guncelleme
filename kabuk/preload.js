/* Masaüstü köprüsü: arayüzün güvenli biçimde dosya, yazdırma ve pencere işlemlerine erişmesi */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  saveDb: (json) => ipcRenderer.invoke('db:save', json),
  loadDb: () => ipcRenderer.invoke('db:load'),
  saveFile: (name, b64) => ipcRenderer.invoke('file:save', name, b64),
  openFile: (name, b64) => ipcRenderer.invoke('file:open', name, b64),
  openUrl: (url) => ipcRenderer.invoke('url:open', url),
  print: (html, o) => ipcRenderer.invoke('print:html', html, o),
  savePdf: (html, name, o) => ipcRenderer.invoke('print:pdf', html, name, o),
  toggleFullscreen: () => ipcRenderer.invoke('win:toggleFs'),
  isFullscreen: () => ipcRenderer.invoke('win:isFs'),
  onFullscreen: (cb) => ipcRenderer.on('fs-changed', (e, v) => cb(v)),
  httpGet: (url) => ipcRenderer.invoke('http:get', url),
  openBackupFolder: () => ipcRenderer.invoke('backup:open'),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  lan: {
    start: () => ipcRenderer.invoke('lan:start'), stop: () => ipcRenderer.invoke('lan:stop'), state: () => ipcRenderer.invoke('lan:state'),
    discover: () => ipcRenderer.invoke('lan:discover'), sync: (host, pin, json) => ipcRenderer.invoke('lan:sync', host, pin, json),
  },
  ota: {
    info: () => ipcRenderer.invoke('ota:info'),
    begin: (v) => ipcRenderer.invoke('ota:begin', v),
    write: (v, rel, b64) => ipcRenderer.invoke('ota:write', v, rel, b64),
    commit: (v) => ipcRenderer.invoke('ota:commit', v),
    bootOk: () => ipcRenderer.invoke('ota:bootOk'),
    restart: () => ipcRenderer.invoke('ota:restart'),
  },
});
