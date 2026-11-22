#!/usr/bin/env python3
"""İngilizce Müfredat Sistemi — yeni sürümü tek adımda hazırlar (deponun kökünden çalıştırılır).

    python3 araclar/yayinla.py 2.4.1 "tr notu" "en note" "ar ملاحظة" [--anahtar YOL]
    git add -A && git commit -m "v2.4.1" && git push        → GitHub Actions sürüm sayfasını (Releases) kendisi açar

Sürüm biçimi semver'dir (v2.4.0, v2.4.1 …). Kabuğa ve eski kurulumlara giden kimlik "ana.ikincilYAMA"
biçimindedir (2.4.1 → "2.401"); böylece 2.3 ve öncesi kurulumlar da yeni sürümü doğru sırada görür.
İkincil sürüm 10'a ulaşmadan ana sürüm artırılmalıdır (ör. 2.9.x'ten sonra 3.0.0).

İmza (Ed25519): --anahtar ile verilen dosya ya da ING_IMZA_ANAHTARI ortam değişkeni (32 baytlık tohumun base64'ü).
Gizli anahtar yalnız yöneticinin bilgisayarında durur: C:\\Claude Programlarım\\_Anahtarlar\\ing-mufredat-imza.key
Programda UPD_KEYS listesi doluysa imzasız paket kurulmaz.

1. kaynak/js/version.js ve kaynak/js/kurum-rules.js yazılır.
2. kaynak/ → gzip+base64 paket (paketler/ing_<kimlik>.b64), latest.json.
3. cikti/paket.ihu: Firebase yedek kanalı için (eski kurulumlar).
"""
import base64, datetime, gzip, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ROOT, "kaynak")


def kimlik(sv):
    m = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", sv)
    if not m:
        sys.exit("Sürüm semver olmalı: 2.4.1")
    a, b, c = map(int, m.groups())
    if c > 99:
        sys.exit("Yama numarası 99'u geçemez")
    return "%d.%d%02d" % (a, b, c), "%d.%d.%d" % (a, b, c)


def imzala(msg, seed_b64):
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    k = Ed25519PrivateKey.from_private_bytes(base64.b64decode(seed_b64.strip()))
    return base64.b64encode(k.sign(msg.encode())).decode()


def main():
    a = sys.argv[1:]
    kanal, anahtar = ROOT, os.environ.get("ING_IMZA_ANAHTARI", "")
    if "--kanal" in a:
        i = a.index("--kanal"); kanal = a[i + 1]; del a[i:i + 2]
    if "--anahtar" in a:
        i = a.index("--anahtar"); anahtar = open(a[i + 1]).read(); del a[i:i + 2]
    if len(a) < 2:
        sys.exit(__doc__)
    ver, sv = kimlik(a[0])
    tr = a[1]; en = a[2] if len(a) > 2 else tr; ar = a[3] if len(a) > 3 else tr
    notes = {"tr": tr, "en": en, "ar": ar}
    with open(os.path.join(UI, "js", "version.js"), "w", encoding="utf-8") as f:
        f.write('/* APP_VERSION: kabuğa giden sürüm kimliği (eski kurulumlarla uyum için "ana.ikincilYAMA": 2.4.0 → 2.400).\n'
                "   APP_SEMVER: programda görünen sürüm. İkisini de araclar/yayinla.py yazar. */\n")
        f.write("window.APP_VERSION='%s';\nwindow.APP_SEMVER='%s';\nwindow.APP_NOTES=%s;\n" % (ver, sv, json.dumps(notes, ensure_ascii=False)))
    rules = os.path.join(ROOT, "firebase", "kurum.rules")
    if os.path.exists(rules):
        with open(os.path.join(UI, "js", "kurum-rules.js"), "w", encoding="utf-8") as f:
            f.write("/* firebase/kurum.rules dosyasından üretilir (araclar/yayinla.py) */\nwindow.KURUM_RULES = %s;\n" % json.dumps(open(rules, encoding="utf-8").read(), ensure_ascii=False))
    files = {}
    for r, ds, fs in os.walk(UI):
        ds.sort()
        for fn in sorted(fs):
            p = os.path.join(r, fn)
            files[os.path.relpath(p, UI).replace(os.sep, "/")] = base64.b64encode(open(p, "rb").read()).decode()
    raw = json.dumps({"format": "ihu-bundle", "version": ver, "semver": sv, "files": files}, ensure_ascii=False, separators=(",", ":")).encode()
    gz = gzip.compress(raw, 9, mtime=0)
    g64 = base64.b64encode(gz).decode()
    sha = hashlib.sha256(gz).hexdigest()
    sig = imzala("ing-mufredat|%s|%s" % (ver, sha), anahtar) if anahtar.strip() else ""
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    name = "paketler/ing_%s.b64" % ver.replace(".", "_")
    os.makedirs(os.path.join(kanal, "paketler"), exist_ok=True)
    for f in os.listdir(os.path.join(kanal, "paketler")):  # eski paketler GitHub Releases'ta saklanır
        if f.endswith(".b64"):
            os.remove(os.path.join(kanal, "paketler", f))
    open(os.path.join(kanal, name), "w").write(g64)
    latest = {"version": ver, "semver": sv, "file": name, "sha256": sha, "size": len(raw), "gzlen": len(g64), "date": now, "minShell": 2,
              "notes_tr": tr, "notes_en": en, "notes_ar": ar}
    if sig:
        latest["sig"] = sig
    json.dump(latest, open(os.path.join(kanal, "latest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, "cikti"), exist_ok=True)
    pk = {"format": "ihu1", "version": ver, "semver": sv, "gz": g64, "sha256": sha, "size": len(raw), "date": now, "minShell": 2, "notes": notes}
    if sig:
        pk["sig"] = sig
    json.dump(pk, open(os.path.join(ROOT, "cikti", "paket.ihu"), "w"), ensure_ascii=False)
    print("hazır v%s (kimlik %s) %d bayt%s" % (sv, ver, len(g64), ", imzalı" if sig else ", İMZASIZ"))


if __name__ == "__main__":
    main()
