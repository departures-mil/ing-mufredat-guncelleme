/* Wi‑Fi (aynı ağ) eşitlemesi — internetsiz, bulut eşitlemesinin ikinci seçeneği.
   Bir cihaz "Bekle" der (masaüstü ya da telefon); öbürü adresini bulup ekrandaki 6 haneli kodu girer.
   Taşıma kabuktadır (masaüstü: masaustu/lan-sunucu.js, Android: LanSunucu.java). Kod ağda hiç gönderilmez: her istek ve yanıt
   koddan türetilen anahtarla HMAC-SHA256 imzalıdır (zaman + tek kullanımlık sayı; tekrar oynatma reddedilir). 5 yanlış imzadan
   sonra bekleyen cihaz kodu değiştirip beklemeyi kapatır. Tarayıcıdan erişim yok (CORS başlığı verilmez, Origin'li istek reddedilir).
   Birleştirme kuralı (ortak çekirdek lan-sync-merge ile aynı): hiçbir kayıt silinmez ya da sessizce ezilmez —
     - yalnız bir tarafta olan kayıt öbür tarafa eklenir,
     - aynı kayıtta farklı alanlar değiştiyse ikisi de kalır, aynı alan iki tarafta farklıysa yenisi kalır, öbürü
       Ayarlar → Çakışma geçmişi'ne yazılır,
     - başka cihazda silinen öğrenci/ders programı bu cihazda da "silinmiş" işaretlenir ama verisi durur: Ayarlar → Arşiv'den geri alınır. */
(function () {
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const eq = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const APP = 'ingmufredat';

  /* ---------------------------------------------------------------- birleştirme (saf; test/birim/lan.test.js) */
  /* Kayıt eşlemleri: students{id}, curricula{prog}, plans.list{id} — kayıt kayıt; diğer parçalar (curriculum, config, exams,
     dict, vocab, activity …) tek kayıt gibi. */
  function kayit(key, label, a, b, log) {
    if (a === undefined) return clone(b);
    if (b === undefined) return a;
    if (eq(a, b)) return a;
    const ru = (b && b.updatedAt) || 0, lu = (a && a.updatedAt) || 0;
    const B = window.Birlestir;
    if (!B || !isObj(a) || !isObj(b)) {
      const yeni = ru > lu ? b : a;
      if (log) log(key, label, [{ path: '', kept: yeni, lost: yeni === a ? b : a, kind: 'conflict' }]);
      return clone(yeni);
    }
    const strip = (o) => { const c = Object.assign({}, o); delete c.updatedAt; return c; };
    const r = B.merge(undefined, strip(a), strip(b), { remoteNewer: ru > lu });
    const v = r.value;
    if (ru || lu) v.updatedAt = Math.max(ru, lu);
    if (log && r.items.length) log(key, label, r.items);
    return v;
  }
  function harita(prefix, a, b, log, adOf) {
    const out = {}; const keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
    keys.forEach((k) => { out[k] = kayit(prefix + k, adOf ? adOf((a && a[k]) || (b && b[k]), k) : k, a ? a[k] : undefined, b ? b[k] : undefined, log); });
    return out;
  }
  function birlestir(local, remote, log) {
    local = local || {}; remote = remote || {};
    const out = {};
    const keys = new Set(Object.keys(local).concat(Object.keys(remote)));
    keys.forEach((k) => {
      const a = local[k], b = remote[k];
      if (k === 'students') out[k] = harita('st:', a, b, log, (s, id) => (s && s.name) || id);
      else if (k === 'curricula') out[k] = harita('meta:curriculum_', a, b, log);
      else if (k === 'plans' && isObj(a) && isObj(b)) {
        const p = Object.assign({}, a, b); p.list = harita('plan:', a.list, b.list, log, (x, id) => (x && x.title && (x.title.tr || x.title.en)) || id);
        p.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0); out[k] = p;
      } else if (k === 'activity' && Array.isArray(a) && Array.isArray(b)) {
        const seen = new Set(); out[k] = a.concat(b).filter((x) => { const s = JSON.stringify(x); if (seen.has(s)) return false; seen.add(s); return true; }).sort((x, y) => (y.t || 0) - (x.t || 0)).slice(0, 80);
      } else out[k] = kayit('meta:' + k, k, a, b, log);
    });
    return out;
  }

  /* ---------------------------------------------------------------- program verisiyle bağlantı */
  const cakismaYaz = (key, label, items) => { try { if (window.Birlestir) Birlestir.logConflicts(key, label, items, 'ag'); } catch (e) {} };
  function paket() {
    const p = { app: APP, v: 2, cihaz: Store.local.deviceId, db: clone(Store.db) };
    try { if (window.FC && FC.agent && FC.agent.exportShare) p.agent = FC.agent.exportShare(); } catch (e) {}
    return p;
  }
  function uygula(uzak) {
    if (!uzak || uzak.app !== APP || !isObj(uzak.db)) throw new Error('veri');
    const once = JSON.stringify(Store.db);
    const yeni = birlestir(clone(Store.db), uzak.db, cakismaYaz);
    if (JSON.stringify(yeni) !== once) {
      Store.db = yeni;
      Store.persistNow();
      try { Store.emit('all'); } catch (e) {}
      try { if (window.Sync && Sync.markDirty) Sync.markDirty('all'); } catch (e) {}
    }
    try { if (uzak.agent && window.FC && FC.agent && FC.agent.importShare) FC.agent.importShare(uzak.agent); } catch (e) {}
    Store.local.lanLast = Date.now(); Store.saveLocal();
  }
  /* Kabuk, öbür cihaz bize bağlanınca bunu çağırır: önce kendi verimizi ayırır, sonra birleştirir. Yanıt = birleştirmeden önceki verimiz. */
  window.__ingLanIn = function (metin) {
    const uzak = typeof metin === 'string' ? JSON.parse(metin) : metin;
    const benim = paket();
    uygula(uzak);
    setTimeout(() => { try { UI.toast(t('lanInDone')); } catch (e) {} }, 0);
    return JSON.stringify(benim);
  };

  /* ---------------------------------------------------------------- kabuk köprüsü */
  const D = window.desktop, A = window.AndroidBridge;
  let cagriNo = 0; const bekleyen = {};
  window.__ingLanSonuc = (id, json) => { const f = bekleyen[id]; delete bekleyen[id]; if (f) f(json); };
  const androidCagri = (fn, args) => new Promise((res) => { const id = ++cagriNo; bekleyen[id] = (j) => { try { res(JSON.parse(j)); } catch (e) { res({ ok: false, error: 'json' }); } }; A[fn].apply(A, [id].concat(args)); });
  const tasima = (() => {
    if (D && D.lan && D.lan.v === 2) return { kind: 'desktop', start: () => D.lan.start(), stop: () => D.lan.stop(), state: () => D.lan.state(), discover: () => D.lan.discover(), sync: (h, p, j) => D.lan.sync(h, p, j) };
    if (A && typeof A.lanStart === 'function') return {
      kind: 'android',
      start: () => androidCagri('lanStart', []).then((r) => { if (!r.ok) throw new Error(r.error || 'lan'); return r; }),
      stop: () => androidCagri('lanStop', []),
      state: () => androidCagri('lanState', []),
      discover: () => androidCagri('lanDiscover', []).then((r) => r.found || []),
      sync: (h, p, j) => androidCagri('lanSync', [h, p, j]),
    };
    return null;
  })();
  const durumDinle = new Set();
  let durum = 'off';
  const durumYaz = (d) => { durum = d; durumDinle.forEach((f) => { try { f(d); } catch (e) {} }); };

  async function esitle(host, pin) {
    durumYaz('busy');
    try {
      const r = await tasima.sync(String(host).trim(), String(pin).trim(), JSON.stringify(paket()));
      if (!r || !r.ok) throw new Error((r && r.error) || 'lan');
      uygula(typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
      Store.local.lanHost = String(host).trim(); Store.saveLocal();
      return true;
    } finally { const st = await tasima.state().catch(() => ({})); durumYaz(st && st.hosting ? 'on' : 'off'); }
  }
  const hataMetni = (e) => {
    const c = String((e && e.message) || e);
    if (c === 'pin' || c === 'imza') return t('lanPin');
    if (c === 'kilitli') return t('lanKilitli');
    if (c === 'eski-surum') return t('lanEskiSurum');
    if (c === 'unreachable' || /fetch|network|timeout|abort|refused|ECONN|EHOST/i.test(c)) return t('lanUnreach');
    return t('error') + ': ' + c;
  };

  /* ---------------------------------------------------------------- pencere (üst çubuk Wi‑Fi düğmesi) */
  function pencere() {
    const { esc, icon, modal, $ } = UI;
    if (!tasima) { modal(icon('wifi') + ' ' + t('lanTitle'), `<p class="muted">${t('lanYok')}</p>`, {}); return; }
    const mm = modal(icon('wifi') + ' ' + t('lanTitle'), `<p class="muted sm">${t('lanIntro')}</p>
      <h4>${t('lanHost')}</h4><div id="lanHostBox" class="muted">…</div><div class="row"><button class="btn pri" id="lanStart"></button></div>
      <h4>${t('lanJoin')}</h4><div class="row"><button class="btn sm" id="lanFind">${icon('search')} ${t('lanFind')}</button><span id="lanFound"></span></div>
      <div class="grid2"><label class="fl"><span>${t('lanAddr')}</span><input id="lanIp" dir="ltr" inputmode="decimal" placeholder="192.168.1.20" value="${esc(Store.local.lanHost || '')}"></label>
      <label class="fl"><span>${t('lanCode')}</span><input id="lanPin" dir="ltr" inputmode="numeric" maxlength="6" placeholder="123456"></label></div>
      <div class="row"><button class="btn pri" id="lanGo">${icon('sync')} ${t('lanGo')}</button></div><p id="lanOut" class="sm"></p>`, { wide: false });
    const w = mm.el;
    const ciz = async () => {
      const st = await tasima.state().catch(() => ({}));
      $('#lanHostBox', w).innerHTML = st.hosting
        ? `<p>${t('lanAddr')}: <b dir="ltr">${esc((st.ips || []).join(', ') || '—')}</b></p><p class="lan-pin" dir="ltr">${esc(st.pin || '')}</p><p class="muted sm">${t('lanHostOn')}</p>`
        : `<p class="muted sm">${t('lanHostOff')}</p>`;
      $('#lanStart', w).textContent = st.hosting ? t('lanStop') : t('lanStart');
      durumYaz(st.hosting ? 'on' : 'off');
    };
    ciz();
    $('#lanStart', w).onclick = async () => { try { const st = await tasima.state(); if (st.hosting) await tasima.stop(); else await tasima.start(); } catch (e) { $('#lanOut', w).textContent = hataMetni(e); } ciz(); };
    $('#lanFind', w).onclick = async () => {
      const b = $('#lanFind', w); b.disabled = true; $('#lanFound', w).textContent = t('lanFinding');
      const f = await tasima.discover().catch(() => []);
      b.disabled = false;
      $('#lanFound', w).innerHTML = f.length ? f.map((h) => `<button class="btn sm ghost" data-h="${esc(h.host || h)}">${esc(h.ad ? h.ad + ' · ' : '')}${esc(h.host || h)}</button>`).join(' ') : `<span class="muted sm">${t('lanNone')}</span>`;
      w.querySelectorAll('[data-h]').forEach((x) => (x.onclick = () => { $('#lanIp', w).value = x.dataset.h; $('#lanPin', w).focus(); }));
      if (f.length === 1) $('#lanIp', w).value = f[0].host || f[0];
    };
    $('#lanGo', w).onclick = async () => {
      const host = $('#lanIp', w).value.trim(), pin = $('#lanPin', w).value.trim(), out = $('#lanOut', w);
      if (!host || !/^\d{6}$/.test(pin)) { out.textContent = t('lanNeed'); return; }
      const b = $('#lanGo', w); b.disabled = true; out.textContent = t('lanBusy');
      try { await esitle(host, pin); out.innerHTML = `<span class="ok">${esc(t('lanDone'))}</span>`; } catch (e) { out.innerHTML = `<span class="err">${esc(hataMetni(e))}</span>`; }
      b.disabled = false;
    };
  }

  /* ---------------------------------------------------------------- Ayarlar kartı */
  function kartHtml() {
    const { icon } = UI;
    const son = Store.local.lanLast ? new Date(Store.local.lanLast).toLocaleString() : '—';
    return `<div class="card" id="lan"><h3>${icon('wifi')} ${t('lanTitle')}</h3><p class="muted sm">${t('lanHelp')}</p>
      ${tasima ? `<div class="row"><button class="btn pri" id="lanAc">${icon('wifi')} ${t('lanOpen')}</button><span class="muted sm">${t('lastSync')}: ${son}</span></div>` : `<p class="muted">${t('lanYok')}</p>`}
      <p class="muted sm">${t('lanGuvenlik')}</p></div>`;
  }
  function kartBagla(root) { const b = root.querySelector('#lanAc'); if (b) b.onclick = pencere; }

  window.Lan = { birlestir, paket, uygula, pencere, kartHtml, kartBagla, var: () => !!tasima, durum: () => durum, onDurum: (f) => durumDinle.add(f), hataMetni };
})();
