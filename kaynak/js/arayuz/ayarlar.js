/* Ayarlar sayfası. Sıra (ortak çekirdek FC.settings): Görünüm (şema, koyu/açık, yazı boyutu) · uygulama kartları
   (dil, kurum, puanlama, unvanlar, uzmanlık yolları, bulut eşitleme, Wi‑Fi eşitleme, kurum üyeleri, çakışma geçmişi, arşiv,
   yapay zeka, yedek, klavye kısayolları) · Asistan Agent · Kullanım Limitleri · Otomatik hata raporu · Hakkında ·
   Admin ile iletişim (HER ZAMAN EN SON). */
(function () {
  const { $, $$, esc, icon, tx, toast, modal, confirmDlg, go, PAGES, R, editTri, resizeImage, MODES, mode, modeName, setLang, today, render } = UI;
  /* Kurum kodu (Firestore'da mufredat_ing/{kurumKodu}) için önerilen değer. Eski sürümler bu değeri hazır yazıyordu;
     aynı kurumun yeni cihazları eski cihazlarla aynı alanı bulsun diye korunur (her kurumun kendi Firebase projesi olduğu için
     başka kurumlarla çakışmaz). */
  const VARSAYILAN_KURUM = 'iha-mufredat';

  function syncStatusHtml() {
    const s = Store.local.sync;
    if (Sync.state === 'off') return `<span class="pill">${t('syncOff')}</span>`;
    return `<span class="pill s-${Sync.state}">${t({ on: 'syncOn', busy: 'syncBusy', connecting: 'syncBusy', error: 'syncErr', offline: 'syncOffline' }[Sync.state] || 'syncOff')}</span> ${s.email ? `${t('connectedAs')}: <b>${esc(s.email)}</b> · ` : ''}${t('workspace').split('(')[0]}: <b>${esc(s.workspace)}</b>${Store.local.lastSync ? ` · ${t('lastSync')}: ${new Date(Store.local.lastSync).toLocaleString()}` : ''}${Sync.msg && Sync.state === 'error' ? `<div class="err">${esc(Sync.msg === 'login' ? t('loginNeeded') : Sync.msg)}</div>` : ''}`;
  }
  PAGES.settings = (m, r) => {
    const C = Store.db.config; const I = C.institution; const S = C.scoring; const sy = Store.local.sync;
    const RK = Store.ranks(); const PT = Store.paths(); const progNote = `<span class="pill p-${Store.prog}">${t('program')}: ${t('prog_' + Store.prog)}</span>`;
    const kap = document.createElement('div');
    kap.innerHTML = `
    <div class="card"><h3>${icon('globe')} ${t('language')}</h3><div class="seg wrap">${MODES.map((l) => `<button class="${l === mode() ? 'on' : ''}" data-lang="${l}">${modeName(l)}</button>`).join('')}</div><p class="muted sm">${t('biHint')}</p></div>
    <div class="card"><h3>${t('institution')}</h3><div class="grid2">
      <label class="fl"><span>${t('instName')}</span><input id="instName" value="${esc(I.name)}"></label>
      <label class="fl"><span>${t('defaultInstructor')}</span><input id="instInst" value="${esc(I.instructor)}"></label></div>
      <div class="logorow"><span>${t('instLogo')}</span>${I.logo ? `<img src="${I.logo}" class="logoprev">` : ''}<label class="btn sm">${icon('ul')} ${t('chooseImage')}<input type="file" accept="image/*" id="logoIn" hidden></label>${I.logo ? `<button class="btn sm ghost" id="logoRm">${t('removeImage')}</button>` : ''}</div></div>
    <div class="card"><h3>${t('scoring')}</h3><p class="muted">${t('scoringHelp')}</p><div class="grid2">
      <label class="fl"><span>${t('passPct')}</span><input type="number" min="0" max="100" id="passPct" value="${S.passPct}"></label>
      <label class="fl"><span>${t('passScore')}</span><input type="number" min="0" max="100" id="passScore" value="${S.passScore}"></label></div>
      <label class="chk"><input type="checkbox" id="reqExam" ${S.requireExam ? 'checked' : ''}> ${t('requireExam')}</label></div>
    <div class="card"><h3>${t('ranks')} ${progNote}</h3><p class="muted">${t('rankHelp')}</p><div class="rtable">${RK.map((rk, i) => `<div class="rrow" data-i="${i}"><input type="color" value="${rk.color}" data-f="color"><span class="rbadge" style="--rc:${rk.color}">${esc(tx(rk.name))}</span><button class="ib" data-a="rname" title="${t('edit')}">${icon('edit')}</button><label class="fl in"><span>${t('rankReq')}</span><input data-f="req" value="${esc(rk.req)}" placeholder="0-8, 9|10"></label><label class="fl in sm"><span>${t('rankMin')}</span><input type="number" data-f="minScore" value="${rk.minScore || 0}"></label><button class="ib" data-a="up">${icon('up')}</button><button class="ib" data-a="down">${icon('down')}</button><button class="ib danger" data-a="del">${icon('trash')}</button></div>`).join('')}</div><button class="btn sm" id="addRank">${icon('plus')} ${t('addRank')}</button></div>
    <div class="card"><h3>${t('paths')} ${progNote}</h3><div class="rtable">${PT.map((p, i) => `<div class="rrow" data-p="${i}"><b class="pid">${esc(p.id)}</b><span>${esc(tx(p.name))}</span><button class="ib" data-a="pname">${icon('edit')}</button><label class="fl in"><span>${t('pathLevels')}</span><input data-f="levels" value="${esc(p.levels)}"></label><button class="ib danger" data-a="pdel">${icon('trash')}</button></div>`).join('')}</div><button class="btn sm" id="addPath">${icon('plus')} ${t('addPath')}</button></div>
    <div class="card" id="sync"><h3>${icon('cloud')} ${t('sync')}</h3><p class="muted">${t('syncHelp')}</p><div id="syncStatus" class="syncst">${syncStatusHtml()}</div>
      ${Sync.state === 'off' || Sync.state === 'error' ? `
      <div class="grid3"><label class="fl"><span>${t('workspace')}</span><input id="fbWs" dir="ltr" value="${esc(sy.workspace || VARSAYILAN_KURUM)}"></label><label class="fl"><span>${t('email')}</span><input id="fbEm" type="email" dir="ltr" value="${esc(sy.email || '')}"></label><label class="fl"><span>${t('password')}</span><input id="fbPw" type="password" dir="ltr"></label></div>
      <div class="row"><button class="btn pri" id="fbLogin">${icon('cloud')} ${t('login')}</button><button class="btn ghost" data-go-help="fb">${icon('help')} ${t('fbGuide')}</button></div>
      <p class="muted sm">${t('accountsHint')}</p>
      ${sy.ortakKesildi ? `<p class="err">⚠ ${esc(t('ortakKesildi'))}</p>` : ''}
      <p class="muted sm">${esc(t('kendiHesap'))} <a href="#" id="fbRehber">${esc(t('kendiHesapRehber'))}</a></p>
      <details class="adv" open><summary>${t('advanced')}</summary><label class="fl"><span>${t('fbConfig')}</span><textarea id="fbCfg" rows="5" dir="ltr" placeholder="${esc(t('fbConfigPh'))}">${sy.config && sy.config.projectId !== FB_CONFIG.projectId ? esc(JSON.stringify(sy.config, null, 1)) : ''}</textarea></label><button class="btn sm ghost" id="fbPaste">${icon('copy')} ${t('pasteLink')}</button></details>` : `
      <div class="row"><button class="btn pri" id="fbNow">${icon('cloud')} ${t('syncNow')}</button><button class="btn" id="fbCopy">${icon('copy')} ${t('copyLink')}</button><button class="btn ghost danger" id="fbOut">${t('logout')}</button></div><p class="muted sm">${t('linkHelp')}</p>`}
    </div>
    ${Lan.kartHtml()}
    ${Kurum.uyeKart()}
    ${Kurum.cakismaKart()}
    ${arsivKart()}
    ${Danisman.ayarKartHtml()}
    <div class="card"><h3>${t('backup')}</h3><div class="row"><button class="btn" id="expBtn">${icon('dl')} ${t('exportData')}</button><label class="btn">${icon('ul')} ${t('importData')}<input type="file" accept=".json,application/json" id="impIn" hidden></label>${Platform.kind === 'desktop' ? `<button class="btn ghost" id="bkFolder">${t('openBackupFolder')}</button>` : ''}</div>${Platform.kind === 'desktop' ? `<p class="muted sm">${t('autoBackupInfo')}</p>` : ''}</div>
    ${kisayolKart()}`;
    const m0 = m;
    m = kap;
    { const fr = $('#fbRehber', m); if (fr) fr.onclick = (e) => { e.preventDefault(); try { Platform.openUrl ? Platform.openUrl(FB_REHBER) : window.open(FB_REHBER, '_blank'); } catch (er) { window.open(FB_REHBER, '_blank'); } }; }
    $$('[data-lang]', m).forEach((b) => (b.onclick = () => setLang(b.dataset.lang)));
    const cfgSave = () => Store.touch('config');
    const rkSave = () => Store.touch(Store.ranksPart());
    $('#instName', m).onchange = (e) => { I.name = e.target.value.trim(); cfgSave(); };
    $('#instInst', m).onchange = (e) => { I.instructor = e.target.value.trim(); cfgSave(); };
    $('#logoIn', m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; I.logo = await resizeImage(f, 360); cfgSave(); };
    const lr = $('#logoRm', m); if (lr) lr.onclick = () => { I.logo = ''; cfgSave(); };
    $('#passPct', m).onchange = (e) => { S.passPct = Math.max(0, Math.min(100, +e.target.value || 0)); cfgSave(); };
    $('#passScore', m).onchange = (e) => { S.passScore = Math.max(0, Math.min(100, +e.target.value || 0)); cfgSave(); };
    $('#reqExam', m).onchange = (e) => { S.requireExam = e.target.checked; cfgSave(); };
    $$('.rrow[data-i]', m).forEach((row) => {
      const i = +row.dataset.i; const rk = RK[i];
      $$('[data-f]', row).forEach((inp) => (inp.onchange = () => { rk[inp.dataset.f] = inp.type === 'number' ? +inp.value || 0 : inp.value.trim(); rkSave(); }));
      $$('[data-a]', row).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.a;
        if (a === 'up' && i > 0) { RK.splice(i - 1, 0, RK.splice(i, 1)[0]); rkSave(); }
        if (a === 'down' && i < RK.length - 1) { RK.splice(i + 1, 0, RK.splice(i, 1)[0]); rkSave(); }
        if (a === 'del' && RK.length > 1 && (await confirmDlg(t('confirmDelete')))) { RK.splice(i, 1); rkSave(); }
        if (a === 'rname') editTri(t('rankName'), rk.name, (v) => { rk.name = v; rkSave(); });
      }));
    });
    $('#addRank', m).onclick = () => editTri(t('addRank'), {}, (v) => { RK.push({ id: Store.uid('r'), name: v, req: '', minScore: 0, color: '#90caf9' }); rkSave(); });
    $$('.rrow[data-p]', m).forEach((row) => {
      const p = PT[+row.dataset.p];
      $('[data-f]', row).onchange = (e) => { p.levels = e.target.value.trim(); rkSave(); };
      $('[data-a=pname]', row).onclick = () => editTri(t('path'), p.name, (v) => { p.name = v; rkSave(); });
      $('[data-a=pdel]', row).onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { PT.splice(+row.dataset.p, 1); rkSave(); } };
    });
    $('#addPath', m).onclick = () => editTri(t('addPath'), {}, (v) => { const ids = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const id = [...ids].find((x) => !PT.some((p) => p.id === x)) || Store.uid('p'); PT.push({ id, name: v, levels: '0-8, 12' }); rkSave(); });
    // senkron
    const val = (id) => ($('#' + id, m) || {}).value;
    const doLogin = async (create) => { const b = $('#fbLogin', m); b.disabled = true; try { await Sync.connect({ config: val('fbCfg'), workspace: val('fbWs'), email: val('fbEm').trim(), password: val('fbPw'), create }); toast(t('syncOn')); render(); } catch (e) { console.error(e); toast((e.code || '') + ' ' + (e.message || e), 'err'); Sync.setState('error', e.code || e.message); } b.disabled = false; };
    if ($('#fbLogin', m)) { $('#fbLogin', m).onclick = () => doLogin(false); $('#fbPw', m).onkeydown = (e) => { if (e.key === 'Enter') doLogin(false); };
      $('#fbPaste', m).onclick = () => { const mm = modal(t('pasteLink'), `<textarea id="lnk" rows="4" dir="ltr" class="full"></textarea>`, { okText: t('ok'), onOk: (w) => { const j = Sync.readLink($('#lnk', w).value); if (!j) { toast(t('syncInvalid'), 'err'); return false; } $('#fbCfg', m).value = JSON.stringify(j.c, null, 1); $('#fbWs', m).value = j.w || ''; } }); };
      $('[data-go-help]', m).onclick = () => go('help', { anchor: 'fb' }); }
    if ($('#fbNow', m)) { $('#fbNow', m).onclick = () => { Sync.syncNow(); Files.pushPending(); };
      $('#fbCopy', m).onclick = async () => { const code = Sync.makeLink(); try { await navigator.clipboard.writeText(code); toast(t('linkCopied')); } catch (e) { modal(t('copyLink'), `<textarea rows="5" dir="ltr" class="full" readonly>${esc(code)}</textarea>`); } };
      $('#fbOut', m).onclick = async () => { if (await confirmDlg(t('logout') + '?')) { await Sync.disconnect(); render(); } }; }
    // yedek
    $('#expBtn', m).onclick = async () => { const name = 'IngMufredat_Yedek_' + today() + '.json'; await Platform.saveFile(name, new Blob([JSON.stringify(Store.db, null, 1)], { type: 'application/json' }), 'application/json'); toast(t('exported')); };
    $('#impIn', m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.curriculum || !j.students) throw new Error('JSON?'); if (await confirmDlg(t('importConfirm'))) { Store.replaceDb(j); toast(t('imported')); } } catch (er) { toast(t('error') + ': ' + er.message, 'err'); } };
    const bf = $('#bkFolder', m); if (bf) bf.onclick = () => Platform.openBackupFolder();
    // ortak çekirdek ayarlar ızgarası: Görünüm · uygulama kartları · Asistan · Kullanım · Hata raporu · Hakkında · İletişim (son)
    m0.innerHTML = `<h2 class="ph">${icon('gear')} ${t('settings')}</h2>`;
    const kartlar = [...kap.children];
    kartlar.forEach((k) => k.classList.add('card'));
    UI.ayarIzgara(m0, kartlar);
    m = m0;   // olay işleyicileri kartları artık ızgarada arar
    Lan.kartBagla(m0); Kurum.bagla(m0); arsivBagla(m0); Danisman.ayarBagla(m0);
    if (r.anchor) { const a = $('#' + r.anchor, m0); if (a) setTimeout(() => a.scrollIntoView({ behavior: 'smooth' }), 50); r.anchor = null; }
  };

  /* ---------- Arşiv: silinen öğrenciler ve ders programları (kalıcı silme yok; başka cihazda silinenler de buraya düşer) ---------- */
  function arsivListe() {
    const st = Object.values(Store.db.students || {}).filter((s) => s.deleted).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const pl = Object.values((Store.db.plans || {}).list || {}).filter((p) => p.deleted).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return { st, pl };
  }
  function arsivKart() {
    const { st, pl } = arsivListe();
    const satir = (tur, id, ad, zaman) => `<div class="arsiv-row"><div class="grow"><b dir="auto">${esc(ad || '—')}</b><small class="muted"> · ${esc(t(tur === 's' ? 'nav_students' : 'nav_plans'))} · ${UI.fmtDate(zaman)}</small></div><button class="btn sm" data-arsiv="${tur}:${esc(id)}">${icon('up')} ${t('arsivGeri')}</button></div>`;
    const list = st.slice(0, 60).map((s) => satir('s', s.id, s.name, s.updatedAt)).join('') + pl.slice(0, 60).map((p) => satir('p', p.id, tx(p.title) || p.name || p.id, p.updatedAt)).join('');
    return `<div class="card" id="arsiv"><h3>${icon('archive')} ${t('arsivBaslik')}</h3><p class="muted sm">${t('arsivAciklama')}</p>${list || `<p class="muted">${t('arsivBos')}</p>`}</div>`;
  }
  function arsivBagla(root) {
    $$('[data-arsiv]', root).forEach((b) => (b.onclick = () => {
      const [tur, id] = b.dataset.arsiv.split(':');
      if (tur === 's') { const s = Store.db.students[id]; if (!s) return; s.deleted = false; Store.touch('student:' + id); toast(t('arsivGeriAlindi', { s: s.name || '' })); }
      else { const p = Store.db.plans.list[id]; if (!p) return; p.deleted = false; p.updatedAt = Date.now(); Store.touch('plans'); toast(t('arsivGeriAlindi', { s: tx(p.title) || '' })); }
      render();
    }));
  }

  /* ---------- klavye kısayolları ---------- */
  const NAVK = ['dashboard', 'curriculum', 'students', 'assess', 'plans', 'exams', 'grammar', 'dict', 'vocab'];
  const KEYS = () => [['Ctrl + 1…9', t('krKeyNav')], ['Ctrl + F', t('krKeySearch')], ['Ctrl + J', t('nav_ai')], ['Ctrl + N', t('krKeyNew')], ['Ctrl + P', t('krKeyPrint')], ['Ctrl + ,', t('krKeySet')], ['Ctrl + S', t('krKeySync')], ['F1', t('krKeyHelp')], ['Ctrl + /', t('krKeyList')]];
  function kisayolTablo() { return `<table class="keys">${KEYS().map(([k, d]) => `<tr><td><kbd dir="ltr">${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table>`; }
  function kisayolKart() { return `<div class="card" id="kisayol"><h3>${icon('bolt')} ${t('krKeys')}</h3>${kisayolTablo()}<div class="row"><button class="btn sm ghost" onclick="UI.tanitim(true)">${icon('help')} ${t('krTour')}</button></div></div>`; }
  document.addEventListener('keydown', (e) => {
    if (UI.modals.length) return;
    const ctl = e.ctrlKey || e.metaKey;
    if (e.key === 'F1') { e.preventDefault(); go('help'); return; }
    if (!ctl || e.altKey) return;
    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) { const p = NAVK[+k - 1]; if (p && PAGES[p]) { e.preventDefault(); go(p); } return; }
    if (k === 'j') { e.preventDefault(); go('ai'); return; }
    if (k === 'n' && !e.shiftKey) { e.preventDefault(); UI.editStudent && UI.editStudent(); return; }
    if (k === 'p') { e.preventDefault(); go('print'); return; }
    if (k === ',') { e.preventDefault(); go('settings'); return; }
    if (k === 's') { e.preventDefault(); if (window.Sync && Sync.state !== 'off') { Sync.syncNow(); toast(t('syncBusy')); } else { Store.persistNow(); toast(t('saved')); } return; }
    if (k === '/') { e.preventDefault(); modal(icon('bolt') + ' ' + t('krKeys'), kisayolTablo(), {}); }
  });

  UI.syncStatusHtml = syncStatusHtml;
  UI.kisayolTablo = kisayolTablo;
})();
