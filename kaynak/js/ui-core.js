/* Arayüz çekirdeği: kabuk, yönlendirme, yardımcılar, panel, ayarlar, yardım */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* v1.5: 5 dil seçeneği — tr, en, ar, tr-ar, en-ar.
     İki dilli modda t()/tx() metni görünmez işaretlerle "ana ⟨E000⟩ … ⟨E001⟩ arapça ⟨E002⟩" biçiminde döndürür;
     bilingual() gözlemcisi bu işaretleri ekranda "üstte ana dil, altında Arapça" düzenine çevirir. */
  const MODES = ['tr', 'en', 'ar', 'tr-ar', 'en-ar'];
  const mode = () => (MODES.includes(Store.local.lang) ? Store.local.lang : 'tr');
  const lang = () => mode().split('-')[0];
  const lang2 = () => (mode().includes('-') ? mode().split('-')[1] : '');
  const BIRX = /\uE000([^\uE000\uE001\uE002]*)\uE001([^\uE000\uE002]*)\uE002/g;
  const part = (s, i) => String(s).replace(BIRX, i ? '$2' : '$1');
  window.plainText = (s) => (s == null ? s : part(s, 0));
  const BI = (a, b) => {
    if (!b || b === a) return a;
    if (/[<>]/.test(a) || /[<>]/.test(b)) return a + '<span class="b2 blk" dir="rtl" lang="ar">' + b + '</span>'; // HTML içeren metin
    return '\uE000' + a + '\uE001' + b + '\uE002';
  };
  const tl = (L, k, p) => String((I18N[L] && I18N[L][k]) ?? I18N.tr[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (p && p[x] != null ? part(p[x], L === lang2() && L !== lang() ? 1 : 0) : ''));
  window.t = (k, p) => { const a = tl(lang(), k, p); const l2 = lang2(); return l2 ? BI(a, tl(l2, k, p)) : a; };
  const tx = (o) => { const a = DocModel.tx(o, lang()); const l2 = lang2(); if (!l2 || !o || typeof o !== 'object' || !o[l2]) return a; return BI(a, o[l2]); };
  const fmtDate = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString(lang() === 'ar' ? 'ar-SY' : lang() === 'en' ? 'en-GB' : 'tr-TR'); } catch (e) { return d; } };
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- v1.5: iki dilli görünüm ----------
     İşaretli metin düğümleri <span class="bi"><span class="b1">ana</span><span class="b2">العربية</span></span> olur.
     Açılır liste, başlık ipucu, yer tutucu gibi alt satır olamayan yerlerde "ana — العربية" biçimi kullanılır. */
  const INLINE_TAGS = { OPTION: 1, TITLE: 1, TEXTAREA: 1, SCRIPT: 1, STYLE: 1 };
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  function biText(node) {
    const v = node.nodeValue; if (!v || v.indexOf('\uE000') < 0) return;
    const par = node.parentNode; if (!par) return;
    if (INLINE_TAGS[par.nodeName] || par.closest && par.closest('svg')) { node.nodeValue = v.replace(BIRX, '$1 — $2'); return; }
    const frag = document.createDocumentFragment(); let last = 0; let m; BIRX.lastIndex = 0;
    while ((m = BIRX.exec(v))) {
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      const w = document.createElement('span'); w.className = 'bi';
      const a = document.createElement('span'); a.className = 'b1'; a.textContent = m[1];
      const b = document.createElement('span'); b.className = 'b2'; b.dir = 'rtl'; b.lang = 'ar'; b.textContent = m[2];
      w.append(a, b); frag.appendChild(w); last = BIRX.lastIndex;
    }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last).replace(/[\uE000-\uE002]/g, '')));
    par.replaceChild(frag, node);
  }
  function biEl(el) {
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v && v.indexOf('\uE000') >= 0) el.setAttribute(a, v.replace(BIRX, '$1 — $2')); }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value && el.value.indexOf('\uE000') >= 0) el.value = part(el.value, 0); // düzenlenen değere işaret karışmasın
  }
  function biScan(root) {
    if (!root) return;
    if (root.nodeType === 3) { biText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) biEl(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const texts = []; let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) { if (n.nodeValue.indexOf('\uE000') >= 0) texts.push(n); } else biEl(n); }
    texts.forEach(biText);
  }
  const biObs = new MutationObserver((list) => {
    for (const mu of list) {
      if (mu.type === 'characterData') biText(mu.target);
      else if (mu.type === 'attributes') biEl(mu.target);
      else mu.addedNodes.forEach(biScan);
    }
  });
  biObs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const modeName = (m) => m.split('-').map((l) => (I18N[lang()] || I18N.tr)['langName_' + l]).join(' + '); // v2.0: dil adları da seçili dilde
  function setLang(m) {
    if (!MODES.includes(m)) m = 'tr';
    Store.local.lang = m;
    const pr = Store.local.ui.print; if (pr) { pr.lang = m.split('-')[0]; pr.lang2 = m.includes('-') ? m.split('-')[1] : ''; } // çıktılar varsayılan olarak aynı dil çiftiyle
    document.querySelectorAll('.modal-wrap').forEach((w) => w.remove()); // açık pencereler eski dilde kalmasın
    Store.saveLocal(); shell(); render();
  }

  /* ---------- simgeler ---------- */
  const P = {
    dash: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
    users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    assess: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
    print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
    plane: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z', // İngilizce sürüm: kep simgesi
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z', down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    clip: 'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    play: 'M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
    file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    full: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    win: 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
    cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    unlock: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
    chev: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    cal: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    x: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    dl: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z', ul: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    globe: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
    note: 'M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z', archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z', copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    exam: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    move: 'M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4h-6zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3L10 4z',
    folder: 'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    vocab: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM9.5 18 7 15.5l1.4-1.4 1.1 1.1 3.1-3.1 1.4 1.4L9.5 18zM13 9V3.5L18.5 9H13z',
    dict: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
    speak: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    img: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    bolt: 'M7 2v11h3v9l7-12h-4l4-8z', flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z', grip: 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z', translate: 'M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z',
  };
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;

  /* ---------- bildirim, modal ---------- */
  function toast(msg, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg;
    $('#toasts').appendChild(el); setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, kind === 'err' ? 5000 : 2600);
  }
  window.toast = toast;
  const modals = [];
  function modal(title, body, o) {
    o = o || {};
    const w = document.createElement('div'); w.className = 'modal-wrap';
    w.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''} ${o.cls || ''}" role="dialog"><div class="mh"><div class="mt">${title}</div><button class="ib mclose" title="${t('close')}">${icon('x')}</button></div><div class="mb">${body}</div>${o.foot !== false ? `<div class="mf">${o.foot || ''}${o.onOk ? `<button class="btn ghost mcancel">${t('cancel')}</button><button class="btn pri mok">${o.okText || t('save')}</button>` : `<button class="btn ghost mcancel">${t('close')}</button>`}</div>` : ''}</div>`;
    document.getElementById('modal-root').appendChild(w);
    const close = () => { w.remove(); const i = modals.indexOf(close); if (i >= 0) modals.splice(i, 1); o.onClose && o.onClose(); if (!modals.length && pendingRender) { pendingRender = false; render(); } };
    modals.push(close);
    w.addEventListener('mousedown', (e) => { if (e.target === w && !o.sticky) close(); });
    $('.mclose', w).onclick = close; const c = $('.mcancel', w); if (c) c.onclick = close;
    const ok = $('.mok', w);
    if (ok) ok.onclick = async () => { ok.disabled = true; try { const r = await o.onOk(w); if (r !== false) close(); } catch (e) { console.error(e); toast(e.message || String(e), 'err'); } ok.disabled = false; };
    setTimeout(() => { const f = $('input:not([type=checkbox]):not([type=color]),textarea,select', $('.mb', w)); if (f && !o.noFocus) f.focus(); }, 30);
    return { el: w, close };
  }
  function confirmDlg(msg, okText) { return new Promise((res) => { let done = false; modal(t('ok'), `<p class="cmsg">${esc(msg)}</p>`, { okText: okText || t('yes'), onOk: () => { done = true; res(true); }, onClose: () => { if (!done) res(false); }, cls: 'small' }); }); }

  /* ---------- çok dilli alan düzenleyici ---------- */
  function triFields(name, val, o) {
    val = val || {}; o = o || {};
    const order = [lang(), ...['tr', 'en', 'ar'].filter((x) => x !== lang())];
    return `<div class="tri" data-tri="${name}">${order.map((l) => `<label class="fl"><span>${t('text' + l[0].toUpperCase() + l[1])}${l === lang() ? ' ★' : ''}</span>${o.area ? `<textarea rows="2" data-l="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">${esc(val[l] || '')}</textarea>` : `<input data-l="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}" value="${esc(val[l] || '')}">`}</label>`).join('')}</div>`;
  }
  function readTri(root, name) { const o = {}; $$(`[data-tri="${name}"] [data-l]`, root).forEach((e) => (o[e.dataset.l] = e.value.trim())); return o; }
  async function fillTranslations(obj) {
    const src = obj[lang()] ? lang() : obj.tr ? 'tr' : obj.en ? 'en' : 'ar';
    if (!obj[src]) return obj;
    for (const l of ['tr', 'en', 'ar']) {
      if (!obj[l]) { try { obj[l] = await translateText(obj[src], src, l); } catch (e) { obj[l] = obj[src]; obj._untranslated = true; } }
    }
    const u = obj._untranslated; delete obj._untranslated; if (u) toast(t('translateFail'), 'err');
    return obj;
  }
  function triBlockFoot() { return `<label class="chk"><input type="checkbox" class="autotr" checked> ${t('autoTranslate')}</label><button type="button" class="btn ghost sm trnow">${icon('translate')} ${t('translateNow')}</button>`; }
  function wireTri(m) {
    const b = $('.trnow', m.el); if (!b) return;
    b.onclick = async () => { b.disabled = true; b.textContent = t('translating'); for (const box of $$('[data-tri]', m.el)) { const o = readTri(m.el, box.dataset.tri); const has = Object.values(o).some(Boolean); if (!has) continue; await fillTranslations(o); $$('[data-l]', box).forEach((e) => (e.value = o[e.dataset.l] || '')); } b.disabled = false; b.innerHTML = icon('translate') + ' ' + t('translateNow'); };
  }
  async function readTriAuto(m, name) { const o = readTri(m.el, name); const auto = $('.autotr', m.el); if (auto && auto.checked && Object.values(o).some(Boolean) && Object.values(o).some((v) => !v)) await fillTranslations(o); else { const f = o[lang()] || o.tr || o.en || o.ar || ''; for (const l of ['tr', 'en', 'ar']) if (!o[l]) o[l] = f; } return o; }

  /* ---------- yönlendirme ---------- */
  const R = { page: 'dashboard', sid: null, tab: 'summary', history: [] };
  function go(page, extra) {
    R.history.push({ page: R.page, sid: R.sid, tab: R.tab });
    if (R.history.length > 30) R.history.shift();
    R.page = page; Object.assign(R, extra || {});
    if (page === 'plans' && !(extra && extra.pid)) R.pid = null; // v2.1: menüden açılınca liste
    if (page !== 'student') R.sid = extra && extra.sid ? extra.sid : R.sid;
    render(true);
    document.body.classList.remove('nav-open');
  }
  function back() { const h = R.history.pop(); if (!h) return false; Object.assign(R, h); render(true); return true; }
  window.__onBack = () => { if (modals.length) { modals[modals.length - 1](); return true; } if (document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); return true; } return back(); };

  const PAGES = {};
  const NAV = [['dashboard', 'dash', 'nav_dashboard'], ['curriculum', 'book', 'nav_curriculum'], ['students', 'users', 'nav_students'], ['assess', 'assess', 'nav_assess'], ['plans', 'cal', 'nav_plans'], ['exams', 'exam', 'nav_exams'], ['grammar', 'clock', 'nav_grammar'], ['dict', 'dict', 'nav_dict'], ['vocab', 'vocab', 'nav_vocab'], ['print', 'print', 'nav_print'], ['settings', 'gear', 'nav_settings'], ['help', 'help', 'nav_help']];

  function shell() {
    const L = lang();
    document.documentElement.lang = L; document.documentElement.dir = L === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('bilingual', !!lang2());
    document.title = plainText(t('appName')) + ' v' + Platform.semver;
    $('#app').innerHTML = `
      <header class="topbar">
        <button class="ib burger" id="burger">${icon('menu')}</button>
        <div class="brand" id="brand"><div class="logo">${logoSvg()}</div><div><div class="bt"><span class="nfull">${t('appName')}</span><span class="nshort">${t('appShort')}</span> <span class="bver">v${Platform.semver}</span></div><div class="bv">v${Platform.semver} · ${tx(Store.cur().title)}</div></div></div>
        <div class="sp"></div>
        <div class="gsearch" id="gsWrap"></div>
        <div class="progsel p-${Store.prog}" title="${t('program')}">${icon('plane')}<select id="progSel">${Store.PROGS.map((p) => `<option value="${p}" ${p === Store.prog ? 'selected' : ''}>${t('prog_' + p)}</option>`).join('')}</select></div>
        <button class="chip upd" id="updChip" hidden>${icon('dl')}<span></span></button>
        <button class="chip sync" id="syncChip" title="${t('sync')}">${icon('cloud')}<span></span></button>
        <div class="langsel">${icon('globe')}<select id="langSel">${MODES.map((l) => `<option value="${l}" ${l === mode() ? 'selected' : ''}>${modeName(l)}</option>`).join('')}</select></div>
        ${Platform.kind !== 'android' ? `<button class="ib" id="fsBtn" title="${t('windowed')}">${icon('win')}</button>` : ''}
        ${Platform.kind !== 'web' && Platform.quit ? `<button class="ib" id="quitBtn" title="${t('closeApp')}">${icon('x')}</button>` : ''}
      </header>
      <nav class="sidebar">${NAV.map(([p, ic, k]) => `<a class="nav" data-go="${p}">${icon(ic)}<span>${t(k)}</span></a>`).join('')}
        <div class="navfoot">${icon('plane', 'big')}<div>${t('dataSafe')}</div></div></nav>
      <main id="main"></main>
      <nav class="bottombar">${NAV.slice(0, 5).map(([p, ic, k]) => `<a class="bnav" data-go="${p}">${icon(ic)}<span>${t(k)}</span></a>`).join('')}</nav>
      <div class="scrim" id="scrim"></div>`;
    $('#langSel').onchange = (e) => setLang(e.target.value);
    $('#progSel').onchange = (e) => { setProgram(e.target.value); };
    $('#burger').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    $('#brand').onclick = () => go('dashboard');
    $('#syncChip').onclick = () => go('settings', { anchor: 'sync' });
    $('#updChip').onclick = () => updateModal();
    if ($('#quitBtn')) $('#quitBtn').onclick = () => { if (confirm(t('closeAsk'))) { Store.persistNow(); setTimeout(() => Platform.quit(), 300); } };
    updChip();
    const fb = $('#fsBtn');
    if (fb) { const upd = (fs) => { fb.innerHTML = icon(fs ? 'win' : 'full'); fb.title = fs ? t('windowed') : t('fullscreen'); }; fb.onclick = async () => upd(await Platform.toggleFullscreen()); Platform.isFullscreen().then(upd); Platform.onFullscreen(upd); }
    $$('[data-go]').forEach((a) => (a.onclick = () => go(a.dataset.go)));
    syncChip();
    if (window.GSearch) GSearch.mount();
  }
  /* v1.5: çalışılan eğitim programını değiştirir (Genel / Kanatlı / FPV) */
  function setProgram(p, keepPage) {
    if (p === Store.prog) return;
    Store.setProg(p); shell();
    if (!keepPage && (R.page === 'student')) { R.page = 'students'; }
    if (!keepPage) toast(t('progSwitched', { p: t('prog_' + p) }));
    render();
  }
  /* Öğrenci açılınca bağlam öğrencinin programına geçer */
  function ensureProg(st) {
    const p = Store.progOf(st); if (p === Store.prog) return;
    Store.setProg(p); // sayfa çizimi sırasında çağrılır: kabuğu yeniden kurmadan yalnız üst çubuğu güncelle
    const ps = $('.progsel'); if (ps) { ps.className = 'progsel p-' + p; $('select', ps).value = p; }
    const bv = $('.brand .bv'); if (bv) bv.textContent = 'v' + Platform.semver + ' · ' + tx(Store.cur().title);
  }
  function logoSvg() { return `<svg viewBox="0 0 64 64"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fc3f7"/><stop offset="1" stop-color="#1565c0"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#lg)"/><circle cx="32" cy="32" r="30" fill="none" stroke="#ffb74d" stroke-width="2.5" stroke-dasharray="4 5"/><path fill="#fff" transform="translate(12 11) scale(1.67)" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`; }
  function syncChip() {
    const c = $('#syncChip'); if (!c) return;
    const s = Sync.state; const map = { off: 'syncOff', connecting: 'syncBusy', busy: 'syncBusy', on: 'syncOn', error: 'syncErr', offline: 'syncOffline' };
    c.className = 'chip sync s-' + s; $('span', c).textContent = t(map[s] || 'syncOff');
  }
  Sync.onState(() => { syncChip(); if (R.page === 'settings') { const box = $('#syncStatus'); if (box) box.innerHTML = syncStatusHtml(); } if (Sync.state === 'on' && window.Files) Files.pushPending(); });

  /* v1.8: Ekran sabitliği — yeniden çizimde son tıklanan (ya da ekranda görünen ilk) öğe aynı ekran konumunda kalır.
     İki dilli metinler çizimle aynı anda dönüştürülür; böylece yükseklik sonradan değişip ekran kaymaz. */
  let lastPt = null;
  document.addEventListener('pointerdown', (e) => { lastPt = e.target; }, true);
  document.addEventListener('focusin', (e) => { if (e.target && e.target.closest && e.target.closest('#main')) lastPt = e.target; }, true);
  const KEYS = ['data-gs', 'data-iid', 'data-mid', 'data-mk', 'data-lid', 'data-at', 'data-id', 'data-sid', 'data-fi', 'data-p', 'data-i', 'data-note', 'data-rv', 'data-open', 'data-pt', 'data-tab', 'data-o', 'data-k', 'data-prog', 'data-lang', 'data-f', 'data-ev', 'data-ef', 'data-a', 'data-q'];
  const scroller = () => $('#main');
  function anchorOf(main) {
    let el = lastPt && lastPt.isConnected && main.contains(lastPt) ? lastPt : null;
    if (!el) { const r0 = main.getBoundingClientRect(); el = [...main.querySelectorAll(KEYS.map((k) => '[' + k + ']').join(','))].find((x) => x.getBoundingClientRect().bottom > r0.top + 4) || null; }
    const chain = [];
    for (let e = el; e && e !== main; e = e.parentElement) for (const k of KEYS) if (e.hasAttribute && e.hasAttribute(k)) { chain.push({ k, v: e.getAttribute(k), el: e }); break; }
    // en dıştaki benzersiz anahtar + içteki öğe birlikte aranır
    for (const c of chain) { const sel = '[' + c.k + '="' + (window.CSS && CSS.escape ? CSS.escape(c.v) : c.v) + '"]'; const all = [...main.querySelectorAll(sel)]; const idx = all.indexOf(c.el); if (idx >= 0) return { sel, idx, top: c.el.getBoundingClientRect().top }; }
    return null;
  }
  function keepPos(fn) {
    const main = scroller(); if (!main) return fn();
    const st = main.scrollTop; const a = anchorOf(main);
    const done = () => {
      biScan(main);
      main.scrollTop = st;
      if (a) { const all = main.querySelectorAll(a.sel); const el = all[a.idx] || all[0]; if (el) { const d = el.getBoundingClientRect().top - a.top; if (Math.abs(d) > 0.5) main.scrollTop += d; } }
      afterRender.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    };
    const r = fn();
    if (r && typeof r.then === 'function') return r.then((v) => { done(); return v; });
    done(); return r;
  }
  const afterRender = [];
  function render(nav) {
    $$('[data-go]').forEach((a) => a.classList.toggle('on', a.dataset.go === (R.page === 'student' ? 'students' : R.page)));
    const m = $('#main'); if (!m) return;
    const fn = PAGES[R.page] || PAGES.dashboard;
    if (nav) {
      m.innerHTML = ''; const r = fn(m, R); m.scrollTop = 0;
      const fin = () => { biScan(m); m.scrollTop = 0; afterRender.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); };
      if (r && typeof r.then === 'function') return r.then(fin); fin(); return r;
    }
    return keepPos(() => { m.innerHTML = ''; return fn(m, R); });
  }
  let rt = null; let pendingRender = false;
  Store.on((what) => { if (UI.suspendRender) return; clearTimeout(rt); rt = setTimeout(() => { const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT') && $('#main').contains(ae) && what && what.startsWith && what.startsWith('student:')) return; if (!modals.length) render(); else pendingRender = true; }, 60); });

  /* ---------- PANEL ---------- */
  /* v2.0: etkinlik kayıtlarındaki unvan adı kaydedildiği dilde kalmasın — her zaman seçili dilde göster */
  function actParams(a) {
    const p = Object.assign({}, a.params || {});
    if (p.r) { p.r = String(p.r).replace(/\uE000([^\uE001]*)\uE001[^\uE002]*\uE002/g, '$1'); let f = null; for (const pg of Store.PROGS) { f = (Store.ranks(pg) || []).find((x) => x.name && ['tr', 'en', 'ar'].some((l) => x.name[l] === p.r)); if (f) break; } p.r = f ? tx(f.name) : window.LangGuard ? LangGuard.ptx(p.r) : p.r; }
    return p;
  }
  PAGES.dashboard = (m) => {
    const st = Store.students(false, Store.prog); const c = Store.counts();
    const avg = st.length ? Math.round(st.reduce((a, s) => a + Store.overall(s), 0) / st.length) : 0;
    const ranks = Store.ranks(); const dist = ranks.map(() => 0); st.forEach((s) => dist[Store.rankOf(s).index]++);
    const maxd = Math.max(1, ...dist);
    m.innerHTML = `
      <section class="hero"><div><h1>${t('dashWelcome')}</h1><p>${t('dashSub')}</p><div class="progseg">${Store.PROGS.map((p) => `<button class="p-${p} ${p === Store.prog ? 'on' : ''}" data-prog="${p}">${t('prog_' + p)}</button>`).join('')}</div><p class="muted sm">${esc(tx(Store.cur().title))}</p></div><div class="hero-plane">${icon('plane')}</div></section>
      ${!st.length ? `<div class="card tip">${icon('bolt')} ${t('welcomeHelp')}</div>` : ''}
      <div class="stats">
        ${[[t('statStudents'), st.length, 'users'], [t('statLevels'), c.levels, 'flag'], [t('statModules'), c.modules, 'book'], [t('statItems'), c.items, 'check'], [t('statAvg'), '%' + avg, 'plane']].map(([l, v, i]) => `<div class="stat">${icon(i)}<div class="sv">${v}</div><div class="sl">${l}</div></div>`).join('')}
      </div>
      <div class="cols">
        <div class="card"><h3>${t('topStudents')}</h3>${st.length ? `<div class="slist">${st.slice(0, 12).map((s) => studentRow(s)).join('')}</div>` : `<p class="muted">${t('noStudents')}</p>`}</div>
        <div class="card"><h3>${t('rankDist')}</h3><div class="rdist">${ranks.map((r, i) => `<div class="rd"><span class="rbadge" style="--rc:${r.color}">${esc(tx(r.name))}</span><div class="bar"><i style="width:${(dist[i] / maxd) * 100}%;background:${r.color}"></i></div><b>${dist[i]}</b></div>`).join('')}</div>
          <h3 style="margin-top:18px">${t('quickActions')}</h3><div class="qa">
          <button class="btn pri" data-q="addStudent">${icon('plus')} ${t('addStudent')}</button>
          <button class="btn" data-q="assess">${icon('assess')} ${t('nav_assess')}</button>
          <button class="btn" data-q="print">${icon('print')} ${t('printBlank')}</button>
          <button class="btn" data-q="curriculum">${icon('book')} ${t('nav_curriculum')}</button></div></div>
      </div>
      <div class="card"><h3>${t('recent')}</h3>${Store.db.activity.length ? `<ul class="act">${Store.db.activity.slice(0, 12).map((a) => `<li><span class="muted">${fmtDate(a.t)}</span> ${esc(t(a.key, actParams(a)))}</li>`).join('')}</ul>` : `<p class="muted">${t('noActivity')}</p>`}</div>`;
    $$('[data-sid]', m).forEach((e) => (e.onclick = () => go('student', { sid: e.dataset.sid, tab: 'summary' })));
    $$('[data-prog]', m).forEach((b) => (b.onclick = () => setProgram(b.dataset.prog)));
    $$('[data-q]', m).forEach((b) => (b.onclick = () => { const q = b.dataset.q; if (q === 'addStudent') UI.editStudent(); else if (q === 'print') go('print', { ptype: 'blank' }); else go(q); }));
  };
  function studentRow(s) {
    const r = Store.rankOf(s);
    return `<div class="srow" data-sid="${s.id}"><div class="av" style="--rc:${r.rank.color}">${esc((s.name || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</div><div class="sn"><b>${esc(s.name)}</b><span class="rbadge" style="--rc:${r.rank.color}">${esc(tx(r.rank.name))}</span></div><div class="bar sm"><i style="width:${r.score}%"></i></div><b class="pc">${r.score}</b></div>`;
  }

  /* ---------- AYARLAR ---------- */
  function syncStatusHtml() {
    const s = Store.local.sync;
    if (Sync.state === 'off') return `<span class="pill">${t('syncOff')}</span>`;
    return `<span class="pill s-${Sync.state}">${t({ on: 'syncOn', busy: 'syncBusy', connecting: 'syncBusy', error: 'syncErr', offline: 'syncOffline' }[Sync.state] || 'syncOff')}</span> ${s.email ? `${t('connectedAs')}: <b>${esc(s.email)}</b> · ` : ''}${t('workspace').split('(')[0]}: <b>${esc(s.workspace)}</b>${Store.local.lastSync ? ` · ${t('lastSync')}: ${new Date(Store.local.lastSync).toLocaleString()}` : ''}${Sync.msg && Sync.state === 'error' ? `<div class="err">${esc(Sync.msg === 'login' ? t('loginNeeded') : Sync.msg)}</div>` : ''}`;
  }
  PAGES.settings = (m, r) => {
    const C = Store.db.config; const I = C.institution; const S = C.scoring; const sy = Store.local.sync;
    const RK = Store.ranks(); const PT = Store.paths(); const progNote = `<span class="pill p-${Store.prog}">${t('program')}: ${t('prog_' + Store.prog)}</span>`;
    m.innerHTML = `<h2 class="ph">${icon('gear')} ${t('settings')}</h2>
    <div class="card"><h3>${icon('globe')} ${t('language')}</h3><div class="seg wrap">${MODES.map((l) => `<button class="${l === mode() ? 'on' : ''}" data-lang="${l}">${modeName(l)}</button>`).join('')}</div><p class="muted sm">${t('biHint')}</p></div>
    ${updCardHtml()}
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
      <div class="grid3"><label class="fl"><span>${t('workspace')}</span><input id="fbWs" dir="ltr" value="${esc(sy.workspace || 'iha-mufredat')}"></label><label class="fl"><span>${t('email')}</span><input id="fbEm" type="email" dir="ltr" value="${esc(sy.email || '')}"></label><label class="fl"><span>${t('password')}</span><input id="fbPw" type="password" dir="ltr"></label></div>
      <div class="row"><button class="btn pri" id="fbLogin">${icon('cloud')} ${t('login')}</button><button class="btn ghost" data-go-help="fb">${icon('help')} ${t('fbGuide')}</button></div>
      <p class="muted sm">${t('accountsHint')}</p>
      ${sy.ortakKesildi ? `<p class="err">⚠ ${esc(t('ortakKesildi'))}</p>` : ''}
      <p class="muted sm">${esc(t('kendiHesap'))} <a href="#" id="fbRehber">${esc(t('kendiHesapRehber'))}</a></p>
      <details class="adv" open><summary>${t('advanced')}</summary><label class="fl"><span>${t('fbConfig')}</span><textarea id="fbCfg" rows="5" dir="ltr" placeholder="${esc(t('fbConfigPh'))}">${sy.config && sy.config.projectId !== FB_CONFIG.projectId ? esc(JSON.stringify(sy.config, null, 1)) : ''}</textarea></label><button class="btn sm ghost" id="fbPaste">${icon('copy')} ${t('pasteLink')}</button></details>` : `
      <div class="row"><button class="btn pri" id="fbNow">${icon('cloud')} ${t('syncNow')}</button><button class="btn" id="fbCopy">${icon('copy')} ${t('copyLink')}</button><button class="btn ghost danger" id="fbOut">${t('logout')}</button></div><p class="muted sm">${t('linkHelp')}</p>`}
    </div>
    ${window.V24 ? V24.settingsTop() : ''}
    <div id="kulYer"></div>
    <div class="card"><h3>${t('backup')}</h3><div class="row"><button class="btn" id="expBtn">${icon('dl')} ${t('exportData')}</button><label class="btn">${icon('ul')} ${t('importData')}<input type="file" accept=".json,application/json" id="impIn" hidden></label>${Platform.kind === 'desktop' ? `<button class="btn ghost" id="bkFolder">${t('openBackupFolder')}</button>` : ''}</div>${Platform.kind === 'desktop' ? `<p class="muted sm">${t('autoBackupInfo')}</p>` : ''}</div>
    ${Platform.kind === 'desktop' ? `<div class="card"><h3>${t('display')}</h3><p>${t('startFullscreen')}</p><button class="btn" id="fsToggle">${icon('win')} ${t('windowed')} / ${t('fullscreen')}</button></div>` : ''}
    ${window.V24 ? V24.settingsBottom() : ''}
    ${Contact.cardHtml()}`;
    wireUpd(m); Contact.wire(m); if (window.V24) V24.wireSettings(m);
    { const ky = $('#kulYer', m); if (ky && window.Kullanim) { const k = Kullanim.kart(); k.classList.add('card'); ky.replaceWith(k); } }
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
    const ft = $('#fsToggle', m); if (ft) ft.onclick = () => Platform.toggleFullscreen();
    if (r.anchor) { const a = $('#' + r.anchor, m); if (a) setTimeout(() => a.scrollIntoView({ behavior: 'smooth' }), 50); r.anchor = null; }
  };
  function editTri(title, val, onSave, area) {
    const mm = modal(title, triFields('v', val, { area }), { foot: triBlockFoot(), onOk: async (w) => { const v = await readTriAuto(mm, 'v'); if (!Object.values(v).some(Boolean)) { toast(t('required'), 'err'); return false; } onSave(v); } });
    wireTri(mm); return mm;
  }
  async function resizeImage(file, max) {
    const url = URL.createObjectURL(file); const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c.toDataURL('image/png');
  }

  /* ---------- GÜNCELLEMELER ---------- */
  function updChip() {
    const c = $('#updChip'); if (!c) return; const U = Updater; const v = U.latest && Updater.semver(U.latest.version);
    const show = ['available', 'downloading', 'ready'].includes(U.state);
    c.hidden = !show; c.className = 'chip upd s-' + U.state;
    $('span', c).textContent = U.state === 'ready' ? t('restartNow') : U.state === 'downloading' ? (U.dl ? IndirmeIlerleme.yazi(U.dl, lang()) : t('downloading', { p: U.progress })) : t('updateChip', { v });
  }
  function updNotes() { const L = Updater.latest || {}; return L['notes_' + lang()] || L.notes_tr || ''; }
  function updBoxHtml() {
    const U = Updater; const v = U.latest && Updater.semver(U.latest.version);
    let st = '';
    if (!U.supported()) st = `<p class="muted">${t('noOta')}</p>`;
    else if (U.state === 'checking') st = `<p>${t('checking')}</p>`;
    else if (U.state === 'uptodate') st = `<p class="ok">${icon('check')} ${t('upToDate')}</p>`;
    else if (U.state === 'available') st = `<p><b>${t('updateAvailable', { v })}</b></p>${updNotes() ? `<div class="notes"><b>${t('whatsNew')}</b><div class="pre">${esc(updNotes())}</div></div>` : ''}<button class="btn pri" data-u="install">${icon('dl')} ${t('updateNow')}</button>`;
    else if (U.state === 'downloading') st = `<p>${t('downloading', { p: U.progress })}</p><div class="bar"><i style="width:${U.progress}%"></i></div>${U.dl ? `<p class="muted">${esc(IndirmeIlerleme.yazi(U.dl, lang()))}</p>` : ''}`;
    else if (U.state === 'ready') st = `<p class="ok">${t('updateReady', { v })}</p><button class="btn pri" data-u="restart">${icon('bolt')} ${t('restartNow')}</button>`;
    else if (U.state === 'shellOld') st = `<p class="err">${t('shellOld', { v })}</p>`;
    else if (U.state === 'error') st = `<p class="err">${t('updateErr')}: ${esc(U.error)}</p>`;
    const last = Store.local.lastUpdateCheck ? new Date(Store.local.lastUpdateCheck).toLocaleString() : '—';
    return `<p>${t('currentVersion')}: <b>v${Platform.semver}</b>${U.shell() ? ` <span class="muted sm">(${Platform.kind}, shell ${U.shell()})</span>` : ''}</p>${st}
      ${U.supported() && !['downloading', 'ready'].includes(U.state) ? `<div class="row"><button class="btn sm" data-u="check">${icon('cloud')} ${t('checkUpdates')}</button><span class="muted sm">${t('lastCheck')}: ${last}</span></div>` : ''}`;
  }
  function wireUpdBox(box) {
    $$('[data-u]', box).forEach((b) => (b.onclick = async () => {
      const a = b.dataset.u;
      if (a === 'check') Updater.check(true);
      if (a === 'install') { try { await Updater.install(); Updater.restart(); } catch (e) { toast(t('updateErr') + ': ' + e.message, 'err'); } } // v1.2: tek dokunuş: indir, kur, yeniden başlat
      if (a === 'restart') Updater.restart();
    }));
  }
  function updCardHtml() {
    const C = Updater.cfg();
    return `<div class="card" id="upd"><h3>${icon('dl')} ${t('updates')}</h3><div id="updBox">${updBoxHtml()}</div>
      <div class="updcfg"><h4>${t('updCfgTitle')}</h4>
        <label class="chk"><input type="checkbox" data-uc="remind" ${C.remind ? 'checked' : ''}> ${t('updCfgRemind')}</label>
        <label class="chk"><input type="checkbox" data-uc="sys" ${C.sys ? 'checked' : ''}> ${t('updCfgSys')}</label>
        <p class="muted sm">${t('updCfgHint')}</p></div>
      <details class="adv"><summary>${t('publishUpdate')}</summary><p class="muted sm">${t('publishHelp')}</p>
      <div class="grid3"><label class="fl"><span>${t('email')}</span><input id="pubEm" dir="ltr" value="${esc(window.FB_ADMIN_EMAIL || '')}"></label><label class="fl"><span>${t('password')}</span><input id="pubPw" type="password" dir="ltr"></label>
      <div class="fl"><span>&nbsp;</span><button class="btn pri" id="pubBtn">${icon('ul')} ${t('chooseIhu')}</button><input type="file" id="pubFile" accept=".ihu,application/json" hidden></div></div><div id="pubSt" class="muted"></div></details></div>`;
  }
  function wireUpd(m) {
    const box = $('#updBox', m); if (box) wireUpdBox(box);
    $$('[data-uc]', m).forEach((c) => (c.onchange = () => { Updater.setCfg({ [c.dataset.uc]: c.checked }); toast(t('saved')); }));
    const fi = $('#pubFile', m); if (!fi) return;
    $('#pubBtn', m).onclick = () => { if (!$('#pubPw', m).value) { toast(t('password') + ': ' + t('required'), 'err'); $('#pubPw', m).focus(); return; } fi.click(); };
    fi.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; e.target.value = '';
      const st = $('#pubSt', m); const pw = $('#pubPw', m).value; const em = $('#pubEm', m).value.trim();
      st.textContent = t('publishing', { p: 0 });
      try { const v = await Updater.publish(await f.text(), em, pw, (p) => (st.textContent = t('publishing', { p }))); st.innerHTML = `<span class="ok">${esc(t('published', { v }))}</span>`; toast(t('published', { v })); setTimeout(() => Updater.check(true), 1500); }
      catch (er) { console.error(er); st.innerHTML = `<span class="err">${esc(t('error') + ': ' + er.message)}</span>`; }
    };
  }
  /* v1.4: her yeni sürümde bildirim — sistem bildirimi (izin varsa) ve uygulama içi pencere; her sürüm için bir kez */
  let sessionNotified = '';
  function notifyUpdate() {
    const U = Updater; const v = U.latest && Updater.semver(U.latest.version);
    const C = U.cfg();
    // v1.8: "her açılışta hatırlat" açıksa her oturumda bir kez, kapalıysa her sürüm için bir kez
    if (U.state !== 'available' || !v || (C.remind ? sessionNotified === v : Store.local.notifiedUpd === v)) return;
    if (modals.length) return; // açık bir pencere varken araya girmez; sonraki denetimde yeniden denenir
    sessionNotified = v; Store.local.notifiedUpd = v; Store.saveLocal();
    try {
      if (C.sys && 'Notification' in window) {
        const show = () => { const n = new Notification(t('updNotifTitle', { v }), { body: (updNotes() || t('updNotifBody')).slice(0, 220) }); n.onclick = () => { window.focus(); updateModal(); }; };
        if (Notification.permission === 'granted') show(); else if (Notification.permission !== 'denied') Notification.requestPermission().then((p) => { if (p === 'granted') show(); });
      }
    } catch (e) {}
    const mm = modal(icon('bolt') + ' ' + t('updNotifTitle', { v }), `${updNotes() ? `<div class="notes"><b>${t('whatsNew')}</b><div class="pre">${esc(updNotes())}</div></div>` : `<p>${t('updNotifBody')}</p>`}<p class="muted sm">${t('updNotifKeep')}</p>`,
      { foot: `<button class="btn pri" id="unow">${icon('dl')} ${t('updateNow')}</button>` });
    $('#unow', mm.el).onclick = () => { mm.close(); updateModal(); };
  }
  /* güncellemeden sonraki ilk açılışta: "vX.Y kuruldu" ve yenilikler */
  function showWhatsNew() {
    const v = Platform.semver, last = Store.local.lastRunVer;
    if (last === v) return;
    Store.local.lastRunVer = v; Store.saveLocal();
    if (!last) return; // ilk kurulum
    const N = window.APP_NOTES || {}; const txt = N[lang()] || N.tr || '';
    modal(icon('check') + ' ' + t('updDoneTitle', { v }), `${txt ? `<div class="notes"><b>${t('whatsNew')}</b><div class="pre">${esc(txt)}</div></div>` : ''}<p class="muted sm">${t('updNotifKeep')}</p>`, {});
  }
  function updateModal() {
    if (Updater.state === 'ready') { Updater.restart(); return; }
    if (Updater.state === 'available') { Updater.install().then(() => Updater.restart()).catch((e) => toast(t('updateErr') + ': ' + e.message, 'err')); return; } // v1.2: tek dokunuşla güncelle
    if (Updater.state === 'downloading') return;
    const mm = modal(icon('dl') + ' ' + t('updates'), `<div id="updBox2">${updBoxHtml()}</div>`, {});
    const box = $('#updBox2', mm.el); wireUpdBox(box);
    Updater.on(() => { if (!document.body.contains(box)) return; box.innerHTML = updBoxHtml(); wireUpdBox(box); });
  }

  /* ---------- YARDIM ---------- */
  PAGES.help = (m, r) => {
    m.innerHTML = `<h2 class="ph">${icon('help')} ${t('helpTitle')}</h2>${lang2() && window.HELP && HELP[lang2()] ? `<div class="helpbi"><div class="card help">${HELP[lang()] || HELP.tr}</div><div class="card help" dir="rtl" lang="ar">${HELP[lang2()]}</div></div>` : `<div class="card help">${(window.HELP && (HELP[lang()] || HELP.tr)) || ''}</div>`}`;
    if (r.anchor) { const a = $('#' + r.anchor, m); if (a) setTimeout(() => a.scrollIntoView(), 50); r.anchor = null; }
  };

  window.UI = { $, $$, esc, icon, tx, t: window.t, lang, lang2, mode, MODES, setLang, keepPos, afterRender, biScan, fmtDate, today, toast, modal, confirmDlg, triFields, readTri, readTriAuto, wireTri, triBlockFoot, fillTranslations, editTri, go, back, render, shell, PAGES, R, studentRow, resizeImage, modals, setProgram, ensureProg };

  window.App = {
    async start() {
      await Store.init();
      document.body.classList.add('pf-' + Platform.kind);
      shell(); render();
      Sync.start();
      Updater.on(() => { updChip(); const b = $('#updBox'); if (b) { b.innerHTML = updBoxHtml(); wireUpdBox(b); } notifyUpdate(); });
      Updater.init();
      setTimeout(showWhatsNew, 1200);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modals.length) modals[modals.length - 1](); });
    },
  };
})();
