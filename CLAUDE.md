# İngilizce Müfredat Sistemi

CEFR müfredatı, öğrenci takibi, ölçme-değerlendirme ve çıktılar. Windows masaüstü (Electron, NSIS kurulum, `masaustu/`) +
Android (Gradle'sız WebView kabuğu, `android/`). Arayüz `kaynak/` (düz JS, derleme adımı `araclar/derle.js`). 3.1.0'dan beri
ortak çekirdek üzerinde yeniden düzenlendi (eski yama katmanları v24.js / enjekte.js / 5 i18n yaması kaldırıldı).

## Düzen
- `kaynak/dosyalar.json` betik sırası (tek kaynak): `js/surum.js` → `temel/ayar.js` → `i18n/{tr,en,ar}.js` → `veri/*` (hazır müfredat,
  sınavlar, sözlük, çeviri belleği) → `temel/*` (platform, store, birlestir, sync, lan, ceviri …) → `arayuz/*` (temel, panel, sayfalar,
  danisman, kurum, ayarlar, yardim) → `uygulama/kabuk.js` (ortak çekirdek bağlantısı + açılış). `derle.js` bunları `js/uygulama.js`
  olarak birleştirir (kararlı çıktı: aynı kaynak → aynı bayt; FCD1 yamaları buna dayanır). Kitaplıklar `kaynak/vendor/`;
  çevrimdışı OCR (Tesseract 5) npm'den derlemede eklenir (depoya ikili dosya girmez).
- Metinler: dil başına TEK sözlük `kaynak/i18n/{tr,en,ar}.js`. Yeni metin üç dosyaya aynı anahtarla eklenir (test denetler; koddaki
  `t('anahtar')` sözlükte olmalı). Beş dil kipi korunur: tr, en, ar, tr-ar, en-ar (iki dilli görünüm). Arapça RTL, gömülü Noto Sans Arabic.
- Ortak çekirdek: `kaynak/cekirdek/` (fc-core.js, css, yazı tipleri) + `masaustu/cekirdek/` (Electron) + `android/src/com/departuresmil/ortak/`.
  Commit `kaynak/cekirdek/VERSION`'da (yerel ekler orada yazılı). ortak-cekirdek deposunu buradan değiştirme.

## Kurallar (kullanıcı)
- Kullanıcı "BAŞLA" demeden yeni iş başlatma. Yazışma dili Türkçe. Arayüz tr/en/ar (+ iki dilli kipler).
- Sürüm semver X.Y.Z, etiket `vX.Y.Z`. Tek kaynak `package.json`: önce `release-notes.json` (tr/en/ar), sonra `node araclar/surum.js X.Y.Z`
  (→ `kaynak/js/surum.js`: sürüm, eski kanal kimliği `3.100`, notlar). `npm test` tutarlılığı denetler.
- **Kayıtlar asla kaybolmaz.** Masaüstü veri klasörü `%APPDATA%\IngMufredatSistemi` (localStorage/IndexedDB `app://ingmufredat`
  kökeninde + `veri\db.json` atomik + günlük `yedekler\`); Android paket `com.departures.ingmufredat`, köken `https://ing.local`,
  `files/veri/db.json`. localStorage anahtarları (`ingmufredat_db_v1`, `ingmufredat_local_v1`, `ingmufredat_ai_*`), IndexedDB
  (`ingmufredat_files`, `ingmufredat_templates`, `ingmufredat_sync`) ve Firestore yolları (`mufredat_ing/{kurumKodu}/…`) DEĞİŞMEZ.
  appId `com.departures.ingmufredat`, productName `Ing Mufredat Sistemi` DEĞİŞMEZ.
- Eşitleme ad alanı: eşitlemesi önceden kurulu cihaz Firebase uygulama adı/şifreli giriş öneki olarak `iha-mufredat`ta kalır
  (değişirse kayıtlı oturum açılmaz), yeni cihaz `ing-mufredat` (`Store.local.sync.ns`). Kurum kodu önerisi ve paylaşım bağlantısı
  (`IHAMS1:`) cihazlar arası biçim olduğu için aynı kalır.
- Silme yok: öğrenci/ders programı silinince `deleted:true` (Ayarlar → Arşiv'den geri alınır). Firebase üç yönlü birleştirme ve Wi‑Fi
  eşitleme aynı kural: uzakta silinen → yerelde de silinmiş işaretli ama veri durur; aynı alanda iki değer → yenisi kalır, öbürü
  Çakışma geçmişine (IndexedDB `ingmufredat_sync/conflicts`).
- Wi‑Fi eşitleme protokolü v2 (port 47851): kod ağda gönderilmez, HMAC-SHA256 imzalı istek/yanıt, tek kullanımlık meydan, 5 yanlış
  denemede kilit, CORS yok, Origin'li istek reddedilir. Masaüstü `masaustu/lan-sunucu.js`, Android `LanSunucu.java` — ikisi birebir
  (test/birim/lan-protokol.test.js Java imzasını da denetler). Birleştirme arayüzde (`kaynak/js/temel/lan.js`).
- Kabuk üzerinden GET yalnız izin listesine (çeviri hizmeti, departures-mil GitHub): `platform.js`, `masaustu/main.js`, `Kopru.java` aynı liste.
- Yapay zeka: her kullanıcı KENDİ anahtarı (Gemini/OpenAI/Anthropic/uyumlu sunucu, Ollama/LM Studio) + çevrimdışı yerleşik danışman.
  Çeviri sırası: çeviri belleğinde birebir → kendi AI anahtarı → genel çeviri (translate.googleapis.com) → çevrimdışı bellek (taslak).
- Ayarlar: Görünüm · uygulama kartları · Asistan Agent · Kullanım Limitleri · Otomatik hata raporu · Hakkında · **Admin ile iletişim EN SON**.
- Üst çubuk: [Duyurular · ✦] Eşitle · Wi‑Fi · Güncelle · tema · dil | Küçült · Orta · Tam ekran · Kapat. Masaüstü her açılışta tam ekran.
- Kullanıcıya APK/exe dosyası gönderme; güncelleme uygulamanın içinden. İmza anahtarları depoya girmez.

## Güncelleme / yayın
- Yalnız GitHub Releases + `latest.json` + FCD1 yama (ortak `reusable-release.yml`). Kanallar: `win-app` (app.asar), `win-setup`
  (NSIS, sürüm sayfasında `IngMufredat-X.Y.Z-win-setup.exe`, kullanıcı başına), `android` (APK; kurulu APK + yama → yeni APK, `Kopru.apkUpdate`).
- CI `.github/workflows/release.yml`: test (birim + Playwright + Electron xvfb) → build-win (NSIS + Windows duman testi) + build-android
  (secret'lar varsa; APK sertifikası 3.0.0 APK'sınınkiyle aynı olmalı: `45c0abce…ad7f`) → release (yalnız main'de workflow_dispatch ya da etiket).
  Yayın: `gh api -X POST repos/departures-mil/ing-mufredat-guncelleme/actions/workflows/release.yml/dispatches -f ref=main`.
- ESKİ KANAL KÖPRÜSÜ (kabuk 2–3: taşınabilir exe ve 3.0.0 APK): depo kökündeki `latest.json` + `paketler/ing_<kimlik>.b64` (raw main, imzasız —
  eski arayüzün imza listesi boş). Release'ten SONRA: `node araclar/derle.js && node araclar/eski-kanal.js` → commit + push main.
  Eski kabukta yeni arayüz açılır, açılış onayını verir ve "Yeni kurulum gerekli" (masaüstü → kurulum dosyası) / "Yeni uygulama sürümü"
  (Android → APK) penceresini gösterir. Yeni kurulum eski taşınabilir klasörün `resources\app`ini siler (`masaustu/kurulum/kurulum.nsh`).
  Kabuk 3'ün kendi güncellemesi (`kabuk/kabuk.json`, Ed25519) kullanılmıyor; anahtar `_Anahtarlar\IngMufredat\kabuk-imza.pem` gerekmiyor.

## Test
- `npm test` = `node araclar/derle.js` + `node --test test/birim/*.test.js` (sürüm, derleme, i18n, çeviri, birleştirme, Wi‑Fi protokolü,
  izin listesi, eski kanal) + `test/arayuz.test.js` (Playwright: `PLAYWRIGHT_CORE=/opt/npm-tools/node_modules/playwright-core
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) + `test/electron.test.js` (gerçek Electron, xvfb, `ING_SMOKE=1`, `ING_VERI`).
- Ekran görüntüleri: `node araclar/ekran.js <klasör>`. APK yerelde: `ANDROID_TOOLS=<bt/,pf/> APK_IMZASIZ=1 bash araclar/apk.sh`.
