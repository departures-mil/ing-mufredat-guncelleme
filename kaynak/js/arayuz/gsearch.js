/* v1.8: Genel arama — üst çubukta kalıcı arama kutusu + Ctrl+F.
   1) Sayfa içinde bul: eşleşmeler işaretlenir, "3 / 17" sayacı; Enter sonraki, Shift+Enter önceki, Esc kapatır.
   2) Uygulama genelinde: üç programın müfredatı, uçuş hattı, öğrenciler, yardım ve ayarlar — sonuca tıklayınca oraya gidilir.
   Büyük/küçük harf, ı/i ve Arapça hareke/elif farkları aramayı etkilemez. */
(function () {
  const { $, $$, esc, icon, tx, go, PAGES } = UI;
  let q = '', marks = [], cur = -1, tmr = null, open = false;

  /* ---------- harf katlama (karakter başına; işaretleme için konum eşlemesi korunur) ---------- */
  const AR_DIAC = /[ً-ٰٟـ]/;
  const foldCh = (c) => {
    if (AR_DIAC.test(c)) return '';
    if ('أإآٱ'.includes(c)) return 'ا';
    if (c === 'ة') return 'ه';
    if (c === 'ى') return 'ي';
    if (c === 'ؤ') return 'و';
    if (c === 'ئ') return 'ي';
    if (c === 'I' || c === 'İ' || c === 'ı') return 'i';
    const l = c.toLocaleLowerCase('tr');
    return l.length === 1 ? l : c.toLowerCase().charAt(0);
  };
  function fold(s) { let out = ''; const map = []; for (let i = 0; i < s.length; i++) { const f = foldCh(s[i]); for (let j = 0; j < f.length; j++) { out += f[j]; map.push(i); } } return { out, map }; }
  const foldStr = (s) => fold(String(s || '')).out;
  const plain = (s) => (window.plainText ? plainText(String(s || '')) : String(s || ''));

  /* ---------- sayfa içinde işaretleme ---------- */
  function clearMarks() {
    const parents = new Set();
    $$('mark.gfind').forEach((m) => { const p = m.parentNode; if (!p) return; p.replaceChild(document.createTextNode(m.textContent), m); parents.add(p); });
    parents.forEach((p) => p.normalize && p.normalize());
    marks = []; cur = -1;
  }
  function highlight(keepIndex) {
    const main = $('#main'); if (!main) return;
    const prevCur = cur;
    clearMarks();
    const fq = foldStr(q).trim(); if (fq.length < 2) { counter(); return; }
    const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
      const p = n.parentElement; if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('script,style,textarea,input,select,option,mark.gfind')) return NodeFilter.FILTER_REJECT;
      return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    const nodes = []; let n; while ((n = tw.nextNode())) nodes.push(n);
    for (const node of nodes) {
      const v = node.nodeValue; const { out, map } = fold(v);
      let idx = out.indexOf(fq); if (idx < 0) continue;
      const parts = []; let last = 0;
      while (idx >= 0) { const s0 = map[idx], e0 = map[idx + fq.length - 1] + 1; if (s0 >= last) { parts.push([s0, e0]); last = e0; } idx = out.indexOf(fq, idx + fq.length); }
      const frag = document.createDocumentFragment(); let pos = 0;
      for (const [a, b] of parts) { if (a > pos) frag.appendChild(document.createTextNode(v.slice(pos, a))); const m = document.createElement('mark'); m.className = 'gfind'; m.textContent = v.slice(a, b); frag.appendChild(m); marks.push(m); pos = b; }
      if (pos < v.length) frag.appendChild(document.createTextNode(v.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    }
    cur = marks.length ? (keepIndex && prevCur >= 0 ? Math.min(prevCur, marks.length - 1) : -1) : -1;
    if (cur >= 0) marks[cur].classList.add('cur');
    counter();
  }
  function step(d) {
    if (!marks.length) { tryLocal(); return; }
    if (cur >= 0 && marks[cur]) marks[cur].classList.remove('cur');
    cur = (cur + d + marks.length) % marks.length;
    const m = marks[cur]; m.classList.add('cur');
    m.scrollIntoView({ block: 'center', behavior: 'smooth' });
    counter();
  }
  function counter() { const c = $('#gsCount'); if (!c) return; const fq = foldStr(q).trim(); c.textContent = fq.length < 2 ? '' : marks.length ? (cur >= 0 ? cur + 1 : 0) + ' / ' + marks.length : '0'; c.classList.toggle('none', fq.length >= 2 && !marks.length); }
  /* Kapalı bölümlerdeki eşleşmeler: sayfanın kendi aramasına aktar (seviyeleri açar) */
  function tryLocal() {
    const loc = $('#cq') || $('#aq') || $('#sq');
    if (loc && q && loc.value !== q) { loc.value = q; loc.dispatchEvent(new Event('input', { bubbles: true })); setTimeout(() => { highlight(); if (marks.length) step(1); $('#gsIn') && $('#gsIn').focus(); }, 120); }
  }

  /* ---------- uygulama genelinde arama ---------- */
  const triAll = (o) => (o && typeof o === 'object' ? [o.tr, o.en, o.ar].filter(Boolean).join(' ') : String(o || ''));
  function globalResults() {
    const fq = foldStr(q).trim(); if (fq.length < 2) return [];
    const hit = (s) => foldStr(s).includes(fq);
    const out = [];
    const push = (g, label, sub, act) => out.push({ g, label, sub, act });
    // Sayfalar
    [['dashboard', 'nav_dashboard'], ['curriculum', 'nav_curriculum'], ['students', 'nav_students'], ['assess', 'nav_assess'], ['print', 'nav_print'], ['settings', 'nav_settings'], ['help', 'nav_help']]
      .forEach(([p, k]) => { if (hit(plain(t(k))) || ['tr', 'en', 'ar'].some((l) => hit(I18N[l][k]))) push('gPages', t(k), '', () => go(p)); });
    // Müfredat (üç program)
    for (const pg of Store.PROGS) {
      const c = Store.cur(pg); const pn = t('prog_' + pg);
      (c.levels || []).forEach((l, i) => {
        if (hit(triAll(l.title)) || hit(triAll(l.goal))) push('gCurr', tx(l.title), pn + ' · ' + t('level') + ' ' + i, () => openCurr(pg, l.title));
        l.modules.forEach((md, mi) => {
          if (hit(triAll(md.title))) push('gCurr', tx(md.title), pn + ' · ' + i + '.' + (mi + 1), () => openCurr(pg, md.title));
          md.items.forEach((it) => { if (hit(triAll(it.text))) push('gCurr', tx(it.text), pn + ' · ' + i + '.' + (mi + 1), () => openCurr(pg, it.text)); });
        });
      });
      (c.flight || []).forEach((f) => { if (hit(f.code + ' ' + triAll(f.content) + ' ' + triAll(f.cond))) push('gFlight', f.code + ' — ' + tx(f.content), pn, () => openFlight(pg)); });
    }
    // Öğrenciler
    Store.students(true).forEach((s) => { if (hit([s.name, s.no, s.phone, ...Object.values(s.nums || {}), s.instructor, s.background].join(' '))) push('gStud', s.name, t('prog_' + Store.progOf(s)) + (s.no ? ' · #' + s.no : ''), () => go('student', { sid: s.id, tab: 'summary' })); });
    // Yardım
    const H = (window.HELP && (HELP[UI.lang()] || HELP.tr)) || '';
    H.split(/<h3/).slice(1).forEach((sec) => { const title = (sec.match(/>([^<]+)<\/h3>/) || [])[1] || ''; const txt = sec.replace(/<[^>]+>/g, ' '); if (hit(txt)) push('gHelp', title, '', () => go('help')); });
    // Ayarlar
    ['language', 'updates', 'institution', 'scoring', 'ranks', 'paths', 'sync', 'ctAdmin', 'backup', 'about', 'templates']
      .forEach((k) => { if (['tr', 'en', 'ar'].some((l) => hit(I18N[l][k]))) push('gSet', t(k), t('nav_settings'), () => go(k === 'templates' ? 'print' : 'settings')); });
    return out.slice(0, 60);
  }
  function openCurr(pg, textObj) { if (pg !== Store.prog) UI.setProgram(pg, true); go('curriculum'); setTimeout(() => { const cq = $('#cq'); const key = q; if (cq) { cq.value = key; cq.dispatchEvent(new Event('input', { bubbles: true })); } setTimeout(() => { highlight(); if (marks.length) step(1); }, 150); }, 60); }
  function openFlight(pg) { if (pg !== Store.prog) UI.setProgram(pg, true); go('curriculum'); setTimeout(() => { const fc = $('#flightCard'); if (fc) fc.scrollIntoView({ block: 'start' }); highlight(); if (marks.length) step(1); }, 120); }

  function drawResults() {
    const box = $('#gsRes'); if (!box) return;
    const fq = foldStr(q).trim();
    if (!open || fq.length < 2) { box.hidden = true; return; }
    const res = globalResults();
    const groups = {}; res.forEach((r) => (groups[r.g] = groups[r.g] || []).push(r));
    box.innerHTML = `<div class="gsr-h">${icon('search')} ${t('gInPage')}: <b>${marks.length}</b> <span class="muted sm">· Enter ↓ · Shift+Enter ↑ · Esc</span></div>` +
      (res.length ? Object.keys(groups).map((g) => `<div class="gsr-g">${t(g)}</div>` + groups[g].slice(0, 12).map((r) => `<button class="gsr-i" data-gi="${res.indexOf(r)}"><span class="gsr-l">${esc(r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</button>`).join('')).join('') : `<div class="gsr-n">${t('gNoRes')}</div>`);
    box.hidden = false;
    $$('[data-gi]', box).forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); const r = res[+b.dataset.gi]; close(false); r.act(); }));
  }
  function close(clear) { open = false; const box = $('#gsRes'); if (box) box.hidden = true; if (clear) { q = ''; const i = $('#gsIn'); if (i) i.value = ''; clearMarks(); counter(); } document.body.classList.remove('gs-open'); }

  function mount() {
    const w = $('#gsWrap'); if (!w) return;
    w.innerHTML = `<button class="ib gs-btn" id="gsBtn" title="${t('gSearchPh')}">${icon('search')}</button><div class="gs-box">${icon('search')}<input id="gsIn" type="search" autocomplete="off" spellcheck="false" placeholder="${t('gSearchPh')}"><span id="gsCount" class="gs-count"></span><button class="ib gs-x" id="gsX" title="Esc">✕</button><div id="gsRes" class="gs-res" hidden></div></div>`;
    const inp = $('#gsIn', w); inp.value = q;
    inp.oninput = () => { q = inp.value; open = true; clearTimeout(tmr); tmr = setTimeout(() => { highlight(); drawResults(); }, 140); };
    inp.onfocus = () => { open = true; drawResults(); };
    inp.onblur = () => setTimeout(() => { open = false; const b = $('#gsRes'); if (b) b.hidden = true; }, 150);
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const b = $('#gsRes'); if (b) b.hidden = true; step(e.shiftKey ? -1 : 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); inp.blur(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); const f = $('#gsRes [data-gi]'); if (f) f.focus(); }
    };
    $('#gsX', w).onmousedown = (e) => { e.preventDefault(); close(true); };
    $('#gsBtn', w).onclick = () => { document.body.classList.add('gs-open'); inp.focus(); };
    counter();
  }
  function focusSearch() { const i = $('#gsIn'); if (!i) return; document.body.classList.add('gs-open'); i.focus(); i.select(); open = true; drawResults(); }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); focusSearch(); }
    else if (e.key === 'F3') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape' && (q || document.body.classList.contains('gs-open')) && !document.querySelector('.modal-wrap')) close(true);
  }, true);
  // sayfa yeniden çizilince işaretleri yenile (konumu korur)
  UI.afterRender.push(() => { if (foldStr(q).trim().length >= 2) highlight(true); });

  window.GSearch = { mount, focus: focusSearch, fold: foldStr };
})();
