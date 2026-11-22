/* Uygulama içi güncelleme (OTA)
   v2.0: birincil kanal GitHub (window.UPD_GH deposu: latest.json + paketler/ing_X_Y.b64); Firestore yedek kanal olarak kalır.
   İki kanal da okunur, hangisinde daha yeni sürüm varsa o kullanılır.
   Eski açıklama — Firestore kanalı:
   v1.2: kanal, okumaya zaten açık olan guncellemeler koleksiyonunun içinde "ing_" önekiyle durur (ek kural gerekmez)
   guncellemeler/ing_latest                  : son sürüm bilgisi (herkes okuyabilir)
   guncellemeler/ing_surum_X_Y/parcalar/{i}  : sıkıştırılmış arayüz paketinin parçaları
   Yalnız yönetici hesabı (FB_ADMIN_EMAIL) yazabilir. */
(function () {
  const C = window.FB_YAYIN;   // 2.2: yöneticinin yayın projesi
  const BASE = 'https://firestore.googleapis.com/v1/projects/' + C.projectId + '/databases/(default)/documents/';
  const CHUNK = 700000;
  const CH = 'guncellemeler/ing_';
  /* v2.4.0: sürüm karşılaştırma. Görünen sürüm semver (v2.4.0, v2.4.1…). Kabuğa giden kimlik eski kurulumlarla uyum için
     "ana.ikincilYAMA" biçimindedir: 2.4.0 → "2.400", 2.4.1 → "2.401". Eski "2.3" biçimi de doğru sıralanır. */
  const vnum = (v) => {
    const p = String(v || '0').replace(/^v/i, '').split('.');
    const a = parseInt(p[0], 10) || 0; let mi = 0, pa = 0;
    if (p.length >= 3) { mi = parseInt(p[1], 10) || 0; pa = parseInt(p[2], 10) || 0; }
    else if (p[1] != null) { const b = String(p[1]); if (b.length >= 3) { mi = parseInt(b.slice(0, -2), 10) || 0; pa = parseInt(b.slice(-2), 10) || 0; } else mi = parseInt(b, 10) || 0; }
    return a * 1e6 + mi * 1e3 + pa;
  };
  const semver = (v) => { const n = vnum(v); return Math.floor(n / 1e6) + '.' + Math.floor((n % 1e6) / 1e3) + '.' + (n % 1e3); };
  /* v2.4.0: paket imzası (Ed25519). Anahtar listesi doluysa imzasız ya da yanlış imzalı paket KURULMAZ.
     Gizli anahtar yalnız yöneticinin bilgisayarında (C:\Claude Programlarım\_Anahtarlar) durur. */
  const SIGN_KEYS = window.UPD_KEYS || [];
  const imzaMesaji = (m) => 'ing-mufredat|' + m.version + '|' + m.sha256;
  function imzaDogru(m) {
    if (!SIGN_KEYS.length) return true;
    if (!m.sig || !window.nacl) return false;
    try {
      const msg = new TextEncoder().encode(imzaMesaji(m)); const sig = b64ToBytes(m.sig);
      return SIGN_KEYS.some((k) => nacl.sign.detached.verify(msg, sig, b64ToBytes(k)));
    } catch (e) { return false; }
  }
  const val = (f) => (f == null ? null : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? +f.integerValue : 'booleanValue' in f ? f.booleanValue : 'doubleValue' in f ? f.doubleValue : null);
  const b64ToBytes = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
  async function getDoc(path) {
    const r = await fetch(BASE + path + '?key=' + C.apiKey, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); const o = {};
    for (const k in j.fields || {}) o[k] = val(j.fields[k]);
    return o;
  }
  const GH = window.UPD_GH || null;
  const ghRaw = (f) => 'https://raw.githubusercontent.com/' + GH.owner + '/' + GH.repo + '/' + (GH.branch || 'main') + '/' + f;
  async function getText(url) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) return await r.text(); if (r.status === 404) return null; } catch (e) {}
    return Platform.httpGet(url);
  }
  async function ghLatest() {
    if (!GH || !GH.owner) return null;
    let txt = null;
    try { // API: önbelleksiz, en taze bilgi
      const r = await fetch('https://api.github.com/repos/' + GH.owner + '/' + GH.repo + '/contents/latest.json?ref=' + (GH.branch || 'main'), { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json' } });
      if (r.ok) txt = await r.text();
    } catch (e) {}
    if (!txt) txt = await getText(ghRaw('latest.json') + '?t=' + Date.now());
    if (!txt) return null;
    const m = JSON.parse(txt); m.src = 'gh'; return m;
  }
  async function fbLatest() { const m = await getDoc(CH + 'latest'); if (m) m.src = 'fb'; return m; }
  async function latest() {
    const yon = window.Sync && Sync.user && (Sync.user.email || '').toLowerCase() === String(window.FB_ADMIN_EMAIL || '').toLowerCase();
    const res = await Promise.allSettled(yon ? [ghLatest(), fbLatest()] : [ghLatest()]);
    const ok = res.filter((r) => r.status === 'fulfilled' && r.value && r.value.version).map((r) => r.value);
    if (!ok.length) { const er = res.find((r) => r.status === 'rejected'); throw er ? er.reason : new Error('kanal'); }
    ok.sort((a, b) => vnum(b.version) - vnum(a.version) || (a.src === 'gh' ? -1 : 1));
    return ok[0];
  }
  async function gunzipText(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  const U = {
    state: 'idle', latest: null, error: '', progress: 0, info: null, listeners: new Set(),
    on(fn) { this.listeners.add(fn); },
    set(state, extra) { this.state = state; Object.assign(this, extra || {}); this.listeners.forEach((f) => { try { f(this); } catch (e) {} }); },
    supported() { return !!Platform.ota; },
    vnum, semver, imzaDogru,
    async init() {
      if (!this.supported()) return;
      try { this.info = await Platform.ota.info(); } catch (e) {}
      try { await Platform.ota.bootOk(); } catch (e) {}
      setTimeout(() => this.check(false), 3000); // v1.9: yalnız program açılışında denetlenir
    },
    // v1.8: denetim ayarları (bu cihaza özel): açılışta denetle, aralık (saniye, 0 = kapalı), her açılışta hatırlat, Windows bildirimi
    cfg() { const c = Object.assign({ remind: true, sys: true }, (Store.local.ui || {}).upd || {}); delete c.every; delete c.onStart; return c; },
    setCfg(o) { Store.local.ui = Store.local.ui || {}; Store.local.ui.upd = Object.assign(this.cfg(), o); Store.saveLocal(); },
    shell() { return (this.info && this.info.shell) || 0; },
    async check(manual) {
      if (this.state === 'downloading' || this.state === 'ready') return;
      if (manual || this.state !== 'available') this.set('checking', { error: '' }); // sık denetimde üst çubuktaki düğme yanıp sönmesin
      try {
        const m = await latest();
        Store.local.lastUpdateCheck = Date.now(); Store.saveLocal();
        const avail = m && m.version && vnum(m.version) > vnum(Platform.version);
        const bad = this.info && this.info.state && this.info.state.bad;
        if (avail && bad && bad === m.version) this.set('error', { latest: m, error: t('updateBad', { v: semver(m.version) }) });
        else if (avail && (m.minShell || 2) > this.shell()) this.set('shellOld', { latest: m });
        else this.set(avail ? 'available' : 'uptodate', { latest: m });
      } catch (e) { this.set('error', { error: e.message || String(e) }); }
    },
    async install() {
      const m = this.latest; if (!m) return;
      if (!this.supported()) throw new Error('shell');
      this.set('downloading', { progress: 0 });
      try {
        const id = 'surum_' + m.version.replace(/\./g, '_');
        const parts = [];
        if (m.src === 'gh') {
          // yüzde + MB (inen / toplam / kalan) + hız; olmazsa eski yol
          const url = ghRaw(m.file || ('paketler/ing_' + m.version.replace(/\./g, '_') + '.b64'));
          let txt = null;
          try {
            const buf = await IndirmeIlerleme.indir(url + '?t=' + Date.now(), { toplam: m.gzlen || 0,
              ilerleme: (p) => this.set('downloading', { progress: Math.round((p.yuzde || 0) / 2), dl: p }) });
            txt = IndirmeIlerleme.metin(buf);
          } catch (e) { txt = await getText(url); }
          if (!txt) throw new Error('paket indirilemedi');
          parts.push(txt.trim()); this.set('downloading', { progress: 50 });
        } else {
          for (let i = 0; i < m.chunks; i++) {
            const d = await getDoc(CH + id + '/parcalar/' + i);
            if (!d || !d.d) throw new Error('parça ' + i);
            parts.push(d.d); this.set('downloading', { progress: Math.round(((i + 1) / m.chunks) * 50) });
          }
        }
        const bytes = b64ToBytes(parts.join(''));
        if (SIGN_KEYS.length && !m.sha256) throw new Error('doğrulama (imza)');
        if (m.sha256) { const h = hex(await crypto.subtle.digest('SHA-256', bytes)); if (h !== m.sha256) throw new Error('doğrulama (sha256)'); }
        if (!imzaDogru(m)) throw new Error('doğrulama (imza)');
        const bundle = JSON.parse(await gunzipText(bytes));
        if (bundle.version !== m.version || !bundle.files || !bundle.files['index.html']) throw new Error('paket');
        await Platform.ota.begin(m.version);
        const names = Object.keys(bundle.files);
        for (let i = 0; i < names.length; i++) {
          await Platform.ota.write(m.version, names[i], bundle.files[names[i]]);
          if (i % 3 === 0) this.set('downloading', { progress: 50 + Math.round(((i + 1) / names.length) * 50) });
        }
        await Platform.ota.commit(m.version);
        Store.persistNow();
        this.set('ready', { progress: 100, dl: null });
      } catch (e) { console.error(e); this.set('error', { error: e.message || String(e) }); throw e; }
    },
    restart() { Store.persistNow(); setTimeout(() => Platform.ota.restart(), 300); },

    /* Yönetici: .ihu güncelleme dosyasını Firebase'e yayınlar */
    async publish(text, email, password, onProgress) {
      let pkg; try { pkg = JSON.parse(text); } catch (e) { throw new Error(t('ihuInvalid')); }
      if (pkg.format !== 'ihu1' || !pkg.version || !pkg.gz) throw new Error(t('ihuInvalid'));
      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + C.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || 'auth');
      const token = j.idToken;
      const put = async (path, fields) => {
        const x = await fetch(BASE + path + '?key=' + C.apiKey, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
        if (!x.ok) { let msg = 'HTTP ' + x.status; try { msg += ' ' + (await x.json()).error.message; } catch (e) {} throw new Error(msg); }
      };
      const S = (v) => ({ stringValue: String(v == null ? '' : v) });
      const id = 'surum_' + pkg.version.replace(/\./g, '_');
      const n = Math.ceil(pkg.gz.length / CHUNK);
      for (let i = 0; i < n; i++) { await put(CH + id + '/parcalar/' + i, { d: S(pkg.gz.slice(i * CHUNK, (i + 1) * CHUNK)) }); onProgress && onProgress(Math.round(((i + 1) / (n + 1)) * 100)); }
      const notes = pkg.notes || {};
      const meta = { version: S(pkg.version), chunks: { integerValue: String(n) }, sha256: S(pkg.sha256), size: { integerValue: String(pkg.size || 0) }, date: S(pkg.date || new Date().toISOString()), minShell: { integerValue: String(pkg.minShell || 2) }, notes_tr: S(notes.tr), notes_en: S(notes.en), notes_ar: S(notes.ar), publishedBy: S(email) };
      await put(CH + id, meta);
      await put(CH + 'latest', meta);
      onProgress && onProgress(100);
      return pkg.version;
    },
  };
  window.Updater = U;
})();
