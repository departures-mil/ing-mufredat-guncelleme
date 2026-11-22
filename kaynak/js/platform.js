/* Platform köprüsü: masaüstü (Electron), Android (WebView) ve tarayıcı için ortak arayüz */
(function () {
  const b64 = async (data) => {
    if (typeof data === 'string') data = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const buf = new Uint8Array(await data.arrayBuffer());
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
    return btoa(s);
  };
  const downloadWeb = (name, blob) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  const toBlob = (data, mime) => (data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }));
  const printViaIframe = (html) => new Promise((res) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => { f.remove(); res(); }, 1500); }, 400); };
    f.srcdoc = html;
  });

  let P;
  if (window.desktop) {
    const d = window.desktop;
    P = {
      kind: 'desktop',
      persist: (json) => d.saveDb(json),
      restore: () => d.loadDb(),
      saveFile: async (name, data, mime) => d.saveFile(name, await b64(toBlob(data, mime))),
      printHtml: (html, o) => d.print(html, o || {}),
      savePdf: (html, name, o) => d.savePdf(html, name, o || {}),
      toggleFullscreen: () => d.toggleFullscreen(),
      isFullscreen: () => d.isFullscreen(),
      onFullscreen: (cb) => d.onFullscreen(cb),
      httpGet: (url) => d.httpGet(url),
      openBackupFolder: () => d.openBackupFolder(),
      openUrl: (url) => d.openUrl(url),
      openFile: (name, b64s, mime) => d.openFile(name, b64s),
      quit: () => d.quit(),
    };
    /* v1.7: Ana pencere kapanınca programı tamamen sonlandır. Eski çekirdekte gizli yazdırma/PDF penceresi açık kalırsa
       süreç görünmeden çalışmaya devam ediyor, sonraki açılışta "Object has been destroyed" hatası veriyordu.
       app.quit() gizli pencereler dahil hepsini kapatır. (Güncelleme sonrası yeniden başlatma app.exit kullanır; etkilenmez.) */
    let quitting = false;
    const quitAll = () => { if (quitting) return; quitting = true; try { d.quit(); } catch (e) {} };
    window.addEventListener('beforeunload', quitAll);
    window.addEventListener('pagehide', quitAll);
  } else if (window.AndroidBridge) {
    const a = window.AndroidBridge;
    P = {
      kind: 'android',
      persist: async (json) => { a.saveDb(json); },
      restore: async () => { const s = a.loadDb(); return s || null; },
      saveFile: async (name, data, mime) => a.saveFile(name, await b64(toBlob(data, mime)), mime || 'application/octet-stream'),
      printHtml: async (html, o) => { a.printHtml(html, (o && o.title) || 'IHA'); },
      savePdf: async (html, name, o) => { a.printHtml(html, name || 'IHA'); return 'android-print'; },
      toggleFullscreen: async () => false, isFullscreen: async () => false, onFullscreen: () => {},
      httpGet: async (url) => { try { const r = await fetch(url); if (r.ok) return await r.text(); } catch (e) {} const r = a.httpGet(url); if (r == null) throw new Error('net'); return r; },
      openBackupFolder: async () => {}, quit: () => a.exitApp(),
      openUrl: async (url) => a.openUrl(url),
      openFile: async (name, b64s, mime) => { const r = a.openFile(name, b64s, mime || ''); if (r && r.indexOf('ERR') === 0) throw new Error(r); },
    };
  } else {
    P = {
      kind: 'web',
      persist: async () => {}, restore: async () => null,
      saveFile: async (name, data, mime) => { downloadWeb(name, toBlob(data, mime)); return name; },
      printHtml: (html) => printViaIframe(html),
      savePdf: (html) => printViaIframe(html).then(() => 'web-print'),
      toggleFullscreen: async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); return !!document.fullscreenElement; },
      isFullscreen: async () => !!document.fullscreenElement,
      onFullscreen: (cb) => document.addEventListener('fullscreenchange', () => cb(!!document.fullscreenElement)),
      httpGet: async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); },
      openBackupFolder: async () => {}, quit: () => {},
    };
  }
  /* Uygulama içi güncelleme köprüsü (kabuk sürümü 2 ve üstü) */
  if (window.desktop && window.desktop.ota) P.ota = window.desktop.ota;
  else if (window.AndroidBridge && typeof window.AndroidBridge.otaInfo === 'function') {
    const a = window.AndroidBridge; const chk = (r) => { if (r && String(r).indexOf('ERR') === 0) throw new Error(r); return true; };
    P.ota = {
      info: async () => JSON.parse(a.otaInfo() || '{}'),
      begin: async (v) => chk(a.otaBegin(v)),
      write: async (v, rel, b64s) => chk(a.otaWrite(v, rel, b64s)),
      commit: async (v) => chk(a.otaCommit(v)),
      bootOk: async () => { a.otaBootOk(); return true; },
      restart: async () => { a.otaRestart(); return true; },
    };
  }
  P.version = window.APP_VERSION || '1.0';
  window.Platform = P;

  /* Ücretsiz Google çeviri uç noktası ile metin çevirisi */
  window.translateText = async function (text, from, to) {
    if (!text || !text.trim() || from === to) return text;
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=' + from + '&tl=' + to + '&q=' + encodeURIComponent(text);
    const raw = await P.httpGet(url);
    const j = JSON.parse(raw);
    return (j[0] || []).map((x) => x[0]).join('');
  };
})();
