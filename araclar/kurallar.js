#!/usr/bin/env node
// firebase/kurum.rules → kaynak/js/temel/kurum-rules.js (Ayarlar → Kurum alanı üyeleri → "Güvenlik kurallarını göster").
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(ROOT, 'firebase', 'kurum.rules'), 'utf8').replace(/\r\n/g, '\n');
fs.writeFileSync(path.join(ROOT, 'kaynak', 'js', 'temel', 'kurum-rules.js'), '/* Otomatik: araclar/kurallar.js ← firebase/kurum.rules */\nwindow.KURUM_RULES = ' + JSON.stringify(s) + ';\n');
console.log('kurum-rules.js yazıldı');
