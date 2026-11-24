/* Platform köprüsü — arayüz kodunun kabuğa erişimi buradan geçer.
   Kabuklar:
     masaüstü (yeni, 3.1+)  : window.desktop (masaustu/preload.js) + window.fcHost (ortak çekirdek)
     masaüstü (ESKİ kabuk)  : yalnız window.desktop (kabuk 2–3, taşınabilir exe) → Platform.legacy = true
     Android (yeni, 3.1+)   : window.AndroidBridge.apkUpdate var
     Android (ESKİ kabuk)   : window.AndroidBridge.otaInfo var, apkUpdate yok → Platform.legacy = true
     tarayıcı               : hiçbiri
   Eski kabukta program olduğu gibi çalışır; uygulama/kabuk.js "Yeni kurulum gerekli" penceresini gösterir.
   Eski kabuğun uygulama içi güncellemesi (OTA) açılış onayı bekler: onay verilmezse bir sonraki açılışta önceki arayüze döner.
   Bu yüzden eski kabukta Platform.legacyBootOk() açılışta çağrılır. */
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
  /* Yalnız bu adreslere kabuk üzerinden (CORS'suz) GET yapılır; Android ve masaüstü kabuğu da aynı listeyi uygular. */
  const HTTP_IZIN = /^https:\/\/(translate\.googleapis\.com\/translate_a\/single\?|raw\.githubusercontent\.com\/departures-mil\/|api\.github\.com\/repos\/departures-mil\/)/;
  const izinli = (url) => HTTP_IZIN.test(String(url || ''));
  const fetchText = async (url) => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };

  let P;
  const D = window.desktop, A = window.AndroidBridge;
  if (D) {
    P = {
      kind: 'desktop', legacy: !window.fcHost,
      persist: (json) => D.saveDb(json),
      restore: () => D.loadDb(),
      saveFile: async (name, data, mime) => D.saveFile(name, await b64(toBlob(data, mime))),
      printHtml: (html, o) => D.print(html, o || {}),
      savePdf: (html, name, o) => D.savePdf(html, name, o || {}),
      toggleFullscreen: () => D.toggleFullscreen(),
      isFullscreen: () => D.isFullscreen(),
      onFullscreen: (cb) => D.onFullscreen(cb),
      httpGet: async (url) => { if (!izinli(url)) throw new Error('izin yok'); try { return await fetchText(url); } catch (e) { return D.httpGet(url); } },
      openBackupFolder: () => D.openBackupFolder(),
      openUrl: (url) => D.openUrl(url),
      openFile: (name, b64s) => D.openFile(name, b64s),
      quit: () => D.quit(),
      minimize: () => (D.minimize ? D.minimize() : null),
    };
    /* Ana pencere kapanınca program tamamen kapansın (gizli yazdırma penceresi açık kalmasın). */
    let quitting = false;
    const quitAll = () => { if (quitting) return; quitting = true; try { D.quit(); } catch (e) {} };
    window.addEventListener('beforeunload', quitAll);
    window.addEventListener('pagehide', quitAll);
  } else if (A) {
    P = {
      kind: 'android', legacy: typeof A.apkUpdate !== 'function',
      persist: async (json) => { A.saveDb(json); },
      restore: async () => A.loadDb() || null,
      saveFile: async (name, data, mime) => A.saveFile(name, await b64(toBlob(data, mime)), mime || 'application/octet-stream'),
      printHtml: async (html, o) => { A.printHtml(html, (o && o.title) || 'Ing'); },
      savePdf: async (html, name) => { A.printHtml(html, name || 'Ing'); return 'android-print'; },
      toggleFullscreen: async () => false, isFullscreen: async () => false, onFullscreen: () => {},
      httpGet: async (url) => {
        if (!izinli(url)) throw new Error('izin yok');
        try { return await fetchText(url); } catch (e) {}
        const r = A.httpGet(url); if (r == null) throw new Error('net'); return r;
      },
      openBackupFolder: async () => {}, quit: () => (A.moveTaskToBack ? A.moveTaskToBack() : A.exitApp()),
      openUrl: async (url) => (A.openExternal ? A.openExternal(url) : A.openUrl(url)),
      openFile: async (name, b64s, mime) => { const r = A.openFile(name, b64s, mime || ''); if (r && String(r).indexOf('ERR') === 0) throw new Error(r); },
      minimize: () => (A.moveTaskToBack ? A.moveTaskToBack() : A.minimize && A.minimize()),
    };
  } else {
    P = {
      kind: 'web', legacy: false,
      persist: async () => {}, restore: async () => null,
      saveFile: async (name, data, mime) => { downloadWeb(name, toBlob(data, mime)); return name; },
      printHtml: (html) => printViaIframe(html),
      savePdf: (html) => printViaIframe(html).then(() => 'web-print'),
      toggleFullscreen: async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); return !!document.fullscreenElement; },
      isFullscreen: async () => !!document.fullscreenElement,
      onFullscreen: (cb) => document.addEventListener('fullscreenchange', () => cb(!!document.fullscreenElement)),
      httpGet: async (url) => { if (!izinli(url)) throw new Error('izin yok'); return fetchText(url); },
      openBackupFolder: async () => {}, quit: () => {},
      openUrl: async (url) => { window.open(url, '_blank', 'noopener'); },
    };
  }
  /* Eski kabuğun OTA köprüsü — yalnız açılış onayı için (yeni sürümler eski kanaldan dağıtılmaz). */
  P.legacyBootOk = async () => {
    try {
      if (D && D.ota && D.ota.bootOk) return await D.ota.bootOk();
      if (A && typeof A.otaBootOk === 'function') return A.otaBootOk();
    } catch (e) { console.warn('bootOk', e); }
  };
  P.legacyShell = async () => {
    try {
      if (D && D.ota && D.ota.info) return (await D.ota.info()) || {};
      if (A && typeof A.otaInfo === 'function') return JSON.parse(A.otaInfo() || '{}');
    } catch (e) {}
    return {};
  };
  const R = window.APP_RELEASE || {};
  P.semver = R.version || '0.0.0';     // görünen sürüm (semver)
  P.version = R.compat || P.semver;     // eski kanal kimliği (3.1.0 → "3.100")
  P.httpAllowed = izinli;
  window.Platform = P;
})();
