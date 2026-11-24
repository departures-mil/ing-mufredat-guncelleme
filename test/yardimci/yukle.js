// Kaynak betiklerini (kaynak/…) tarayıcısız bir vm bağlamında yükler: window = bağlamın kendisi, en küçük localStorage.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const K = path.join(__dirname, '..', '..', 'kaynak');
function bellek(ilk) {
  const m = new Map(Object.entries(ilk || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] || null, get length() { return m.size; }, _m: m };
}
function baglam(ek) {
  const unref = (h) => { if (h && h.unref) h.unref(); return h; };   // bağlamın zamanlayıcıları testi açık tutmasın
  const c = Object.assign({ console, setTimeout: (f, ms, ...a) => unref(setTimeout(f, ms, ...a)), clearTimeout, setInterval: (f, ms, ...a) => unref(setInterval(f, ms, ...a)), clearInterval, TextEncoder, TextDecoder, URL, Blob: global.Blob, crypto: globalThis.crypto, atob, btoa, structuredClone,
    navigator: { onLine: true, language: 'tr' }, localStorage: bellek(), addEventListener() {}, removeEventListener() {} }, ek || {});
  c.window = c; c.globalThis = c; c.self = c;
  vm.createContext(c);
  return c;
}
function yukle(c, dosyalar) {
  for (const f of dosyalar) vm.runInContext(fs.readFileSync(path.join(K, f), 'utf8'), c, { filename: f });
  return c;
}
const sirali = () => JSON.parse(fs.readFileSync(path.join(K, 'dosyalar.json'), 'utf8')).dosyalar;
module.exports = { baglam, yukle, bellek, sirali, K };
