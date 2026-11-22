/* v2.1: Ortak Ders Programı — seçilen öğrencilerin ortak eksik konularından düzenlenebilir ders planı */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, PAGES, go, fmtDate, today } = UI;
  const uidL = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const save = (p) => Store.touchPlan(p, { silent: true });
  const rr = () => UI.keepPos(() => UI.render());
  let sel = new Set(); // havuzda seçili konular

  const topicText = (p, id) => { const tp = Store.planTopic(p, id); return tp ? tx(tp.text) : '—'; };
  const topicCode = (p, id) => { const tp = Store.planTopic(p, id); return tp && tp.code ? tp.code : tp && tp.custom ? '★' : ''; };
  const modTitle = (p, l, lg) => { if (!l.mod) return ''; const f = Store.inProg(p.prog, () => Store.findModule(l.mod)); if (!f) return ''; return lg ? DocModel.tx(f.module.title, lg) : plainText(tx(f.module.title)); };
  UI.planLessonTitle = (p, l, lg) => l.title || modTitle(p, l, lg);
  const pName = (p) => (p.name ? LangGuard.ptx(p.name) : t('planNameDef') + ' — ' + fmtDate(p.createdAt));
  UI.planName = pName;
  const assigned = (p) => new Set(p.lessons.flatMap((l) => l.items));
  const names = (arr) => arr.map((s) => s.name).join(', ');

  /* ---------- liste ---------- */
  function listView(m) {
    const P = Store.plans();
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('cal')} ${t('nav_plans')}</h2><div class="tools"><button class="btn pri" id="pNew">${icon('plus')} ${t('planNew')}</button></div></div>
      <p class="muted">${t('planIntro')}</p>
      ${P.length ? `<div class="plgrid">${P.map((p) => { const S = Store.planStudents(p); const miss = Store.planMissing(p).length; const mins = p.lessons.reduce((a, l) => a + (+l.minutes || 0), 0); const done = p.lessons.filter((l) => l.done).length;
        return `<div class="card plcard" data-pid="${p.id}"><div class="plh"><b>${esc(pName(p))}</b><span class="pill p-${p.prog}">${t('prog_' + p.prog)}</span></div>
          <small class="muted">${icon('users')} ${S.length} · ${esc(names(S)).slice(0, 140)}</small>
          <div class="plst"><span>${t('planMissing')}: <b>${miss}</b></span><span>${t('planLessons')}: <b>${p.lessons.length}</b>${p.lessons.length ? ` (${done} ${t('planDoneTag')})` : ''}</span><span>${mins} ${t('minShort')}</span></div></div>`; }).join('')}</div>`
      : `<div class="card empty">${icon('cal', 'big')}<p>${t('planNoPlans')}</p></div>`}`;
    $('#pNew', m).onclick = () => newPlan();
    $$('[data-pid]', m).forEach((c) => (c.onclick = () => go('plans', { pid: c.dataset.pid })));
  }

  /* Öğrenci seçimi (yeni program veya mevcut programa) */
  function pickStudents(prog, chosen, onOk, title) {
    let pg = prog || Store.prog; const ch = new Set(chosen || []);
    const body = () => { const S = Store.students(false, pg); return `<div class="progseg">${Store.PROGS.map((x) => `<button type="button" class="p-${x} ${x === pg ? 'on' : ''}" data-pp="${x}">${t('prog_' + x)}</button>`).join('')}</div>
      <p class="muted sm">${t('planSameProg')}</p>
      <div class="row"><button type="button" class="btn sm ghost" id="psAll">${t('selectAll')}</button><button type="button" class="btn sm ghost" id="psNone">${t('selectNone')}</button></div>
      <div class="pslist">${S.length ? S.map((s) => { const r = Store.rankOf(s); return `<label class="chk psrow"><input type="checkbox" value="${s.id}" ${ch.has(s.id) ? 'checked' : ''}> <b>${esc(s.name)}</b> <span class="rbadge" style="--rc:${r.rank.color}">${esc(tx(r.rank.name))}</span> <small class="muted">${t('level')}: ${Store.highestLevel(s) >= 0 ? Store.highestLevel(s) : '—'}</small></label>`; }).join('') : `<p class="muted">${t('noStudents')}</p>`}</div>`; };
    const mm = modal(title || t('planPickStudents'), `<div id="psb">${body()}</div>`, { wide: true, onOk: () => { const ids = [...ch].filter((id) => Store.db.students[id] && Store.progOf(Store.db.students[id]) === pg); if (!ids.length) { UI.toast(t('planNoStudents'), 'err'); return false; } onOk(pg, ids); } });
    const wire = () => {
      const b = $('#psb', mm.el);
      $$('[data-pp]', b).forEach((x) => (x.onclick = () => { if (x.dataset.pp !== pg) { pg = x.dataset.pp; ch.clear(); } b.innerHTML = body(); wire(); }));
      $$('input[type=checkbox]', b).forEach((c) => (c.onchange = () => (c.checked ? ch.add(c.value) : ch.delete(c.value))));
      $('#psAll', b).onclick = () => { Store.students(false, pg).forEach((s) => ch.add(s.id)); b.innerHTML = body(); wire(); };
      $('#psNone', b).onclick = () => { ch.clear(); b.innerHTML = body(); wire(); };
    };
    wire();
  }
  function newPlan(ids) {
    const create = (pg, list) => { const p = Store.addPlan({ name: '', prog: pg, students: list }); go('plans', { pid: p.id }); };
    if (ids && ids.length) { const s0 = Store.db.students[ids[0]]; const pg = Store.progOf(s0); create(pg, ids.filter((id) => Store.progOf(Store.db.students[id]) === pg)); return; }
    pickStudents(Store.prog, [], create);
  }
  UI.newPlan = newPlan;

  /* ---------- düzenleyici ---------- */
  function editor(m, p) {
    const S = Store.planStudents(p);
    const mode = p.mode || 'all';
    const all = Store.planMissing(p, mode);
    const asg = assigned(p); const exc = new Set(p.excluded || []);
    const pool = all.filter((r) => !asg.has(r.id) && !exc.has(r.id));
    sel = new Set([...sel].filter((id) => pool.some((r) => r.id === id)));
    const mins = p.lessons.reduce((a, l) => a + (+l.minutes || 0), 0);
    // havuz: seviye > modül gruplu
    let lastL = null, lastM = null;
    const poolHtml = pool.map((r) => {
      let h = '';
      if (r.l !== lastL) { lastL = r.l; lastM = null; h += `<div class="pg-l"><span class="lv-no">${r.li}</span> ${esc(tx(r.l.title))}</div>`; }
      if (r.m !== lastM) { lastM = r.m; h += `<div class="pg-m"><span class="code">${r.code}</span> ${esc(tx(r.m.title))}</div>`; }
      const all1 = r.miss.length === r.rel.length;
      return h + `<label class="pg-i" data-iid="${r.id}"><input type="checkbox" data-sel="${r.id}" ${sel.has(r.id) ? 'checked' : ''}><span class="it-text">${esc(tx(r.it.text))}</span><span class="mc ${all1 ? 'all' : ''}" title="${esc(t('planMissIn') + ': ' + names(r.miss))}">${r.miss.length}/${r.rel.length}</span><button type="button" class="ib sm" data-exc="${r.id}" title="${t('planExclude')}">${icon('x')}</button></label>`;
    }).join('');
    const lessonOpts = (cur) => p.lessons.map((l, i) => `<option value="${l.id}" ${cur === l.id ? 'selected' : ''}>${t('planLesson')} ${i + 1}${UI.planLessonTitle(p, l) ? ' — ' + esc(UI.planLessonTitle(p, l)) : ''}</option>`).join('');
    const lessonHtml = (l, i) => {
      const tot = l.items.length;
      return `<div class="card lesson ${l.done ? 'done' : ''}" data-lid="${l.id}">
        <div class="lsh"><span class="lsn">${i + 1}</span><input class="lst" data-lf="title" value="${esc(l.title || '')}" placeholder="${esc(modTitle(p, l) || t('planLessonTitle'))}">
          ${l.done ? `<span class="stchip st-achieved">${icon('check')} ${t('planDoneTag')}</span>` : ''}
          <span class="sp"></span><button class="ib" data-la="up" title="↑">${icon('up')}</button><button class="ib" data-la="down" title="↓">${icon('down')}</button><button class="ib danger" data-la="del" title="${t('del')}">${icon('trash')}</button></div>
        <div class="lsf"><label class="fl in"><span>${t('date')}</span><input type="date" data-lf="date" value="${l.date || ''}"></label>
          <label class="fl in sm"><span>${t('planTime')}</span><input type="time" data-lf="time" value="${l.time || ''}"></label>
          <label class="fl in sm"><span>${t('planMinutes')}</span><input type="number" min="0" data-lf="minutes" value="${l.minutes ?? ''}"></label>
          <label class="fl in"><span>${t('instructor')}</span><input data-lf="instructor" value="${esc(l.instructor || '')}"></label>
          <label class="fl in grow"><span>${t('note')}</span><input data-lf="note" value="${esc(l.note || '')}"></label></div>
        <ol class="lsi">${tot ? l.items.map((id, k) => `<li data-it="${id}"><span class="code">${topicCode(p, id)}</span><span class="it-text">${esc(topicText(p, id))}</span>
          <span class="sp"></span><button class="ib sm" data-ia="up">${icon('up')}</button><button class="ib sm" data-ia="down">${icon('down')}</button>
          ${p.lessons.length > 1 ? `<select class="mv" data-ia="move"><option value="">${t('planMoveTo')}…</option>${p.lessons.filter((x) => x.id !== l.id).map((x) => `<option value="${x.id}">${t('planLesson')} ${p.lessons.indexOf(x) + 1}</option>`).join('')}</select>` : ''}
          <button class="ib sm danger" data-ia="rm" title="${t('planBackToPool')}">${icon('x')}</button></li>`).join('') : `<p class="muted sm">${t('planEmptyLesson')}</p>`}</ol>
        <div class="row"><button class="btn sm ghost" data-la="custom">${icon('plus')} ${t('planCustom')}</button><span class="sp"></span>
          ${l.done ? `<button class="btn sm" data-la="undo">${t('planUndo')}</button>` : `<button class="btn sm pri" data-la="done" ${tot ? '' : 'disabled'}>${icon('check')} ${t('planDone')}</button>`}</div></div>`;
    };
    m.innerHTML = `<div class="ph-row"><h2 class="ph"><button class="ib" id="pBack">${icon('up', 'rot-l')}</button>${icon('cal')} <input id="pName" class="pname" value="${esc(p.name || '')}" placeholder="${esc(pName(p))}"><span class="pill p-${p.prog}">${t('prog_' + p.prog)}</span></h2>
      <div class="tools"><button class="btn" id="pDoc">${icon('print')} ${t('planDocs')}</button><button class="ib danger" id="pDel" title="${t('planDelete')}">${icon('trash')}</button></div></div>
      <div class="card"><div class="ph-row"><h3>${icon('users')} ${t('planStudents')} (${S.length})</h3><button class="btn sm" id="pStu">${icon('edit')} ${t('planAddStudents')}</button></div>
        <div class="chips">${S.map((s) => `<span class="chip2" data-sid="${s.id}">${esc(s.name)}<button class="ib sm" data-rmS="${s.id}">${icon('x')}</button></span>`).join('') || `<p class="muted">${t('planNoStudents')}</p>`}</div>
        <p class="muted sm">${t('planSummary', { m: all.length, a: all.length - pool.length - all.filter((r) => exc.has(r.id)).length, l: p.lessons.length, d: mins })}</p></div>
      <div class="plcols">
        <div class="card pool"><div class="ph-row"><h3>${icon('book')} ${t('planMissing')} <span class="pill">${pool.length}</span></h3>
          <div class="seg sm"><button class="${mode === 'all' ? 'on' : ''}" data-mode="all">${t('planModeAll')}</button><button class="${mode === 'any' ? 'on' : ''}" data-mode="any">${t('planModeAny')}</button></div></div>
          <p class="muted sm">${t(mode === 'all' ? 'planModeAllD' : 'planModeAnyD')}</p>
          ${pool.length ? `<div class="pbar"><label class="chk"><input type="checkbox" id="selAll" ${sel.size && sel.size === pool.length ? 'checked' : ''}> ${t('selectAll')} (${sel.size})</label><span class="sp"></span>
            <select id="toL"><option value="__new">${t('planNewLesson')}</option>${lessonOpts(Store.local.ui.planLast)}</select><button class="btn sm pri" id="addSel" ${sel.size ? '' : 'disabled'}>${icon('plus')} ${t('planAddSel')}</button>
            <button class="btn sm" id="pAuto">${icon('bolt')} ${t('planAuto')}</button></div>
            <div class="pgl">${poolHtml}</div>` : `<p class="muted">${all.length ? t('planAllAssigned') : S.length ? t('planNoMissing') : t('planNoStudents')}</p>`}
          ${exc.size ? `<details class="pexc"><summary>${t('planExcluded')} (${exc.size})</summary>${[...exc].map((id) => `<div class="pg-i"><span class="code">${topicCode(p, id)}</span><span class="it-text">${esc(topicText(p, id))}</span><button class="btn sm ghost" data-rst="${id}">${t('planRestore')}</button></div>`).join('')}</details>` : ''}
        </div>
        <div class="lessons"><div class="ph-row"><h3>${icon('cal')} ${t('planLessons')} <span class="pill">${p.lessons.length}</span></h3><button class="btn sm" id="addL">${icon('plus')} ${t('planAddLesson')}</button></div>
          ${p.lessons.map(lessonHtml).join('') || `<div class="card empty"><p class="muted">${t('planNoLessons')}</p></div>`}</div>
      </div>`;

    /* olaylar */
    $('#pBack', m).onclick = () => go('plans', { pid: null });
    $('#pName', m).onchange = (e) => { p.name = e.target.value.trim(); save(p); };
    $('#pDel', m).onclick = async () => { if (await confirmDlg(t('planDelete') + '?')) { p.deleted = true; save(p); go('plans', { pid: null }); } };
    $('#pDoc', m).onclick = () => { const o = Store.local.ui.print = Object.assign(Store.local.ui.print || {}, { planId: p.id }); o.planId = p.id; Store.saveLocal(); go('print', { ptype: 'plan' }); };
    $('#pStu', m).onclick = () => pickStudents(p.prog, p.students, (pg, ids) => { if (pg !== p.prog) { p.prog = pg; p.lessons.forEach((l) => (l.items = l.items.filter((id) => p.custom && p.custom[id]))); p.excluded = []; } p.students = ids; save(p); rr(); }, t('planAddStudents'));
    $$('[data-rmS]', m).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); p.students = p.students.filter((x) => x !== b.dataset.rms); save(p); rr(); }));
    $$('.chip2[data-sid]', m).forEach((c) => (c.ondblclick = () => go('student', { sid: c.dataset.sid, tab: 'assess' })));
    $$('[data-mode]', m).forEach((b) => (b.onclick = () => { p.mode = b.dataset.mode; save(p); rr(); }));
    $$('[data-sel]', m).forEach((c) => (c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); rr(); }));
    const sa = $('#selAll', m); if (sa) sa.onchange = () => { sel = sa.checked ? new Set(pool.map((r) => r.id)) : new Set(); rr(); };
    $$('[data-exc]', m).forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); p.excluded = [...new Set([...(p.excluded || []), b.dataset.exc])]; sel.delete(b.dataset.exc); save(p); rr(); }));
    $$('[data-rst]', m).forEach((b) => (b.onclick = () => { p.excluded = (p.excluded || []).filter((x) => x !== b.dataset.rst); save(p); rr(); }));
    const newLesson = () => { const last = p.lessons[p.lessons.length - 1]; const l = { id: uidL(), title: '', date: '', time: last ? last.time || '' : '', minutes: last ? last.minutes || 90 : 90, instructor: last ? last.instructor || '' : (Store.db.config.institution.instructor || ''), note: '', items: [] }; p.lessons.push(l); return l; };
    $('#addL', m).onclick = () => { newLesson(); save(p); rr(); };
    const as = $('#addSel', m); if (as) as.onclick = () => {
      const v = $('#toL', m).value; const l = v === '__new' ? newLesson() : p.lessons.find((x) => x.id === v); if (!l) return;
      const order = pool.map((r) => r.id).filter((id) => sel.has(id)); l.items.push(...order); sel.clear();
      Store.local.ui.planLast = l.id; Store.saveLocal(); save(p); rr();
    };
    const au = $('#pAuto', m); if (au) au.onclick = () => autoSplit(p, sel.size ? pool.filter((r) => sel.has(r.id)) : pool);
    $$('.lesson', m).forEach((box) => {
      const l = p.lessons.find((x) => x.id === box.dataset.lid); if (!l) return; const i = p.lessons.indexOf(l);
      $$('[data-lf]', box).forEach((inp) => (inp.onchange = () => { const k = inp.dataset.lf; l[k] = k === 'minutes' ? (inp.value === '' ? '' : +inp.value) : inp.value.trim(); save(p); if (k === 'minutes') rr(); }));
      $$('[data-la]', box).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.la;
        if (a === 'up' && i > 0) { p.lessons.splice(i - 1, 0, p.lessons.splice(i, 1)[0]); }
        else if (a === 'down' && i < p.lessons.length - 1) { p.lessons.splice(i + 1, 0, p.lessons.splice(i, 1)[0]); }
        else if (a === 'del') { if (!(await confirmDlg(t('planDelLesson')))) return; if (l.done) undoLesson(p, l); p.lessons.splice(i, 1); }
        else if (a === 'custom') { UI.editTri(t('planCustom'), {}, (v) => { const id = 'c' + Date.now().toString(36); p.custom = p.custom || {}; p.custom[id] = v; l.items.push(id); save(p); rr(); }); return; }
        else if (a === 'done') { doneLesson(p, l); return; }
        else if (a === 'undo') { if (!(await confirmDlg(t('planUndoQ')))) return; undoLesson(p, l); }
        else return;
        save(p); rr();
      }));
      $$('li[data-it]', box).forEach((li) => {
        const id = li.dataset.it; const k = l.items.indexOf(id);
        $$('[data-ia]', li).forEach((b) => {
          const act = () => {
            const a = b.dataset.ia;
            if (a === 'up' && k > 0) l.items.splice(k - 1, 0, l.items.splice(k, 1)[0]);
            else if (a === 'down' && k < l.items.length - 1) l.items.splice(k + 1, 0, l.items.splice(k, 1)[0]);
            else if (a === 'rm') l.items.splice(k, 1);
            else if (a === 'move') { const to = p.lessons.find((x) => x.id === b.value); if (!to) return; l.items.splice(k, 1); to.items.push(id); }
            else return;
            save(p); rr();
          };
          if (b.tagName === 'SELECT') b.onchange = act; else b.onclick = act;
        });
      });
    });
  }

  /* Otomatik bölme: konu başına süreye göre dersler oluşturur */
  function autoSplit(p, rows) {
    const last = p.lessons[p.lessons.length - 1];
    const mm = modal(icon('bolt') + ' ' + t('planAuto'), `<p class="muted">${t('planAutoHelp', { n: rows.length })}</p><div class="grid2">
      <label class="fl"><span>${t('planLessonMin')}</span><input type="number" id="aL" min="15" value="${(last && last.minutes) || 90}"></label>
      <label class="fl"><span>${t('planItemMin')}</span><input type="number" id="aI" min="1" value="15"></label>
      <label class="fl"><span>${t('planStart')}</span><input type="date" id="aD" value="${today()}"></label>
      <label class="fl"><span>${t('planEvery')}</span><input type="number" id="aE" min="0" value="7"></label>
      <label class="fl"><span>${t('planTime')}</span><input type="time" id="aT" value="${(last && last.time) || '09:00'}"></label>
      <label class="fl"><span>${t('instructor')}</span><input id="aR" value="${esc((last && last.instructor) || Store.db.config.institution.instructor || '')}"></label></div>
      <label class="chk"><input type="checkbox" id="aM" checked> ${t('planAutoByModule')}</label>`, {
      onOk: (w) => {
        const L = Math.max(15, +$('#aL', w).value || 90), I = Math.max(1, +$('#aI', w).value || 15), E = Math.max(0, +$('#aE', w).value || 0), byMod = $('#aM', w).checked;
        let d = $('#aD', w).value ? new Date($('#aD', w).value) : null; const per = Math.max(1, Math.floor(L / I));
        const mk = () => { const l = { id: uidL(), title: '', date: d ? d.toISOString().slice(0, 10) : '', time: $('#aT', w).value, minutes: L, instructor: $('#aR', w).value.trim(), note: '', items: [] }; if (d) d = new Date(d.getTime() + E * 86400000); p.lessons.push(l); return l; };
        let cur = null, lastMod = null;
        for (const r of rows) {
          // modül değişince, kalan yer o modülün tamamına yetmiyorsa yeni derse geç (konular bölünmesin)
          const modLeft = rows.filter((x) => x.m === r.m).length;
          if (!cur || cur.items.length >= per || (byMod && r.m !== lastMod && cur.items.length >= Math.ceil(per / 2) && cur.items.length + Math.min(modLeft, per) > per)) cur = mk();
          if (!cur.mod) cur.mod = r.m.id; // başlık dil bağımsız: modül adı seçili dilde gösterilir
          cur.items.push(r.id); lastMod = r.m;
        }
        sel.clear(); save(p); rr(); UI.toast(t('planAutoDone'));
      },
    });
  }

  /* Ders yapıldı: katılanlarda dersin konuları "çalıştık" olarak işaretlenir (geri alınabilir) */
  function doneLesson(p, l) {
    const S = Store.planStudents(p);
    const mm = modal(icon('check') + ' ' + t('planDone'), `<p class="muted">${t('planDoneQ')}</p><div class="pslist">${S.map((s) => `<label class="chk psrow"><input type="checkbox" value="${s.id}" checked> <b>${esc(s.name)}</b></label>`).join('')}</div>
      <label class="fl"><span>${t('date')}</span><input type="date" id="dD" value="${l.date || today()}"></label>`, {
      onOk: (w) => {
        const ids = $$('input[type=checkbox]', w).filter((c) => c.checked).map((c) => c.value); const d = $('#dD', w).value || today();
        l.marked = {}; l.journal = {};
        const topics = l.items.filter((id) => !(p.custom && p.custom[id]));
        for (const sid of ids) {
          const s = Store.db.students[sid]; if (!s) continue;
          const set = [];
          for (const id of topics) { const mk = s.marks[id] || {}; if (!mk.k && !mk.s) { mk.s = true; mk.d = d; mk.plan = l.id; s.marks[id] = mk; set.push(id); } }
          l.marked[sid] = set;
          const jid = 'j' + Date.now().toString(36) + sid.slice(-3);
          s.journal = s.journal || []; s.journal.unshift({ id: jid, date: d, minutes: +l.minutes || 0, text: p.name || '', plan: { pid: p.id, lid: l.id, n: l.items.length } });
          l.journal[sid] = jid;
          Store.touch('student:' + sid, { silent: true });
        }
        l.done = true; l.attended = ids; l.date = l.date || d; l.doneAt = Date.now();
        Store.log('activity_plan', { n: ids.length, k: topics.length });
        save(p); rr(); UI.toast(t('planDoneT', { n: ids.length }));
      },
    });
  }
  function undoLesson(p, l) {
    for (const [sid, ids] of Object.entries(l.marked || {})) {
      const s = Store.db.students[sid]; if (!s) continue;
      for (const id of ids) { const mk = s.marks[id]; if (mk && mk.plan === l.id && !mk.k) { delete mk.s; delete mk.plan; delete mk.d; if (!mk.n) delete s.marks[id]; } }
      const jid = (l.journal || {})[sid]; if (jid) s.journal = (s.journal || []).filter((j) => j.id !== jid);
      Store.touch('student:' + sid, { silent: true });
    }
    l.done = false; l.marked = {}; l.journal = {}; l.attended = [];
  }

  PAGES.plans = (m, R) => {
    const p = R.pid ? Store.plan(R.pid) : null;
    if (R.pid && !p) R.pid = null;
    if (p) editor(m, p); else listView(m);
  };
})();
