const ExcelJS = require('exceljs');

const cache = new Map();

function cellText(ws, addr) {
  const v = ws.getCell(addr).value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'result' in v) return String(v.result ?? '');
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('');
  return String(v);
}

async function readTemplate(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const kitap = wb.getWorksheet('Kitap');
  const konularWs = wb.getWorksheet('Konular');
  const testTuruWs = wb.getWorksheet('TestTuru');
  if (!kitap || !konularWs || !testTuruWs) {
    throw new Error('Şablonda Kitap / Konular / TestTuru sayfaları bulunamadı');
  }

  const header = {
    kitapAdi: cellText(kitap, 'B1'),
    isbn: cellText(kitap, 'C2'),
    yayinevi: cellText(kitap, 'C3'),
    kitapId: cellText(kitap, 'C4'),
  };

  const konular = [];
  konularWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const kod = row.getCell(3).value;
    const ad = row.getCell(4).value;
    if (kod === null || kod === undefined || kod === '') return;
    konular.push({
      sinif: String(row.getCell(1).value ?? ''),
      ders: String(row.getCell(2).value ?? ''),
      kod: Number(kod),
      ad: String(ad ?? ''),
    });
  });

  const seen = new Set();
  const testTurleri = [];
  testTuruWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const ad = row.getCell(1).value;
    if (ad === null || ad === undefined || String(ad).trim() === '') return;
    const key = String(ad).trim();
    if (seen.has(key)) return;
    seen.add(key);
    testTurleri.push({ ad: key, id: row.getCell(2).value ?? null });
  });

  const result = { header, konular, testTurleri };
  cache.set(filePath, result);
  return result;
}

module.exports = { readTemplate };
