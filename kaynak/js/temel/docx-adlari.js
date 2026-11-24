/* docx-preview ve docx kitaplıkları ikisi de window.docx adını kullanır: önce yüklenen önizleyici window.docxPreview'e,
   sonra yüklenen yazıcı window.docxLib'e alınır (index.html bu dosyayı iki kez, iki kitaplığın ardından yükler). */
if (!window.docxPreview && window.docx) { window.docxPreview = window.docx; window.docx = undefined; }
else if (window.docx) { window.docxLib = window.docx; }
