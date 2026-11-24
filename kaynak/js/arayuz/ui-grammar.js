/* v1.1: Dil bilgisi başvuru kartları ve zaman çizelgesi (past – present – future × simple – continuous – perfect – perfect continuous).
   Çizelge hem "Dil bilgisi" sayfasında hem müfredat sayfasının üstünde görünür; müfredat maddelerindeki kart düğmeleri ilgili kartı açar. */
(function () {
  const { $, $$, esc, icon, tx, modal, PAGES, go } = UI;
  const G = () => window.GRAMMAR;
  const TIMES = ['past', 'present', 'future'];
  const ASPECTS = ['simple', 'cont', 'perf', 'pcont'];
  const REFX = { past: 0.27, present: 0.5, future: 0.73 };
  const ml = () => (UI.lang() === 'en' ? '' : UI.lang()); // fiil anlamı sütunu: İngilizce arayüzde gösterilmez

  /* Zaman çizgisi çizimi: nokta = tek seferlik eylem, bant = süren eylem, ok = önceden başlayıp referans noktasına ulaşan eylem */
  function tlSvg(ten, W, H, big) {
    const y = H * 0.58, x0 = 6, x1 = W - 6, rx = W * REFX[ten.t], now = W * 0.5;
    const col = `var(--tl-${ten.t})`;
    let g = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="tl-axis"/><path d="M${x1} ${y} l-7 -4 v8 z" class="tl-axhead"/>`;
    g += `<line x1="${now}" y1="${y - H * 0.42}" x2="${now}" y2="${y + H * 0.3}" class="tl-now"/>`;
    if (big) g += `<text x="${W * 0.2}" y="${H - 4}" class="tl-lbl">${esc(t('tlPast'))}</text><text x="${now}" y="${H - 4}" class="tl-lbl now">${esc(t('tlNow'))}</text><text x="${W * 0.8}" y="${H - 4}" class="tl-lbl">${esc(t('tlFuture'))}</text>`;
    const r = big ? 7 : 4.5, bw = W * 0.09, from = rx - W * 0.2;
    if (ten.a === 'simple') {
      if (ten.t === 'present') [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86].forEach((f) => (g += `<circle cx="${W * f}" cy="${y}" r="${r * 0.75}" fill="${col}"/>`));
      else g += `<path d="M${rx - r} ${y - r} L${rx + r} ${y + r} M${rx + r} ${y - r} L${rx - r} ${y + r}" stroke="${col}" stroke-width="${big ? 4 : 3}" stroke-linecap="round"/>`;
    } else if (ten.a === 'cont') {
      g += `<rect x="${rx - bw}" y="${y - r * 1.4}" width="${bw * 2}" height="${r * 2.8}" rx="${r * 1.4}" fill="${col}" opacity=".28"/>`;
      g += `<path d="M${rx - bw + 4} ${y} q ${bw / 4} -${r} ${bw / 2} 0 t ${bw / 2} 0 t ${bw / 2} 0 t ${bw / 2 - 8} 0" fill="none" stroke="${col}" stroke-width="${big ? 3 : 2}"/>`;
      g += `<line x1="${rx}" y1="${y - r * 2.6}" x2="${rx}" y2="${y + r * 2}" stroke="${col}" stroke-width="2" stroke-dasharray="3 2"/>`;
    } else if (ten.a === 'perf') {
      g += `<path d="M${from} ${y} Q ${(from + rx) / 2} ${y - H * 0.42} ${rx - 2} ${y - 3}" fill="none" stroke="${col}" stroke-width="${big ? 3.5 : 2.5}"/><path d="M${rx} ${y - 2} l-9 -2 l5 -7 z" fill="${col}"/>`;
      g += `<path d="M${from - r} ${y - r} L${from + r} ${y + r} M${from + r} ${y - r} L${from - r} ${y + r}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;
      g += `<circle cx="${rx}" cy="${y}" r="${r * 0.7}" fill="none" stroke="${col}" stroke-width="2"/>`;
    } else {
      g += `<rect x="${from}" y="${y - r * 1.4}" width="${rx - from}" height="${r * 2.8}" rx="${r * 1.4}" fill="${col}" opacity=".28"/>`;
      g += `<path d="M${from + 4} ${y} q ${(rx - from) / 12} -${r} ${(rx - from) / 6} 0 t ${(rx - from) / 6} 0 t ${(rx - from) / 6} 0 t ${(rx - from) / 6} 0 t ${(rx - from) / 6} 0" fill="none" stroke="${col}" stroke-width="${big ? 3 : 2}"/>`;
      g += `<path d="M${rx + 3} ${y} l-10 -6 v12 z" fill="${col}"/>`;
    }
    if (big && ten.t !== 'present' && ten.a !== 'simple') g += `<line x1="${rx}" y1="${y + 6}" x2="${rx}" y2="${y + 16}" stroke="${col}" stroke-width="2"/>`;
    return `<svg class="tlsvg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
  }
  const tenseOf = (tt, a) => G().tenses.find((x) => x.t === tt && x.a === a);

  /* 3 × 4 çizelge (müfredat sayfası ve dil bilgisi sayfası) */
  function grid(sel, compact) {
    return `<div class="tlgrid ${compact ? 'compact' : ''}"><div class="tlh"></div>${ASPECTS.map((a) => `<div class="tlh">${esc(t('asp_' + a))}<small dir="ltr">${{ simple: 'Simple', cont: 'Continuous', perf: 'Perfect', pcont: 'Perfect Continuous' }[a]}</small></div>`).join('')}
      ${TIMES.map((tt) => `<div class="tlrow tl-${tt}">${esc(t('tl_' + tt))}<small dir="ltr">${tt[0].toUpperCase() + tt.slice(1)}</small></div>${ASPECTS.map((a) => { const x = tenseOf(tt, a); return `<button class="tlcell tl-${tt} ${sel === tt + a ? 'on' : ''}" data-tense="${tt}:${a}">${tlSvg(x, 200, 54)}<b dir="ltr">${esc(x.name)}</b><span class="lvb">${esc(x.lvl)}</span></button>`; }).join('')}`).join('')}</div>`;
  }
  function tenseDetail(x) {
    return `<div class="tldet tl-${x.t}"><div class="tlbig">${tlSvg(x, 640, 120, true)}</div>
      <div class="tlinfo"><h3 dir="ltr">${esc(x.name)} <span class="lvb">${esc(x.lvl)}</span></h3><p>${esc(tx(x.use))}</p>
      <table class="t tlform"><tr><th>${t('gForm')}</th><td dir="ltr">${esc(x.form)}</td></tr><tr><th>(+)</th><td dir="ltr">${esc(x.pos)}</td></tr><tr><th>(−)</th><td dir="ltr">${esc(x.neg)}</td></tr><tr><th>(?)</th><td dir="ltr">${esc(x.q)}</td></tr><tr><th>${t('gSignal')}</th><td dir="ltr">${esc(x.sig)}</td></tr></table>
      <button class="ib" data-say="${esc(x.pos)}" title="${t('listen')}">${icon('speak')}</button></div></div>`;
  }
  function wireGrid(root, onPick) { $$('[data-tense]', root).forEach((b) => (b.onclick = () => onPick(b.dataset.tense))); wireSay(root); }
  function wireSay(root) { $$('[data-say]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); UI.say(b.dataset.say); })); }
  UI.say = (text, accent) => { try { const u = new SpeechSynthesisUtterance(text); u.lang = accent === 'us' ? 'en-US' : 'en-GB'; const v = speechSynthesis.getVoices().find((x) => x.lang === u.lang) || speechSynthesis.getVoices().find((x) => /^en/.test(x.lang)); if (v) u.voice = v; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { UI.toast(t('noSpeech'), 'err'); } };

  /* Kart içeriği */
  function cardHtml(k, opt) {
    const c = G().cards[k]; if (!c) return '';
    let h = `${c.intro ? `<p>${esc(tx(c.intro))}</p>` : ''}`;
    if (c.rules) h += `<div class="grules">${c.rules.map((r) => `<div class="grule"><p>${esc(tx(r.rule))}</p><div class="gex" dir="ltr">${esc(r.ex)}</div></div>`).join('')}</div>`;
    if (c.kind === 'timeline') h += grid(opt && opt.sel) + `<div id="tldet">${opt && opt.sel ? tenseDetail(tenseOf(...opt.sel.split(':'))) : ''}</div>`;
    if (c.kind === 'irregular' || c.kind === 'regular') {
      const irr = c.kind === 'irregular'; const lg = ml();
      h += `<div class="tools"><div class="search">${icon('search')}<input id="vq" placeholder="${t('search')}"></div><div class="seg sm" id="vlv">${['', 'A1', 'A2', 'B1', 'B2', 'C1'].map((x) => `<button data-lv="${x}" class="${x ? '' : 'on'}">${x || t('filterAll')}</button>`).join('')}</div></div>
        <div class="tbl"><table class="t vt"><thead><tr><th>V1</th><th>V2</th>${irr ? '<th>V3</th>' : ''}${lg ? `<th>${t('meaning')}</th>` : ''}<th>CEFR</th><th></th></tr></thead><tbody>
        ${(irr ? G().irregular : G().regular).map((v) => `<tr data-lv="${v.lvl}" data-s="${esc((v.v1 + ' ' + v.v2 + ' ' + (v.v3 || '') + ' ' + (v[lg] || '')).toLowerCase())}"><td dir="ltr"><b>${esc(v.v1)}</b></td><td dir="ltr">${esc(v.v2)}</td>${irr ? `<td dir="ltr">${esc(v.v3)}</td>` : ''}${lg ? `<td>${esc(v[lg] || '')}</td>` : ''}<td><span class="lvb">${esc(v.lvl)}</span></td><td><button class="ib" data-say="${esc(v.v1 + ', ' + v.v2 + (irr ? ', ' + v.v3 : ''))}">${icon('speak')}</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    return h;
  }
  function wireCard(root, k, rerender) {
    wireSay(root);
    if (G().cards[k].kind === 'timeline') wireGrid(root, (sel) => { $$('[data-tense]', root).forEach((b) => b.classList.toggle('on', b.dataset.tense === sel)); $('#tldet', root).innerHTML = tenseDetail(tenseOf(...sel.split(':'))); wireSay($('#tldet', root)); });
    const vq = $('#vq', root); if (!vq) return;
    let lv = '';
    const f = () => { const q = vq.value.trim().toLowerCase(); $$('.vt tbody tr', root).forEach((tr) => { tr.hidden = (q && !tr.dataset.s.includes(q)) || (lv && tr.dataset.lv !== lv); }); };
    vq.oninput = f; $$('#vlv [data-lv]', root).forEach((b) => (b.onclick = () => { lv = b.dataset.lv; $$('#vlv button', root).forEach((x) => x.classList.toggle('on', x === b)); f(); }));
  }
  UI.grammarCard = function (k, sel) {
    const c = G().cards[k]; if (!c) return;
    const mm = modal(icon(c.icon || 'book') + ' ' + esc(tx(c.title)), `<div class="gcard">${cardHtml(k, { sel })}</div>`, { wide: true, foot: `<button class="btn" id="gpr">${icon('print')} ${t('print')}</button><button class="btn" id="gpg">${icon('book')} ${t('nav_grammar')}</button>` });
    wireCard(mm.el, k);
    $('#gpr', mm.el).onclick = () => { mm.close(); go('print', { ptype: 'grammar', pcard: k }); };
    $('#gpg', mm.el).onclick = () => { mm.close(); go('grammar', { gcard: k }); };
  };

  /* ---------- Dil bilgisi sayfası ---------- */
  PAGES.grammar = (m, R) => {
    if (!G()) return;
    const k = R.gcard && G().cards[R.gcard] ? R.gcard : 'tenses';
    const used = refsUsed();
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('clock')} ${t('nav_grammar')}</h2><div class="tools"><button class="btn sm" id="gpr">${icon('print')} ${t('print')}</button></div></div>
      <p class="muted sm">${t('grammarHelp')}</p>
      <div class="gtabs">${G().order.map((x) => `<button class="${x === k ? 'on' : ''}" data-g="${x}">${icon(G().cards[x].icon || 'book')}<b>${esc(tx(G().cards[x].title))}</b><small>${esc(G().cards[x].lvl)}${used[x] ? ' · ' + t('usedInN', { n: used[x].length }) : ''}</small></button>`).join('')}</div>
      <div class="card gcard"><h3>${esc(tx(G().cards[k].title))} <span class="lvb">${esc(G().cards[k].lvl)}</span></h3>${cardHtml(k, { sel: R.gsel })}
        ${used[k] ? `<h4>${t('usedIn')}</h4><div class="chips">${used[k].map((u) => `<button class="chip" data-goto="${u.mid}">${esc(u.code)} ${esc(tx(u.title))}</button>`).join('')}</div>` : ''}</div>`;
    $$('[data-g]', m).forEach((b) => (b.onclick = () => { R.gcard = b.dataset.g; R.gsel = null; UI.keepPos(() => PAGES.grammar(m, R)); }));
    $('#gpr', m).onclick = () => go('print', { ptype: 'grammar', pcard: k });
    $$('[data-goto]', m).forEach((b) => (b.onclick = () => { UI.setProgram('genel', true); go('curriculum', { focus: b.dataset.goto }); }));
    wireCard(m, k);
  };
  function refsUsed() {
    const out = {};
    Store.inProg('genel', () => Store.levels().forEach((l, i) => l.modules.forEach((md, j) => md.items.forEach((it) => { if (it.ref) { const a = (out[it.ref] = out[it.ref] || []); if (!a.some((x) => x.mid === md.id)) a.push({ mid: md.id, code: i + '.' + (j + 1), title: md.title }); } }))));
    return out;
  }

  /* ---------- müfredat sayfasına ekler: zaman çizelgesi kartı, seviye bilgi kartı, madde kart düğmeleri ---------- */
  UI.currTimelineCard = function () {
    if (!G() || Store.prog !== 'genel') return '';
    const open = Store.local.ui.tlOpen !== false;
    return `<div class="card tlcard ${open ? 'open' : ''}"><div class="ph-row"><h3>${icon('clock')} ${esc(tx(G().cards.tenses.title))}</h3><div class="tools"><button class="btn sm ghost" id="tlFull">${icon('book')} ${t('nav_grammar')}</button><button class="ib chev" id="tlTog">${icon('chev')}</button></div></div>
      ${open ? `<p class="muted sm">${t('tlCurrHelp')}</p>${grid(null, true)}<div id="tldet"></div>` : ''}</div>`;
  };
  UI.wireTimelineCard = function (m) {
    const tg = $('#tlTog', m); if (!tg) return;
    tg.onclick = () => { Store.local.ui.tlOpen = Store.local.ui.tlOpen === false; Store.saveLocal(); UI.keepPos(() => PAGES.curriculum(m)); };
    $('#tlFull', m).onclick = () => go('grammar', { gcard: 'tenses' });
    const card = $('.tlcard', m);
    wireGrid(card, (sel) => { $$('[data-tense]', card).forEach((b) => b.classList.toggle('on', b.dataset.tense === sel)); $('#tldet', card).innerHTML = tenseDetail(tenseOf(...sel.split(':'))); wireSay($('#tldet', card)); });
  };
  UI.refBtn = (it) => (it.ref && G() && G().cards[it.ref] ? `<button class="refb" data-ref="${it.ref}" title="${esc(tx(G().cards[it.ref].title))}">${icon(G().cards[it.ref].icon || 'book')}<span>${esc(tx(G().cards[it.ref].title).split(/[:(—]/)[0].trim())}</span></button>` : '');
  UI.kindTag = (it) => (it.kind ? `<span class="ktag k-${it.kind}">${t('kind_' + it.kind)}</span>` : '');
  UI.levelInfoHtml = function (l) {
    const I = l.info; if (!I && !l.cando) return '';
    const row = (k) => (I && I[k] ? `<tr><th>${t('li_' + k)}</th><td>${typeof I[k] === 'object' ? esc(tx(I[k])) : esc(I[k])}</td></tr>` : '');
    return `<details class="lvinfo"><summary>${icon('flag')} ${t('levelInfo')}</summary><div class="cols2"><table class="t kvt">${['weeks', 'weekly', 'audience', 'classSize', 'approach', 'medium', 'vocab', 'outcome', 'exam'].map(row).join('')}</table>
      <div>${I && I.can ? `<h4>${t('li_can')}</h4><p>${esc(tx(I.can))}</p>` : ''}${I && I.struct ? `<h4>${t('li_struct')}</h4><p>${esc(tx(I.struct))}</p>` : ''}${I && I.cannot ? `<h4>${t('li_cannot')}</h4><p class="muted">${esc(tx(I.cannot))}</p>` : ''}</div></div>
      ${l.cando && l.cando.length ? `<h4>${t('canDo')}</h4><table class="t">${l.cando.map((c) => `<tr><th>${esc(tx(c.area))}</th><td>${esc(tx(c.text))}</td></tr>`).join('')}</table>` : ''}
      ${I && I.note ? `<p class="muted sm">${esc(tx(I.note))}</p>` : ''}</details>`;
  };
  UI.wireRefs = (root) => $$('[data-ref]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); UI.grammarCard(b.dataset.ref); }));

  /* ---------- çıktı: dil bilgisi kartı ---------- */
  DocModel.B.grammar = function (o) {
    const c = DocModel.ctx(o); const k = G().cards[o.cardId] ? o.cardId : 'tenses'; const cd = G().cards[k];
    const blocks = [DocModel.header(c, c.T(cd.title), 'CEFR ' + cd.lvl)];
    if (cd.intro) blocks.push({ t: 'p', text: c.T(cd.intro), text2: c.T2(cd.intro) });
    if (cd.rules) blocks.push({ t: 'table', cols: [{ label: c.L('gRule'), w: 55 }, { label: c.L('gExample'), w: 45 }], rows: cd.rules.map((r) => ({ type: 'row', cells: [{ text: c.T(r.rule), text2: c.T2(r.rule) }, { text: r.ex }] })) });
    if (cd.kind === 'timeline') TIMES.forEach((tt) => {
      blocks.push({ t: 'h2', text: c.L('tl_' + tt) + ' — ' + tt[0].toUpperCase() + tt.slice(1) });
      blocks.push({ t: 'table', cols: [{ label: c.L('gTense'), w: 18 }, { label: c.L('gForm'), w: 24 }, { label: c.L('gExample'), w: 28 }, { label: c.L('gUse'), w: 30 }], rows: G().tenses.filter((x) => x.t === tt).map((x) => ({ type: 'row', cells: [{ text: x.name, bold: true, sub: x.lvl }, { text: x.form, small: true }, { text: x.pos + '\n' + x.neg + '\n' + x.q, small: true }, { text: c.T(x.use), text2: c.T2(x.use), small: true }] })) });
    });
    if (cd.kind === 'irregular' || cd.kind === 'regular') {
      const irr = cd.kind === 'irregular'; const lg = c.lang === 'en' ? (c.lang2 || '') : c.lang;
      const cols = [{ label: 'V1', w: 18 }, { label: 'V2', w: 18 }].concat(irr ? [{ label: 'V3', w: 18 }] : []).concat(lg ? [{ label: c.L('meaning'), w: irr ? 34 : 52 }] : []).concat([{ label: 'CEFR', w: 12, align: 'c' }]);
      blocks.push({ t: 'table', cols, rows: (irr ? G().irregular : G().regular).map((v) => ({ type: 'row', cells: [{ text: v.v1, bold: true }, { text: v.v2 }].concat(irr ? [{ text: v.v3 }] : []).concat(lg ? [{ text: v[lg] || '' }] : []).concat([{ text: v.lvl }]) })) });
    }
    return { title: c.T(cd.title), lang: c.lang, blocks };
  };
})();
