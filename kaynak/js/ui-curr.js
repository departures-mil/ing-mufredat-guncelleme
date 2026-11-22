/* Müfredat düzenleyici: seviye / alt kategori (modül) / madde ekle-düzenle-sil-taşı + konu kaynakları (belge, video linki) */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, triFields, readTriAuto, wireTri, triBlockFoot, PAGES, go } = UI;
  const open = new Set(JSON.parse(localStorage.getItem('iha_open_levels') || '["l0"]'));
  const saveOpen = () => { try { localStorage.setItem('iha_open_levels', JSON.stringify([...open])); } catch (e) {} };
  let q = '';
  const C = () => Store.cur();
  const save = () => Store.touch('curriculum');
  const match = (o) => !q || [o.tr, o.en, o.ar].some((s) => (s || '').toLocaleLowerCase().includes(q));
  const resBtn = (kind, id, node) => { const n = Files.count(node); return `<button class="ib res ${n ? 'has' : ''}" data-res="${kind}:${id}" title="${t('resources')}">${icon('clip')}${n ? `<i>${n}</i>` : ''}</button>`; };
  const sw = (node) => `<button class="sw ${node.off ? '' : 'on'}" data-a="toggle" title="${node.off ? t('offHint') : t('onHint')}"><i></i></button>`;
  let hideOff = false;
  // v1.5: çevrimdışı yapılmış (taslak) çeviri işareti — internet gelince otomatik düzelir
  const dr = (o) => (o && o._mt && o._mt.length ? ` <span class="mtd" title="${t('mtDraftHint')}">${t('mtDraft')}</span>` : '');
  const acts = (kind, id, extra) => `<div class="acts">${extra || ''}<button class="ib" data-a="up" title="${t('moveUp')}">${icon('up')}</button><button class="ib" data-a="down" title="${t('moveDown')}">${icon('down')}</button><button class="ib" data-a="edit" title="${t('edit')}">${icon('edit')}</button><button class="ib danger" data-a="del" title="${t('del')}">${icon('trash')}</button></div>`;

  PAGES.curriculum = (m) => {
    const L = C().levels;
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('book')} ${esc(tx(C().title))} <span class="pill p-${Store.prog}">${t('prog_' + Store.prog)}</span></h2>
      <div class="progseg">${Store.PROGS.map((p) => `<button class="p-${p} ${p === Store.prog ? 'on' : ''}" data-prog="${p}">${t('prog_' + p)}</button>`).join('')}</div>
      <div class="tools"><div class="search">${icon('search')}<input id="cq" placeholder="${t('search')}" value="${esc(q)}"></div>
      <button class="btn sm" id="expAll">${t('expandAll')}</button><button class="btn sm" id="colAll">${t('collapseAll')}</button>
      <button class="btn sm" id="trAll" title="${t('fillMissingTr')}">${icon('translate')} ${t('fillMissingTr')}</button>
      <label class="chk"><input type="checkbox" id="hideOff" ${hideOff ? 'checked' : ''}> ${t('hideOff')}</label><button class="btn sm ghost" id="ped">${icon('help')} ${t('pedagogy')}</button><button class="btn sm ghost" id="rst">${t('resetCurriculum')}</button><button class="btn sm" id="bulkUp" title="${t('bulkHelp')}">${icon('ul')} ${t('bulkBtn')}</button><button class="btn pri" id="addLv">${icon('plus')} ${t('addLevel')}</button></div></div>
      ${Store.prog === 'genel' && C().newRev ? `<div class="card tip newrev">${icon('bolt')} ${t('newCurrAvail')}<div class="row"><button class="btn sm pri" id="nrYes">${t('newCurrLoad')}</button><button class="btn sm ghost" id="nrNo">${t('newCurrKeep')}</button></div></div>` : ''}
      ${UI.currTimelineCard ? UI.currTimelineCard() : ''}
      <p class="muted sm">${t('dragHint')}</p>
      <div class="levels" id="lvList">${L.map((l, i) => levelHtml(l, i)).join('')}</div>
      <div class="card" id="flightCard"><div class="ph-row"><h3>${icon('plane')} ${t('flightTrack')}</h3><button class="btn sm" id="addSt">${icon('plus')} ${t('addStage')}</button></div>
      <div class="tbl"><table class="t"><thead><tr><th>${t('flightStage')}</th><th>${t('parallelLevel')}</th><th>${t('content')}</th><th>${t('passCond')}</th><th></th></tr></thead><tbody>${C().flight.map((f, i) => hideOff && f.off ? '' : `<tr data-fi="${i}" class="${f.off ? 'off' : ''}"><td><b>${esc(f.code)}</b>${f.off ? ` <span class="gtag">${t('offLabel')}</span>` : ''}</td><td>${esc(f.level)}</td><td>${esc(tx(f.content))}</td><td>${esc(tx(f.cond))}</td><td class="nowrap"><button class="sw sm ${f.off ? '' : 'on'}" data-fa="off" title="${f.off ? t('offHint') : t('onHint')}"><i></i></button><button class="ib" data-fa="up">${icon('up')}</button><button class="ib" data-fa="down">${icon('down')}</button><button class="ib" data-fa="edit">${icon('edit')}</button><button class="ib danger" data-fa="del">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div></div>`;
    $('#cq', m).oninput = (e) => { q = e.target.value.trim().toLocaleLowerCase(); const pos = e.target.selectionStart; if (q) L.forEach((l) => open.add(l.id)); UI.keepPos(() => PAGES.curriculum(m)); const n = $('#cq', m); n.focus(); n.setSelectionRange(pos, pos); };
    $$('[data-prog]', m).forEach((b) => (b.onclick = () => UI.setProgram(b.dataset.prog, true)));
    $('#expAll', m).onclick = () => { L.forEach((l) => open.add(l.id)); saveOpen(); UI.keepPos(() => PAGES.curriculum(m)); };
    $('#colAll', m).onclick = () => { open.clear(); saveOpen(); UI.keepPos(() => PAGES.curriculum(m)); };
    $('#rst', m).onclick = async () => { if (await confirmDlg(t('resetConfirm'))) Store.resetCurriculum(); };
    $('#bulkUp', m).onclick = () => UI.bulkUpload(); // v1.3: toplu materyal yükleme
    $('#addLv', m).onclick = () => editLevel(null);
    $('#hideOff', m).onchange = (e) => { hideOff = e.target.checked; UI.keepPos(() => PAGES.curriculum(m)); };
    $('#ped', m).onclick = () => go('help', { anchor: 'ped' });
    $('#trAll', m).onclick = () => fillMissing();
    const ny = $('#nrYes', m); if (ny) { ny.onclick = async () => { if (await confirmDlg(t('newCurrLoadQ'))) { Store.adoptNewCurriculum(); UI.toast(t('saved')); } }; $('#nrNo', m).onclick = () => Store.keepOldCurriculum(); }
    wire(m);
    if (UI.wireTimelineCard) UI.wireTimelineCard(m);
    if (UI.wireRefs) UI.wireRefs(m);
    if (UI.R.focus) { const fid = UI.R.focus; UI.R.focus = null; const f = Store.findModule(fid); if (f && !open.has(f.level.id)) { open.add(f.level.id); saveOpen(); UI.R.focus = fid; return PAGES.curriculum(m); } setTimeout(() => { const el = m.querySelector(`[data-id="${fid}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } }, 50); }
    // uçuş hattı
    $('#addSt', m).onclick = () => editStage(null);
    $$('tr[data-fi]', m).forEach((tr) => { const i = +tr.dataset.fi; const F = C().flight; $$('[data-fa]', tr).forEach((b) => (b.onclick = async () => { const a = b.dataset.fa; if (a === 'off') { F[i].off = !F[i].off; save(); UI.toast(F[i].off ? t('offDone') : t('onDone')); return; } if (a === 'up' && i > 0) { F.splice(i - 1, 0, F.splice(i, 1)[0]); save(); } if (a === 'down' && i < F.length - 1) { F.splice(i + 1, 0, F.splice(i, 1)[0]); save(); } if (a === 'edit') editStage(F[i]); if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { F.splice(i, 1); save(); } })); });
  };

  function levelHtml(l, i) {
    const isOpen = open.has(l.id);
    const mods = l.modules.filter((md) => !q || match(md.title) || md.items.some((it) => match(it.text)) || match(l.title));
    if (q && !mods.length && !match(l.title)) return '';
    if (hideOff && l.off) return '';
    const nItems = l.modules.reduce((a, md) => a + md.items.length, 0);
    const nAct = l.off ? 0 : Store.actMods(l).reduce((a, md) => a + Store.actItems(md).length, 0);
    return `<div class="lv ${isOpen ? 'open' : ''} ${l.off ? 'off' : ''}" data-kind="level" data-id="${l.id}" draggable="true">
      <div class="lv-head"><span class="grip">${icon('grip')}</span><span class="lv-no">${i}</span>
        <div class="lv-title" data-toggle="${l.id}"><b>${esc(tx(l.title))}${dr(l.title)}</b><small>${t('prereq')}: ${esc(tx(l.prereq))} · ≈${l.hours} ${t('hoursShort')} · ${t('modulesCount', { n: l.modules.length })} · ${t('itemsCount', { n: nItems })}${nAct !== nItems ? ` · <span class="offc">${t('activeCount', { n: nAct })}</span>` : ''}</small></div>
        ${sw(l)}${resBtn('level', l.id, l)}${acts('level', l.id, `<button class="ib" data-a="addMod" title="${t('addModule')}">${icon('plus')}</button>`)}<button class="ib chev" data-toggle="${l.id}">${icon('chev')}</button></div>
      ${isOpen ? `<div class="lv-body"><div class="goal">${icon('flag')} ${t('goal')}: ${esc(tx(l.goal))}</div>${UI.levelInfoHtml ? UI.levelInfoHtml(l) : ''}
        ${mods.map((md) => moduleHtml(l, i, md)).join('')}
        <button class="btn sm ghost addrow" data-addmod="${l.id}">${icon('plus')} ${t('addModule')}</button></div>` : ''}
    </div>`;
  }
  function moduleHtml(l, i, md) {
    const code = i + '.' + (l.modules.indexOf(md) + 1);
    if (hideOff && md.off) return '';
    return `<div class="md ${md.off ? 'off' : ''}" data-kind="module" data-id="${md.id}" draggable="true">
      <div class="md-head"><span class="grip">${icon('grip')}</span><span class="code">${code}</span><div class="md-title"><b>${esc(tx(md.title))}${dr(md.title)}</b>${md.added ? ` <span class="tag">${t('added')}</span>` : ''}${md.source ? `<small>${icon('file')} ${esc(LangGuard.ptx(md.source))}</small>` : ''}</div>
      ${sw(md)}${resBtn('module', md.id, md)}${acts('module', md.id, `<button class="ib" data-a="addItem" title="${t('addItem')}">${icon('plus')}</button>`)}</div>
      ${md.goal ? `<div class="mgoal">${icon('flag')} ${esc(tx(md.goal))}</div>` : ''}
      <ul class="items">${md.items.filter((it) => (!q || match(it.text) || match(md.title) || match(l.title)) && !(hideOff && it.off)).map((it) => `<li class="${it.off ? 'off' : ''}" data-kind="item" data-id="${it.id}" draggable="true"><span class="grip">${icon('grip')}</span>${UI.kindTag ? UI.kindTag(it) : ''}<span class="it-text">${esc(tx(it.text))}${dr(it.text)}</span>${UI.refBtn ? UI.refBtn(it) : ''}${sw(it)}${resBtn('item', it.id, it)}${acts('item', it.id)}</li>`).join('')}</ul>
      ${md.acts && md.acts.length ? `<details class="macts"><summary>${icon('users')} ${t('classActs')} (${md.acts.length})</summary><ul>${md.acts.map((a) => `<li>${esc(tx(a))}</li>`).join('')}</ul></details>` : ''}
    </div>`;
  }

  function locate(kind, id) {
    if (kind === 'level') { const arr = C().levels; return { arr, idx: arr.findIndex((x) => x.id === id), node: arr.find((x) => x.id === id) }; }
    if (kind === 'module') { const f = Store.findModule(id); if (!f) return null; const arr = f.level.modules; return { arr, idx: arr.indexOf(f.module), node: f.module, parent: f.level }; }
    const f = Store.findItem(id); if (!f) return null; const arr = f.module.items; return { arr, idx: arr.indexOf(f.item), node: f.item, parent: f.module, level: f.level };
  }

  function wire(m) {
    $$('[data-toggle]', m).forEach((e) => (e.onclick = (ev) => { ev.stopPropagation(); const id = e.dataset.toggle; open.has(id) ? open.delete(id) : open.add(id); saveOpen(); UI.keepPos(() => PAGES.curriculum(m)); }));
    $$('[data-addmod]', m).forEach((b) => (b.onclick = () => editModule(Store.findLevel(b.dataset.addmod), null)));
    $$('[data-res]', m).forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); const [k, id] = b.dataset.res.split(':'); const loc = locate(k, id); if (loc) UI.resourcesModal(loc.node, true); }));
    $$('.acts [data-a], [data-a=toggle]', m).forEach((b) => (b.onclick = async (ev) => {
      ev.stopPropagation();
      const host = b.closest('[data-kind]'); const kind = host.dataset.kind; const id = host.dataset.id; const loc = locate(kind, id); if (!loc) return;
      const a = b.dataset.a; const { arr, idx, node } = loc;
      if (a === 'up' && idx > 0) { arr.splice(idx - 1, 0, arr.splice(idx, 1)[0]); save(); }
      else if (a === 'down' && idx < arr.length - 1) { arr.splice(idx + 1, 0, arr.splice(idx, 1)[0]); save(); }
      else if (a === 'edit') { if (kind === 'level') editLevel(node); else if (kind === 'module') editModule(loc.parent, node); else editItem(loc.parent, node); }
      else if (a === 'del') { if (await confirmDlg(kind === 'level' ? t('confirmDeleteLevel') : kind === 'module' ? t('confirmDeleteModule') : t('confirmDelete'))) { arr.splice(idx, 1); save(); UI.toast(t('deleted')); } }
      else if (a === 'addMod') { open.add(node.id); saveOpen(); editModule(node, null); }
      else if (a === 'addItem') editItem(node, null);
      else if (a === 'toggle') { node.off = !node.off; save(); UI.toast(node.off ? t('offDone') : t('onDone')); }
    }));
    // sürükle-bırak
    let drag = null;
    $$('[draggable=true]', m).forEach((el) => {
      el.addEventListener('dragstart', (e) => { e.stopPropagation(); drag = { kind: el.dataset.kind, id: el.dataset.id }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag.id); } catch (er) {} });
      el.addEventListener('dragend', () => { el.classList.remove('dragging'); $$('.drop-before,.drop-after,.drop-in', m).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-in')); drag = null; });
      el.addEventListener('dragover', (e) => {
        if (!drag) return; const kind = el.dataset.kind;
        const ok = kind === drag.kind || (drag.kind === 'module' && kind === 'level') || (drag.kind === 'item' && kind === 'module');
        if (!ok || el.dataset.id === drag.id) return;
        e.preventDefault(); e.stopPropagation();
        $$('.drop-before,.drop-after,.drop-in', m).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-in'));
        if (kind !== drag.kind) { el.classList.add('drop-in'); return; }
        const r = el.getBoundingClientRect(); el.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
      });
      el.addEventListener('drop', (e) => {
        if (!drag) return; e.preventDefault(); e.stopPropagation();
        const kind = el.dataset.kind; const before = el.classList.contains('drop-before'); const into = el.classList.contains('drop-in');
        const src = locate(drag.kind, drag.id); if (!src) return;
        const node = src.arr.splice(src.idx, 1)[0];
        if (into) { const tgt = locate(kind, el.dataset.id); (kind === 'level' ? tgt.node.modules : tgt.node.items).push(node); open.add(kind === 'level' ? tgt.node.id : (tgt.parent || {}).id); }
        else { const tgt = locate(kind, el.dataset.id); tgt.arr.splice(tgt.arr.indexOf(tgt.node) + (before ? 0 : 1), 0, node); }
        drag = null; saveOpen(); save();
      });
    });
  }

  /* ---------- düzenleme pencereleri ---------- */
  function editLevel(l) {
    const isNew = !l; l = l || { title: {}, prereq: {}, goal: {}, hours: 20 };
    const mm = modal(isNew ? t('addLevel') : t('editLevel'), `
      <h4>${t('level')}</h4>${triFields('title', l.title)}
      <h4>${t('prereq')}</h4>${triFields('prereq', l.prereq)}
      <h4>${t('goal')}</h4>${triFields('goal', l.goal, { area: true })}
      <label class="fl sm"><span>${t('duration')} (${t('hours')})</span><input type="number" id="lh" value="${l.hours || 0}" min="0"></label>`, {
      wide: true, foot: triBlockFoot(), onOk: async (w) => {
        const title = await readTriAuto(mm, 'title'); if (!title.tr && !title.en && !title.ar) { UI.toast(t('required'), 'err'); return false; }
        Object.assign(l, { title, prereq: await readTriAuto(mm, 'prereq'), goal: await readTriAuto(mm, 'goal'), hours: +$('#lh', w).value || 0 });
        if (isNew) { l.id = Store.uid('l'); l.modules = []; C().levels.push(l); open.add(l.id); saveOpen(); }
        save();
      } });
    wireTri(mm);
  }
  function editModule(level, md) {
    const isNew = !md; md = md || { title: {}, source: '', added: false, items: [] };
    const levels = C().levels;
    const mm = modal(isNew ? t('addModule') : t('editModule'), `
      ${triFields('title', md.title)}
      <label class="fl"><span>${t('source')} (${t('optional')})</span><input id="msrc" value="${esc(md.source || '')}"></label>
      <label class="chk"><input type="checkbox" id="madd" ${md.added ? 'checked' : ''}> ${t('addedTopic')}</label>
      <label class="fl"><span>${t('level')} (${t('moveTo')})</span><select id="mlv">${levels.map((x, i) => `<option value="${x.id}" ${x === level ? 'selected' : ''}>${i} — ${esc(tx(x.title))}</option>`).join('')}</select></label>
      ${isNew ? `<label class="fl"><span>${t('items')} (${t('optional')}) — ${t('oneLinePerItem')}</span><textarea id="mitems" rows="4"></textarea></label>` : ''}`, {
      wide: true, foot: triBlockFoot(), onOk: async (w) => {
        const title = await readTriAuto(mm, 'title'); if (!Object.values(title).some(Boolean)) { UI.toast(t('required'), 'err'); return false; }
        Object.assign(md, { title, source: $('#msrc', w).value.trim(), added: $('#madd', w).checked });
        const target = Store.findLevel($('#mlv', w).value) || level;
        if (isNew) {
          md.id = Store.uid('m');
          const lines = ($('#mitems', w).value || '').split('\n').map((s) => s.trim()).filter(Boolean);
          const auto = $('.autotr', w).checked;
          for (const s of lines) { const o = { [UI.lang()]: s }; if (auto) await UI.fillTranslations(o); else { o.tr = o.tr || s; o.en = o.en || s; o.ar = o.ar || s; } md.items.push({ id: Store.uid('i'), text: o }); }
          target.modules.push(md); open.add(target.id); saveOpen();
        } else if (target !== level) { level.modules.splice(level.modules.indexOf(md), 1); target.modules.push(md); open.add(target.id); saveOpen(); }
        save();
      } });
    wireTri(mm);
  }
  function editItem(md, it) {
    const isNew = !it; it = it || { text: {} };
    const mods = []; C().levels.forEach((l, i) => l.modules.forEach((x, j) => mods.push({ x, label: i + '.' + (j + 1) + ' ' + tx(x.title) })));
    const mm = modal(isNew ? t('addItem') : t('editItem'), `${triFields('text', it.text, { area: true })}
      <label class="fl"><span>${t('module')} (${t('moveTo')})</span><select id="imd">${mods.map((o) => `<option value="${o.x.id}" ${o.x === md ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`, {
      wide: true, foot: triBlockFoot(), onOk: async (w) => {
        const text = await readTriAuto(mm, 'text'); if (!Object.values(text).some(Boolean)) { UI.toast(t('required'), 'err'); return false; }
        it.text = text; const target = (Store.findModule($('#imd', w).value) || {}).module || md;
        if (isNew) { it.id = Store.uid('i'); target.items.push(it); }
        else if (target !== md) { md.items.splice(md.items.indexOf(it), 1); target.items.push(it); }
        save();
      } });
    wireTri(mm);
  }
  function editStage(f) {
    const isNew = !f; f = f || { code: 'U' + (C().flight.length + 1), level: '', content: {}, cond: {} };
    const mm = modal(isNew ? t('addStage') : t('edit'), `<div class="grid2"><label class="fl"><span>${t('flightStage')}</span><input id="fc" value="${esc(f.code)}"></label><label class="fl"><span>${t('parallelLevel')}</span><input id="fl" value="${esc(f.level)}"></label></div>
      <h4>${t('content')}</h4>${triFields('content', f.content)}<h4>${t('passCond')}</h4>${triFields('cond', f.cond)}`, { wide: true, foot: triBlockFoot(), onOk: async (w) => {
      Object.assign(f, { code: $('#fc', w).value.trim(), level: $('#fl', w).value.trim(), content: await readTriAuto(mm, 'content'), cond: await readTriAuto(mm, 'cond') });
      if (isNew) { f.id = Store.uid('f'); C().flight.push(f); } save(); } });
    wireTri(mm);
  }
  /* Eksik çevirileri tamamla: bir dildeki metin boş ya da Türkçesiyle aynıysa çevir */
  async function fillMissing() {
    const objs = [];
    const add = (o) => { if (o && typeof o === 'object') objs.push(o); };
    add(C().title); C().levels.forEach((l) => { add(l.title); add(l.prereq); add(l.goal); l.modules.forEach((md) => { add(md.title); md.items.forEach((it) => add(it.text)); }); }); C().flight.forEach((f) => { add(f.content); add(f.cond); });
    const todo = objs.filter((o) => ['tr', 'en', 'ar'].some((l) => !o[l] || (l !== 'tr' && o[l] === o.tr && /[a-zçğıöşü]{4,}/i.test(o.tr) && !/^[A-Za-z0-9 .,()\-/]+$/.test(o.tr))));
    if (!todo.length) { UI.toast(t('nothingToTranslate')); return; }
    const mm = modal(t('fillMissingTr'), `<p>${t('translating')} <b id="trc">0</b> / ${todo.length}</p><div class="bar"><i id="trb" style="width:0"></i></div>`, { foot: '' , sticky: true});
    let n = 0, fail = 0;
    for (const o of todo) {
      for (const l of ['tr', 'en', 'ar']) {
        if (!o[l] || (l !== 'tr' && o[l] === o.tr)) { const src = o.tr || o.en || o.ar; const sl = o.tr ? 'tr' : o.en ? 'en' : 'ar'; if (l === sl) continue; try { o[l] = await translateText(src, sl, l); } catch (e) { fail++; } }
      }
      n++; const c = $('#trc', mm.el); if (c) { c.textContent = n; $('#trb', mm.el).style.width = (n / todo.length) * 100 + '%'; }
      if (fail > 3) break;
    }
    mm.close(); save(); UI.toast(fail ? t('translateFail') : t('saved'), fail ? 'err' : '');
  }

  /* ---------- kaynaklar (belge + link) ---------- */
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function resourcesModal(node, editable) {
    const title = tx(node.title || node.text);
    const body = () => {
      const R = node.res || [];
      const links = R.filter((r) => r.kind === 'link'), files = R.filter((r) => r.kind === 'file');
      return `<div class="resnode">${esc(title)}</div>
      <h4>${icon('play')} ${t('videoLinks')}</h4>
      ${links.length ? `<div class="rlist">${links.map((r) => { const th = Files.videoThumb(r.url); return `<div class="ritem" data-rid="${r.id}">${th ? `<img class="thumb" src="${th}" onerror="this.remove()">` : `<span class="rico">${icon(Files.isVideo(r.url) ? 'play' : 'link')}</span>`}<div class="rinfo"><b>${esc(LangGuard.ptx(r.name))}</b><small dir="ltr">${esc(r.url)}</small></div><div class="racts"><button class="btn sm pri" data-ra="open">${icon('play')} ${t('openLink')}</button><button class="ib" data-ra="copy" title="${t('copy')}">${icon('copy')}</button>${editable ? `<button class="ib danger" data-ra="del">${icon('trash')}</button>` : ''}</div></div>`; }).join('')}</div>` : `<p class="muted sm">${t('noLinks')}</p>`}
      ${editable ? `<div class="addlink"><input id="lkT" placeholder="${t('linkTitle')}"><input id="lkU" dir="ltr" placeholder="https://youtube.com/…"><button class="btn sm" id="lkAdd">${icon('plus')} ${t('addLink')}</button></div>` : ''}
      <h4>${icon('file')} ${t('documents')}</h4>
      ${files.length ? `<div class="rlist">${files.map((r) => `<div class="ritem" data-rid="${r.id}"><span class="rico">${icon('file')}</span><div class="rinfo"><b>${esc(LangGuard.ptx(r.name))}</b><small>${fmtSize(r.size || 0)} · ${UI.fmtDate(r.addedAt)}</small></div><div class="racts"><button class="btn sm pri" data-ra="openf">${t('openFile')}</button><button class="ib" data-ra="save" title="${t('saveAs')}">${icon('dl')}</button>${editable ? `<button class="ib danger" data-ra="del">${icon('trash')}</button>` : ''}</div></div>`).join('')}</div>` : `<p class="muted sm">${t('noDocs')}</p>`}
      ${editable ? `<label class="btn sm">${icon('ul')} ${t('addFiles')}<input type="file" id="rfIn" multiple hidden></label><p class="muted sm">${t('filesSyncInfo')}</p>` : ''}`;
    };
    const mm = modal(icon('clip') + ' ' + t('resources'), body(), { wide: true });
    const wireR = () => {
      const w = mm.el;
      $$('.ritem', w).forEach((row) => { const r = (node.res || []).find((x) => x.id === row.dataset.rid); $$('[data-ra]', row).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.ra;
        if (a === 'open') Files.openLink(r.url);
        if (a === 'copy') { try { await navigator.clipboard.writeText(r.url); UI.toast(t('copied')); } catch (e) { modal(t('copy'), `<textarea class="full" rows="3" dir="ltr" readonly>${esc(r.url)}</textarea>`); } }
        if (a === 'openf') { b.disabled = true; b.textContent = t('processing'); await Files.openFile(r); b.disabled = false; b.textContent = t('openFile'); }
        if (a === 'save') Files.saveFileAs(r);
        if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { Files.remove(node, r.id); refresh(); }
      })); });
      const la = $('#lkAdd', w); if (la) la.onclick = () => { const u = $('#lkU', w).value.trim(); if (!u) { UI.toast(t('required'), 'err'); return; } Files.addLink(node, $('#lkT', w).value.trim(), u); refresh(); };
      const fi = $('#rfIn', w); if (fi) fi.onchange = async (e) => { const fs = [...e.target.files]; if (!fs.length) return; UI.toast(t('processing')); await Files.addFiles(node, fs); refresh(); };
    };
    const refresh = () => { $('.mb', mm.el).innerHTML = body(); wireR(); };
    UI.suspendRender = false; wireR();
    return mm;
  }
  UI.resourcesModal = UI.resourcesModal || resourcesModal; // v1.1: ui-docs.js önizlemeli sürümü kullanır
})();
