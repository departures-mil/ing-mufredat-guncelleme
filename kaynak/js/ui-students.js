/* Öğrenciler, öğrenci kartı, değerlendirme (müfredatın onay kutulu kopyası), yoklama modu, uçuş, ders günlüğü */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, PAGES, go, fmtDate, today } = UI;
  const openA = new Set(JSON.parse(localStorage.getItem('iha_open_assess') || '["l0"]'));
  const saveOpenA = () => { try { localStorage.setItem('iha_open_assess', JSON.stringify([...openA])); } catch (e) {} };
  let filter = 'all', aq = '', showArch = false, sq = '';
  const selS = new Set(); // v2.1: ortak ders programı için seçilen öğrenciler
  let pEdit = false, hideGhost = false; // v1.5: kişiye özel müfredat düzenleme modu / hayaletleri gizle
  const gsw = (on, id) => `<button class="sw sm ${on ? 'on' : ''}" data-gs="${id}" title="${on ? t('ghostOnHint') : t('ghostOffHint')}"><i></i></button>`;
  const statusLbl = { achieved: 'achieved', completed: 'completed', inProgress: 'inProgress', notStarted: 'notStarted' };
  const ring = (pct, color, size) => `<svg class="ring" viewBox="0 0 36 36" style="width:${size || 54}px"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3.2"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="3.2" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25" stroke-linecap="round"/><text x="18" y="21.5" text-anchor="middle">${pct}</text></svg>`;

  /* ---------- liste ---------- */
  PAGES.students = (m) => {
    const list = Store.students(showArch, Store.prog).filter((s) => !sq || (s.name + ' ' + (s.no || '')).toLocaleLowerCase().includes(sq));
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('users')} ${t('students')} <span class="pill p-${Store.prog}">${t('prog_' + Store.prog)}</span></h2><div class="tools"><div class="search">${icon('search')}<input id="sq" placeholder="${t('search')}" value="${esc(sq)}"></div><label class="chk"><input type="checkbox" id="arch" ${showArch ? 'checked' : ''}> ${t('showArchived')}</label><button class="btn" id="mkPlan" ${[...selS].some((id) => list.some((s) => s.id === id)) ? '' : 'disabled'} title="${t('planMakeHint')}">${icon('cal')} ${t('planMake')}${selS.size ? ` (${[...selS].filter((id) => list.some((s) => s.id === id)).length})` : ''}</button><button class="btn pri" id="addS">${icon('plus')} ${t('addStudent')}</button></div></div>
      ${list.length ? `<div class="sgrid">${list.map(card).join('')}</div>` : `<div class="card empty">${icon('users', 'big')}<p>${t('noStudents')}</p></div>`}`;
    $('#sq', m).oninput = (e) => { sq = e.target.value.toLocaleLowerCase(); const p = e.target.selectionStart; UI.keepPos(() => PAGES.students(m)); const n = $('#sq', m); n.focus(); n.setSelectionRange(p, p); };
    $('#arch', m).onchange = (e) => { showArch = e.target.checked; UI.keepPos(() => PAGES.students(m)); };
    $('#addS', m).onclick = () => editStudent();
    $('#mkPlan', m).onclick = () => { const ids = [...selS].filter((id) => list.some((s) => s.id === id)); if (ids.length) { selS.clear(); UI.newPlan(ids); } };
    $$('[data-pick]', m).forEach((c) => (c.onclick = (e) => { e.stopPropagation(); const id = c.dataset.pick; c.checked ? selS.add(id) : selS.delete(id); UI.keepPos(() => PAGES.students(m)); }));
    $$('[data-sid]', m).forEach((c) => (c.onclick = (e) => { if (e.target.closest('[data-pick]')) return; go('student', { sid: c.dataset.sid, tab: 'summary' }); }));
    bindCw(m);
  };
  function card(s) {
    const r = Store.rankOf(s); const hl = Store.highestLevel(s);
    return `<div class="scard ${s.archived ? 'arch' : ''} ${selS.has(s.id) ? 'picked' : ''}" data-sid="${s.id}" style="--rc:${r.rank.color}"><input type="checkbox" class="spick" data-pick="${s.id}" ${selS.has(s.id) ? 'checked' : ''} title="${t('planPickOne')}">${ring(r.score, r.rank.color)}<div class="si"><b>${esc(s.name)}</b><span class="rbadge" style="--rc:${r.rank.color}">${icon('plane')} ${esc(tx(r.rank.name))}</span><small>${t('level')}: ${hl >= 0 ? hl : '—'} · ${t('path')}: ${s.path || '—'}${s.no ? ' · #' + esc(s.no) : ''}</small>${hasCw(s) ? cwBadges(s, 'sm') : ''}</div></div>`;
  }
  /* ---------- v1.5: iletişim yolları (arama / WhatsApp / Telegram / Signal) ---------- */
  const CW = [
    { k: 'call', c: '#f59e0b', l: 'cwCall', svg: '<path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/>' },
    { k: 'wa', c: '#25d366', l: 'cwWa', svg: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.2 7.8c.3 0 .6 0 .8.5l.7 1.6c.1.3 0 .5-.2.7l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.4-.3.7-.2l1.6.7c.4.2.5.5.5.8 0 1-.9 1.9-2 1.9a7 7 0 0 1-6.9-6.9c0-1.1.9-2 1.9-2z" fill="currentColor"/>' },
    { k: 'tg', c: '#2aa3e0', l: 'cwTg', svg: '<path d="M21 4.5 2.8 11.4c-.9.3-.9 1.2 0 1.5l4.5 1.4 1.7 5.3c.2.6.9.7 1.3.3l2.5-2.3 4.6 3.4c.6.4 1.3.1 1.5-.6L22 5.6c.2-.9-.4-1.4-1-1.1zM9.6 14.2l-.3 3.3-1.3-4 9.3-6.2-7.7 6.9z" fill="currentColor"/>' },
    { k: 'sg', c: '#3a76f0', l: 'cwSg', svg: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 1.6"/><path d="M8 12h8M8 9h8M8 15h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
  ];
  const cwIcon = (w) => `<svg viewBox="0 0 24 24" aria-hidden="true">${w.svg}</svg>`;
  const digits = (p) => { let d = String(p || '').replace(/[^\d+]/g, ''); if (d.startsWith('00')) d = d.slice(2); return d.replace(/\D/g, ''); };
  const tgUser = (p) => { const m = String(p || '').trim().match(/^@?([A-Za-z][A-Za-z0-9_]{3,31})$/); return m ? m[1] : ''; };
  const cwUrl = (k, p) => { if (k === 'tg' && tgUser(p)) return 'https://t.me/' + tgUser(p); const d = digits(p); return { call: 'tel:+' + d, wa: 'https://wa.me/' + d, tg: 'https://t.me/+' + d, sg: 'https://signal.me/#p/+' + d }[k]; };
  /* v1.8: her uygulamanın kendi numarası olabilir; boşsa ana telefon numarası kullanılır */
  const cwNum = (s, k) => { const n = (s.nums || {})[k]; return (k !== 'call' && n && String(n).trim()) || s.phone || ''; };
  const hasCw = (s) => !!(s.phone || Object.values(s.nums || {}).some((x) => x && String(x).trim()));
  async function cwOpen(k, phone) {
    if (!digits(phone) && !(k === 'tg' && tgUser(phone))) { UI.toast(t('cwNoPhone'), 'err'); return; }
    if (k === 'call' && Platform.kind !== 'android') {
      try { await navigator.clipboard.writeText(phone); } catch (e) {}
      UI.toast(t('cwCopied') + ': ' + phone); return;
    }
    const u = cwUrl(k, phone);
    if (Platform.kind === 'android' && Platform.openUrl) Platform.openUrl(u); else Files.openLink(u);
  }
  /* Etkin yolları gösteren küçük logolar (dokununca o uygulamada açılır) */
  function cwBadges(s, cls) {
    const c = s.contact || {}; const on = CW.filter((w) => c[w.k] && cwNum(s, w.k));
    if (!on.length) return '';
    return `<span class="cwb ${cls || ''}">${on.map((w) => `<button type="button" class="cwi on" style="--cw:${w.c}" data-cw="${w.k}" data-cws="${s.id}" title="${esc(t(w.l))}: ${esc(cwNum(s, w.k))}">${cwIcon(w)}</button>`).join('')}</span>`;
  }
  function bindCw(root) {
    $$('[data-cw][data-cws]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const s = Store.db.students[b.dataset.cws]; if (s) cwOpen(b.dataset.cw, cwNum(s, b.dataset.cw)); }));
  }
  UI.cwBadges = cwBadges; UI.bindCw = bindCw; UI.hasCw = hasCw;

  function editStudent(s) {
    const isNew = !s; s = s || {};
    let prog = s.program || Store.prog;
    const pathOpts = (p, sel) => `<option value="">${t('noPath')}</option>${Store.paths(p).map((x) => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${x.id} — ${esc(tx(x.name))}</option>`).join('')}`;
    const cst = Object.assign({}, s.contact || {});
    const nums = Object.assign({}, s.nums || {});
    const numRow = (w) => `<label class="cwnum ${cst[w.k] ? '' : 'off'}" data-nk="${w.k}" style="--cw:${w.c}"><span class="cwn-l">${cwIcon(w)}${esc(t(w.l))}</span><input dir="ltr" inputmode="${w.k === 'tg' ? 'text' : 'tel'}" data-num="${w.k}" value="${esc(nums[w.k] || '')}" placeholder="${esc(t(w.k === 'tg' ? 'cwNumPhTg' : 'cwNumPh'))}"></label>`;
    const mm = modal(isNew ? t('addStudent') : t('editStudent'), `<div class="grid2">
      <label class="fl"><span>${t('fullName')} *</span><input id="sn" value="${esc(s.name || '')}"></label>
      <label class="fl"><span>${t('program')} *</span><select id="spr">${Store.PROGS.map((p) => `<option value="${p}" ${p === prog ? 'selected' : ''}>${t('prog_' + p)}</option>`).join('')}</select></label>
      <label class="fl"><span>${t('studentNo')}</span><input id="sno" value="${esc(s.no || '')}"></label>
      <div class="fl"><span>${t('phone')}</span><input id="sph" dir="ltr" inputmode="tel" placeholder="+90 5xx xxx xx xx" value="${esc(s.phone || '')}">
        <div class="cwrow" id="cwr">${CW.map((w) => `<button type="button" class="cwi ${cst[w.k] ? 'on' : ''}" style="--cw:${w.c}" data-k="${w.k}" aria-pressed="${!!cst[w.k]}" title="${esc(t(w.l))} — ${esc(t(cst[w.k] ? 'cwOnHint' : 'cwOffHint'))}">${cwIcon(w)}<small>${esc(t(w.l))}</small></button>`).join('')}</div>
        <small class="cwhint">${t('cwHint')}</small>
        <div class="cwnums" id="cwn"><small class="cwhint">${t('cwNumsHint')}</small>${CW.filter((w) => w.k !== 'call').map(numRow).join('')}</div></div>
      <label class="fl"><span>${t('startDate')}</span><input type="date" id="sst" value="${esc(s.start || today())}"></label>
      <label class="fl"><span>${t('instructor')}</span><input id="sin" value="${esc(s.instructor ?? Store.db.config.institution.instructor ?? '')}"></label>
      <label class="fl"><span>${t('path')}</span><select id="spa">${pathOpts(prog, s.path)}</select></label></div>
      <label class="fl"><span>${t('background')}</span><textarea id="sbg" rows="3">${esc(s.background || '')}</textarea></label>`, { wide: true, onOk: (w) => {
      const name = $('#sn', w).value.trim(); if (!name) { UI.toast(t('required'), 'err'); return false; }
      const d = { name, no: $('#sno', w).value.trim(), phone: $('#sph', w).value.trim(), contact: Object.assign({}, cst), nums: Object.fromEntries($$('[data-num]', w).map((i) => [i.dataset.num, i.value.trim()]).filter((x) => x[1])), program: prog, start: $('#sst', w).value, instructor: $('#sin', w).value.trim(), path: $('#spa', w).value, background: $('#sbg', w).value.trim() };
      if (isNew) { const ns = Store.addStudent(d); setTimeout(() => go('student', { sid: ns.id, tab: 'assess' }), 80); } else { Object.assign(s, d); Store.touch('student:' + s.id); }
      if (prog !== Store.prog) setTimeout(() => UI.ensureProg({ program: prog }), 40);
    } });
    $('#spr', mm.el).onchange = (e) => { prog = e.target.value; $('#spa', mm.el).innerHTML = pathOpts(prog, ''); };
    $$('#cwr .cwi', mm.el).forEach((b) => (b.onclick = () => {
      const k = b.dataset.k; cst[k] = !cst[k];
      b.classList.toggle('on', cst[k]); b.setAttribute('aria-pressed', String(cst[k]));
      const w = CW.find((x) => x.k === k); b.title = t(w.l) + ' — ' + t(cst[k] ? 'cwOnHint' : 'cwOffHint');
      const r = $(`#cwn [data-nk="${k}"]`, mm.el); if (r) { r.classList.toggle('off', !cst[k]); if (cst[k]) $('input', r).focus(); }
    }));
    /* ayrı numara yazılınca o uygulama kendiliğinden açılır */
    $$('#cwn [data-num]', mm.el).forEach((i) => (i.oninput = () => { const k = i.dataset.num; if (i.value.trim() && !cst[k]) { cst[k] = true; const b = $(`#cwr [data-k="${k}"]`, mm.el); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); i.closest('.cwnum').classList.remove('off'); } }));
  }
  UI.editStudent = editStudent;

  /* ---------- öğrenci sayfası ---------- */
  PAGES.student = (m, R) => {
    const s = Store.db.students[R.sid]; if (!s || s.deleted) { go('students'); return; }
    UI.ensureProg(s);
    const r = Store.rankOf(s);
    const tabs = [['summary', 'summary'], ['assess', 'assessment'], ['exams', 'nav_exams'], ['docs', 'stDocs'], ['flight', 'flightTrack'], ['journal', 'journal']]; // v1.1: sınavlar ve belgeler sekmeleri
    m.innerHTML = `<div class="shead" style="--rc:${r.rank.color}"><button class="ib" id="bk">${icon('up', 'rot-l')}</button>${ring(r.score, r.rank.color, 68)}
      <div class="si"><h2>${esc(s.name)}${s.archived ? ` <span class="pill">${t('archived')}</span>` : ''}</h2><span class="rbadge big" style="--rc:${r.rank.color}">${icon('plane')} ${esc(tx(r.rank.name))}</span>${hasCw(s) ? `<div class="sphone">${s.phone ? `<span dir="ltr" class="pnum">${cwIcon(CW[0])}${esc(s.phone)}</span>` : ''}${cwBadges(s)}${CW.filter((w) => w.k !== 'call' && (s.contact || {})[w.k] && (s.nums || {})[w.k] && s.nums[w.k] !== s.phone).map((w) => `<span dir="ltr" class="pnum alt" style="--cw:${w.c}">${cwIcon(w)}${esc(s.nums[w.k])}</span>`).join('')}</div>` : ''}<small>${s.no ? '#' + esc(s.no) + ' · ' : ''}${t('startDate')}: ${fmtDate(s.start)} · ${t('instructor')}: ${esc(s.instructor || '—')} · ${t('path')}: ${s.path || '—'}</small></div>
      <div class="hacts"><button class="btn sm" id="pr">${icon('print')} ${t('printReport')}</button><button class="btn sm" id="ce">${icon('flag')} ${t('printCert')}</button><button class="ib" id="ed" title="${t('edit')}">${icon('edit')}</button><button class="ib" id="ar" title="${s.archived ? t('unarchive') : t('archive')}">${icon('archive')}</button><button class="ib danger" id="dl" title="${t('del')}">${icon('trash')}</button></div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${R.tab === k ? 'on' : ''}" data-tab="${k}">${t(l)}</button>`).join('')}</div><div id="tabBody"></div>`;
    $('#bk', m).onclick = () => go('students'); bindCw(m);
    $('#ed', m).onclick = () => editStudent(s);
    $('#ar', m).onclick = () => { s.archived = !s.archived; Store.touch('student:' + s.id); };
    $('#dl', m).onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { Store.deleteStudent(s.id); go('students'); } };
    $('#pr', m).onclick = () => go('print', { ptype: 'report', psid: s.id });
    $('#ce', m).onclick = () => go('print', { ptype: 'cert', psid: s.id });
    $$('[data-tab]', m).forEach((b) => (b.onclick = () => { R.tab = b.dataset.tab; UI.keepPos(() => PAGES.student(m, R)); }));
    const body = $('#tabBody', m);
    ({ summary, assess: assessView, exams: (b, x) => UI.studentExamsTab(b, x), docs: (b, x) => UI.studentDocsTab(b, x), flight: flightView, journal: journalView }[R.tab] || summary)(body, s);
  };

  function summary(el, s) {
    const r = Store.rankOf(s); const L = Store.levels(); const pl = new Set(Store.pathLevels(s));
    let known = 0, studied = 0; L.forEach((l) => { const x = Store.levelStats(s, l); known += x.known; studied += x.studied; });
    el.innerHTML = `<div class="cols"><div class="card"><h3>${t('currentRank')}</h3><div class="rankbig" style="--rc:${r.rank.color}">${icon('plane')}<div><b>${esc(tx(r.rank.name))}</b><small>${t('overall')}: ${r.score} · ${t('known')}: ${known} · ${t('studied')}: ${studied} · ${t('totalFlight')}: ${Store.flightMinutes(s)} ${t('minShort')}</small></div></div>
      ${r.next ? `<h4>${t('nextNeeds')} — <span class="rbadge" style="--rc:${r.next.rank.color}">${esc(tx(r.next.rank.name))}</span></h4><ul class="needs">${r.next.missing.length ? `<li>${t('missingLevels')}: <b>${r.next.missing.join(', ')}</b></li>` : ''}${!r.next.scoreOk ? `<li>${t('scoreNeeded')}: <b>${r.next.scoreNeeded}</b> (${r.score})</li>` : ''}</ul>` : `<p class="ok">${icon('check')} ${t('maxRank')}</p>`}
      <div class="ladder">${Store.ranks(Store.progOf(s)).map((x, i) => `<span class="rstep ${i <= r.index ? 'on' : ''}" style="--rc:${x.color}">${esc(tx(x.name))}</span>`).join('')}</div>
      ${Store.ghostCount(s) ? `<div class="ghostinfo">${icon('note')} ${t('ghostCount', { n: Store.ghostCount(s) })} <button class="btn sm ghost" id="ghReset">${t('ghostReset')}</button></div>` : ''}
      ${s.background ? `<h4>${t('background')}</h4><p class="pre">${esc(s.background)}</p>` : ''}</div>
      <div class="card"><h3>${t('progress')}</h3><div class="lvprog">${L.map((l, i) => { if (l.off) return ''; const x = Store.levelStats(s, l); const st = Store.levelStatus(s, l); return `<div class="lp ${pl.has(i) ? '' : 'dim'} ${Store.stOff(s, l) ? 'ghost' : ''}" data-open="${l.id}"><span class="lv-no sm">${i}</span><div class="lpt"><span>${esc(tx(l.title))}</span><div class="bar"><i class="st-${st}" style="width:${x.pct}%"></i></div></div><b>%${x.pct}</b><span class="stchip st-${st}">${t(statusLbl[st])}</span></div>`; }).join('')}</div></div></div>`;
    $$('[data-open]', el).forEach((d) => (d.onclick = () => { openA.add(d.dataset.open); saveOpenA(); UI.R.tab = 'assess'; UI.render(); }));
    const gr = $('#ghReset', el); if (gr) gr.onclick = async () => { if (await UI.confirmDlg(t('ghostReset') + '?')) { s.off = {}; Store.touch('student:' + s.id); } };
  }

  /* ---------- değerlendirme ---------- */
  PAGES.assess = (m, R) => {
    const list = Store.students(false, Store.prog);
    const inList = (id) => id && list.some((x) => x.id === id);
    if (!inList(R.asid)) R.asid = inList(Store.local.ui.lastAssess) ? Store.local.ui.lastAssess : (list[0] || {}).id;
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('assess')} ${t('assessment')}</h2><div class="tools"><select id="asel" class="big">${list.length ? list.map((s) => `<option value="${s.id}" ${s.id === R.asid ? 'selected' : ''}>${esc(s.name)}</option>`).join('') : `<option>${t('noStudents')}</option>`}</select><button class="btn sm" id="addS">${icon('plus')} ${t('addStudent')}</button>${R.asid ? `<button class="btn sm" id="openS">${t('summary')}</button>` : ''}</div></div><div id="abody"></div>`;
    $('#asel', m).onchange = (e) => { R.asid = e.target.value; Store.local.ui.lastAssess = R.asid; Store.saveLocal(); UI.keepPos(() => PAGES.assess(m, R)); };
    $('#addS', m).onclick = () => editStudent();
    const os = $('#openS', m); if (os) os.onclick = () => go('student', { sid: R.asid, tab: 'summary' });
    const s = Store.db.students[R.asid];
    if (s) { assessView($('#abody', m), s, true); } else $('#abody', m).innerHTML = `<div class="card empty"><p>${t('noStudents')}</p></div>`;
  };

  function assessView(el, s, showHead) {
    const r = Store.rankOf(s);
    const L = Store.levels();
    if (L.length && !L.some((l) => openA.has(l.id))) { openA.add(L[0].id); saveOpenA(); } // programın ilk seviyesi açık gelsin
    const q = aq.toLocaleLowerCase();
    const mt = (o) => !q || [o.tr, o.en, o.ar].some((x) => (x || '').toLocaleLowerCase().includes(q));
    el.innerHTML = `${showHead ? `<div class="mini-head" style="--rc:${r.rank.color}">${ring(r.score, r.rank.color, 46)}<span class="rbadge big" style="--rc:${r.rank.color}">${icon('plane')} ${esc(tx(r.rank.name))}</span>${r.next ? `<small>${t('nextRank')}: <b>${esc(tx(r.next.rank.name))}</b>${r.next.missing.length ? ' — ' + t('missingLevels') + ': ' + r.next.missing.join(', ') : ''}</small>` : ''}</div>` : ''}
      <div class="atools"><div class="seg">${['all', 'missing', 'done'].map((f) => `<button class="${filter === f ? 'on' : ''}" data-f="${f}">${t({ all: 'filterAll', missing: 'filterMissing', done: 'filterDone' }[f])}</button>`).join('')}</div>
      <div class="search">${icon('search')}<input id="aq" placeholder="${t('search')}" value="${esc(aq)}"></div>
      <span class="legend"><span class="cbx k on"></span>${t('known')} <span class="cbx s on"></span>${t('studied')}</span>
      <button class="btn sm" id="aexp">${t('expandAll')}</button><button class="btn sm" id="acol">${t('collapseAll')}</button>
      <button class="btn sm ${pEdit ? 'pri' : ''}" id="pedit">${icon(pEdit ? 'check' : 'edit')} ${pEdit ? t('ghostDone') : t('ghostEdit')}</button>
      <label class="chk"><input type="checkbox" id="hghost" ${hideGhost ? 'checked' : ''}> ${t('ghostHide')}</label></div>
      ${pEdit ? `<div class="card tip ghosttip">${icon('note')} ${t('ghostHelp')}</div>` : ''}
      <div class="alevels">${L.map((l, i) => {
        if (l.off) return '';
        const lg = Store.stOff(s, l); if (lg && hideGhost && !pEdit) return '';
        const x = Store.levelStats(s, l); const st = Store.levelStatus(s, l); const ev = s.evals[l.id] || {}; const evg = Store.evOff(s, l); const lock = !!ev.locked || lg; const isOpen = openA.has(l.id) || !!q;
        const mods = l.modules.map((md, mi) => {
          if (md.off) return '';
          const mOwn = Store.stOff(s, md); if (mOwn && hideGhost && !pEdit) return '';
          const mg = lg || mOwn;
          const items = Store.actItems(md).filter((it) => !(Store.stOff(s, it) && hideGhost && !pEdit)).filter((it) => { const done = Store.isDone(s, it.id); return (filter === 'all' || (filter === 'missing' ? !done : done)) && (mt(it.text) || mt(md.title)); });
          if (!items.length && (filter !== 'all' || q)) return '';
          const ms = Store.moduleStats(s, md);
          const kState = ms.total && ms.k === ms.total ? 'on' : ms.k ? 'part' : ''; const sState = ms.total && ms.s === ms.total ? 'on' : ms.s ? 'part' : '';
          return `<div class="amd ${mg ? 'ghost' : ''}"><div class="amd-h">${pEdit ? gsw(!mOwn, md.id) : ''}<span class="code">${i}.${mi + 1}</span><b>${esc(tx(md.title))}</b>${Files.count(md) ? `<button class="ib res has" data-rv="m:${md.id}">${icon('clip')}<i>${Files.count(md)}</i></button>` : ''}<span class="sp"></span><span class="mcount">${ms.done}/${ms.total}</span><button class="cbx k ${kState}" data-mk="k" data-mid="${md.id}" ${lock || mg ? 'disabled' : ''} title="${t('known')}"></button><button class="cbx s ${sState}" data-mk="s" data-mid="${md.id}" ${lock || mg ? 'disabled' : ''} title="${t('studied')}"></button></div>
            ${items.map((it) => { const mk = s.marks[it.id] || {}; const iOwn = Store.stOff(s, it); const ig = mg || iOwn; return `<div class="ait ${mk.k || mk.s ? 'done' : ''} ${ig ? 'ghost' : ''}" data-iid="${it.id}">${pEdit ? gsw(!iOwn, it.id) : ''}<span class="it-text">${esc(tx(it.text))}${mk.n ? `<span class="inote">${icon('note')} ${esc(mk.n)}</span>` : ''}</span>${Files.count(it) ? `<button class="ib res has" data-rv="i:${it.id}">${icon('clip')}<i>${Files.count(it)}</i></button>` : ''}${mk.d && (mk.k || mk.s) ? `<small class="idate">${fmtDate(mk.d)}</small>` : ''}<button class="ib nb ${mk.n ? 'has' : ''}" data-note="${it.id}" title="${t('itemNote')}">${icon('note')}</button><button class="cbx k ${mk.k ? 'on' : ''}" data-ik="k" ${lock || ig ? 'disabled' : ''} title="${t('known')}"></button><button class="cbx s ${mk.s ? 'on' : ''}" data-ik="s" ${lock || ig ? 'disabled' : ''} title="${t('studied')}"></button></div>`; }).join('')}</div>`;
        }).join('');
        if (q && !mods) return '';
        return `<div class="alv ${isOpen ? 'open' : ''} st-${st} ${lg ? 'ghost' : ''}" data-lid="${l.id}">
          <div class="alv-h" data-at="${l.id}">${pEdit ? gsw(!lg, l.id) : ''}<span class="lv-no">${i}</span><div class="lpt"><b>${esc(tx(l.title))}</b><div class="bar"><i class="st-${st}" style="width:${x.pct}%"></i></div></div><b class="pc">%${x.pct}</b><span class="stchip st-${st}">${t(statusLbl[st])}</span>${lock ? `<span class="lockic" title="${t('locked')}">${icon('lock')}</span>` : ''}${Files.count(l) ? `<button class="ib res has" data-rv="l:${l.id}">${icon('clip')}<i>${Files.count(l)}</i></button>` : ''}<button class="ib chev">${icon('chev')}</button></div>
          ${isOpen ? `<div class="alv-b">
            ${evg && hideGhost && !pEdit ? '' : `<div class="evalp ${lock ? 'locked' : ''} ${evg ? 'ghost' : ''}"><div class="evt">${pEdit && !lg ? gsw(!evg, 'ev_' + l.id) : ''}${icon('flag')} ${t('levelEval')} <small>${esc(tx(l.goal))}</small>${evg ? `<span class="gtag">${t('ghostTag')}</span>` : ''}</div>
              <div class="evr"><div class="seg sm">${[['pass', 'passed'], ['fail', 'failed'], ['', 'notEvaluated']].map(([v, k]) => `<button class="${(ev.result || '') === v ? 'on ' + (v || 'none') : ''}" data-ev="${v}" ${lock || evg ? 'disabled' : ''}>${t(k)}</button>`).join('')}</div>
              <label class="fl in sm"><span>${t('examScore')}</span><input type="number" min="0" max="100" data-ef="score" value="${ev.score ?? ''}" ${lock || evg ? 'disabled' : ''}></label>
              <label class="fl in"><span>${t('date')}</span><input type="date" data-ef="date" value="${ev.date || ''}" ${lock || evg ? 'disabled' : ''}></label>
              <label class="fl in"><span>${t('evaluator')}</span><input data-ef="by" value="${esc(ev.by || '')}" ${lock || evg ? 'disabled' : ''}></label>
              <label class="fl in grow"><span>${t('note')}</span><input data-ef="note" value="${esc(ev.note || '')}" ${lock || evg ? 'disabled' : ''}></label>
              <button class="btn sm ${lock ? '' : 'pri'}" data-lock ${evg ? 'disabled' : ''}>${icon(lock ? 'unlock' : 'lock')} ${lock ? t('unlock') : t('approve')}</button></div>
              <div class="evr"><button class="btn sm" data-qc ${lock ? 'disabled' : ''}>${icon('bolt')} ${t('quickCheck')}</button><button class="btn sm ghost" data-allk ${lock ? 'disabled' : ''}>${t('markAllKnown')}</button><button class="btn sm ghost" data-clr ${lock ? 'disabled' : ''}>${t('clearAll')}</button></div></div>`}
            ${mods}</div>` : ''}</div>`;
      }).join('')}</div>`;

    const rerender = () => UI.keepPos(() => (showHead ? assessView(el, s, showHead) : UI.render()));
    const commit = (n) => {
      const before = Store.rankOf(s).index;
      Store.touch('student:' + s.id, { silent: true });
      const after = Store.rankOf(s);
      if (after.index !== before) { Store.log('activity_rank', { s: s.name, r: tx(after.rank.name) }); if (after.index > before) UI.toast('✈ ' + t('activity_rank', { s: s.name, r: tx(after.rank.name) })); }
      if (n) { const last = Store.db.activity[0]; if (last && last.key === 'activity_check' && last.params.s === s.name && Date.now() - last.t < 600000) { last.params.n += n; last.t = Date.now(); } else Store.log('activity_check', { s: s.name, n }); }
      rerender();
    };
    const setMark = (id, kind, on) => {
      const mk = s.marks[id] || {};
      if (on) { mk.k = kind === 'k'; mk.s = kind === 's'; mk.d = today(); } else { mk[kind] = false; }
      if (!mk.k && !mk.s && !mk.n) delete s.marks[id]; else s.marks[id] = mk;
    };
    $$('[data-f]', el).forEach((b) => (b.onclick = () => { filter = b.dataset.f; rerender(); }));
    $('#aq', el).oninput = (e) => { aq = e.target.value; const p = e.target.selectionStart; rerender(); const n = $('#aq', el); n.focus(); n.setSelectionRange(p, p); };
    $('#aexp', el).onclick = () => { Store.levels().forEach((l) => openA.add(l.id)); saveOpenA(); rerender(); };
    $('#acol', el).onclick = () => { openA.clear(); saveOpenA(); rerender(); };
    $('#pedit', el).onclick = () => { pEdit = !pEdit; rerender(); };
    $('#hghost', el).onchange = (e) => { hideGhost = e.target.checked; rerender(); };
    $$('[data-gs]', el).forEach((b) => (b.onclick = (e) => {
      e.stopPropagation(); const id = b.dataset.gs;
      const node = id.startsWith('ev_') ? { id } : Store.findLevel(id) || (Store.findModule(id) || {}).module || (Store.findItem(id) || {}).item; if (!node) return;
      const off = !Store.stOff(s, node); Store.setStOff(s, node, off);
      UI.toast(off ? t('ghostDoneT') : t('ghostBackT')); commit(0);
    }));
    $$('[data-at]', el).forEach((h) => (h.onclick = (e) => { if (e.target.closest('[data-rv]') || e.target.closest('[data-gs]')) return; const id = h.dataset.at; openA.has(id) ? openA.delete(id) : openA.add(id); saveOpenA(); rerender(); }));
    $$('[data-rv]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const [k, id] = b.dataset.rv.split(':'); const node = k === 'l' ? Store.findLevel(id) : k === 'm' ? Store.findModule(id).module : Store.findItem(id).item; UI.resourcesModal(node, false, s); }));
    $$('.ait [data-ik]', el).forEach((b) => (b.onclick = () => { const id = b.closest('.ait').dataset.iid; const kind = b.dataset.ik; const on = !b.classList.contains('on'); setMark(id, kind, on); commit(on ? 1 : 0); }));
    $$('[data-mk]', el).forEach((b) => (b.onclick = () => { const md = Store.findModule(b.dataset.mid).module; const kind = b.dataset.mk; const on = !b.classList.contains('on'); let n = 0; Store.actItems(md, s).forEach((it) => { const was = Store.isDone(s, it.id); setMark(it.id, kind, on); if (on && !was) n++; }); commit(n); }));
    $$('[data-note]', el).forEach((b) => (b.onclick = () => { const id = b.dataset.note; const mk = s.marks[id] || {}; const it = Store.findItem(id).item; modal(t('itemNote'), `<p class="muted">${esc(tx(it.text))}</p><textarea id="nt" rows="4" class="full">${esc(mk.n || '')}</textarea>`, { onOk: (w) => { const v = $('#nt', w).value.trim(); const m2 = s.marks[id] || {}; m2.n = v; if (!m2.k && !m2.s && !m2.n) delete s.marks[id]; else s.marks[id] = m2; commit(0); } }); }));
    $$('.alv', el).forEach((box) => {
      const l = Store.findLevel(box.dataset.lid); if (!l) return;
      const ev = (s.evals[l.id] = s.evals[l.id] || {});
      $$('[data-ev]', box).forEach((b) => (b.onclick = () => { ev.result = b.dataset.ev; if (ev.result && !ev.date) ev.date = today(); if (ev.result) Store.log('activity_eval', { s: s.name, l: Store.levelNo(l) }); commit(0); }));
      $$('[data-ef]', box).forEach((inp) => (inp.onchange = () => { ev[inp.dataset.ef] = inp.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value.trim(); if (inp.dataset.ef === 'score' && ev.score !== '' && !ev.result) ev.result = ev.score >= Store.db.config.scoring.passScore ? 'pass' : 'fail'; commit(0); }));
      const lk = $('[data-lock]', box); if (lk) lk.onclick = async () => { if (ev.locked) { if (await confirmDlg(t('unlock') + '?')) { ev.locked = false; commit(0); } } else { ev.locked = true; if (!ev.result) ev.result = 'pass'; if (!ev.date) ev.date = today(); commit(0); } };
      const qc = $('[data-qc]', box); if (qc) qc.onclick = () => quickCheck(s, l, rerender);
      const ak = $('[data-allk]', box); if (ak) ak.onclick = async () => { if (!(await confirmDlg(t('markAllKnown') + '?'))) return; let n = 0; Store.actMods(l, s).forEach((md) => Store.actItems(md, s).forEach((it) => { if (!Store.isDone(s, it.id)) n++; setMark(it.id, 'k', true); })); commit(n); };
      const cl = $('[data-clr]', box); if (cl) cl.onclick = async () => { if (!(await confirmDlg(t('clearAll') + '?'))) return; Store.actMods(l, s).forEach((md) => Store.actItems(md, s).forEach((it) => { const mk = s.marks[it.id]; if (mk) { if (mk.n) { mk.k = mk.s = false; } else delete s.marks[it.id]; } })); commit(0); };
    });
  }

  /* ---------- yoklama modu ---------- */
  function quickCheck(s, l, after) {
    const items = []; l.modules.forEach((md, mi) => { if (md.off || Store.stOff(s, md)) return; Store.actItems(md, s).forEach((it) => { if (!Store.isDone(s, it.id)) items.push({ md, mi, it }); }); });
    let i = 0, n = 0;
    const mm = modal(icon('bolt') + ' ' + t('quickCheck') + ' — ' + t('level') + ' ' + Store.levelNo(l), '', { wide: true, foot: '', onClose: () => after() });
    const show = () => {
      const b = $('.mb', mm.el);
      if (i >= items.length) { b.innerHTML = `<div class="qc done">${icon('check', 'big')}<p>${t('finished')}</p><button class="btn pri" id="qcx">${t('close')}</button></div>`; $('#qcx', b).onclick = mm.close; return; }
      const { md, mi, it } = items[i];
      b.innerHTML = `<p class="muted sm">${t('quickCheckHelp')}</p><div class="qc"><div class="qcp">${i + 1} / ${items.length}</div><div class="bar"><i style="width:${(i / items.length) * 100}%"></i></div>
        <div class="qcm">${Store.levelNo(l)}.${mi + 1} ${esc(tx(md.title))}</div><div class="qci">${esc(tx(it.text))}</div>
        ${Files.count(it) || Files.count(md) ? `<button class="btn sm ghost" id="qcr">${icon('clip')} ${t('resources')}</button>` : ''}
        <div class="qcb"><button class="btn big ok" data-k="k">1 · ${t('known')}</button><button class="btn big blue" data-k="s">2 · ${t('studied')}</button><button class="btn big ghost" data-k="">3 · ${t('later')}</button></div>
        ${i > 0 ? `<button class="btn sm ghost" id="qcb">${t('back')}</button>` : ''}</div>`;
      $$('[data-k]', b).forEach((x) => (x.onclick = () => answer(x.dataset.k)));
      const rb = $('#qcr', b); if (rb) rb.onclick = () => UI.resourcesModal(Files.count(it) ? it : md, false);
      const bb = $('#qcb', b); if (bb) bb.onclick = () => { i--; show(); };
    };
    const answer = (k) => {
      const { it } = items[i];
      if (k) { const mk = s.marks[it.id] || {}; mk.k = k === 'k'; mk.s = k === 's'; mk.d = today(); s.marks[it.id] = mk; n++; Store.touch('student:' + s.id, { silent: true }); }
      i++; show();
    };
    const key = (e) => { if (!document.body.contains(mm.el)) { document.removeEventListener('keydown', key); return; } if (e.key === '1') answer('k'); if (e.key === '2') answer('s'); if (e.key === '3') answer(''); };
    document.addEventListener('keydown', key);
    show();
    if (n) Store.log('activity_check', { s: s.name, n });
  }

  /* ---------- uçuş ---------- */
  function flightView(el, s) {
    const F = (Store.cur(Store.progOf(s)).flight || []).filter((f) => !f.off);
    const FA = Store.flightAct(s);
    el.innerHTML = `<div class="atools"><button class="btn sm ${pEdit ? 'pri' : ''}" id="pedit">${icon(pEdit ? 'check' : 'edit')} ${pEdit ? t('ghostDone') : t('ghostEdit')}</button>
      <label class="chk"><input type="checkbox" id="hghost" ${hideGhost ? 'checked' : ''}> ${t('ghostHide')}</label></div>
      ${pEdit ? `<div class="card tip ghosttip">${icon('note')} ${t('ghostHelpF')}</div>` : ''}
      <div class="card"><h3>${icon('plane')} ${t('flightTrack')}</h3><div class="tbl"><table class="t"><thead><tr>${pEdit ? '<th></th>' : ''}<th>${t('flightStage')}</th><th>${t('parallelLevel')}</th><th>${t('content')}</th><th>${t('passCond')}</th><th>${t('passed')}</th><th>${t('date')}</th><th>${t('note')}</th></tr></thead><tbody>
      ${F.map((f) => { const r = s.flight[f.id] || {}; const g = Store.stOff(s, f); if (g && hideGhost && !pEdit) return ''; const d = g ? 'disabled' : ''; return `<tr data-f="${f.id}" class="${g ? 'ghost' : ''}">${pEdit ? `<td class="gcell">${gsw(!g, f.id)}</td>` : ''}<td><b>${esc(f.code)}</b>${g ? ` <span class="gtag">${t('ghostTag')}</span>` : ''}</td><td>${esc(f.level)}</td><td>${esc(tx(f.content))}</td><td>${esc(tx(f.cond))}</td><td><button class="cbx k ${r.passed ? 'on' : ''}" data-p ${d}></button></td><td><input type="date" data-d value="${r.date || ''}" ${d}></td><td><input data-n value="${esc(r.note || '')}" ${d}></td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="card"><div class="ph-row"><h3>${t('flightLog')} — ${t('totalFlight')}: ${Store.flightMinutes(s)} ${t('minShort')}</h3></div>
      <div class="addlog"><input type="date" id="fd" value="${today()}"><select id="fs">${FA.map((f) => `<option>${esc(f.code)}</option>`).join('')}</select><input type="number" id="fm" placeholder="${t('minutes')}" min="1"><input id="fp" placeholder="${t('platform')}"><input id="fn" placeholder="${t('note')}"><button class="btn sm pri" id="fa">${icon('plus')} ${t('addFlight')}</button></div>
      <div class="tbl"><table class="t"><thead><tr><th>${t('date')}</th><th>${t('flightStage')}</th><th>${t('minutes')}</th><th>${t('platform')}</th><th>${t('note')}</th><th></th></tr></thead><tbody>${(s.flightLog || []).map((f, i) => `<tr><td>${fmtDate(f.date)}</td><td>${esc(f.stage)}</td><td>${f.minutes}</td><td>${esc(f.platform)}</td><td>${esc(f.note)}</td><td><button class="ib danger" data-del="${i}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div></div>`;
    const save = () => Store.touch('student:' + s.id);
    const rr = () => UI.keepPos(() => UI.render());
    $('#pedit', el).onclick = () => { pEdit = !pEdit; rr(); };
    $('#hghost', el).onchange = (e) => { hideGhost = e.target.checked; rr(); };
    $$('[data-gs]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const f = F.find((x) => x.id === b.dataset.gs); if (!f) return; const off = !Store.stOff(s, f); Store.setStOff(s, f, off); UI.toast(off ? t('ghostDoneT') : t('ghostBackT')); save(); }));
    $$('tr[data-f]', el).forEach((tr) => { const id = tr.dataset.f; const r = () => (s.flight[id] = s.flight[id] || {});
      $('[data-p]', tr).onclick = () => { const x = r(); x.passed = !x.passed; if (x.passed && !x.date) x.date = today(); save(); };
      $('[data-d]', tr).onchange = (e) => { r().date = e.target.value; save(); };
      $('[data-n]', tr).onchange = (e) => { r().note = e.target.value.trim(); save(); }; });
    $('#fa', el).onclick = () => { const mnt = +$('#fm', el).value; if (!mnt) { UI.toast(t('required'), 'err'); return; } s.flightLog.unshift({ date: $('#fd', el).value, stage: $('#fs', el).value, minutes: mnt, platform: $('#fp', el).value.trim(), note: $('#fn', el).value.trim() }); save(); };
    $$('[data-del]', el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { s.flightLog.splice(+b.dataset.del, 1); save(); } }));
  }

  /* v2.1: ortak dersten gelen günlük kaydı her zaman seçili dilde */
  const planJ = (j) => { const p = Store.plan(j.plan.pid); const l = p && p.lessons.find((x) => x.id === j.plan.lid); const lt = p && l ? UI.planLessonTitle(p, l) : ''; return t('planJournal', { n: j.plan.n, p: p ? plainText(UI.planName(p)) : j.text }) + (lt ? ' — ' + lt : ''); };
  /* ---------- ders günlüğü ---------- */
  function journalView(el, s) {
    el.innerHTML = `<div class="card"><h3>${t('journal')}</h3><div class="addlog"><input type="date" id="jd" value="${today()}"><input type="number" id="jm" placeholder="${t('minutes')}"><input id="jt" class="grow" placeholder="${t('topicsCovered')}"><button class="btn sm pri" id="ja">${icon('plus')} ${t('addJournal')}</button></div>
      <div class="journal">${(s.journal || []).map((j, i) => `<div class="jrow"><b>${fmtDate(j.date)}</b>${j.minutes ? `<span class="pill">${j.minutes} ${t('minShort')}</span>` : ''}<span class="grow">${esc(j.plan ? planJ(j) : j.text)}</span><button class="ib danger" data-del="${i}">${icon('trash')}</button></div>`).join('') || `<p class="muted">${t('noActivity')}</p>`}</div></div>`;
    $('#ja', el).onclick = () => { const tx2 = $('#jt', el).value.trim(); if (!tx2) { UI.toast(t('required'), 'err'); return; } s.journal.unshift({ date: $('#jd', el).value, minutes: +$('#jm', el).value || 0, text: tx2 }); Store.touch('student:' + s.id); };
    $$('[data-del]', el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { s.journal.splice(+b.dataset.del, 1); Store.touch('student:' + s.id); } }));
  }
})();
