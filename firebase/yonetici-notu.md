# Yönetici Firebase projesi (mufredat-bc0ad)

Bu proje artık kurum verisi tutmaz (2.2'den beri her kurum kendi projesini kullanır). Yalnız şunlar için kullanılır:

- `guncellemeler/ing_*`: eski (2.7 öncesi) kurulumlar için yedek güncelleme kanalı.
- Yöneticinin kendi eşitlemesi (`mufredat_ing/...`).

Aynı proje başka programların (`guncellemeler/<önek>_*`) güncellemelerini de taşıdığı için kurallar
program program değiştirilmemeli. Önerilen en az kural:

```
match /guncellemeler/{d=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.email == 'qa757939@gmail.com';
}
```

Kurum verisi için `kurum.rules` içindeki `mufredat_ing` bölümü eklenebilir.
Kurallar değiştirilmeden önce mevcut kurallar Firebase konsolundan yedeklenmelidir.
