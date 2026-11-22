# İngilizce Müfredat Sistemi — kaynak ve güncelleme kanalı

Programın (masaüstü ve telefon) arayüz kaynağı ve uygulama içi güncellemeleri buradadır.

- `kaynak/` — programın arayüz kaynağı (masaüstü/Android kabuğu, minShell 2, kurulu programdadır).
- `latest.json` — son sürüm bilgisi. Program açılışta buna bakar.
- `paketler/` — son sürüm paketi (gzip + base64). Önceki sürümler **Releases** sayfasında saklanır.
- `firebase/kurum.rules` — kurumların kendi Firebase projesine yapıştıracağı güvenlik kuralları.
- `araclar/` — yayın ve imza araçları.

Kayıtlar ve yedekler bu depoda **bulunmaz**. Onlar yalnızca kullanıcının cihazında (`%APPDATA%\IngMufredatSistemi`) ve kurumun kendi Firebase hesabında durur.

## Sürüm numaraları
Görünen sürüm semver'dir: v2.4.0, v2.4.1 … Kabuğa giden kimlik eski kurulumlarla uyum için `ana.ikincilYAMA` biçimindedir (2.4.1 → `2.401`).

## Yeni sürüm (tek adım)
```
python3 araclar/yayinla.py 2.4.1 "tr notu" "en note" "ar ملاحظة" --anahtar <gizli-anahtar-dosyası>
git add -A && git commit -m "v2.4.1" && git push
```
GitHub Actions (`.github/workflows/surum.yml`) paketi doğrular ve `v2.4.1` sürüm sayfasını kendisi açar.

## Paket imzası
Paketler Ed25519 ile imzalanır. Gizli anahtar yalnız yöneticinin bilgisayarında durur (`C:\Claude Programlarım\_Anahtarlar`).
Açık anahtar `kaynak/js/fbconfig.js` → `window.UPD_KEYS` listesine yazılınca program imzasız paketi kurmaz.
Anahtar üretmek için: `python3 araclar/anahtar_uret.py ing-mufredat-imza.key`

## Geri dönüş
Sürümler geriye kurulmaz (eski sürüm numarası yeni sayılmaz). Bir sürümde sorun olursa önceki sürümün içeriği
Releases'tan alınır ve daha yüksek bir numarayla (ör. v2.4.2) yeniden yayınlanır. Program da ilk açılışı onaylanmayan
sürümden kendiliğinden bir önceki sürüme döner.

## Kabuk v3 (2026-11-22) — Küçült, Wi‑Fi eşitleme, kabuk güncellemesi
- `kabuk/` masaüstü kabuğunun kaynağı (Electron 33.2.1): `main.js`, `preload.js`, `lan.js` (aynı modemde eşitleme sunucusu,
  port 47851, 6 haneli kod), `enjekte.js` (arayüze Küçült ve 📶 düğmelerini ekler; birleştirmeyi arayüzün `Birlestir`
  modülüyle yapar — tabansız birleştirme hiçbir kaydı silmez). Eklenti arayüz sürümünden bağımsızdır; `kaynak/`'a dokunmaz.
- Kabuk artık kendini de günceller: `kabuk/kabuk.json` (Ed25519 imzalı). Yayın: `node araclar/kabuk_yayinla.js 3.0.1 <kabuk-imza.pem>`
  (anahtar `C:\Claude Programlarım\_Anahtarlar\IngMufredat\kabuk-imza.pem`).
- `kurulum/IngMufredat_Sistemi_v3.exe` — tek dosyalık program: açılınca bilgisayarda kurulu eski programın kabuğunu yeniler
  ya da programı kurar ve kısayol açar (kayıtlar `%APPDATA%\IngMufredatSistemi` içinde kalır). Kabuk v2 kurulumları için bir kerelik.
- `kurulum/IngMufredat-3.0.0.apk` — yeni Android kabuğu (paket `com.departures.ingmufredat`, yeni anahtar
  `_Anahtarlar\IngMufredat\ingmufredat.jks`); eski uygulamanın yanına kurulur, kayıtlar eşitlemeyle gelir. Derleme: `kabuk/android/derle-apk.sh`.
