/* Belge modelini Word (.docx) dosyasına çevirir — antetli şablon başlıkta "metnin arkasında" görsel olarak eklenir */
(function () {
  const MM = 56.7; // twip / mm
  const dataToBytes = (dataUrl) => { const b = atob(dataUrl.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

  window.RenderDOCX = async function (model, po) {
    const D = window.docxLib; po = po || {};
    const rtl = model.lang === 'ar';
    const land = !!(po.landscape ?? model.landscape);
    const tpl = po.template;
    const mt = tpl ? +po.marginTop || 30 : +po.marginTop || 12, mb = tpl ? +po.marginBottom || 22 : +po.marginBottom || 12, ms = +po.marginSide || 14;
    const pwMM = land ? 297 : 210, phMM = land ? 210 : 297;
    const CW = Math.round((pwMM - 2 * ms) * MM); // içerik genişliği (twip)
    const FONT = rtl ? 'Tahoma' : 'Arial';
    const run = (text, o = {}) => new D.TextRun({ text: String(text == null ? '' : text), bold: o.bold, italics: o.italic, size: o.size || 20, color: o.color, font: o.font || FONT, rightToLeft: rtl });
    const para = (children, o = {}) => new D.Paragraph({ children: Array.isArray(children) ? children : [children], bidirectional: rtl, alignment: o.align || (rtl ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT), spacing: { before: o.before || 0, after: o.after ?? 60 }, pageBreakBefore: !!o.pb, indent: o.indent ? (rtl ? { right: o.indent } : { left: o.indent }) : undefined, border: o.border });
    const B = { style: D.BorderStyle.SINGLE, size: 4, color: 'C5CED8' };
    const borders = { top: B, bottom: B, left: B, right: B };
    const NB = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
    const hex = (c) => (c || '').replace('#', '').toUpperCase() || undefined;
    const cellP = (paras, w, o = {}) => new D.TableCell({ children: paras, width: { size: w, type: D.WidthType.DXA }, borders: o.borders || borders, shading: o.fill ? { fill: o.fill, type: D.ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 }, verticalAlign: D.VerticalAlign.CENTER, columnSpan: o.span });
    const table = (rows, widths) => new D.Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, columnWidths: widths, rows, visuallyRightToLeft: rtl, layout: D.TableLayoutType.FIXED });
    const boxRun = (v) => run(v === 2 ? '☑' : '☐', { size: 26, font: 'Segoe UI Symbol', color: v === 2 ? '1B7F3B' : '2A3A4A' });
    const center = D.AlignmentType.CENTER;

    function cellContent(c, col) {
      if (c.qr !== undefined || c.span) {
        const out = [para(run(c.text, { bold: true, size: 17, color: '14365E' }), { after: 0, indent: 300 })];
        if (c.sub) out.push(para(run(c.sub, { size: 15, color: '1F5FA0' }), { after: 0, indent: 300 }));
        if (c.qr) out.push(para(new D.ImageRun({ data: dataToBytes(c.qr), transformation: { width: 64, height: 64 } }), { after: 0, indent: 300 }));
        return out;
      }
      if (c.box) return [para(boxRun(c.box), { align: center, after: 0 })];
      const out = [];
      const runs = [];
      if (c.indent) runs.push(run('›  ', { bold: true, color: '1F5FA0', size: 19 }));
      runs.push(run(c.text, { bold: c.bold, size: c.small ? 16 : 19, color: hex(c.color) }));
      if (c.tag) runs.push(run('  (' + c.tag + ')', { italic: true, size: 15, color: '8A96A3' }));
      out.push(para(runs, { align: c.rtl ? D.AlignmentType.RIGHT : col && col.align === 'c' ? center : undefined, after: 0, indent: c.indent ? 160 : 0 }));
      if (c.text2) out.push(para(run(c.text2, { size: 16, color: '6B7B8D' }), { after: 0, indent: c.indent ? 360 : 0 }));
      if (c.sub) out.push(para(run(c.sub, { size: 15, color: '6B7B8D', italic: true }), { after: 0 }));
      return out;
    }

    const children = [];
    for (const b of model.blocks) {
      switch (b.t) {
        case 'title': {
          if (b.inst) children.push(para(run(b.inst, { bold: true, size: 20, color: '1F5FA0' }), { pb: b.pageBreak, after: 20 }));
          children.push(para(run(b.text, { bold: true, size: 40, color: '0E2A4D' }), { pb: b.pageBreak && !b.inst, after: 20 }));
          if (b.sub) children.push(para(run(b.sub, { size: 21, color: '5A6B7D' }), { after: 200, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: '1F5FA0', space: 6 } } }));
          break;
        }
        case 'h1': children.push(para([run(b.text, { bold: true, size: 32, color: '0E2A4D' })].concat(b.text2 ? [run('  ' + b.text2, { size: 20, color: '6B7B8D' })] : []), { pb: b.pageBreak, after: 140, border: { bottom: { style: D.BorderStyle.SINGLE, size: 10, color: '1F5FA0', space: 4 } } })); break;
        case 'h2': children.push(para([run(b.text, { bold: true, size: 25, color: '0E2A4D' })].concat(b.text2 ? [run('  ' + b.text2, { size: 18, color: '6B7B8D' })] : []), { before: 200, after: 80 })); break;
        case 'p': children.push(para(run(b.text, { bold: b.style === 'bold', color: b.style === 'muted' ? '6B7B8D' : undefined }), { before: b.style === 'bold' ? 160 : 0 })); if (b.text2) children.push(para(run(b.text2, { size: 17, color: '6B7B8D' }))); break;
        case 'list': for (const i of b.items) { children.push(para([run('•  ', { color: '1F5FA0', bold: true }), run(i.text)], { indent: 240, after: 20 })); if (i.text2) children.push(para(run(i.text2, { size: 17, color: '6B7B8D' }), { indent: 480, after: 40 })); } break;
        case 'kv': {
          const w = [Math.round(CW * 0.17), Math.round(CW * 0.33), Math.round(CW * 0.17)]; w.push(CW - w[0] - w[1] - w[2]);
          const rows = [];
          for (let i = 0; i < b.rows.length; i += 2) { const a = b.rows[i], c = b.rows[i + 1] || ['', '']; rows.push(new D.TableRow({ children: [cellP([para(run(a[0], { bold: true, size: 19 }), { after: 0 })], w[0], { fill: 'EEF3F8' }), cellP([para(run(a[1], { size: 19 }), { after: 0 })], w[1]), cellP([para(run(c[0], { bold: true, size: 19 }), { after: 0 })], w[2], { fill: 'EEF3F8' }), cellP([para(run(c[1], { size: 19 }), { after: 0 })], w[3])] })); }
          children.push(table(rows, w)); children.push(para(run(''), { after: 120 })); break;
        }
        case 'info': {
          const w = [Math.round(CW * 0.25), Math.round(CW * 0.2)]; w.push(CW - w[0] - w[1]);
          children.push(table([new D.TableRow({ children: b.cells.map((c, i) => cellP([para(run(c.label.toUpperCase(), { bold: true, size: 14, color: '6B7B8D' }), { after: 20 }), para(run(c.value, { size: 19 }), { after: 0 })].concat(c.value2 ? [para(run(c.value2, { size: 16, color: '6B7B8D' }), { after: 0 })] : []), w[i], { fill: 'F2F6FA', borders: noBorders })) })], w));
          children.push(para(run(''), { after: 80 })); break;
        }
        case 'table': {
          const w = b.cols.map((c) => Math.round((CW * c.w) / 100)); w[w.length - 1] = CW - w.slice(0, -1).reduce((a, x) => a + x, 0);
          const rows = [new D.TableRow({ tableHeader: true, children: b.cols.map((c, i) => cellP([para(run(c.label, { bold: true, size: 17, color: 'FFFFFF' }), { align: c.align === 'c' ? center : undefined, after: 0 })], w[i], { fill: '14365E' })) })];
          for (const r of b.rows) {
            if (r.type === 'res') { rows.push(new D.TableRow({ cantSplit: true, children: [cellP(cellContent(r.cells[0]), CW, { span: b.cols.length, fill: 'FBFCFE' })] })); continue; }
            rows.push(new D.TableRow({ cantSplit: true, height: r.type === 'blank' ? { value: 480, rule: D.HeightRule.ATLEAST } : undefined, children: r.cells.map((c, i) => cellP(cellContent(c, b.cols[i]), w[i], { fill: r.type === 'module' ? 'E6EEF7' : undefined })) }));
          }
          children.push(table(rows, w)); children.push(para(run(''), { after: 100 })); break;
        }
        case 'evalbox': {
          const TB = { style: D.BorderStyle.SINGLE, size: 12, color: '1F5FA0' };
          const ps = [para(run(b.title, { bold: true, size: 21, color: '0E2A4D' }), { after: 30 })];
          if (b.sub) ps.push(para(run(b.sub, { italic: true, size: 17, color: '6B7B8D' }), { after: 80 }));
          for (const l of b.lines) ps.push(para(run(l, { size: 19 }), { after: 100 }));
          children.push(table([new D.TableRow({ cantSplit: true, children: [cellP(ps, CW, { borders: { top: TB, bottom: TB, left: TB, right: TB } })] })], [CW]));
          children.push(para(run(''), { after: 160 })); break;
        }
        case 'bars': {
          const w = [Math.round(CW * 0.46), Math.round(CW * 0.34), Math.round(CW * 0.08)]; w.push(CW - w[0] - w[1] - w[2]);
          const rows = b.rows.map((r) => { const n = Math.round(r.pct / 5); return new D.TableRow({ children: [cellP([para(run(r.label, { size: 18 }), { after: 0 })], w[0], { borders: noBorders }), cellP([para([run('█'.repeat(n), { color: hex(r.color), size: 16, font: 'Arial' }), run('░'.repeat(20 - n), { color: 'D5DDE5', size: 16, font: 'Arial' })], { after: 0 })], w[1], { borders: noBorders }), cellP([para(run('%' + r.pct, { bold: true, size: 18 }), { align: center, after: 0 })], w[2], { borders: noBorders }), cellP([para(run(r.right || '', { size: 16, color: '6B7B8D' }), { after: 0 })], w[3], { borders: noBorders })] }); });
          children.push(table(rows, w)); break;
        }
        case 'rank': {
          const C = { style: D.BorderStyle.SINGLE, size: 16, color: hex(b.color) };
          const w = [Math.round(CW * 0.34), Math.round(CW * 0.18)]; w.push(CW - w[0] - w[1]);
          children.push(table([new D.TableRow({ children: [
            cellP([para(run(b.rankLabel.toUpperCase(), { bold: true, size: 14, color: '6B7B8D' }), { after: 20 }), para(run('✈ ' + b.rank, { bold: true, size: 32, color: hex(b.color) }), { after: 0 })].concat(b.rank2 ? [para(run(b.rank2, { size: 17, color: '6B7B8D' }))] : []), w[0], { borders: { top: C, bottom: C, left: rtl ? NB : C, right: rtl ? C : NB } }),
            cellP([para(run(b.scoreLabel.toUpperCase(), { bold: true, size: 14, color: '6B7B8D' }), { align: center, after: 20 }), para(run(String(b.score), { bold: true, size: 40, color: '0E2A4D' }), { align: center, after: 0 })], w[1], { borders: { top: C, bottom: C, left: NB, right: NB } }),
            cellP([para(run(b.next, { size: 18 }), { after: 40 }), para(run(b.flight, { size: 18 }), { after: 0 })], w[2], { borders: { top: C, bottom: C, left: rtl ? C : NB, right: rtl ? NB : C } }),
          ] })], w)); break;
        }
        case 'sign': {
          const w = b.labels.map(() => Math.floor(CW / b.labels.length));
          children.push(para(run(''), { after: 400 }));
          children.push(table([new D.TableRow({ children: b.labels.map((l, i) => cellP([para(run('____________________________', { color: '333333' }), { align: center, after: 40 }), para(run(l, { size: 18, color: '36495C' }), { align: center, after: 0 })], w[i], { borders: noBorders })) })], w)); break;
        }
        case 'lines': for (let i = 0; i < b.n; i++) children.push(para(run(' '), { after: 200, border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: '9AA7B4', space: 1 } } })); break;
        case 'cert': {
          const C = { style: D.BorderStyle.DOUBLE, size: 18, color: hex(b.color) };
          const ps = [];
          ps.push(para(run(''), { after: 300 }));
          if (b.inst) ps.push(para(run(b.inst, { bold: true, size: 24, color: '1F5FA0' }), { align: center, after: 120 }));
          ps.push(para(run(b.title, { bold: true, size: 56, color: '0E2A4D' }), { align: center, after: 40 }));
          if (b.title2) ps.push(para(run(b.title2, { size: 22, color: '6B7B8D' }), { align: center, after: 200 }));
          ps.push(para(run(b.name, { bold: true, size: 48 }), { align: center, before: 200, after: 200 }));
          ps.push(para(run(b.text, { size: 24 }), { align: center, after: 80 }));
          if (b.text2) ps.push(para(run(b.text2, { size: 19, color: '6B7B8D' }), { align: center, after: 80 }));
          ps.push(para(run(b.rank + (b.rank2 ? ' · ' + b.rank2 : ''), { bold: true, size: 40, color: hex(b.color) }), { align: center, before: 200, after: 160 }));
          ps.push(para(run(b.levels, { size: 20, color: '36495C' }), { align: center, after: 60 }));
          ps.push(para(run(b.date, { size: 20, color: '36495C' }), { align: center, after: 500 }));
          ps.push(para(run(b.signs.map(() => '______________________').join('                    ')), { align: center, after: 40 }));
          ps.push(para(run(b.signs.join('                                        '), { size: 18, color: '36495C' }), { align: center, after: 300 }));
          children.push(table([new D.TableRow({ children: [cellP(ps, CW, { borders: { top: C, bottom: C, left: C, right: C } })] })], [CW]));
          break;
        }
      }
    }

    const props = { page: { size: { width: 11906, height: 16838, orientation: land ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT }, margin: { top: Math.round(mt * MM), bottom: Math.round(mb * MM), left: Math.round(ms * MM), right: Math.round(ms * MM), header: 0, footer: 0 } } };
    const section = { properties: props, children };
    if (tpl) {
      const pxW = Math.round((pwMM / 25.4) * 96), pxH = Math.round((phMM / 25.4) * 96);
      // v1.7: ince ayar (ölçek merkezden, kaydırma mm) — EMU: 1 mm = 36000
      const sc = +tpl.sc || 1; const w2 = Math.round(pxW * sc), h2 = Math.round(pxH * sc);
      const offX = Math.round(((+tpl.dx || 0) - (pwMM * (sc - 1)) / 2) * 36000), offY = Math.round(((+tpl.dy || 0) - (phMM * (sc - 1)) / 2) * 36000);
      const img = new D.ImageRun({ data: dataToBytes(tpl.data), transformation: { width: w2, height: h2 }, floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, offset: offX }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, offset: offY }, behindDocument: true, allowOverlap: true, zIndex: 0 } });
      const h = new D.Header({ children: [new D.Paragraph({ children: [img] })] });
      if (po.templateFirst) { props.titlePage = true; section.headers = { first: h, default: new D.Header({ children: [new D.Paragraph('')] }) }; }
      else section.headers = { default: h };
    }
    const doc = new D.Document({ creator: 'Ing Mufredat Sistemi', title: model.title, styles: { default: { document: { run: { font: FONT, size: 20 } } } }, sections: [section] });
    return D.Packer.toBlob(doc);
  };
})();
