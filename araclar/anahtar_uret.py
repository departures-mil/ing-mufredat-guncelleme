#!/usr/bin/env python3
"""Güncelleme imza anahtarı üretir (bir kez).
    python3 araclar/anahtar_uret.py ing-mufredat-imza.key
Gizli anahtar dosyası YALNIZ yöneticinin bilgisayarında saklanır (C:\\Claude Programlarım\\_Anahtarlar).
Ekrana yazılan açık anahtar kaynak/js/fbconfig.js içindeki window.UPD_KEYS listesine eklenir."""
import base64, os, sys
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
if len(sys.argv) < 2:
    sys.exit(__doc__)
if os.path.exists(sys.argv[1]):
    sys.exit("Dosya zaten var; eski anahtarın üzerine yazılmaz.")
k = Ed25519PrivateKey.generate()
seed = k.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
pub = k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
open(sys.argv[1], "w").write(base64.b64encode(seed).decode() + "\n")
print("Açık anahtar (UPD_KEYS):", base64.b64encode(pub).decode())
