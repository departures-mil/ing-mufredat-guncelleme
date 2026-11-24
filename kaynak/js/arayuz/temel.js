/* Arayüz temeli: metin (t / tx, iki dilli görünüm), simgeler, bildirim ve pencere, çok dilli alan düzenleyici,
   yönlendirme (go / back), program kabuğu (yan menü + üst çubuk) ve sayfa çizimi (konumu koruyarak).
   Sayfalar UI.PAGES[ad] = (main, R) => … olarak kendi dosyalarında tanımlanır (panel.js, ayarlar.js, ui-*.js).
   Üst çubuğun sağ ucu (Eşitle · Wi‑Fi · Güncelle · tema · dil | Küçült · Orta · Tam ekran · Kapat) ortak çekirdekten gelir:
   uygulama/kabuk.js UI.onShell ile #topbar'a bağlar. */
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
    Store.saveLocal();
    try { if (window.FC && FC.i18n && FC.i18n.lang() !== lang()) FC.i18n.set(lang()); } catch (e) {}
    shell(); render();
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
  P.spark = 'M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14zM5 14l.9 2.6 2.6.9-2.6.9L5 21l-.9-2.6-2.6-.9 2.6-.9L5 14z';
  P.chat = 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z';
  P.wifi = 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z';
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
  const NAV = [['dashboard', 'dash', 'nav_dashboard'], ['curriculum', 'book', 'nav_curriculum'], ['students', 'users', 'nav_students'], ['assess', 'assess', 'nav_assess'], ['plans', 'cal', 'nav_plans'], ['exams', 'exam', 'nav_exams'], ['grammar', 'clock', 'nav_grammar'], ['dict', 'dict', 'nav_dict'], ['vocab', 'vocab', 'nav_vocab'], ['ai', 'chat', 'nav_ai'], ['print', 'print', 'nav_print'], ['settings', 'gear', 'nav_settings'], ['help', 'help', 'nav_help']];
  const onShell = [];   // kabuk her kurulduğunda çağrılır (uygulama/kabuk.js: ortak çekirdek üst çubuğu)

  function shell() {
    const L = lang();
    document.documentElement.lang = L; document.documentElement.dir = L === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('bilingual', !!lang2());
    document.title = plainText(t('appName')) + ' v' + Platform.semver;
    $('#app').innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="brand" id="brand"><div class="logo">${logoSvg()}</div><div class="brand-txt"><div class="bt">${t('appShort')}</div><div class="bv">v${esc(Platform.semver)}</div></div></div>
        <nav class="nav" id="nav">${NAV.map(([p, ic, k]) => `<a class="nav-item" data-go="${p}" href="#">${icon(ic)}<span>${t(k)}</span></a>`).join('')}</nav>
        <div class="navfoot">${icon('lock')}<div>${t('dataSafe')}</div></div>
      </aside>
      <div class="main-col">
        <header class="topbar" id="topbar">
          <button class="ib burger" id="burger" title="${t('menu') || ''}">${icon('menu')}</button>
          <div class="topbar-title"><div class="pt" id="pageTitle"></div><div class="ps" id="pageSub">${tx(Store.cur().title)}</div></div>
          <div class="sp"></div>
          <div class="gsearch" id="gsWrap"></div>
          <button class="ib ai-top" id="aiTop" title="${t('aiTitle')}">${icon('chat')}</button>
          <div class="progsel p-${Store.prog}" title="${t('program')}">${icon('plane')}<select id="progSel">${Store.PROGS.map((p) => `<option value="${p}" ${p === Store.prog ? 'selected' : ''}>${t('prog_' + p)}</option>`).join('')}</select></div>
        </header>
        <main id="main"></main>
      </div>
      <nav class="bottombar">${NAV.slice(0, 5).map(([p, ic, k]) => `<a class="bnav" data-go="${p}" href="#">${icon(ic)}<span>${t(k)}</span></a>`).join('')}</nav>
      <div class="scrim" id="scrim"></div>`;
    $('#progSel').onchange = (e) => { setProgram(e.target.value); };
    $('#burger').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    $('#brand').onclick = () => go('dashboard');
    $('#aiTop').onclick = () => go('ai', R.page === 'student' && R.sid ? { sid: R.sid } : undefined);
    $$('[data-go]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); go(a.dataset.go); }));
    if (window.GSearch) GSearch.mount();
    onShell.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  }
  function pageTitle() {
    const p = R.page === 'student' ? 'students' : R.page;
    const n = NAV.find((x) => x[0] === p);
    const el = $('#pageTitle'); if (el) el.textContent = plainText(t(n ? n[2] : 'appName'));
    const ps = $('#pageSub'); if (ps) ps.textContent = plainText(tx(Store.cur().title));
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
    const sel = $('.progsel'); if (sel) { sel.className = 'progsel p-' + p; $('select', sel).value = p; }
    const ps = $('#pageSub'); if (ps) ps.textContent = plainText(tx(Store.cur().title));
  }
  function logoSvg() { return `<svg viewBox="0 0 64 64"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fc3f7"/><stop offset="1" stop-color="#1565c0"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#lg)"/><circle cx="32" cy="32" r="30" fill="none" stroke="#ffb74d" stroke-width="2.5" stroke-dasharray="4 5"/><path fill="#fff" transform="translate(12 11) scale(1.67)" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`; }
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
    $$('[data-go]').forEach((a) => { const on = a.dataset.go === (R.page === 'student' ? 'students' : R.page); a.classList.toggle('on', on); a.classList.toggle('active', on); });
    pageTitle();
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
  function editTri(title, val, onSave, area) {
    const mm = modal(title, triFields('v', val, { area }), { foot: triBlockFoot(), onOk: async (w) => { const v = await readTriAuto(mm, 'v'); if (!Object.values(v).some(Boolean)) { toast(t('required'), 'err'); return false; } onSave(v); } });
    wireTri(mm); return mm;
  }
  async function resizeImage(file, max) {
    const url = URL.createObjectURL(file); const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c.toDataURL('image/png');
  }
  function studentRow(s) {
    const r = Store.rankOf(s);
    return `<div class="srow" data-sid="${s.id}"><div class="av" style="--rc:${r.rank.color}">${esc((s.name || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</div><div class="sn"><b>${esc(s.name)}</b><span class="rbadge" style="--rc:${r.rank.color}">${esc(tx(r.rank.name))}</span></div><div class="bar sm"><i style="width:${r.score}%"></i></div><b class="pc">${r.score}</b></div>`;
  }
  const openUrl = (u) => { try { Platform.openUrl ? Platform.openUrl(u) : window.open(u, '_blank'); } catch (e) { window.open(u, '_blank'); } };

  window.UI = { $, $$, esc, icon, tx, t: window.t, lang, lang2, mode, MODES, modeName, setLang, keepPos, afterRender, biScan, fmtDate, today, toast, modal, confirmDlg, triFields, readTri, readTriAuto, wireTri, triBlockFoot, fillTranslations, editTri, go, back, render, shell, onShell, PAGES, NAV, R, studentRow, resizeImage, modals, setProgram, ensureProg, logoSvg, openUrl, suspendRender: false };
})();
