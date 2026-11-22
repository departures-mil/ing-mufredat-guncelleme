# İngilizce Müfredat Sistemi — güncelleme kanalı

Programın (masaüstü ve telefon) uygulama içi güncellemeleri buradan dağıtılır.

- `latest.json`: son sürüm bilgisi. Program açılışta buna bakar.
- `paketler/`: sürüm paketleri (gzip + base64). Her paket o sürümün tüm kaynak kodunu içerir.

Kayıtlar ve yedekler bu depoda **bulunmaz**. Onlar yalnızca kullanıcının bilgisayarında (`%APPDATA%\IngMufredatSistemi`) ve Firebase'de durur.

## Kaynak (2.3'ten itibaren)
- `kaynak/` programın arayüz kaynağıdır (2.2 paketinden çıkarıldı). Masaüstü/telefon kabuğu (minShell 2) kurulu programdadır.
- Yeni sürüm: `python3 araclar/yayinla.py 2.4 "tr notu" "en note" "ar ملاحظة"` → `git add -A && git commit && git push`
