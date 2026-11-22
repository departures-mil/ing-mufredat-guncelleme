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
