#!/usr/bin/env python3
"""İngilizce Müfredat Sistemi — yeni arayüz sürümünü yayınlar (iha-mufredat-kaynak deposunun kökünden).

    python3 araclar/yayinla.py 2.9 "tr notu" "en note" "ar ملاحظة" --kanal ../iha-mufredat-guncelleme

1. ui/js/version.js sürümünü yazar.
2. ui/ (vendor hariç) → gzip+base64 paket üretir.
3. Kanal deposuna latest.json + paketler/ing_X_Y.b64 yazar (GitHub, birincil kanal).
4. cikti/paket.ihu yazar: yönetici oturumu açık masaüstü programı bu dosyayı yayın klasöründe
   görünce Firebase yedek kanalına kendisi yükler (eski 2.7 ve öncesi kurulumlar Firebase'den okur).
Sonra iki depoda: git add -A && git commit && git push
"""
import base64, datetime, gzip, hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ROOT, "kaynak")


def main():
    a = sys.argv[1:]
    kanal = ROOT
    if '--kanal' in a:
        i = a.index('--kanal'); kanal = a[i + 1]; del a[i:i + 2]
    if len(a) < 2:
        sys.exit(__doc__)
    ver, tr = a[0], a[1]
    en = a[2] if len(a) > 2 else tr
    ar = a[3] if len(a) > 3 else tr
    open(os.path.join(UI, 'js', 'version.js'), 'w').write("window.APP_VERSION='%s';\nwindow.APP_NOTES=%s;\n" % (ver, json.dumps({'tr': tr, 'en': en, 'ar': ar}, ensure_ascii=False)))
    files = {}
    for r, ds, fs in os.walk(UI):
        for f in sorted(fs):
            p = os.path.join(r, f)
            files[os.path.relpath(p, UI).replace(os.sep, '/')] = base64.b64encode(open(p, 'rb').read()).decode()
    raw = json.dumps({'format': 'ihu-bundle', 'version': ver, 'files': files}, ensure_ascii=False, separators=(',', ':')).encode()
    gz = gzip.compress(raw, 9, mtime=0)
    g64 = base64.b64encode(gz).decode()
    sha = hashlib.sha256(gz).hexdigest()
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    notes = {'tr': tr, 'en': en, 'ar': ar}
    name = 'paketler/ing_%s.b64' % ver.replace('.', '_')
    os.makedirs(os.path.join(kanal, 'paketler'), exist_ok=True)
    for f in os.listdir(os.path.join(kanal, 'paketler')):
        if f.endswith('.b64'):
            os.remove(os.path.join(kanal, 'paketler', f))
    open(os.path.join(kanal, name), 'w').write(g64)
    latest = {'version': ver, 'file': name, 'sha256': sha, 'size': len(raw), 'gzlen': len(g64), 'date': now, 'minShell': 2,
              'notes_tr': tr, 'notes_en': en, 'notes_ar': ar}
    json.dump(latest, open(os.path.join(kanal, 'latest.json'), 'w'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, 'cikti'), exist_ok=True)
    json.dump({'format': 'ihu1', 'version': ver, 'gz': g64, 'sha256': sha, 'size': len(raw), 'date': now, 'minShell': 2, 'notes': notes},
              open(os.path.join(ROOT, 'cikti', 'paket.ihu'), 'w'), ensure_ascii=False)
    print('hazır', ver, len(g64), 'bayt')


if __name__ == '__main__':
    main()
