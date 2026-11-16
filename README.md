# İngilizce Müfredat Sistemi — güncelleme kanalı

Programın (masaüstü ve telefon) uygulama içi güncellemeleri buradan dağıtılır.

- `latest.json`: son sürüm bilgisi. Program açılışta buna bakar.
- `paketler/`: sürüm paketleri (gzip + base64). Her paket o sürümün tüm kaynak kodunu içerir.

Kayıtlar ve yedekler bu depoda **bulunmaz**. Onlar yalnızca kullanıcının bilgisayarında (`%APPDATA%\IngMufredatSistemi`) ve Firebase'de durur.
