/* İngilizce Müfredat — kabuk eklentisi (kabuk v3). Kabuk bu dosyayı her sayfa yüklemesinde arayüze ekler;
   arayüz sürümünden bağımsızdır (uygulama içi güncellemeler bu dosyaya dokunmaz).
   - Üst çubuğa "Küçült" (—) ve "Wi‑Fi ile eşitle" (📶) düğmeleri.
   - İnternetsiz eşitleme: aynı modeme bağlı bilgisayar ↔ bilgisayar / telefon. Birleştirme programın kendi
     kayıt birleştirmesiyle (Birlestir) yapılır: tabansız birleştirme hiçbir kaydı silmez, iki tarafta eklenenler kalır,
     aynı kayıtta iki tarafta farklı değişen alanda daha yeni olan kalır. */
(function () {
  'use strict';
  if (window.__kabukEk) return; window.__kabukEk = true;
  var D = window.desktop || null, A = window.AndroidBridge || null;
  var S = {
    tr: { min: 'Küçült', lan: 'Wi‑Fi ile eşitle (internetsiz)', intro: 'İnternet gerekmez. Cihazlar aynı Wi‑Fi modemine bağlı olsun. Bilgisayarda «Bekle»ye basın; öbür cihazda adresi bulup kodu girin. Kayıtlar iki yönlü birleşir; hiçbir kayıt silinmez ya da üzerine yazılmaz, aynı kayıtta en son değiştirilen kalır.',
      host: '1) Bu bilgisayar beklesin', hostOff: 'Bu bilgisayarı eşitlemeye açar; adres ve kod burada görünür.', hostOn: 'Eşitleme bitene kadar program açık kalsın.', start: 'Bekle (eşitlemeye aç)', stop: 'Beklemeyi durdur',
      join: '2) Öbür cihaza bağlan', joinPhone: 'Bilgisayara bağlan', find: 'Ağda bul', finding: 'Aranıyor…', none: 'Bekleyen cihaz bulunamadı. Adresi elle yazabilirsiniz.',
      addr: 'Adres', code: 'Kod', go: 'Şimdi eşitle', need: 'Adresi ve 6 haneli kodu girin.', busy: 'Eşitleniyor…', done: 'Eşitlendi. Kayıtlar birleştirildi.',
      pin: 'Kod yanlış.', unreach: 'Cihaza ulaşılamadı. İkisi de aynı Wi‑Fi’de mi, öbür cihazda «Bekle» açık mı?', err: 'Hata:', close: 'Kapat', inDone: 'Wi‑Fi eşitlemesi tamamlandı: kayıtlar birleştirildi.' },
    en: { min: 'Minimize', lan: 'Wi‑Fi sync (no internet)', intro: 'No internet needed. Put the devices on the same Wi‑Fi router. Press «Wait» on the computer; on the other device find its address and enter the code. Records merge both ways; nothing is deleted or overwritten — for the same record the latest change wins.',
      host: '1) Let this computer wait', hostOff: 'Opens this computer for syncing; the address and code appear here.', hostOn: 'Keep the program open until syncing finishes.', start: 'Wait (open for sync)', stop: 'Stop waiting',
      join: '2) Connect to the other device', joinPhone: 'Connect to the computer', find: 'Find on network', finding: 'Searching…', none: 'No waiting device found. You can type the address yourself.',
      addr: 'Address', code: 'Code', go: 'Sync now', need: 'Enter the address and the 6‑digit code.', busy: 'Syncing…', done: 'Synced. Records were merged.',
      pin: 'Wrong code.', unreach: 'Could not reach the device. Are both on the same Wi‑Fi and is «Wait» on?', err: 'Error:', close: 'Close', inDone: 'Wi‑Fi sync finished: records merged.' },
    ar: { min: 'تصغير', lan: 'مزامنة عبر Wi‑Fi (بدون إنترنت)', intro: 'لا حاجة للإنترنت. اربط الأجهزة بنفس راوتر Wi‑Fi. اضغط «انتظار» على الحاسوب، ثم ابحث عن عنوانه في الجهاز الآخر وأدخل الرمز. تُدمج السجلات في الاتجاهين؛ لا يُحذف شيء ولا يُكتب فوقه، وفي السجل نفسه يبقى آخر تعديل.',
      host: '١) اجعل هذا الحاسوب ينتظر', hostOff: 'يفتح هذا الحاسوب للمزامنة؛ يظهر العنوان والرمز هنا.', hostOn: 'أبقِ البرنامج مفتوحاً حتى تنتهي المزامنة.', start: 'انتظار (فتح للمزامنة)', stop: 'إيقاف الانتظار',
      join: '٢) الاتصال بالجهاز الآخر', joinPhone: 'الاتصال بالحاسوب', find: 'بحث في الشبكة', finding: 'جارٍ البحث…', none: 'لم يُعثر على جهاز منتظر. يمكنك كتابة العنوان يدوياً.',
      addr: 'العنوان', code: 'الرمز', go: 'زامن الآن', need: 'أدخل العنوان والرمز المكوّن من ٦ أرقام.', busy: 'جارٍ المزامنة…', done: 'تمت المزامنة ودُمجت السجلات.',
      pin: 'الرمز خاطئ.', unreach: 'تعذّر الوصول إلى الجهاز. هل كلاهما على نفس Wi‑Fi وهل «انتظار» مفعّل؟', err: 'خطأ:', close: 'إغلاق', inDone: 'اكتملت مزامنة Wi‑Fi ودُمجت السجلات.' }
  };
  function L() { var l = String(document.documentElement.lang || 'tr').slice(0, 2); return S[l] ? l : 'tr'; }
  function t(k) { return S[L()][k] || S.tr[k] || k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function note(m) { try { if (window.toast) return window.toast(m); } catch (e) {} var d = document.createElement('div'); d.className = 'kb-toast'; d.textContent = m; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500); }

  // ---------------------------------------------------------------- birleştirme
  var isObj = function (x) { return x !== null && typeof x === 'object' && !Array.isArray(x); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  function m3(a, b) {
    var ru = (b && b.updatedAt) || 0, lu = (a && a.updatedAt) || 0;
    if (window.Birlestir && Birlestir.merge) {
      var v = Birlestir.merge(null, a, b, { remoteNewer: ru > lu }).value;
      if (isObj(v) && (ru || lu)) v.updatedAt = Math.max(ru, lu);
      return v;
    }
    return ru > lu ? b : a;     // eski arayüz: kayıt düzeyinde en yeni
  }
  function isRecMap(o) { var k = Object.keys(o); return k.length > 0 && k.every(function (x) { return isObj(o[x]) && (o[x].updatedAt != null || o[x].id != null); }); }
  function part(a, b) {
    if (a === undefined) return clone(b);
    if (b === undefined) return a;
    if (isObj(a) && isObj(b)) {
      if (a.updatedAt == null && b.updatedAt == null && (isRecMap(a) || isRecMap(b))) {
        var out = {}, keys = {};
        Object.keys(a).concat(Object.keys(b)).forEach(function (k) { keys[k] = 1; });
        Object.keys(keys).forEach(function (k) { out[k] = part(a[k], b[k]); });
        return out;
      }
      return m3(a, b);
    }
    return a;
  }
  function mergeDb(local, remote) {
    var out = {}, keys = {};
    Object.keys(local || {}).concat(Object.keys(remote || {})).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) { out[k] = part(local ? local[k] : undefined, remote ? remote[k] : undefined); });
    return out;
  }
  function payload() { return { app: 'ingmufredat', db: clone(window.Store.db) }; }
  function apply(remote) {
    if (!remote || remote.app !== 'ingmufredat' || !remote.db) throw new Error('veri');
    var merged = mergeDb(clone(window.Store.db), remote.db);
    window.Store.db = merged;
    window.Store.persistNow();
    try { window.Store.emit('all'); } catch (e) {}
    try { if (window.Sync && Sync.markDirty) Sync.markDirty('all'); } catch (e) {}
  }
  // başka cihaz bize bağlandı (masaüstü kabuğu çağırır): önce kendi verimizi ayır, sonra birleştir
  window.__kabukLanIn = function (remote) {
    var mine = payload();
    apply(remote);
    note(t('inDone'));
    return JSON.stringify(mine);
  };

  // ---------------------------------------------------------------- düğmeler
  var CSS = '.kb-ib{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;border-radius:10px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer;font-weight:700;margin-inline-start:4px}' +
    '.kb-ib:hover{background:rgba(127,127,127,.18)}.kb-wrap{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center}' +
    '.kb-dlg{background:#0f1c33;color:#eef3ff;border-radius:16px;max-width:560px;width:92vw;max-height:90vh;overflow:auto;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.5);font:15px/1.45 system-ui,"Segoe UI",sans-serif}' +
    '.kb-dlg h3{margin:0 0 10px}.kb-dlg h4{margin:14px 0 6px}.kb-dlg p{margin:6px 0}.kb-dlg .m{color:#a9b8d6;font-size:13px}.kb-dlg input{width:100%;box-sizing:border-box;padding:9px;border-radius:9px;border:1px solid #2d4168;background:#14264a;color:inherit;margin:4px 0 8px}' +
    '.kb-dlg button{padding:8px 14px;border-radius:9px;border:0;background:#22365e;color:inherit;cursor:pointer;margin:4px 6px 4px 0}.kb-dlg button.p{background:#2a8cff}.kb-pin{font-size:26px;letter-spacing:4px;font-weight:800}' +
    '.kb-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22365e;color:#fff;padding:10px 16px;border-radius:10px;z-index:100000}';
  function ensureCss() { if (document.getElementById('kb-css')) return; var s = document.createElement('style'); s.id = 'kb-css'; s.textContent = CSS; document.head.appendChild(s); }
  function buttons() {
    var bar = document.querySelector('header.topbar');
    if (!bar || bar.querySelector('#kbLan')) return;
    ensureCss();
    var lan = document.createElement('button'); lan.id = 'kbLan'; lan.className = 'kb-ib'; lan.textContent = '📶'; lan.title = t('lan'); lan.onclick = dialog;
    var mn = document.createElement('button'); mn.id = 'kbMin'; mn.className = 'kb-ib'; mn.textContent = '—'; mn.title = t('min');
    mn.onclick = function () { if (D && D.minimize) D.minimize(); else if (A && A.minimize) A.minimize(); };
    var ref = bar.querySelector('#fsBtn') || bar.querySelector('#quitBtn');
    if (ref) { bar.insertBefore(lan, ref); bar.insertBefore(mn, ref); } else { bar.appendChild(lan); bar.appendChild(mn); }
  }

  function dialog() {
    ensureCss();
    var desk = !!(D && D.lan);
    var w = document.createElement('div'); w.className = 'kb-wrap';
    w.innerHTML = '<div class="kb-dlg" dir="' + (L() === 'ar' ? 'rtl' : 'ltr') + '"><h3>' + esc(t('lan')) + '</h3><p class="m">' + esc(t('intro')) + '</p>' +
      (desk ? '<h4>' + esc(t('host')) + '</h4><div id="kbHost"></div><button class="p" id="kbStart"></button>' : '') +
      '<h4>' + esc(t(desk ? 'join' : 'joinPhone')) + '</h4>' + (desk ? '<button id="kbFind">' + esc(t('find')) + '</button><div id="kbFound"></div>' : '') +
      '<label>' + esc(t('addr')) + '<input id="kbIp" inputmode="decimal" placeholder="192.168.1.20"></label>' +
      '<label>' + esc(t('code')) + '<input id="kbPin" inputmode="numeric" maxlength="6" placeholder="123456"></label>' +
      '<button class="p" id="kbGo">' + esc(t('go')) + '</button><button id="kbX">' + esc(t('close')) + '</button><p id="kbOut"></p></div>';
    document.body.appendChild(w);
    var $ = function (s) { return w.querySelector(s); };
    $('#kbX').onclick = function () { w.remove(); };
    w.addEventListener('mousedown', function (e) { if (e.target === w) w.remove(); });
    function paint() {
      if (!desk) return;
      D.lan.state().then(function (st) {
        $('#kbHost').innerHTML = st.hosting
          ? '<p>' + esc(t('addr')) + ': <b>' + esc((st.ips || []).join(', ') || '—') + '</b></p><p class="kb-pin">' + esc(t('code')) + ': ' + esc(st.pin) + '</p><p class="m">' + esc(t('hostOn')) + '</p>'
          : '<p class="m">' + esc(t('hostOff')) + '</p>';
        $('#kbStart').textContent = st.hosting ? t('stop') : t('start');
      });
    }
    if (desk) {
      paint();
      $('#kbStart').onclick = function () { D.lan.state().then(function (st) { return st.hosting ? D.lan.stop() : D.lan.start(); }).then(paint, function (e) { $('#kbOut').textContent = t('err') + ' ' + e.message; }); };
      $('#kbFind').onclick = function () {
        var b = $('#kbFind'); b.disabled = true; b.textContent = t('finding');
        D.lan.discover().then(function (f) {
          b.disabled = false; b.textContent = t('find');
          $('#kbFound').innerHTML = f.length ? f.map(function (h) { return '<button data-h="' + esc(h) + '">' + esc(h) + '</button>'; }).join('') : '<p class="m">' + esc(t('none')) + '</p>';
          Array.prototype.forEach.call(w.querySelectorAll('[data-h]'), function (x) { x.onclick = function () { $('#kbIp').value = x.getAttribute('data-h'); }; });
          if (f.length === 1) $('#kbIp').value = f[0];
        });
      };
    }
    $('#kbGo').onclick = function () {
      var host = $('#kbIp').value.trim(), pin = $('#kbPin').value.trim(), out = $('#kbOut');
      if (!host || !/^\d{6}$/.test(pin)) { out.textContent = t('need'); return; }
      out.textContent = t('busy');
      var p = desk ? D.lan.sync(host, pin, JSON.stringify(payload())) : webSync(host, pin);
      p.then(function (r) {
        if (!r.ok) throw new Error(r.error);
        apply(typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
        out.textContent = t('done');
      }).catch(function (e) {
        var c = String(e && e.message || e);
        out.textContent = c === 'pin' ? t('pin') : (c === 'unreachable' || /fetch|network|timeout|abort/i.test(c)) ? t('unreach') : t('err') + ' ' + c;
      });
    };
  }
  function webSync(host, pin) {
    var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, 60000);
    return fetch('http://' + host + ':47851/ing-esitle', { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': pin }, body: JSON.stringify(payload()), signal: ctl.signal })
      .then(function (r) { if (r.status === 403) return { ok: false, error: 'pin' }; if (!r.ok) return { ok: false, error: 'http ' + r.status }; return r.json().then(function (j) { return { ok: true, data: j }; }); })
      .catch(function () { return { ok: false, error: 'unreachable' }; })
      .finally(function () { clearTimeout(tm); });
  }

  function watch() { buttons(); new MutationObserver(function () { buttons(); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
