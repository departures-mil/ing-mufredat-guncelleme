/* Belge modelini yazdırılabilir HTML'e çevirir (antetli şablon arka planı + tekrar eden üst/alt boşluk) */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const box = (v) => (v === 2 ? '<span class="bx on">☑</span>' : v === 1 ? '<span class="bx">☐</span>' : '');
  const t2 = (s) => (s ? `<div class="t2" dir="auto">${esc(s)}</div>` : '');

  function cell(c, col) {
    if (c.qr !== undefined || c.span) return `<td colspan="${c.span || 1}" class="res">${c.qr ? `<img class="qr" src="${c.qr}">` : ''}<div class="rt">${esc(c.text)}</div>${c.sub ? `<div class="sub ru">${esc(c.sub)}</div>` : ''}</td>`;
    if (c.box) return `<td class="c">${box(c.box)}</td>`;
    const cls = [col && col.align === 'c' ? 'c' : '', c.small ? 'sm' : '', c.indent ? 'ind' : ''].join(' ');
    const css = (c.color ? 'color:' + c.color + ';' : '') + (c.rtl ? 'text-align:right;' : '');
    const style = (css ? ` style="${esc(css)}"` : '') + (c.rtl ? ' dir="rtl"' : '');
    return `<td class="${cls}"${style}>${c.indent ? '<span class="arr">›</span>' : ''}<span class="${c.bold ? 'b' : ''}">${esc(c.text)}</span>${c.tag ? ` <span class="tag">(${esc(c.tag)})</span>` : ''}${t2(c.text2)}${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}</td>`;
  }
  function block(b) {
    switch (b.t) {
      case 'title': return `<div class="titleblk${b.pageBreak ? ' pb' : ''}">${b.logo ? `<img class="logo" src="${b.logo}">` : ''}<div>${b.inst ? `<div class="inst">${esc(b.inst)}</div>` : ''}<div class="ttl">${esc(b.text)}</div>${b.sub ? `<div class="tsub">${esc(b.sub)}</div>` : ''}</div></div>`;
      case 'h1': return `<h1 class="${b.pageBreak ? 'pb' : ''}">${esc(b.text)}${b.text2 ? `<span class="h2l">${esc(b.text2)}</span>` : ''}</h1>`;
      case 'h2': return `<h2>${esc(b.text)}${b.text2 ? `<span class="h2l">${esc(b.text2)}</span>` : ''}</h2>`;
      case 'p': return `<p class="${b.style || ''}">${esc(b.text)}${t2(b.text2)}</p>`;
      case 'list': return `<ul>${b.items.map((i) => `<li>${esc(i.text)}${t2(i.text2)}</li>`).join('')}</ul>`;
      case 'kv': { const r = b.rows; let h = '<table class="kv">'; for (let i = 0; i < r.length; i += 2) { h += '<tr>' + [r[i], r[i + 1]].map((x) => (x ? `<th>${esc(x[0])}</th><td>${esc(x[1])}</td>` : '<th></th><td></td>')).join('') + '</tr>'; } return h + '</table>'; }
      case 'info': return `<table class="info"><tr>${b.cells.map((c) => `<td><div class="lbl">${esc(c.label)}</div><div>${esc(c.value)}</div>${t2(c.value2)}</td>`).join('')}</tr></table>`;
      case 'table': return `<table class="grid"><colgroup>${b.cols.map((c) => `<col style="width:${c.w}%">`).join('')}</colgroup><thead><tr>${b.cols.map((c) => `<th class="${c.align === 'c' ? 'c' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr class="${r.type}">${r.cells.map((c, i) => cell(c, b.cols[i])).join('')}</tr>`).join('')}</tbody></table>`;
      case 'evalbox': return `<div class="evalbox"><div class="et">${esc(b.title)}</div>${b.sub ? `<div class="es">${esc(b.sub)}</div>` : ''}${b.lines.map((l) => `<div class="el">${esc(l)}</div>`).join('')}</div>`;
      case 'bars': return `<table class="bars">${b.rows.map((r) => `<tr><td class="bl">${esc(r.label)}</td><td class="bb"><div class="bar"><i style="width:${r.pct}%;background:${r.color}"></i></div></td><td class="bp">%${r.pct}</td><td class="br">${esc(r.right || '')}</td></tr>`).join('')}</table>`;
      case 'rank': return `<div class="rankbox" style="border-color:${esc(b.color)}"><div><div class="lbl">${esc(b.rankLabel)}</div><div class="rk" style="color:${esc(b.color)}">✈ ${esc(b.rank)}</div>${b.rank2 ? `<div class="t2">${esc(b.rank2)}</div>` : ''}</div><div class="sc"><div class="lbl">${esc(b.scoreLabel)}</div><div class="num">${b.score}</div></div><div class="nx">${esc(b.next)}<br>${esc(b.flight)}</div></div>`;
      case 'sign': return `<table class="sign"><tr>${b.labels.map((l) => `<td><div class="sl"></div>${esc(l)}</td>`).join('')}</tr></table>`;
      case 'lines': return Array.from({ length: b.n }, () => '<div class="wl"></div>').join('');
      case 'cert': return `<div class="cert"><div class="cframe" style="border-color:${esc(b.color)}">${b.logo ? `<img class="clogo" src="${b.logo}">` : '<div class="cwing">✈</div>'}${b.inst ? `<div class="cinst">${esc(b.inst)}</div>` : ''}<div class="ctitle">${esc(b.title)}</div>${b.title2 ? `<div class="t2">${esc(b.title2)}</div>` : ''}<div class="cname">${esc(b.name)}</div><div class="ctext">${esc(b.text)}</div>${b.text2 ? `<div class="ctext t2">${esc(b.text2)}</div>` : ''}<div class="crank" style="color:${esc(b.color)};border-color:${esc(b.color)}">${esc(b.rank)}${b.rank2 ? ' · ' + esc(b.rank2) : ''}</div><div class="clv">${esc(b.levels)}</div><div class="cdate">${esc(b.date)}</div><table class="sign"><tr>${b.signs.map((l) => `<td><div class="sl"></div>${esc(l)}</td>`).join('')}</tr></table></div></div>`;
      default: return '';
    }
  }

  window.RenderHTML = function (model, po) {
    po = po || {};
    const land = !!(po.landscape ?? model.landscape);
    const tpl = po.template;
    const mt = tpl ? +po.marginTop || 30 : +po.marginTop || 12, mb = tpl ? +po.marginBottom || 22 : +po.marginBottom || 12, ms = +po.marginSide || 14;
    const rtl = model.lang === 'ar';
    const pw = land ? 297 : 210, ph = land ? 210 : 297;
    // v1.7: antet orijinal oranıyla tam sayfa; isteğe bağlı ince ayar (mm kaydırma + ölçek)
    const tf = tpl && (tpl.dx || tpl.dy || (tpl.sc && tpl.sc !== 1)) ? `transform:translate(${+tpl.dx || 0}mm,${+tpl.dy || 0}mm) scale(${+tpl.sc || 1});transform-origin:center center;` : '';
    const bg = tpl ? `<img class="bgimg ${po.templateFirst ? 'first' : 'all'}" style="${tf}" src="${tpl.data}">` : '';
    const css = `
@page{size:A4 ${land ? 'landscape' : 'portrait'};margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;background:#fff;color:#1b2430;font-family:${rtl ? "'Segoe UI','Tahoma','Noto Naskh Arabic','Noto Sans Arabic'" : "'Segoe UI','Arial','Noto Sans'"},sans-serif;font-size:10.5pt}
.bgimg{width:${pw}mm;height:${ph}mm;top:0;left:0;z-index:-1;object-fit:fill;display:block;max-width:none}
.bgimg.all{position:fixed}.bgimg.first{position:absolute}
.sheet{isolation:isolate}
@media screen{body{background:#5b6b7f}.sheet{width:${pw}mm;min-height:${ph}mm;margin:12px auto;background:#fff;position:relative;box-shadow:0 4px 18px rgba(0,0,0,.35)}.bgimg.all,.bgimg.first{position:absolute}}
table.frame{width:100%;border-collapse:collapse}
table.frame>thead td{height:${mt}mm;padding:0}table.frame>tfoot td{height:${mb}mm;padding:0}
table.frame>tbody>tr>td{padding:0 ${ms}mm}
.pb{break-before:page;page-break-before:always}
.titleblk{display:flex;align-items:center;gap:14px;border-bottom:2.5px solid #1f5fa0;padding-bottom:8px;margin-bottom:12px}
.titleblk .logo{height:58px;max-width:120px;object-fit:contain}
.inst{font-size:10pt;font-weight:700;color:#1f5fa0;letter-spacing:.5px}
.ttl{font-size:20pt;font-weight:800;color:#0e2a4d;line-height:1.15}
.tsub{color:#5a6b7d;font-size:10.5pt;margin-top:3px}
h1{font-size:16pt;color:#0e2a4d;border-bottom:2px solid #1f5fa0;padding-bottom:4px;margin:0 0 8px}
h2{font-size:12.5pt;color:#0e2a4d;margin:14px 0 6px}
.h2l{display:block;font-size:.72em;color:#6b7b8d;font-weight:500}
.t2{font-size:.86em;color:#6b7b8d;margin-top:1px}
p{margin:4px 0}p.muted{color:#6b7b8d}p.bold{font-weight:700;margin-top:10px}
ul{margin:4px 0 8px;padding-${rtl ? 'right' : 'left'}:18px}li{margin:3px 0}
table{border-collapse:collapse;width:100%}
table.kv{margin:6px 0 10px}table.kv th,table.kv td{border:1px solid #c5ced8;padding:6px 8px;text-align:start;font-size:10pt}
table.kv th{background:#eef3f8;width:17%;font-weight:700}table.kv td{width:33%}
table.info{margin:2px 0 10px;background:#f2f6fa}table.info td{padding:7px 10px;vertical-align:top;font-size:10pt}
.lbl{font-size:7.5pt;font-weight:800;color:#6b7b8d;text-transform:uppercase;letter-spacing:.4px}
table.grid{margin:4px 0 10px;table-layout:fixed}
table.grid th{background:#14365e;color:#fff;font-size:9pt;padding:5px 6px;text-align:start;border:1px solid #14365e}
table.grid th.c,table.grid td.c{text-align:center}
table.grid td{border:1px solid #c5ced8;padding:4px 6px;vertical-align:middle;font-size:9.6pt}
table.grid thead{display:table-header-group}
table.grid tr{break-inside:avoid;page-break-inside:avoid}
tr.module td{background:#e6eef7}tr.module td .b{color:#0e2a4d}
tr.blank td{height:9mm}
td.ind{padding-${rtl ? 'right' : 'left'}:16px}.arr{color:#1f5fa0;font-weight:700;margin-${rtl ? 'left' : 'right'}:5px}
td.sm,.sub{font-size:8pt;color:#6b7b8d}.sub{margin-top:2px;font-style:italic}
.tag{font-size:8pt;color:#8a96a3;font-style:italic}
.b{font-weight:700}
tr.res td{background:#fbfcfe;font-size:8.6pt;padding-${rtl ? 'right' : 'left'}:30px}td.res .qr{float:${rtl ? 'left' : 'right'};width:17mm;height:17mm;image-rendering:pixelated;margin:1px 0 1px 6px}td.res .rt{font-weight:600;color:#14365e}.ru{word-break:break-all;font-style:normal}
.bx{font-family:'Segoe UI Symbol','DejaVu Sans','Noto Sans Symbols2',sans-serif;font-size:14pt;line-height:1;color:#2a3a4a}.bx.on{color:#1b7f3b}
.evalbox{border:2px solid #1f5fa0;border-radius:4px;padding:9px 12px;margin:8px 0 12px;break-inside:avoid}
.evalbox .et{font-weight:800;color:#0e2a4d}.evalbox .es{font-size:9pt;color:#6b7b8d;font-style:italic;margin:2px 0 6px}.evalbox .el{margin:6px 0;white-space:pre-wrap}
table.bars td{padding:3px 4px;font-size:9.4pt;border-bottom:1px solid #eef1f4}
.bl{width:46%}.bb{width:34%}.bp{width:8%;text-align:center;font-weight:700}.br{width:12%;font-size:8.5pt;color:#6b7b8d}
.bar{height:9px;background:#e3e9ef;border-radius:5px;overflow:hidden}.bar i{display:block;height:100%}
.rankbox{display:flex;gap:18px;align-items:center;border:2px solid;border-radius:8px;padding:10px 14px;margin:6px 0 4px;break-inside:avoid}
.rk{font-size:17pt;font-weight:800}.sc{text-align:center}.num{font-size:22pt;font-weight:800;color:#0e2a4d}.nx{flex:1;font-size:9.5pt;color:#36495c}
table.sign{margin-top:26px}table.sign td{text-align:center;padding:0 20px;font-size:9.5pt;color:#36495c}.sl{border-bottom:1px solid #333;height:34px;margin-bottom:4px}
.wl{border-bottom:1px solid #9aa7b4;height:9mm}
.cert{height:${ph - mt - mb - 2}mm;display:flex}
.cframe{flex:1;border:6px double;border-radius:8px;padding:14mm 18mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.clogo{height:70px}.cwing{font-size:40pt;color:#1f5fa0}.cinst{font-weight:700;color:#1f5fa0;letter-spacing:1px}
.ctitle{font-size:28pt;font-weight:900;color:#0e2a4d;letter-spacing:3px}
.cname{font-size:24pt;font-weight:700;border-bottom:1.5px solid #0e2a4d;padding:4px 30px;margin:8px 0}
.ctext{max-width:200mm;font-size:12pt;line-height:1.5}.crank{font-size:20pt;font-weight:900;border:2px solid;border-radius:30px;padding:6px 26px;margin:10px 0}
.clv,.cdate{font-size:10pt;color:#36495c}.cert table.sign{width:70%}
`;
    const body = model.blocks.map(block).join('\n');
    return `<!doctype html><html lang="${model.lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(model.title)}</title><style>${css}</style></head><body><div class="sheet">${bg}<table class="frame"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td>${body}</td></tr></tbody></table></div></body></html>`;
  };
})();
