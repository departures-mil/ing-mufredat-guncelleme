/* Masaüstü köprüsü (kabuk 3.1): window.fcHost (ortak çekirdek: pencere düğmeleri, güncelleme, indirme, Asistan paylaşımı)
   + window.desktop (program: kayıt dosyası, dosya kaydet/aç, yazdır/PDF, izinli GET, yedek klasörü, Wi‑Fi eşitleme).
   window.desktop'un yöntem adları kabuk 2–3 ile aynıdır; arayüz eski kabukta da çalışır (fcHost yoksa "Yeni kurulum gerekli"). */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
require('./cekirdek/fc-preload.js');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
require('./cekirdek/yerel-zeka/fc-yerel-zeka-preload').expose(contextBridge, ipcRenderer); // window.fcYerelZeka
contextBridge.exposeInMainWorld('desktop', {
  shell: 'fc',
  saveDb: (json) => call('db:save', json),
  loadDb: () => call('db:load'),
  saveFile: (name, b64) => call('file:save', name, b64),
  openFile: (name, b64) => call('file:open', name, b64),
  openUrl: (url) => call('url:open', url),
  print: (html, o) => call('print:html', html, o),
  savePdf: (html, name, o) => call('print:pdf', html, name, o),
  toggleFullscreen: () => call('win:toggleFs'),
  isFullscreen: () => call('win:isFs'),
  onFullscreen: (cb) => ipcRenderer.on('fs-changed', (e, v) => cb(v)),
  httpGet: (url) => call('http:get', url),
  openBackupFolder: () => call('backup:open'),
  quit: () => call('app:quit'),
  minimize: () => call('win:minimize'),
  lan: {
    v: 2,
    start: () => call('lan:start').then((r) => { if (!r || !r.ok) throw new Error((r && r.error) || 'lan'); return r.data; }),
    stop: () => call('lan:stop'), state: () => call('lan:state'), discover: () => call('lan:discover'),
    sync: (host, pin, json) => call('lan:sync', host, pin, json),
  },
});
