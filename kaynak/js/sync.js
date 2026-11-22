/* Firebase (Firestore) ile masaüstü ↔ Android senkronizasyonu
   Yapı: mufredat/{kurumKodu}/meta/curriculum, mufredat/{kurumKodu}/meta/config, mufredat/{kurumKodu}/students/{id}
   Her belge: { data: JSON metni, updatedAt: ms, by: cihazKimliği } — son yazan kazanır (updatedAt'e göre). */
(function () {
  const SEP = ['plans', 'exams', 'dict', 'vocab'];
  const Y = {
    state: 'off', msg: '', user: null, app: null, auth: null, fs: null, unsubs: [], dirty: new Set(), timer: null, ready: { curriculum: false, config: false, students: false },
    listeners: new Set(),
    onState(fn) { this.listeners.add(fn); },
    setState(s, msg) { this.state = s; this.msg = msg || ''; this.listeners.forEach((f) => f(s, msg)); },

    parseConfig(text) {
      if (!text) return null;
      if (typeof text === 'object') return text;
      const o = {};
      const re = /["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g; let m;
      while ((m = re.exec(text))) o[m[1]] = m[2];
      return o.apiKey && o.projectId ? o : null;
    },
    wsId(s) { return String(s || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); },
    makeLink() { const s = Store.local.sync; return 'IHAMS1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ c: s.config, w: s.workspace })))); },
    readLink(code) { try { const j = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^IHAMS1:/, ''))))); return j && j.c ? j : null; } catch (e) { return null; } },

    async ensureApp(config) {
      if (!window.FB) throw new Error('Firebase kütüphanesi yüklenemedi');
      if (this.app) { try { this.unsubs.forEach((u) => u()); } catch (e) {} this.unsubs = []; try { await FB.deleteApp(this.app); } catch (e) {} this.app = null; }
      // Sabit uygulama adı: kayıtlı oturum bu ada bağlıdır (her açılışta otomatik bağlanma için şart)
      this.app = FB.initializeApp(config, 'iha-mufredat');
      try { this.auth = FB.initializeAuth(this.app, { persistence: [FB.indexedDBLocalPersistence, FB.browserLocalPersistence] }); } catch (e) { this.auth = FB.getAuth(this.app); }
      this.fs = FB.initializeFirestore(this.app, { localCache: FB.memoryLocalCache(), experimentalAutoDetectLongPolling: true });
    },
    async connect({ config, workspace, email, password, create }) {
      const cfg = (config && String(config).trim() ? this.parseConfig(config) : null) || (window.FB_CONFIG && window.FB_CONFIG.apiKey ? window.FB_CONFIG : null);
      if (!cfg) throw new Error(t('syncInvalid'));
      const ws = this.wsId(workspace);
      if (!ws) throw new Error(t('workspace') + ': ' + t('required'));
      this.setState('connecting');
      await this.ensureApp(cfg);
      const cred = create ? await FB.createUserWithEmailAndPassword(this.auth, email, password) : await FB.signInWithEmailAndPassword(this.auth, email, password);
      this.user = cred.user;
      await this.saveCred(email, password);
      Object.assign(Store.local.sync, { config: cfg, workspace: ws, email, enabled: true });
      Store.saveLocal();
      this.attach();
    },
    async start() {
      const s = Store.local.sync;
      if (s && !s.config && window.FB_CONFIG && window.FB_CONFIG.apiKey) s.config = window.FB_CONFIG;
      if (s && s.config && window.FB_YAYIN && s.config.projectId === window.FB_YAYIN.projectId && String(s.email || '').toLowerCase() !== String(window.FB_ADMIN_EMAIL || '').toLowerCase()) {
        Object.assign(s, { enabled: false, config: null, ortakKesildi: true }); delete s.cred; Store.saveLocal();
      }
      if (!s || !s.enabled || !s.config || !s.workspace) { this.setState('off'); return; }
      try {
        this.setState('connecting');
        await this.ensureApp(s.config);
        try { if (this.auth.authStateReady) await this.auth.authStateReady(); } catch (e) {}
        await new Promise((res) => { const un = FB.onAuthStateChanged(this.auth, (u) => { un(); this.user = u; res(); }); });
        // Oturum bulunamazsa cihazda saklanan bilgilerle sessizce yeniden giriş
        if (!this.user) { const cr = await this.loadCred(); if (cr && cr.e && cr.p) { try { this.user = (await FB.signInWithEmailAndPassword(this.auth, cr.e, cr.p)).user; } catch (e) { console.warn('auto-login', e.code); } } }
        if (!this.user) { this.setState('error', 'login'); return; }
        this.attach();
      } catch (e) { console.error(e); this.setState('error', e.message); }
    },
    async disconnect() {
      try { this.unsubs.forEach((u) => u()); } catch (e) {}
      this.unsubs = [];
      try { if (this.auth) await FB.signOut(this.auth); } catch (e) {}
      Store.local.sync.enabled = false; delete Store.local.sync.cred; Store.saveLocal(); this.user = null; this.setState('off');
    },
    /* Giriş bilgisi yalnız bu cihazda, cihaz anahtarıyla şifreli saklanır (eşitlenmez) */
    async key() { const raw = new TextEncoder().encode('iha-mufredat|' + Store.local.deviceId); const h = await crypto.subtle.digest('SHA-256', raw); return crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']); },
    async saveCred(e, p) { try { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key(), new TextEncoder().encode(JSON.stringify({ e, p })))); const b = (u) => btoa(String.fromCharCode.apply(null, u)); Store.local.sync.cred = b(iv) + '.' + b(ct); Store.saveLocal(); } catch (er) { console.warn(er); } },
    async loadCred() { try { const c = Store.local.sync.cred; if (!c) return null; const [a, b] = c.split('.').map((x) => Uint8Array.from(atob(x), (ch) => ch.charCodeAt(0))); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: a }, await this.key(), b))); } catch (er) { return null; } },
    ref(...p) { return FB.doc(this.fs, 'mufredat_ing', Store.local.sync.workspace, ...p); },
    /* v1.5: eşitlenen meta parçaları — genel müfredat, ayarlar ve her programın müfredatı */
    metaParts() { return ['curriculum', 'config', 'plans', 'exams', 'dict', 'vocab'].concat(Object.keys(Store.db.curricula || {}).map((p) => 'curriculum_' + p)); },
    getPart(part) { if (part === 'plans') return Store.db.plans; if (part === 'exams' || part === 'dict' || part === 'vocab') return Store.db[part] || { updatedAt: 0 }; return part === 'config' ? Store.db.config : part === 'curriculum' ? Store.db.curriculum : (Store.db.curricula || {})[part.slice(11)]; },
    setPart(part, obj) { if (part === 'plans') { obj.list = obj.list || {}; Store.db.plans = obj; return; } if (part === 'exams' || part === 'dict' || part === 'vocab') { Store.db[part] = obj; return; } if (part === 'config') Store.db.config = obj; else if (part === 'curriculum') Store.db.curriculum = obj; else Store.db.curricula[part.slice(11)] = obj; },
    attach() {
      const ws = Store.local.sync.workspace;
      this.ready = { students: false }; this.metaParts().forEach((p) => (this.ready[p] = false));
      const onErr = (e) => { console.error(e); if (e && e.code === 'resource-exhausted') window.Kullanim&&Kullanim.kotaDoldu('bulut'); this.setState('error', e.code || e.message); };
      for (const part of this.metaParts()) {
        this.unsubs.push(FB.onSnapshot(this.ref('meta', part), (snap) => {
          if (!snap.metadata.fromCache) window.Kullanim&&Kullanim.say('okuma', 1);
          const local = this.getPart(part);
          if (!snap.exists()) { this.dirty.add(part); this.schedule(50); }
          else {
            const r = snap.data();
            if ((r.updatedAt || 0) > (local.updatedAt || 0)) { try { const o = JSON.parse(r.data); o.updatedAt = r.updatedAt; this.setPart(part, o); Store.persist(); Store.emit(part); } catch (e) { console.error(e); } }
            else if ((local.updatedAt || 0) > (r.updatedAt || 0)) { this.dirty.add(part); this.schedule(50); }
          }
          this.ready[part] = true; this.okState();
        }, SEP.includes(part) ? (e) => { console.warn(part, e.code || e.message); this.ready[part] = true; this.okState(); } : onErr));
      }
      this.unsubs.push(FB.onSnapshot(FB.collection(this.fs, 'mufredat_ing', ws, 'students'), (qs) => {
        if (!qs.metadata.fromCache) window.Kullanim&&Kullanim.say('okuma', Math.max(1, qs.docChanges().length));
        const remoteIds = new Set(); let changed = false;
        qs.forEach((d) => {
          remoteIds.add(d.id); const r = d.data(); const l = Store.db.students[d.id];
          if (!l || (r.updatedAt || 0) > (l.updatedAt || 0)) { try { const obj = JSON.parse(r.data); obj.updatedAt = r.updatedAt; Store.db.students[d.id] = obj; changed = true; } catch (e) {} }
          else if ((l.updatedAt || 0) > (r.updatedAt || 0)) this.dirty.add('student:' + d.id);
        });
        if (!this.ready.students) { for (const id of Object.keys(Store.db.students)) if (!remoteIds.has(id)) this.dirty.add('student:' + id); }
        if (changed) { Store.persist(); Store.emit('students'); }
        if (this.dirty.size) this.schedule(50);
        this.ready.students = true; this.okState();
      }, onErr));
    },
    okState() { if (Object.values(this.ready).every(Boolean) && this.state !== 'busy') { Store.local.lastSync = Date.now(); Store.saveLocal(); this.setState(navigator.onLine === false ? 'offline' : 'on'); } },
    markDirty(part) {
      if (part === 'all') { this.metaParts().forEach((p) => this.dirty.add(p)); Object.keys(Store.db.students).forEach((id) => this.dirty.add('student:' + id)); }
      else this.dirty.add(part);
      if (this.state === 'on' || this.state === 'offline' || this.state === 'busy') this.schedule(1200);
    },
    schedule(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), ms); },
    async push() {
      if (!this.fs || !this.user || !this.dirty.size) return;
      const parts = [...this.dirty]; this.dirty.clear();
      this.setState('busy');
      try {
        const batch = FB.writeBatch(this.fs); let n = 0;
        const by = Store.local.deviceId;
        for (const p of parts) {
          if (SEP.includes(p)) continue; // ayrı yazılır (aşağıda)
          if (p === 'curriculum' || p === 'config' || p.startsWith('curriculum_')) { const o = this.getPart(p); if (!o) continue; if (!o.updatedAt) o.updatedAt = Date.now(); batch.set(this.ref('meta', p), { data: JSON.stringify(o), updatedAt: o.updatedAt, by }); n++; }
          else if (p.startsWith('student:')) { const id = p.slice(8); const s = Store.db.students[id]; if (!s) continue; if (!s.updatedAt) s.updatedAt = Date.now(); batch.set(this.ref('students', id), { data: JSON.stringify(s), updatedAt: s.updatedAt, by }); n++; }
          if (n >= 400) break;
        }
        if (n) { await batch.commit(); window.Kullanim&&Kullanim.say('yazma', n); }
        // v2.1: ortak ders programları ayrı yazılır; bir sorun diğer kayıtların eşitlenmesini engellemez
        // v1.1: sınav sistemi ve sözlük de ayrı yazılır
        for (const sp of SEP) if (parts.includes(sp) && Store.db[sp]) { try { const o = Store.db[sp]; if (!o.updatedAt) o.updatedAt = Date.now(); await FB.setDoc(this.ref('meta', sp), { data: JSON.stringify(o), updatedAt: o.updatedAt, by }); window.Kullanim&&Kullanim.say('yazma', 1); } catch (e) { console.warn(sp + ' sync', e.code || e.message); } }
        Store.local.lastSync = Date.now(); Store.saveLocal();
        this.setState('on');
      } catch (e) { console.error(e); parts.forEach((p) => this.dirty.add(p)); this.setState(navigator.onLine === false ? 'offline' : 'error', e.code || e.message); this.schedule(15000); }
    },
    syncNow() { this.markDirty('all'); this.schedule(10); },
  };
  window.addEventListener('online', () => { if (Y.state === 'offline' || Y.state === 'error') { Y.setState('on'); Y.schedule(500); } });
  window.addEventListener('offline', () => { if (Y.state !== 'off') Y.setState('offline'); });
  window.Sync = Y;
})();
