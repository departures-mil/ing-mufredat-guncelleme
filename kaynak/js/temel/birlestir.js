/* v2.4.0: Kayıt bazında birleştirme ve çakışma geçmişi
   "Son yazan kazanır" yerine üç yönlü birleştirme yapılır:
     taban  = bu cihazın en son eşitlediği hâl
     yerel  = bu cihazdaki hâl
     uzak   = buluttaki (ya da diğer cihazdaki) hâl
   - Yalnız bir tarafta değişen alan o taraftan alınır.
   - Kimlikli (id) listeler (günlük, uçuş kaydı, konular…) öğe öğe birleştirilir; iki tarafta eklenenlerin hepsi kalır.
   - İki tarafta da farklı değiştirilen alanda daha yeni olan kazanır; kaybeden değer çakışma geçmişine yazılır (silinmez).
   - Taban yoksa (ilk eşitleme) hiçbir şey silinmez: iki tarafın kayıtları birleşir.
   Aynı birleştirme internetsiz (aynı modem) eşitlemede de kullanılır. */
(function () {
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const eq = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const SKIP = { updatedAt: 1 };
  const idOf = (x) => (isObj(x) ? x.id || x.uid || null : null);
  const idList = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => idOf(x) != null) && new Set(a.map(idOf)).size === a.length;

  function mergeIdArrays(base, a, b, ctx, path) {
    const bm = new Map((Array.isArray(base) ? base : []).filter(isObj).map((x) => [idOf(x), x]));
    const am = new Map(a.map((x) => [idOf(x), x]));
    const rm = new Map(b.map((x) => [idOf(x), x]));
    const order = [];
    const seen = new Set();
    // sıra: yerel sıra, araya uzakta yeni eklenenler kendi komşularının ardından
    for (const x of a) { order.push(idOf(x)); seen.add(idOf(x)); }
    b.forEach((x, i) => {
      const id = idOf(x); if (seen.has(id)) return;
      let pos = order.length;
      for (let j = i - 1; j >= 0; j--) { const k = order.indexOf(idOf(b[j])); if (k >= 0) { pos = k + 1; break; } }
      order.splice(pos, 0, id); seen.add(id);
    });
    const out = [];
    for (const id of order) {
      const inA = am.has(id), inB = rm.has(id), inBase = bm.has(id);
      if (inA && inB) out.push(merge(bm.get(id), am.get(id), rm.get(id), ctx, path + '[' + id + ']'));
      else if (inA) { // uzakta yok: tabanda vardı ve yerelde değişmediyse uzakta silinmiştir
        if (inBase && eq(bm.get(id), am.get(id))) continue;
        if (inBase) ctx.log(path + '[' + id + ']', am.get(id), undefined, 'keptEdited');
        out.push(am.get(id));
      } else { // yerelde yok
        if (inBase && eq(bm.get(id), rm.get(id))) continue;
        if (inBase) ctx.log(path + '[' + id + ']', rm.get(id), undefined, 'keptEdited');
        out.push(rm.get(id));
      }
    }
    return out;
  }

  function merge(base, a, b, ctx, path) {
    if (eq(a, b)) return clone(a);
    if (base !== undefined && eq(base, a)) return clone(b);
    if (base !== undefined && eq(base, b)) return clone(a);
    if (a === undefined) return clone(b);
    if (b === undefined) return clone(a);
    if (isObj(a) && isObj(b)) {
      const o = {}; const bs = isObj(base) ? base : undefined;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        if (SKIP[k]) { if (path && (k in a || k in b)) o[k] = Math.max(+(a[k] || 0), +(b[k] || 0)); continue; }
        const inA = k in a, inB = k in b, inBase = bs && k in bs;
        if (inA && inB) o[k] = merge(bs ? bs[k] : undefined, a[k], b[k], ctx, path ? path + '.' + k : k);
        else if (inA) { if (inBase && eq(bs[k], a[k])) continue; o[k] = clone(a[k]); }
        else { if (inBase && eq(bs[k], b[k])) continue; o[k] = clone(b[k]); }
      }
      return o;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (idList(a) && idList(b)) return mergeIdArrays(base, a, b, ctx, path);
      if ((a.length === 0 || idList(a)) && (b.length === 0 || idList(b))) return mergeIdArrays(base, a, b, ctx, path);
      const prim = (x) => x.every((v) => v === null || typeof v !== 'object');
      if (prim(a) && prim(b)) { // basit listeler: tabanda olup bir tarafta silinenler çıkar, eklenenlerin hepsi kalır
        const bset = new Set(Array.isArray(base) ? base.map(String) : []);
        const sa = new Set(a.map(String)), sb = new Set(b.map(String));
        const out = [];
        for (const v of a) if (!(bset.has(String(v)) && !sb.has(String(v)))) out.push(v);
        for (const v of b) if (!sa.has(String(v)) && !bset.has(String(v))) out.push(v);
        return out;
      }
    }
    // gerçek çakışma: daha yeni taraf kazanır, kaybeden kayda geçer
    const win = ctx.remoteNewer ? b : a, lose = ctx.remoteNewer ? a : b;
    ctx.log(path, win, lose, 'conflict');
    return clone(win);
  }

  /* Çakışma geçmişi — yalnız bu cihazda (IndexedDB), son 300 kayıt */
  const DBN = 'ingmufredat_sync', ST_B = 'base', ST_C = 'conflicts';
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('idb'));
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(ST_B)) d.createObjectStore(ST_B); if (!d.objectStoreNames.contains(ST_C)) d.createObjectStore(ST_C, { autoIncrement: true }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = async (st, mode, fn) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const s = t.objectStore(st); let out; const q = fn(s); if (q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };

  const baseCache = new Map();
  const B = {
    merge(base, local, remote, opts) {
      const items = [];
      const ctx = { remoteNewer: !!(opts && opts.remoteNewer), log: (path, kept, lost, kind) => items.push({ path, kept, lost, kind }) };
      const out = merge(base, local, remote, ctx, '');
      return { value: out, items };
    },
    eq,
    /* taban: { u: updatedAt, d: JSON metni } */
    async loadBases() { try { await tx(ST_B, 'readonly', (s) => { const q = s.openCursor(); q.onsuccess = () => { const c = q.result; if (c) { baseCache.set(c.key, c.value); c.continue(); } }; return null; }); } catch (e) { console.warn('base', e); } },
    base(key) { return baseCache.get(key) || null; },
    setBase(key, u, d) { const v = { u: u || 0, d: typeof d === 'string' ? d : JSON.stringify(d) }; baseCache.set(key, v); tx(ST_B, 'readwrite', (s) => s.put(v, key)).catch(() => {}); },
    async logConflicts(key, label, items, by) {
      const real = items.filter((x) => x.kind === 'conflict' || x.kind === 'keptEdited');
      if (!real.length) return;
      const t = Date.now();
      try {
        await tx(ST_C, 'readwrite', (s) => { real.slice(0, 50).forEach((x) => s.add({ t, key, label, path: x.path, kind: x.kind, kept: JSON.stringify(x.kept === undefined ? null : x.kept).slice(0, 4000), lost: JSON.stringify(x.lost === undefined ? null : x.lost).slice(0, 4000), by: by || '' })); return null; });
        const all = await this.conflicts(); if (all.length > 300) { const old = all.slice(300).map((x) => x._k); await tx(ST_C, 'readwrite', (s) => { old.forEach((k) => s.delete(k)); return null; }); }
      } catch (e) { console.warn('conflict log', e); }
      (this.listeners || []).forEach((f) => { try { f(); } catch (e) {} });
    },
    async conflicts() {
      const out = [];
      try { await tx(ST_C, 'readonly', (s) => { const q = s.openCursor(null, 'prev'); q.onsuccess = () => { const c = q.result; if (c) { out.push(Object.assign({ _k: c.key }, c.value)); c.continue(); } }; return null; }); } catch (e) {}
      return out;
    },
    async clearConflicts() { try { await tx(ST_C, 'readwrite', (s) => s.clear()); } catch (e) {} },
    listeners: [],
    onConflict(f) { this.listeners.push(f); },
  };
  window.Birlestir = B;
})();
