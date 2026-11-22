/* v1.1: Sözlük (OALD tarzı) — İngilizce tanım, İngiliz / Amerikan fonetik yazımı ve sesli okuma, CEFR seviyesi (A1–C2),
   Oxford 3000 / 5000 anahtar kelime işareti, Türkçe ve Arapça karşılık. Tüm kayıtlar düzenlenebilir, eklenebilir, silinebilir.
   Tanımlar özgündür; ayrıntı için kelimenin Oxford Learner's Dictionaries sayfası tek dokunuşla açılır. */
(function () {
  const { $, $$, esc, icon, modal, confirmDlg, PAGES, go } = UI;
  const D = () => Store.db.dict;
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const st = { q: '', lv: '', ox: '', letter: '', n: 120 };
  const save = () => Store.touch('dict');
  const oxUrl = (w) => 'https://www.oxfordlearnersdictionaries.com/definition/english/' + encodeURIComponent(String(w).toLowerCase().trim().replace(/\s+/g, '-'));
  const trLangs = () => { const a = [UI.lang(), UI.lang2()].filter((l) => l && l !== 'en'); if (Store.local.ui.dictAll) return ['tr', 'ar']; return [...new Set(a)]; };
  const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'determiner', 'conjunction', 'exclamation', 'modal verb', 'phrasal verb', 'number'];

  function filtered() {
    const q = st.q.trim().toLowerCase();
    return D().list.filter((e) => (!st.lv || e.lvl === st.lv) && (!st.ox || e.ox === st.ox) && (!st.letter || e.w.toLowerCase().startsWith(st.letter)) &&
      (!q || e.w.toLowerCase().includes(q) || (e.tr || '').toLowerCase().includes(q) || (e.ar || '').includes(q) || (e.def || '').toLowerCase().includes(q)))
      .sort((a, b) => a.w.localeCompare(b.w, 'en', { sensitivity: 'base' }) || (a.pos || '').localeCompare(b.pos || ''));
  }
  const oxBadge = (e) => (e.ox ? `<span class="oxk ox${e.ox}" title="${t('oxList', { n: e.ox })}">🔑 ${e.ox}</span>` : '');
  const lvBadge = (e) => (e.lvl ? `<span class="lvb lv-${e.lvl}">${e.lvl}</span>` : '');

  PAGES.dict = (m) => {
    if (!D()) { m.innerHTML = `<div class="card empty">${t('dictMissing')}</div>`; return; }
    const L = filtered(); const all = D().list;
    const cnt = {}; all.forEach((e) => (cnt[e.lvl] = (cnt[e.lvl] || 0) + 1));
    const langs = trLangs();
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('dict')} ${t('nav_dict')}</h2><div class="tools"><button class="btn sm" id="dpr">${icon('print')} ${t('print')}</button><label class="btn" title="${esc(t('ocrHelp'))}">📷 ${t('ocrBtn')}<input type="file" accept="image/*" id="docr" hidden></label><button class="btn pri" id="dadd">${icon('plus')} ${t('addWord')}</button></div></div>
      <p class="muted sm">${t('dictHelp')}</p>
      <div class="dstats">${LV.map((l) => `<span class="lvb lv-${l}">${l}</span><b>${cnt[l] || 0}</b>`).join(' ')} · ${t('total')}: <b>${all.length}</b></div>
      <div class="atools"><div class="search">${icon('search')}<input id="dq" placeholder="${t('dictSearch')}" value="${esc(st.q)}"></div>
        <div class="seg sm">${[''].concat(LV).map((l) => `<button class="${st.lv === l ? 'on' : ''}" data-lv="${l}">${l || t('filterAll')}</button>`).join('')}</div>
        <div class="seg sm">${[['', 'filterAll'], ['3000', 'ox3000'], ['5000', 'ox5000']].map(([k, l]) => `<button class="${st.ox === k ? 'on' : ''}" data-ox="${k}">${t(l)}</button>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="dall" ${Store.local.ui.dictAll ? 'checked' : ''}> ${t('dictAllTr')}</label></div>
      <div class="azbar">${['', ...'abcdefghijklmnopqrstuvwxyz'].map((c) => `<button class="${st.letter === c ? 'on' : ''}" data-az="${c}">${c ? c.toUpperCase() : '★'}</button>`).join('')}</div>
      <div class="dlist">${L.slice(0, st.n).map((e) => `<div class="dent" data-id="${e.id}"><div class="dhw"><b dir="ltr" lang="en">${esc(e.w)}</b> <i dir="ltr">${esc(e.pos || '')}</i> ${lvBadge(e)} ${oxBadge(e)}</div>
        <div class="dph" dir="ltr">${e.ipa ? `<span>BrE <span class="ipa">/${esc(e.ipa)}/</span><button class="ib sm" data-say="gb">${icon('speak')}</button></span>` : ''}${e.ipaUS && e.ipaUS !== e.ipa ? `<span>NAmE <span class="ipa">/${esc(e.ipaUS)}/</span><button class="ib sm" data-say="us">${icon('speak')}</button></span>` : e.ipa ? `<span>NAmE<button class="ib sm" data-say="us">${icon('speak')}</button></span>` : ''}</div>
        <div class="ddef" dir="ltr" lang="en">${esc(e.def || '')}${e.ex ? `<div class="dex">${esc(e.ex)}</div>` : ''}</div>
        ${langs.map((l) => (e[l] ? `<div class="dtr" dir="${l === 'ar' ? 'rtl' : 'ltr'}" lang="${l}"><small>${t('langName_' + l)}</small> ${esc(e[l])}</div>` : '')).join('')}</div>`).join('') || `<div class="card empty">${t('noResults')}</div>`}</div>
      ${L.length > st.n ? `<button class="btn" id="dmore">${t('showMore', { n: L.length - st.n })}</button>` : ''}`;
    const rer = () => UI.keepPos(() => PAGES.dict(m));
    $('#dq', m).oninput = (e) => { st.q = e.target.value; st.n = 120; const p = e.target.selectionStart; PAGES.dict(m); const n = $('#dq', m); n.focus(); n.setSelectionRange(p, p); };
    $$('[data-lv]', m).forEach((b) => (b.onclick = () => { st.lv = b.dataset.lv; st.n = 120; rer(); }));
    $$('[data-ox]', m).forEach((b) => (b.onclick = () => { st.ox = b.dataset.ox; st.n = 120; rer(); }));
    $$('[data-az]', m).forEach((b) => (b.onclick = () => { st.letter = b.dataset.az; st.n = 120; rer(); }));
    $('#dall', m).onchange = (e) => { Store.local.ui.dictAll = e.target.checked; Store.saveLocal(); rer(); };
    $('#dadd', m).onclick = () => editWord(null);
    $('#docr', m).onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fromPhoto(f); };
    if (!m.dataset.paste) { m.dataset.paste = '1'; document.addEventListener('paste', (e) => { if (!document.body.contains(m) || UI.modals.length || !$('#docr', m)) return; const it = [...((e.clipboardData || {}).items || [])].find((x) => x.type.startsWith('image/')); if (it) { e.preventDefault(); fromPhoto(it.getAsFile()); } }); }
    $('#dpr', m).onclick = () => go('print', { ptype: 'dict' });
    const mo = $('#dmore', m); if (mo) mo.onclick = () => { st.n += 300; rer(); };
    $$('.dent', m).forEach((row) => {
      const e = D().list.find((x) => x.id === row.dataset.id);
      row.onclick = (ev) => { if (ev.target.closest('[data-say]')) return; entryModal(e); };
      $$('[data-say]', row).forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); UI.say(e.w, b.dataset.say); }));
    });
  };

  function entryModal(e) {
    const mm = modal(icon('dict') + ' ' + esc(e.w), `<div class="dcard"><div class="dhw big"><b dir="ltr" lang="en">${esc(e.w)}</b> <i dir="ltr">${esc(e.pos || '')}</i> ${lvBadge(e)} ${oxBadge(e)}</div>
      <div class="dph big" dir="ltr">${e.ipa ? `<span>BrE <span class="ipa">/${esc(e.ipa)}/</span><button class="ib" data-say="gb">${icon('speak')}</button></span>` : ''}<span>NAmE <span class="ipa">/${esc(e.ipaUS || e.ipa || '')}/</span><button class="ib" data-say="us">${icon('speak')}</button></span></div>
      <h4>${t('enDef')}</h4><p dir="ltr" lang="en">${esc(e.def || '')}</p>${e.ex ? `<p class="dex" dir="ltr" lang="en">${esc(e.ex)}</p>` : ''}
      ${trLangs().map((l) => (e[l] ? `<h4>${t('langName_' + l)}</h4><p dir="${l === 'ar' ? 'rtl' : 'ltr'}" lang="${l}">${esc(e[l])}</p>` : '')).join('')}
      <p class="muted sm">${e.ox ? t('oxList', { n: e.ox }) + ' · ' : ''}CEFR ${esc(e.lvl || '—')}</p></div>`, { wide: true,
      foot: `<button class="btn" id="eox">${icon('globe')} ${t('openOxford')}</button><button class="btn" id="eed">${icon('edit')} ${t('edit')}</button><button class="btn ghost danger" id="edl">${icon('trash')} ${t('del')}</button>` });
    $$('[data-say]', mm.el).forEach((b) => (b.onclick = () => UI.say(e.w, b.dataset.say)));
    $('#eox', mm.el).onclick = () => Files.openLink(oxUrl(e.w));
    $('#eed', mm.el).onclick = () => { mm.close(); editWord(e); };
    $('#edl', mm.el).onclick = async () => { if (!(await confirmDlg(t('confirmDelete')))) return; const L = D().list; L.splice(L.indexOf(e), 1); D().removed = (D().removed || []).concat([e.id]); mm.close(); save(); };
  }

  function editWord(e, pre, img) {
    const isNew = !e; e = e || { w: '', pos: 'noun', ipa: '', ipaUS: '', lvl: 'A1', ox: '', def: '', ex: '', tr: '', ar: '' };
    const src = pre ? Object.assign({}, e, pre) : e; // v1.2: fotoğraftan okunan değerler forma yerleşir; Kaydet'e basılınca kayda geçer
    const f = (k, label, o) => `<label class="fl ${o && o.cls ? o.cls : ''}"><span>${label}</span>${o && o.area ? `<textarea rows="2" data-k="${k}" dir="${o.dir || 'ltr'}">${esc(src[k] || '')}</textarea>` : `<input data-k="${k}" dir="${(o && o.dir) || 'ltr'}" value="${esc(src[k] || '')}">`}</label>`;
    const mm = modal(isNew ? t('addWord') : t('edit'), `<div class="grid3">${f('w', t('dWord'))}<label class="fl"><span>${t('dPos')}</span><input data-k="pos" list="posl" dir="ltr" value="${esc(src.pos || '')}"><datalist id="posl">${POS.map((p) => `<option value="${p}">`).join('')}</datalist></label>
      <label class="fl"><span>CEFR</span><select data-k="lvl">${LV.map((l) => `<option ${src.lvl === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${f('ipa', t('ipaUK'))}${f('ipaUS', t('ipaUS'))}<label class="fl"><span>Oxford</span><select data-k="ox"><option value="">—</option><option value="3000" ${src.ox === '3000' ? 'selected' : ''}>${t('ox3000')}</option><option value="5000" ${src.ox === '5000' ? 'selected' : ''}>${t('ox5000')}</option></select></label></div>
      ${f('def', t('enDef'), { area: true })}${f('ex', t('dExample'))}<div class="grid2">${f('tr', t('langName_tr'), { dir: 'ltr' })}${f('ar', t('langName_ar'), { dir: 'rtl' })}</div>
      ${img ? `<div class="ocrbox"><img src="${img}" alt=""><div><p class="ok sm">${t('ocrFilled')}</p><label class="chk"><input type="checkbox" id="wvt" ${Store.db.vocab ? 'checked' : 'disabled'}> ${t('ocrToVocab')}</label></div></div>` : ''}<p class="muted sm">${t('ipaHelp')} <button class="btn sm ghost" id="wox">${icon('globe')} ${t('openOxford')}</button></p>`, { wide: true, onOk: (w) => {
      const v = {}; $$('[data-k]', w).forEach((i) => (v[i.dataset.k] = i.value.trim().replace(/^\/|\/$/g, '')));
      if (!v.w) { UI.toast(t('required'), 'err'); return false; }
      Object.assign(e, v); if (isNew) { e.id = Store.uid('w'); D().list.push(e); }
      const vt = $('#wvt', w); if (vt && vt.checked) UI.vocabAdd({ term: e.w, tr: e.tr || '', ar: e.ar || '', pron: e.ipa ? '/' + e.ipa + '/' : '' });
      save();
    } });
    $('#wox', mm.el).onclick = () => { const w = $('[data-k=w]', mm.el).value.trim(); if (w) Files.openLink(oxUrl(w)); };
  }

  /* ---------- v1.2: fotoğraftan kelime bilgisi (OALD ekran görüntüsü) ---------- */
  async function fromPhoto(file) {
    if (!window.OCR || !OCR.available()) { toast(t('ocrNone'), 'err'); return; }
    const img = await UI.resizeImage(file, 900).catch(() => '');
    const mm = modal('📷 ' + t('ocrBtn'), `<p id="ocrSt">${t('ocrReading', { p: 0 })}</p><div class="bar"><i id="ocrBar" style="width:0%"></i></div>`, { foot: false, sticky: true });
    let r;
    try { r = await OCR.read(file, (p) => { const s = $('#ocrSt', mm.el), b = $('#ocrBar', mm.el); if (s) s.textContent = t('ocrReading', { p }); if (b) b.style.width = p + '%'; }); }
    catch (er) { console.error(er); mm.close(); toast(t('ocrFail') + ': ' + (er.message || er), 'err'); return; }
    mm.close();
    if (!r.w) { modal('📷 ' + t('ocrBtn'), `<p class="err">${t('ocrNoWord')}</p><textarea rows="10" readonly dir="ltr" style="width:100%">${esc(r.raw || '')}</textarea>`, {}); return; }
    const pre = {}; ['w', 'pos', 'ipa', 'ipaUS', 'lvl', 'ox', 'def', 'ex'].forEach((k) => { if (r[k]) pre[k] = r[k]; });
    const same = D().list.find((x) => x.w.toLowerCase() === r.w && (!r.pos || (x.pos || '') === r.pos)) || D().list.find((x) => x.w.toLowerCase() === r.w);
    if (same && same.pos && r.pos && same.pos !== r.pos) { editWord(null, pre, img); return; }
    editWord(same || null, pre, img);
  }

  /* ---------- çıktı: kelime listesi ---------- */
  DocModel.B.dict = function (o) {
    const c = DocModel.ctx(o); const lv = o.dictLvl || '';
    const list = D().list.filter((e) => !lv || e.lvl === lv).sort((a, b) => a.w.localeCompare(b.w, 'en', { sensitivity: 'base' }));
    const L = c.lang === 'en' ? c.lang2 : c.lang;
    const cols = [{ label: c.L('dWord'), w: 20 }, { label: c.L('ipaUK'), w: 17 }, { label: c.L('enDef'), w: L ? 38 : 55 }].concat(L ? [{ label: c.L('langName_' + L), w: 17 }] : []).concat([{ label: 'CEFR', w: 8, align: 'c' }]);
    return { title: c.L('nav_dict') + (lv ? ' — ' + lv : ''), lang: c.lang, blocks: [DocModel.header(c, c.L('nav_dict') + (lv ? ' — ' + lv : ''), list.length + ' · Oxford 3000 / 5000'),
      { t: 'table', cols, rows: list.map((e) => ({ type: 'row', cells: [{ text: e.w, bold: true, sub: e.pos }, { text: e.ipa ? '/' + e.ipa + '/' : '', small: true }, { text: e.def || '', sub: e.ex || '', small: true }].concat(L ? [{ text: e[L] || '' }] : []).concat([{ text: e.lvl + (e.ox ? ' · ' + e.ox : ''), small: true }]) })) }] };
  };
})();
