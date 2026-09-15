const fs = require('fs/promises');
const JSZip = require('jszip');

const FIRST_DATA_ROW = 10;
const MIN_ROWS = 20;
const SHEET_PATH = 'xl/worksheets/sheet1.xml';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numCell(ref, style, value) {
  const s = style ? ` s="${style}"` : '';
  return `<c r="${ref}"${s}><v>${Number(value)}</v></c>`;
}

function strCell(ref, style, value) {
  const s = style ? ` s="${style}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
}

function dFormula(r) {
  return `<c r="D${r}" s="7"><f>IFERROR(VLOOKUP(C${r},Konular!$C:$D,2,0),"")</f></c>`;
}

function gFormula(r) {
  const p = r - 1;
  return `<c r="G${r}" s="5"><f>IF(C${r}&lt;&gt;"", IF(C${r}=C${p},G${p}+1,1), "")</f></c>`;
}

function hasValue(v) {
  return v !== '' && v !== null && v !== undefined;
}

function buildRow(r, test) {
  const cells = [];
  if (test) cells.push(numCell(`C${r}`, 5, test.konuKodu));
  cells.push(dFormula(r));
  if (test && test.konuAdiKitap) cells.push(strCell(`E${r}`, 7, test.konuAdiKitap));
  if (test && hasValue(test.testId)) cells.push(numCell(`F${r}`, null, test.testId));
  cells.push(gFormula(r));
  if (test) {
    cells.push(numCell(`H${r}`, 5, test.soruSayisi));
    cells.push(strCell(`I${r}`, null, test.testTuru));
    cells.push(strCell(`J${r}`, null, test.cevaplar));
  }
  return `<row r="${r}">${cells.join('')}</row>`;
}

async function writeExcel(templatePath, tests, outPath) {
  const buf = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file(SHEET_PATH).async('string');

  const totalRows = Math.max(MIN_ROWS, tests.length);
  const lastRow = FIRST_DATA_ROW + totalRows - 1;

  const rows = [];
  for (let i = 0; i < totalRows; i++) {
    rows.push(buildRow(FIRST_DATA_ROW + i, tests[i] || null));
  }

  const startIdx = xml.indexOf(`<row r="${FIRST_DATA_ROW}"`);
  const endIdx = xml.indexOf('</sheetData>');
  if (startIdx === -1 || endIdx === -1) throw new Error('Kitap sayfası beklenen yapıda değil');
  xml = xml.slice(0, startIdx) + rows.join('') + xml.slice(endIdx);

  xml = xml.replace(/<dimension ref="[^"]*"/, `<dimension ref="A1:K${lastRow}"`);
  xml = xml.replace(/<xm:sqref>I10:I\d+<\/xm:sqref>/, `<xm:sqref>I10:I${lastRow + 1}</xm:sqref>`);

  zip.file(SHEET_PATH, xml);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.writeFile(outPath, out);
  return outPath;
}

module.exports = { writeExcel };
