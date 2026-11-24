// Kayıt deposu (Store), birleştirme (Birlestir) ve Wi‑Fi birleştirme kuralı (Lan.birlestir): hiçbir kayıt kaybolmaz.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { baglam, yukle, bellek } = require('../yardimci/yukle.js');

const VERI = ['js/veri/default-data.js', 'js/veri/programs-data.js', 'js/veri/exams-data.js', 'js/veri/dict-data.js', 'js/veri/vocab-data.js'];
function store(ls) {
  const c = baglam({ localStorage: bellek(ls) });
  c.APP_RELEASE = { version: '3.1.0', compat: '3.100', notes: {} };
  c.Platform = { kind: 'web', persist: () => {}, restore: async () => null };
  yukle(c, VERI.concat(['js/temel/store.js', 'js/temel/birlestir.js', 'js/temel/lan.js']));
  return c;
}

test('kayıt anahtarları değişmez (eski sürümlerin verisi okunur)', async () => {
  const eski = { schema: 1, curriculum: { levels: [], updatedAt: 5 }, config: { ranks: [], paths: [], institution: { name: 'Okul' } }, students: { s1: { id: 's1', name: 'Ali', marks: { i1: 'k' }, updatedAt: 9 } }, activity: [] };
  const c = store({ ingmufredat_db_v1: JSON.stringify(eski), ingmufredat_local_v1: JSON.stringify({ lang: 'ar', deviceId: 'dX', ui: { theme: 'light' } }) });
  await c.Store.init();
  assert.strictEqual(c.Store.db.students.s1.name, 'Ali');
  assert.strictEqual(c.Store.db.students.s1.marks.i1, 'k');
  assert.strictEqual(c.Store.db.config.institution.name, 'Okul');
  assert.strictEqual(c.Store.local.lang, 'ar');
  assert.strictEqual(c.Store.local.deviceId, 'dX');
  assert.ok(c.Store.db.curricula && c.Store.db.exams && c.Store.db.dict && c.Store.db.vocab, 'eksik parçalar varsayılanlarla eklenir');
  const yazilan = JSON.parse(c.localStorage.getItem('ingmufredat_db_v1'));
  assert.strictEqual(yazilan.students.s1.name, 'Ali');
});

test('localStorage boşsa kabuğun kayıt dosyasından (db.json) okunur', async () => {
  const c = store({});
  c.Platform.restore = async () => JSON.stringify({ schema: 1, students: { s9: { id: 's9', name: 'Ayşe' } } });
  await c.Store.init();
  assert.strictEqual(c.Store.db.students.s9.name, 'Ayşe');
});

test('öğrenci silme kalıcı değildir (deleted işareti; veri durur)', async () => {
  const c = store({});
  await c.Store.init();
  const s = c.Store.addStudent({ name: 'Zeynep' });
  c.Store.deleteStudent(s.id);
  assert.strictEqual(c.Store.db.students[s.id].deleted, true);
  assert.strictEqual(c.Store.db.students[s.id].name, 'Zeynep');
  assert.ok(!c.Store.students(true).some((x) => x.id === s.id));
});

test('Birlestir: iki tarafta farklı alanlar korunur; aynı alanda yenisi kalır, kaybeden çakışmaya yazılır', () => {
  const c = store({});
  const base = { name: 'A', no: '1', journal: [{ id: 'j1', t: 'x' }] };
  const yerel = { name: 'A', no: '2', journal: [{ id: 'j1', t: 'x' }, { id: 'j2', t: 'yerel' }] };
  const uzak = { name: 'B', no: '3', journal: [{ id: 'j1', t: 'x' }, { id: 'j3', t: 'uzak' }] };
  const r = c.Birlestir.merge(base, yerel, uzak, { remoteNewer: true });
  assert.strictEqual(r.value.name, 'B');
  assert.strictEqual(r.value.no, '3');
  assert.deepStrictEqual(Array.from(r.value.journal, (x) => x.id).sort(), ['j1', 'j2', 'j3']);
  assert.ok(r.items.some((x) => x.kind === 'conflict' && x.lost === '2'));
});

test('Wi‑Fi birleştirme: iki taraftaki öğrenciler birleşir, uzak silme yerelde arşivlenir (veri durur), çakışma kaydedilir', () => {
  const c = store({});
  const log = [];
  const yerel = { students: { a: { id: 'a', name: 'Ali', no: '1', updatedAt: 10 }, b: { id: 'b', name: 'Banu', updatedAt: 10 } }, activity: [{ t: 1, key: 'x' }], plans: { list: { p1: { id: 'p1', title: { tr: 'Plan' }, updatedAt: 3 } }, updatedAt: 3 } };
  const uzak = { students: { a: { id: 'a', name: 'Ali', no: '9', updatedAt: 20 }, b: { id: 'b', name: 'Banu', deleted: true, updatedAt: 30 }, c: { id: 'c', name: 'Cem', updatedAt: 5 } }, activity: [{ t: 2, key: 'y' }], plans: { list: { p2: { id: 'p2', title: { tr: 'Yeni' }, updatedAt: 4 } }, updatedAt: 4 } };
  const m = c.Lan.birlestir(JSON.parse(JSON.stringify(yerel)), uzak, (k, l, items) => log.push([k, items]));
  assert.deepStrictEqual(Object.keys(m.students).sort(), ['a', 'b', 'c']);
  assert.strictEqual(m.students.a.no, '9');                       // yeni olan kalır
  assert.ok(log.some(([k, items]) => k === 'st:a' && items.some((x) => x.lost === '1')), 'kaybeden değer çakışma geçmişine');
  assert.strictEqual(m.students.b.deleted, true);                  // uzakta silinen → yerelde de silinmiş işaretli …
  assert.strictEqual(m.students.b.name, 'Banu');                   // … ama veri durur (Ayarlar → Arşiv'den geri alınır)
  assert.deepStrictEqual(Object.keys(m.plans.list).sort(), ['p1', 'p2']);
  assert.strictEqual(m.activity.length, 2);
  // yerelde olup uzakta olmayan hiçbir şey kaybolmaz
  const yalnizYerel = c.Lan.birlestir({ students: { z: { id: 'z', name: 'Zehra' } } }, { students: {} });
  assert.strictEqual(yalnizYerel.students.z.name, 'Zehra');
});

test('Wi‑Fi paketi yalnız bu uygulamanın verisini kabul eder', async () => {
  const c = store({});
  await c.Store.init();
  assert.throws(() => c.Lan.uygula({ app: 'baska', db: {} }), /veri/);
});
