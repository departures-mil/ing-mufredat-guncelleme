/* v1.2: Kelime Testi — Sınav Hazırlama Sistemi 1.6.9'daki Kelime Testi bölümünün taşınmış hali.
   İngilizce sütunu sabit; Türkçe ve Arapça sütunları ayrı ayrı açılıp kapanır (en az biri açık kalır, kapalı sütunun verisi silinmez).
   Her kelimenin aç/kapa anahtarı, ✈ havacılık işareti, 🔑 Oxford 3000 işareti ve CEFR seviyesi (elle değiştirilebilir) vardır.
   Kapalı kelimeler çıktıya ve puana girmez. İçe / dışa aktarma: JSON, CSV ve .sinav dosyası. Yalnız elle verilen değerler saklanır. */
(function () {
  const { $, $$, esc, icon, modal, confirmDlg, PAGES, go } = UI;
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const V = () => Store.db.vocab;
  const view = { sort: 'list', filter: 'all', q: '', levels: new Set([...LEVELS, '-']) };
  const isArabic = (s) => /[؀-ۿ]/.test(s || '');
  const title = () => (V() && V().title) || t('vtDefTitle');

  const autoAv = (it) => !!(window.isAviationTerm && window.isAviationTerm(it.term));
  const avOf = (it) => (typeof it.av === 'boolean' ? it.av : autoAv(it));
  const oxOf = (it) => (window.oxfordLevel ? window.oxfordLevel(it.term) : null);
  const lvlOf = (it) => (it.lvl ? (it.lvl === '-' ? null : it.lvl) : (oxOf(it) || {}).lvl || null);
  const lvlIndex = (it) => { const l = lvlOf(it); return l ? LEVELS.indexOf(l) : 99; };

  function normItem(x) {
    const it = { id: x.id || Store.uid('w'), term: String(x.term || '').trim(), tr: String(x.tr || '').trim(), ar: String(x.ar ?? '').trim(), pron: String(x.pron || '').trim() };
    if (x.off) it.off = true;
    if (typeof x.av === 'boolean') { if (x.av !== autoAv(it)) it.av = x.av; } else if (typeof x.aviation === 'boolean' && x.aviation !== autoAv(it)) it.av = x.aviation;
    if (x.lvl && (LEVELS.includes(x.lvl) || x.lvl === '-')) it.lvl = x.lvl;
    else if ('cefr' in x && (x.cefr || null) !== ((oxOf(it) || {}).lvl || null)) it.lvl = LEVELS.includes(x.cefr) ? x.cefr : '-';
    return it;
  }
  function dedupe(items) {
    const seen = new Set();
    return items.filter((it) => { const k = it.term.toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  }

  function visible() {
    const q = view.q.trim().toLocaleLowerCase('tr');
    let list = V().items.map((it, i) => ({ it, i }));
    list = list.filter(({ it }) => {
      if (view.filter === 'av' && !avOf(it)) return false;
      if (view.filter === 'noav' && avOf(it)) return false;
      if (view.filter === 'on' && it.off) return false;
      if (view.filter === 'off' && !it.off) return false;
      if (!view.levels.has(lvlOf(it) || '-')) return false;
      if (q && ![it.term, it.tr, it.ar].some((s) => (s || '').toLocaleLowerCase('tr').includes(q))) return false;
      return true;
    });
    const az = (a, b) => a.it.term.localeCompare(b.it.term, 'en', { sensitivity: 'base' });
    if (view.sort === 'cefr') list.sort((a, b) => lvlIndex(a.it) - lvlIndex(b.it) || az(a, b));
    if (view.sort === 'cefrDesc') list.sort((a, b) => { const x = lvlIndex(a.it), y = lvlIndex(b.it); return (x === 99) - (y === 99) || y - x || az(a, b); });
    if (view.sort === 'az') list.sort(az);
    if (view.sort === 'av') list.sort((a, b) => avOf(b.it) - avOf(a.it) || a.i - b.i);
    return list;
  }
  UI.vocabVisible = () => (V() ? visible().map((x) => x.it) : []);
  // v1.2: sözlükten (fotoğraftan okunan kelime) Kelime Testine ekleme — aynı kelime varsa boş anlamları tamamlanır
  UI.vocabAdd = (x) => {
    if (!V() || !x.term) return;
    const have = V().items.find((it) => it.term.toLowerCase() === x.term.toLowerCase());
    if (have) { ['tr', 'ar', 'pron'].forEach((k) => { if (!have[k] && x[k]) have[k] = x[k]; }); }
    else V().items.push(normItem(x));
    Store.touch('vocab', { silent: true });
  };

  function badge(it) {
    const av = avOf(it), ox = oxOf(it), lvl = lvlOf(it);
    const avTip = av ? t('vtAvTip') + '. ' + t('vtAvOff') : t('vtAvOn');
    const lvTip = (it.lvl ? t('vtLvlManual') : ox ? t('vtLvlOx', { n: ox.list, w: ox.word, l: ox.lvl }) : t('vtLvlNone')) + '. ' + t('vtLvlClick');
    return `<i class="av${av ? '' : ' ghost'}" data-a="av" title="${esc(avTip)}">✈</i>${ox && ox.list === 3000 && !it.lvl ? `<i title="${esc(t('vtKey3000'))}">🔑</i>` : ''}<b class="${lvl ? 'l' + lvl : ''}${it.lvl ? ' manual' : ''}" data-a="lvl" title="${esc(lvTip)}">${lvl || '—'}</b>`;
  }

  PAGES.vocab = (m) => {
    if (!V()) { m.innerHTML = `<div class="card empty">${t('vtMissing')}</div>`; return; }
    const S = V(), c = S.cols;
    const list = visible();
    const n = S.items.length, off = S.items.filter((x) => x.off).length, pts = +S.pointsEach || 0;
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('vocab')} ${t('nav_vocab')}</h2><div class="tools"><span class="vtstat">${t('vtStat', { a: n - off, n, v: S.items.filter(avOf).length, s: list.length })}</span></div></div>
      <div class="card vt">
        <div class="vrow"><label class="fl inl"><span>${t('vtTitle')}</span><input id="vtTitle" value="${esc(S.title || '')}" placeholder="${esc(t('vtDefTitle'))}" style="width:260px"></label>
          <label class="fl inl"><span>${t('vtPts')}</span><input id="vtPts" type="number" min="0" step="0.5" value="${esc(S.pointsEach)}" style="width:80px"></label>
          <b class="vttotal">${t('vtTotal', { n: (n - off) * pts })}</b></div>
        <div class="vrow"><b>${t('vtCols')}</b> <span><b>EN</b> ${t('langName_en')} (${t('vtFixed')})</span>
          <label class="chk"><span class="vsw"><input type="checkbox" id="vtColTr" ${c.tr ? 'checked' : ''}><span></span></span> ${t('langName_tr')}</label>
          <label class="chk"><span class="vsw"><input type="checkbox" id="vtColAr" ${c.ar ? 'checked' : ''}><span></span></span> ${t('langName_ar')}</label>
          <span class="muted sm">${t('vtColsHint')}</span></div>
        <div class="vrow"><button class="btn pri" id="vtAdd">${icon('plus')} ${t('vtAdd')}</button>
          <button class="btn" id="vtAllOn" ${off ? '' : 'disabled'}>👁 ${t('vtAllOn')}</button>
          <button class="btn" id="vtAllOff" ${!n || off === n ? 'disabled' : ''}>🚫 ${t('vtAllOff')}</button>
          <label class="btn">${icon('ul')} ${t('vtImport')}<input type="file" id="vtFile" accept=".json,.sinav,.csv,.txt" hidden></label>
          <button class="btn" id="vtJson">${icon('dl')} JSON</button><button class="btn" id="vtCsv">${icon('dl')} Excel (CSV)</button>
          <button class="btn" id="vtPrS">${icon('print')} ${t('vtSheet')}</button><button class="btn" id="vtPrK">${icon('print')} ${t('answerKey')}</button></div>
        <div class="vrow"><label class="fl inl"><span>${t('vtSort')}</span><select id="vtSort">${[['list', 'vtSortList'], ['cefr', 'vtSortUp'], ['cefrDesc', 'vtSortDown'], ['az', 'vtSortAz'], ['av', 'vtSortAv']].map(([k, l]) => `<option value="${k}" ${view.sort === k ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <button class="btn sm" id="vtApply" title="${esc(t('vtApplyTip'))}">${t('vtApply')}</button>
          <label class="fl inl"><span>${t('vtShow')}</span><select id="vtFilter">${[['all', 'vtFAll'], ['av', 'vtFAv'], ['noav', 'vtFNoAv'], ['on', 'vtFOn'], ['off', 'vtFOff']].map(([k, l]) => `<option value="${k}" ${view.filter === k ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <span class="lvlchips">${[...LEVELS, '-'].map((l) => `<b class="${l === '-' ? 'none' : 'l' + l}${view.levels.has(l) ? ' on' : ''}" data-l="${l}" title="${esc(t('vtChipTip'))}">${l === '-' ? '—' : l}</b>`).join('')}</span>
          <div class="search">${icon('search')}<input id="vtQ" placeholder="${esc(t('search'))}" value="${esc(view.q)}"></div></div>
        <p class="muted sm" style="margin:0">${t('vtHelp')}</p></div>
      <div class="card vtwrap"><table class="vtable"><thead><tr><th>#</th><th class="on">${t('vtOn')}<br><label class="vsw" title="${esc(t('vtMasterTip'))}"><input type="checkbox" id="vtOnAll"><span></span></label></th><th>${t('langName_en')}</th>${c.tr ? `<th>${t('langName_tr')}</th>` : ''}${c.ar ? `<th>${t('langName_ar')}</th>` : ''}<th></th></tr></thead>
        <tbody id="vtRows">${list.map(({ it, i }) => `<tr data-i="${i}" class="${it.off ? 'off' : ''}"><td class="n">${i + 1}</td>
          <td class="on"><label class="vsw" title="${esc(t(it.off ? 'vtOffTip' : 'vtOnTip'))}"><input type="checkbox" data-a="on" ${it.off ? '' : 'checked'}><span></span></label></td>
          <td class="term"><div class="oxwrap"><input type="text" data-k="term" dir="ltr" lang="en" value="${esc(it.term)}" placeholder="${esc(t('vtTermPh'))}" title="${esc(it.pron || '')}"><span class="oxb">${badge(it)}</span></div></td>
          ${c.tr ? `<td class="tr"><input type="text" data-k="tr" value="${esc(it.tr)}" placeholder="${esc(t('vtTrPh'))}"></td>` : ''}
          ${c.ar ? `<td class="ar"><input type="text" data-k="ar" dir="rtl" lang="ar" value="${esc(it.ar)}" placeholder="${esc(t('vtArPh'))}"></td>` : ''}
          <td class="del"><button class="ib danger" data-a="del" title="${esc(t('del'))}">${icon('trash')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted" style="padding:16px;text-align:center">${t('noResults')}</td></tr>`}</tbody></table></div>`;

    const rer = () => UI.keepPos(() => PAGES.vocab(m));
    const commit = () => { Store.touch('vocab', { silent: true }); rer(); };
    const all = $('#vtOnAll', m); all.checked = off === 0 && n > 0; all.indeterminate = off > 0 && off < n;
    const setAll = (on) => { S.items.forEach((it) => { if (on) delete it.off; else it.off = true; }); commit(); };
    all.onchange = () => setAll(off > 0);
    $('#vtAllOn', m).onclick = () => setAll(true);
    $('#vtAllOff', m).onclick = () => setAll(false);
    $('#vtTitle', m).oninput = (e) => { S.title = e.target.value; Store.touch('vocab', { silent: true }); };
    $('#vtPts', m).onchange = (e) => { S.pointsEach = Math.max(0, parseFloat(e.target.value) || 0); commit(); };
    const colSw = (k, other) => (e) => { if (!e.target.checked && !S.cols[other]) { toast(t('vtNeedOne'), 'err'); e.target.checked = true; return; } S.cols[k] = e.target.checked; commit(); };
    $('#vtColTr', m).onchange = colSw('tr', 'ar');
    $('#vtColAr', m).onchange = colSw('ar', 'tr');
    $('#vtAdd', m).onclick = () => { S.items.push({ id: Store.uid('w'), term: '', tr: '', ar: '', pron: '' }); view.sort = 'list'; view.filter = 'all'; view.q = ''; view.levels = new Set([...LEVELS, '-']); commit(); const inp = $$('#vtRows input[data-k=term]', m); if (inp.length) { inp[inp.length - 1].scrollIntoView({ block: 'center' }); inp[inp.length - 1].focus(); } };
    $('#vtSort', m).onchange = (e) => { view.sort = e.target.value; rer(); };
    $('#vtFilter', m).onchange = (e) => { view.filter = e.target.value; rer(); };
    $('#vtQ', m).oninput = (e) => { view.q = e.target.value; const p = e.target.selectionStart; PAGES.vocab(m); const q = $('#vtQ', m); q.focus(); q.setSelectionRange(p, p); };
    $$('.lvlchips [data-l]', m).forEach((b) => (b.onclick = () => { const l = b.dataset.l; view.levels.has(l) ? view.levels.delete(l) : view.levels.add(l); rer(); }));
    $('#vtApply', m).onclick = () => {
      const keep = { filter: view.filter, q: view.q, levels: view.levels };
      view.filter = 'all'; view.q = ''; view.levels = new Set([...LEVELS, '-']);
      S.items = visible().map((x) => x.it);
      Object.assign(view, keep, { sort: 'list' }); commit(); toast(t('saved'));
    };
    $('#vtJson', m).onclick = exportJson;
    $('#vtCsv', m).onclick = exportCsv;
    $('#vtFile', m).onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); };
    $('#vtPrS', m).onclick = () => go('print', { ptype: 'vocab', pkey: '' });
    $('#vtPrK', m).onclick = () => go('print', { ptype: 'vocab', pkey: 'only' });

    const tb = $('#vtRows', m);
    const rowItem = (el) => { const tr = el.closest('tr[data-i]'); return tr ? S.items[+tr.dataset.i] : null; };
    tb.addEventListener('input', (e) => {
      const it = rowItem(e.target), k = e.target.dataset.k; if (!it || !k) return;
      it[k] = e.target.value;
      if (k === 'term') e.target.parentElement.querySelector('.oxb').innerHTML = badge(it);
      Store.touch('vocab', { silent: true });
    });
    tb.addEventListener('change', (e) => { if (e.target.dataset.k === 'term') { const it = rowItem(e.target); if (it) it.term = it.term.trim(); rer(); } });
    tb.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const it = rowItem(a); if (!it) return;
      const act = a.dataset.a;
      if (act === 'on') { if (a.checked) delete it.off; else it.off = true; }
      else if (act === 'del') { if (!(await confirmDlg(t('vtDelQ', { w: it.term || '—' })))) return; S.items.splice(S.items.indexOf(it), 1); S.removed = (S.removed || []).concat([it.id]); }
      else if (act === 'av') { const next = !avOf(it); if (next === autoAv(it)) delete it.av; else it.av = next; }
      else if (act === 'lvl') { pickLevel(it, commit); return; }
      else return;
      commit();
    });
  };

  function pickLevel(it, done) {
    const auto = (oxOf(it) || {}).lvl || '';
    const cur = it.lvl || '';
    const mm = modal(t('vtLvlPick', { w: esc(it.term) }), `<p class="muted sm">${t('vtLvlPickHelp')}</p><div class="lvlchips big">${LEVELS.map((l) => `<b class="l${l} on${cur === l ? ' sel' : ''}" data-v="${l}">${l}</b>`).join('')}<b class="none on${cur === '-' ? ' sel' : ''}" data-v="-">—</b></div>
      <p><button class="btn sm${!cur ? ' pri' : ''}" data-v="">${t('vtLvlAuto', { l: auto || '—' })}</button></p>`, {});
    $$('[data-v]', mm.el).forEach((b) => (b.onclick = () => {
      const s = b.dataset.v;
      if (!s || s === (auto || '-')) delete it.lvl; else it.lvl = s;
      mm.close(); done();
    }));
  }

  /* ---------- içe / dışa aktarma ---------- */
  const dl = (name, text, mime) => Platform.saveFile(name, new Blob([text], { type: mime }), mime).then(() => toast(t('exported')));
  function exportJson() {
    const S = V();
    const items = S.items.map((it) => Object.assign({}, it, { cefr: lvlOf(it), oxford: (oxOf(it) || {}).list || null, aviation: avOf(it), off: !!it.off }));
    dl('kelimeler.json', JSON.stringify({ format: 'kelime-testi/1', exported: new Date().toISOString().slice(0, 10), title: title(), pointsEach: S.pointsEach, cols: S.cols, count: items.length, items }, null, 2), 'application/json');
  }
  const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  function exportCsv() {
    const lines = [['#', 'English', 'Türkçe', 'Telaffuz', 'Arapça', 'CEFR', 'Aviation', 'Açık'].map(csvCell).join(';')];
    V().items.forEach((it, i) => lines.push([i + 1, it.term, it.tr, it.pron, it.ar, lvlOf(it) || '', avOf(it) ? '✈' : '', it.off ? 'Hayır' : 'Evet'].map(csvCell).join(';')));
    dl('kelimeler.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function parseCsv(text) {
    const first = text.split('\n')[0];
    const sep = first.includes('\t') && !first.includes(';') ? '\t' : (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (ch !== '\r') cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.replace(/^﻿/, '').toLocaleLowerCase('tr'));
    const find = (re) => head.findIndex((h) => re.test(h));
    let iEn = find(/english|ingilizce|kelime|word|الإنجليزية/), iTr = find(/türkçe|turkce|turkish|التركية/), iAr = find(/arap|arabic|عرب/), iPr = find(/telaffuz|pronun/), iOn = find(/^açık$|^on$/);
    let body = rows.slice(1);
    if (iEn < 0) { body = rows; iEn = 0; iTr = 1; iAr = 2; if (rows[0] && isArabic(rows[0][1])) { iAr = 1; iTr = 2; } }
    return body.map((r) => ({ term: r[iEn], tr: iTr >= 0 ? r[iTr] : '', ar: iAr >= 0 ? r[iAr] : '', pron: iPr >= 0 ? r[iPr] : '', off: iOn >= 0 && /^(hayır|hayir|no|off|0)$/i.test((r[iOn] || '').trim()) })).filter((x) => (x.term || '').trim());
  }
  // .sinav = Sınav Hazırlama Sistemi dosyası (JSON). Kelimeler vocab.items içinde: term, meaning (Arapça), tr, off, av
  function fromSinav(d, S) {
    const v = d.vocab || {};
    if (v.title) S.title = (typeof v.title === 'string' ? v.title : v.title[UI.lang()] || v.title.tr || v.title.en || v.title.ar) || S.title;
    if (v.pointsEach != null) S.pointsEach = +v.pointsEach || 0;
    if (v.cols) S.cols = { ar: v.cols.ar !== false, tr: !!v.cols.tr || v.cols.ar === false };
    return (v.items || []).map((it) => ({ id: it.id, term: it.term, tr: it.tr, ar: typeof it.meaning === 'string' ? it.meaning : it.ar || '', off: it.off, av: it.av }));
  }
  async function importFile(f) {
    const S = V(); const text = await f.text(); let incoming; const meta = {};
    try {
      if (/\.(csv|txt)$/i.test(f.name)) incoming = parseCsv(text);
      else {
        const d = JSON.parse(text);
        if (d.vocab) incoming = fromSinav(d, meta);
        else { incoming = Array.isArray(d) ? d : d.items || []; if (d.cols) meta.cols = d.cols; if (d.title && d.title !== t('vtDefTitle')) meta.title = d.title; if (d.pointsEach != null) meta.pointsEach = d.pointsEach; }
      }
    } catch (err) { toast(t('vtReadErr') + ': ' + err.message, 'err'); return; }
    const items = incoming.map(normItem).filter((x) => x.term);
    if (!items.length) { toast(t('vtNothing'), 'err'); return; }
    const apply = (replace) => {
      const before = S.items.length;
      const merged = replace ? items : [...S.items, ...items];
      S.items = dedupe(merged);
      Object.assign(S, meta); if (S.cols && !S.cols.tr && !S.cols.ar) S.cols.tr = true;
      Store.touch('vocab', { silent: true }); UI.render();
      const dup = merged.length - S.items.length;
      toast(replace ? t('vtLoaded', { n: S.items.length, d: dup }) : t('vtAdded', { n: S.items.length - before, d: dup }));
    };
    if (!S.items.length) { apply(true); return; }
    const mm = modal(t('vtImport'), `<p>${t('vtFound', { n: items.length })}</p><p class="muted sm">${t('vtDupNote')}</p>`, { foot: `<button class="btn" id="vtApp">${t('vtAppend')}</button><button class="btn pri" id="vtRep">${t('vtReplace')}</button>` });
    $('#vtApp', mm.el).onclick = () => { mm.close(); apply(false); };
    $('#vtRep', mm.el).onclick = () => { mm.close(); apply(true); };
  }

  /* ---------- çıktı: öğrenci kâğıdı (anlamlar boş) ve cevap anahtarı (anlamlar yeşil) ---------- */
  DocModel.B.vocab = function (o) {
    const c = DocModel.ctx(o); const S = V();
    const items = UI.vocabVisible().filter((it) => !it.off && it.term.trim());
    const cols = [S.cols.tr && 'tr', S.cols.ar && 'ar'].filter(Boolean);
    const total = items.length * (+S.pointsEach || 0);
    const ttl = S.title || c.L('vtDefTitle');
    const mw = cols.length ? Math.floor(62 / cols.length) : 0;
    const tcols = [{ label: '#', w: 8, align: 'c' }, { label: c.L('langName_en'), w: 100 - 8 - mw * cols.length }].concat(cols.map((k) => ({ label: c.L('langName_' + k), w: mw })));
    const table = (key) => ({ t: 'table', cols: tcols, rows: items.map((it, i) => ({ type: key ? 'row' : 'blank', cells: [{ text: String(i + 1), bold: true }, { text: it.term, bold: true }].concat(cols.map((k) => ({ text: key ? it[k] || '' : '', color: key ? '#1e7b34' : undefined, bold: key, rtl: k === 'ar' }))) })) });
    const sub = c.L('vtPrintSub').replace('{n}', items.length).replace('{p}', total);
    const blocks = [];
    if (!o.keyOnly) blocks.push(DocModel.header(c, ttl, sub), { t: 'p', text: c.L('vtNameLine') }, table(false));
    if (o.withKey || o.keyOnly) {
      if (o.keyOnly) blocks.push(DocModel.header(c, ttl + ' — ' + c.L('answerKey'), sub));
      else blocks.push({ t: 'h1', text: ttl + ' — ' + c.L('answerKey'), pageBreak: true });
      blocks.push(table(true));
    }
    return { title: ttl + (o.keyOnly ? ' — ' + c.L('answerKey') : ''), lang: c.lang, blocks };
  };
})();
