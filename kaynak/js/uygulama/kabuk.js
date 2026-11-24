/* İngilizce Müfredat — ortak çekirdek (cekirdek/fc-core.js) bağlantısı ve açılış. Son yüklenen dosyadır; App.start() burada.
   - "klasik" renk şeması (2.5'e kadarki lacivert havacılık görünümü); varsayılan şema Falcon
   - dil köprüsü: program 5 dil kipi bilir (tr, en, ar, tr-ar, en-ar), çekirdek 3 dil (tr, en, ar)
   - üst çubuk: [Duyurular · ✦ Asistan] Eşitle · Wi‑Fi · Güncelle · tema · dil | Küçült · Orta · Tam ekran · Kapat
   - ayarlar ızgarası (FC.settings: Görünüm … Admin ile iletişim EN SON), Kullanım Limitleri (Firebase + yapay zeka)
   - ilk açılış rehberi (dil, görünüm, kendi Firebase'iniz, kendi yapay zeka anahtarınız), "neler yeni", çökme raporu
   - eski ayarların taşınması (tema, hata raporu, tanıtım) — bir kez
   - Android güncellemesi (kurulu APK + FCD1 yama → yeni APK; yerel tarafta, ortak ApkPatchInstaller)
   - ESKİ KABUK KÖPRÜSÜ: kabuk 2–3 (taşınabilir exe / eski APK) bu arayüzü eski kanaldan (depo kökündeki latest.json) alır;
     program olduğu gibi çalışır ve "Yeni kurulum gerekli" penceresi kurulum dosyasına (win-setup) / yeni APK'ya yönlendirir. */
(function () {
  'use strict';
  const OWNER = 'departures-mil', REPO = 'ing-mufredat-guncelleme', APP = 'ing-mufredat';
  const REL = window.APP_RELEASE || { version: '0.0.0', notes: {} };
  const VER = REL.version;
  const AB = window.AndroidBridge || null;
  const ui = FC.ui;
  window.__kabukEk = true;   // eski kabuğun (v3) enjekte.js eklentisi bu arayüze düğme eklemesin
  window.__ingErrors = [];
  window.addEventListener('error', (e) => { if (e && e.message && !/ResizeObserver/.test(e.message)) window.__ingErrors.push(String(e.message)); });

  /* ---------- "klasik" şema: 2.5'e kadarki app.css renkleri (koyu = :root, açık = html.light) ---------- */
  FC.look.registerScheme('klasik', {
    label: { tr: 'Klasik (eski görünüm)', en: 'Classic (previous look)', ar: 'الكلاسيكي (المظهر السابق)' },
    dark: {
      '--bg': '#061327', '--bg-grid': '#78b8ff0a', '--panel': '#0c203ec7', '--panel-solid': '#0c203e', '--panel-hover': '#122e56',
      '--border': '#82beff2e', '--border-strong': '#82beff52', '--border-w': '1px', '--text': '#e8f1fb', '--muted': '#a3b8cf', '--label': '#c3d3e5',
      '--nav-text': '#a9bfd6', '--nav-title': '#7f97b2', '--accent': '#4fc3f7', '--accent-2': '#ffa726', '--on-accent': '#061327',
      '--primary-1': '#2196f3', '--primary-2': '#1565c0', '--active-1': '#2196f359', '--active-2': '#2196f314', '--active-line': '#4fc3f766',
      '--accent-soft': '#4fc3f71a', '--accent-line': '#4fc3f759', '--focus': '#4fc3f7', '--focus-w': '2px', '--focus-ring': '#4fc3f733',
      '--danger': '#ef5350', '--warn': '#ffca28', '--ok': '#66bb6a', '--ok-text': '#a5d6a7', '--danger-text': '#ff8a80', '--warn-text': '#ffe082',
      '--ok-soft': '#66bb6a1f', '--ok-line': '#66bb6a66', '--danger-soft': '#ef53501f', '--danger-line': '#ef535073', '--warn-soft': '#ffca281f', '--warn-line': '#ffca2866',
      '--sidebar-bg': '#061328bd', '--topbar-bg': '#051022d1', '--modal-bg': '#0b1a2e', '--modal-border': '#82beff40', '--backdrop': '#02060fb8',
      '--toast-bg': '#0f2442', '--toast-text': '#e8f1fb', '--toast-line': '#66bb6a66', '--toast-err-bg': '#4a1416', '--toast-err-text': '#ffffff', '--toast-err-line': '#ef535073',
      '--badge-text': '#e8f1fb', '--badge-bg': '#ffa72624', '--badge-line': '#ffa72659', '--on-badge': '#061327',
      '--bar-track': '#ffffff14', '--scroll-thumb': '#82beff40', '--glow-1': '#4fc3f740', '--glow-2': '#ffa7261a',
      '--shadow-pop': '0 10px 30px #00000059', '--shadow-modal': '0 30px 80px #000000a6', '--shadow-toast': '0 12px 30px #00000073'
    },
    light: {
      '--bg': '#eef3f9', '--bg-grid': '#143c6e08', '--panel': '#ffffffeb', '--panel-solid': '#ffffff', '--panel-hover': '#f4f8fd',
      '--border': '#143c6e24', '--border-strong': '#143c6e42', '--border-w': '1px', '--text': '#0f2238', '--muted': '#5f7590', '--label': '#3d5672',
      '--nav-text': '#3d5672', '--nav-title': '#5f7590', '--accent': '#0277bd', '--accent-2': '#e65100', '--on-accent': '#ffffff',
      '--primary-1': '#1565c0', '--primary-2': '#0d47a1', '--active-1': '#1565c029', '--active-2': '#1565c00f', '--active-line': '#1565c059',
      '--accent-soft': '#0277bd14', '--accent-line': '#0277bd59', '--focus': '#0277bd', '--focus-w': '2px', '--focus-ring': '#0277bd26',
      '--danger': '#c62828', '--warn': '#b26a00', '--ok': '#2e7d32', '--ok-text': '#2e7d32', '--danger-text': '#c62828', '--warn-text': '#8a5200',
      '--ok-soft': '#2e7d321a', '--ok-line': '#2e7d3259', '--danger-soft': '#c628281a', '--danger-line': '#c6282859', '--warn-soft': '#b26a001a', '--warn-line': '#b26a0059',
      '--sidebar-bg': '#fffffff0', '--topbar-bg': '#ffffffeb', '--modal-bg': '#ffffff', '--modal-border': '#143c6e33', '--backdrop': '#0f223859',
      '--toast-bg': '#0f2238', '--toast-text': '#ffffff', '--toast-line': '#0f2238', '--toast-err-bg': '#c62828', '--toast-err-text': '#ffffff', '--toast-err-line': '#c62828',
      '--badge-text': '#3d2600', '--badge-bg': '#e6510024', '--badge-line': '#e6510059', '--on-badge': '#ffffff',
      '--bar-track': '#143c6e14', '--scroll-thumb': '#5f759059', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 6px 20px #14325a1f', '--shadow-modal': '0 24px 60px #14325a33', '--shadow-toast': '0 12px 30px #0f172a26'
    }
  });

  /* ---------- metinler ---------- */
  FC.i18n.add({
    tr: {
      'ing.kurulum': 'Yeni kurulum gerekli', 'ing.kurulum.p1': 'İngilizce Müfredat Sistemi {v} yeni bir kurulum programıyla gelir: tam ekran açılış, tek tuşla güncelleme (yalnızca değişen kısımlar indirilir), yeni görünüm ve daha güvenli Wi‑Fi eşitleme. Bir kez kurun; sonraki güncellemeler kendiliğinden gelir.',
      'ing.kurulum.p2': 'Kayıtlarınız korunur: müfredat, öğrenciler, değerlendirmeler, belgeler ve eşitleme bilgileri aynı yerde (%APPDATA%\\IngMufredatSistemi) kalır; yeni sürüm onları kendiliğinden açar.',
      'ing.kurulum.p3': '"Kurulumu indir" düğmesi kurulum dosyasını tarayıcıyla indirir. İnen dosyayı açın; kurulum birkaç saniye sürer ve program yeniden açılır. Masaüstündeki eski kısayol da çalışmaya devam eder.',
      'ing.kurulum.indir': 'Kurulumu indir', 'ing.kurulum.sayfa': 'Sürümler sayfası', 'ing.kurulum.sonra': 'Daha sonra',
      'ing.apk': 'Yeni uygulama sürümü gerekli', 'ing.apk.p1': 'İngilizce Müfredat {v} için uygulamanın yeni sürümünü (APK) kurun: tek dokunuşla güncelleme, yeni görünüm ve telefonda da Wi‑Fi eşitleme.',
      'ing.apk.p2': 'Kayıtlarınız korunur: yeni sürüm aynı uygulamanın üzerine kurulur ve kayıtlarını kendiliğinden açar. Kurulum için "bilinmeyen kaynaklar" izni istenebilir.',
      'ing.apk.indir': 'Yeni sürümü indir',
      'ing.fb.doldur': 'Firebase bilgileri Ayarlar → Eşitleme bölümüne yazıldı. Kurum kodunu, e-posta ve şifrenizi girip "Giriş yap"a basın.'
    },
    en: {
      'ing.kurulum': 'New installer required', 'ing.kurulum.p1': 'English Curriculum System {v} comes with a new installer: full-screen start, one-click updates (only the changed parts are downloaded), a new look and safer Wi‑Fi sync. Install it once; later updates arrive automatically.',
      'ing.kurulum.p2': 'Your records are kept: the curriculum, students, assessments, documents and sync details stay where they are (%APPDATA%\\IngMufredatSistemi) and the new version opens them automatically.',
      'ing.kurulum.p3': '"Download the installer" downloads the setup file in your browser. Open the downloaded file; installation takes a few seconds and the program reopens. The old desktop shortcut keeps working.',
      'ing.kurulum.indir': 'Download the installer', 'ing.kurulum.sayfa': 'Releases page', 'ing.kurulum.sonra': 'Later',
      'ing.apk': 'New app version required', 'ing.apk.p1': 'Install the new app version (APK) for English Curriculum {v}: one-tap updates, a new look and Wi‑Fi sync on the phone too.',
      'ing.apk.p2': 'Your records are kept: the new version installs over the same app and opens its records automatically. Android may ask for the "unknown sources" permission.',
      'ing.apk.indir': 'Download the new version',
      'ing.fb.doldur': 'The Firebase details were filled in Settings → Sync. Enter the institution code, your e-mail and password, then press "Sign in".'
    },
    ar: {
      'ing.kurulum': 'يلزم مثبّت جديد', 'ing.kurulum.p1': 'يأتي نظام منهج اللغة الإنجليزية {v} بمثبّت جديد: فتح بملء الشاشة، وتحديث بضغطة واحدة (تُنزَّل الأجزاء المتغيرة فقط)، ومظهر جديد، ومزامنة Wi‑Fi أكثر أماناً. ثبّته مرة واحدة؛ وستصل التحديثات التالية تلقائياً.',
      'ing.kurulum.p2': 'سجلاتك محفوظة: المنهج والطلاب والتقييمات والمستندات وبيانات المزامنة تبقى في مكانها (%APPDATA%\\IngMufredatSistemi) ويفتحها الإصدار الجديد تلقائياً.',
      'ing.kurulum.p3': 'زر «تنزيل المثبّت» ينزّل ملف التثبيت عبر المتصفح. افتح الملف الذي تم تنزيله؛ يستغرق التثبيت ثوانيَ ثم يُعاد فتح البرنامج. يبقى الاختصار القديم على سطح المكتب صالحاً.',
      'ing.kurulum.indir': 'تنزيل المثبّت', 'ing.kurulum.sayfa': 'صفحة الإصدارات', 'ing.kurulum.sonra': 'لاحقاً',
      'ing.apk': 'يلزم إصدار جديد من التطبيق', 'ing.apk.p1': 'ثبّت الإصدار الجديد من التطبيق (APK) لمنهج اللغة الإنجليزية {v}: تحديث بلمسة واحدة، ومظهر جديد، ومزامنة Wi‑Fi على الهاتف أيضاً.',
      'ing.apk.p2': 'سجلاتك محفوظة: يُثبَّت الإصدار الجديد فوق التطبيق نفسه ويفتح سجلاته تلقائياً. قد يطلب Android إذن «مصادر غير معروفة».',
      'ing.apk.indir': 'تنزيل الإصدار الجديد',
      'ing.fb.doldur': 'كُتبت بيانات Firebase في الإعدادات ← المزامنة. أدخل رمز المؤسسة وبريدك وكلمة المرور ثم اضغط «تسجيل الدخول».'
    }
  });
  const T = (k, v) => FC.t(k, v);

  /* ---------- kullanım sayaçları: programın eski Kullanim çağrıları → FC.usage ---------- */
  window.Kullanim = {
    say(tur, n) { if (tur === 'aiIstek') return FC.usage.count('ai.custom', n || 1); FC.usage.count(tur === 'okuma' ? 'firebase.read' : tur === 'silme' ? 'firebase.delete' : 'firebase.write', n || 1); },
    ekle() { /* token sayımı çekirdekte tutulmaz */ },
    kotaDoldu(ne) { FC.usage.count(ne === 'ai' ? 'ai.gemini.full' : 'firebase.full'); },
  };
  FC.usage.wrapFetch();   // yapay zeka (Gemini/OpenAI/Anthropic/Groq) çağrıları kendiliğinden sayılır

  /* ---------- Android: güncelleme yerel tarafta (kurulu APK + yama → yeni APK; hata → tam APK) ---------- */
  if (FC.host.kind === 'android' && AB && typeof AB.apkUpdate === 'function') {
    FC.host.update.run = function (plan, onEv) {
      return new Promise((resolve, reject) => {
        window.__fcApk = function (ev) {
          if (!ev) return;
          if (ev.type === 'progress') onEv({ patch: !!ev.patch, done: ev.done, total: ev.total, finished: !!ev.finished });
          else if (ev.type === 'patchFailed') onEv({ patchFailed: true, error: ev.error });
          else if (ev.type === 'installing') onEv({ installing: true });
          else if (ev.type === 'done') resolve(ev.result || 'done');
          else if (ev.type === 'error') reject(Object.assign(new Error(ev.error || 'FAILED'), { code: ev.error || 'FAILED' }));
        };
        try { AB.apkUpdate(JSON.stringify({ version: plan.version, full: plan.full, patch: plan.mode === 'patch' ? { url: plan.url, sha256: plan.sha256, size: plan.size } : null })); }
        catch (e) { reject(e); }
      });
    };
    FC.host.can.update = true;
  }

  /* ---------- dil köprüsü ---------- */
  function programDili() { return UI.lang(); }
  let dilAyarlaniyor = false;
  FC.i18n.onChange((l) => {
    if (dilAyarlaniyor || !window.Store || !Store.local) return;
    if (UI.lang() === l) return;
    dilAyarlaniyor = true;
    try { UI.setLang(l); } finally { dilAyarlaniyor = false; }
  });
  function cekirdekDili() {
    const l = programDili();
    if (FC.i18n.lang() !== l) { dilAyarlaniyor = true; try { FC.i18n.set(l); } finally { dilAyarlaniyor = false; } }
  }

  /* ---------- eski ayarların bir kez taşınması ---------- */
  function tasi() {
    if (FC.storage.get('ing.tasindi', false)) return;
    const u = (Store.local && Store.local.ui) || {};
    const eskiKullanici = !!(Store.local && (Store.local.lastRunVer || Object.keys(Store.db.students || {}).length || (Store.local.sync && Store.local.sync.config)));
    if (u.theme && FC.storage.get('theme', null) == null) FC.look.setTheme(u.theme === 'auto' ? 'auto' : u.theme === 'light' ? 'light' : 'dark');
    if (u.errRep === false) FC.storage.set('crash.enabled', false);
    if (eskiKullanici) {
      if (FC.storage.get('onboarding.done', null) == null) FC.storage.set('onboarding.done', true);
      if (FC.storage.get('scheme', null) == null) FC.look.setScheme('klasik');   // eski kullanıcı tanıdığı görünümle başlar
    }
    // kendi AI anahtarı: Danışman ayarı → çekirdek (Asistan Agent'ın çevrimiçi önerileri)
    try { const c = Danisman.cfg(); if (c.key && ['gemini', 'openai', 'anthropic'].includes(c.provider) && !FC.storage.get('ai', null)) FC.storage.set('ai', { provider: c.provider, key: c.key }); } catch (e) {}
    FC.storage.set('ing.tasindi', true);
  }

  /* ---------- ilk açılış rehberi ---------- */
  let bekleyenFb = null;
  function OB() {
    return {
      firebase: !(Store.local.sync && Store.local.sync.enabled), ai: true,
      onFirebase(cfg) { bekleyenFb = cfg; },
      onAi(a) {
        if (!a || !a.key) return;
        const c = Danisman.cfg(); c.provider = ['gemini', 'openai', 'anthropic'].includes(a.provider) ? a.provider : 'custom'; c.key = a.key;
        if (a.provider === 'groq') { c.url = 'https://api.groq.com/openai/v1'; }
        Danisman.cfgYaz(c);
      },
      onClose() {
        if (!bekleyenFb) return;
        const cfg = bekleyenFb; bekleyenFb = null;
        Store.local.sync = Object.assign(Store.local.sync || {}, { config: cfg }); Store.saveLocal();
        UI.go('settings', { anchor: 'sync' });
        setTimeout(() => {
          const ta = document.getElementById('fbCfg'); if (ta) { ta.value = JSON.stringify(cfg, null, 1); const d = ta.closest('details'); if (d) d.open = true; }
          ui.toast(T('ing.fb.doldur'), 'info', 9000);
        }, 150);
      },
    };
  }

  /* ---------- üst çubuk ---------- */
  let tb = null;
  const SYNC = { off: 'off', connecting: 'syncing', busy: 'syncing', on: 'idle', error: 'error', offline: 'offline' };
  function ustCubuk() {
    const bar = document.getElementById('topbar'); if (!bar) return;
    tb = FC.topbar.mount(bar, {
      before: [FC.announcements.button()],
      sync: { state: SYNC[Sync.state] || 'off', onClick: (st) => { if (st === 'off' || st === 'error') UI.go('settings', { anchor: 'sync' }); else { Sync.syncNow(); if (window.Files) Files.pushPending(); } } },
      lan: { onClick: () => Lan.pencere() },
    });
    tb.setSync(SYNC[Sync.state] || 'off');
    if (tb.setLan) tb.setLan(Lan.durum());
  }
  UI.onShell.push(ustCubuk);
  Sync.onState(() => { if (tb) tb.setSync(navigator.onLine === false && Sync.state !== 'off' ? 'offline' : SYNC[Sync.state] || 'off'); if (Sync.state === 'on' && window.Files) Files.pushPending(); });
  Lan.onDurum((d) => { if (tb && tb.setLan) tb.setLan(d); });

  /* ---------- ayarlar ızgarası ---------- */
  function projeId() { const s = Store.local.sync; return s && s.enabled && s.config ? s.config.projectId : ''; }
  UI.ayarIzgara = function (kap, kartlar) {
    FC.settings.build(kap, { cards: kartlar, usage: { project: projeId }, about: { version: VER }, onboarding: OB() });
  };

  /* ---------- eski kabuk köprüsü ---------- */
  const relSayfa = 'https://github.com/' + OWNER + '/' + REPO + '/releases/latest';
  async function sonSurum() {
    try {
      const j = JSON.parse(await Platform.httpGet('https://api.github.com/repos/' + OWNER + '/' + REPO + '/releases/latest'));
      const a = (j.assets || []).find((x) => Platform.kind === 'android' ? /\.apk$/i.test(x.name) : /setup.*\.exe$/i.test(x.name));
      return a ? a.browser_download_url : null;
    } catch (e) { return null; }
  }
  let kopruAcik = false;
  function kopru() {
    if (kopruAcik) return; kopruAcik = true;
    const apk = Platform.kind === 'android';
    const body = ui.el('div');
    if (apk) { body.appendChild(ui.el('p', { text: T('ing.apk.p1', { v: VER }) })); body.appendChild(ui.el('p.muted', { text: T('ing.apk.p2') })); }
    else { ['p1', 'p2', 'p3'].forEach((k, i) => body.appendChild(ui.el(i ? 'p.muted' : 'p', { text: T('ing.kurulum.' + k, { v: VER }) }))); }
    ui.modal({ title: T(apk ? 'ing.apk' : 'ing.kurulum'), icon: 'download', body, onClose: () => { kopruAcik = false; }, buttons: [
      { label: T('ing.kurulum.sonra'), cls: 'ghost' }, 'spacer',
      { label: T('ing.kurulum.sayfa'), onClick: () => { Platform.openUrl(relSayfa); return false; } },
      { label: T(apk ? 'ing.apk.indir' : 'ing.kurulum.indir'), icon: 'download', cls: 'primary', onClick: () => { sonSurum().then((u) => Platform.openUrl(u || relSayfa)); return false; } },
    ] });
  }

  /* ---------- açılış ---------- */
  async function baslat() {
    await App.start();
    tasi();
    cekirdekDili();
    FC.init({ app: APP, repo: REPO, version: VER, setupChannel: 'win-setup', announcements: true, whatsnew: false, update: !Platform.legacy, onboarding: false });
    // "neler yeni": güncellemeden sonraki ilk açılışta (sürüm notları paketin içinde)
    try {
      if (FC.storage.get('whatsnew.seen', null) == null && Store.local.lastRunVer) FC.storage.set('whatsnew.seen', String(Store.local.lastRunVer));
      FC.whatsnew.start({ version: VER, notes: (v) => (String(v) === VER ? REL.notes : null) });
    } catch (e) { console.warn(e); }
    Store.local.lastRunVer = VER; Store.saveLocal();
    if (!FC.storage.get('onboarding.done', false)) setTimeout(() => FC.onboarding.maybeStart(OB()), 700);
    if (Platform.legacy) {
      await Platform.legacyBootOk();   // eski kabuk: "bu arayüz açıldı" onayı (verilmezse bir sonraki açılışta eski arayüze dönülür)
      setTimeout(kopru, 1500);
      UI.kopru = kopru;
    }
  }
  window.Kabuk = { kopru, legacy: Platform.legacy, version: VER };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
