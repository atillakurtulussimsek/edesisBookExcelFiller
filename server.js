const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { readTemplate } = require('./lib/template');
const { writeExcel } = require('./lib/writer');
const sessions = require('./lib/sessions');

const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function validateTest(body, tpl) {
  const errors = [];
  const konuKodu = Number(body.konuKodu);
  if (!Number.isFinite(konuKodu) || !tpl.konular.some((k) => k.kod === konuKodu)) {
    errors.push('Konu listeden seçilmeli');
  }
  const testId = body.testId === '' || body.testId === undefined || body.testId === null ? '' : Number(body.testId);
  if (testId !== '' && !Number.isFinite(testId)) errors.push('Test ID sayı olmalı');
  const soruSayisi = Number(body.soruSayisi);
  if (!Number.isInteger(soruSayisi) || soruSayisi < 1) errors.push('Soru sayısı 1 veya daha büyük tam sayı olmalı');
  const testTuru = String(body.testTuru ?? '').trim();
  if (!tpl.testTurleri.some((t) => t.ad === testTuru)) errors.push('Test türü listeden seçilmeli');
  const cevaplar = String(body.cevaplar ?? '').replace(/\s+/g, '').toUpperCase();
  if (!/^[ABCDE]+$/.test(cevaplar)) errors.push('Cevaplar yalnızca A-E harflerinden oluşmalı');
  else if (cevaplar.length !== soruSayisi) {
    errors.push(`Cevap sayısı (${cevaplar.length}) soru sayısı (${soruSayisi}) ile eşit olmalı`);
  }
  const konuAdiKitap = String(body.konuAdiKitap ?? '').trim();
  if (errors.length) return { errors };
  const konu = tpl.konular.find((k) => k.kod === konuKodu);
  return {
    test: { konuKodu, konuAdiUks: konu.ad, konuAdiKitap, testId, soruSayisi, testTuru, cevaplar },
  };
}

function safeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

async function generateExcel(session) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const base = safeFileName(session.sourceFileName.replace(/\.xlsx$/i, ''));
  const outPath = path.join(OUTPUT_DIR, `${base}.xlsx`);
  await writeExcel(session.templatePath, session.tests, outPath);
  return outPath;
}

app.get('/api/sessions', wrap(async (req, res) => {
  res.json(await sessions.listSessions());
}));

app.post('/api/sessions', upload.single('excel'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Excel dosyası gerekli' });
  const tmpPath = path.join(__dirname, 'data', 'uploads', `tmp-${Date.now()}.xlsx`);
  await fs.mkdir(path.dirname(tmpPath), { recursive: true });
  await fs.writeFile(tmpPath, req.file.buffer);
  let tpl;
  try {
    tpl = await readTemplate(tmpPath);
  } catch (e) {
    await fs.rm(tmpPath, { force: true });
    return res.status(400).json({ error: e.message });
  }
  await fs.rm(tmpPath, { force: true });
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const session = await sessions.createSession(req.file.buffer, originalName, tpl.header);
  res.json(session);
}));

app.get('/api/sessions/:id', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const tpl = await readTemplate(session.templatePath);
  res.json({ session, konular: tpl.konular, testTurleri: tpl.testTurleri });
}));

app.post('/api/sessions/:id/tests', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const tpl = await readTemplate(session.templatePath);
  const { errors, test } = validateTest(req.body, tpl);
  if (errors) return res.status(400).json({ error: errors.join('. ') });
  session.tests.push(test);
  await sessions.saveSession(session);
  res.json(session);
}));

app.put('/api/sessions/:id/tests/:index', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const i = Number(req.params.index);
  if (!session.tests[i]) return res.status(404).json({ error: 'Test bulunamadı' });
  const tpl = await readTemplate(session.templatePath);
  const { errors, test } = validateTest(req.body, tpl);
  if (errors) return res.status(400).json({ error: errors.join('. ') });
  session.tests[i] = test;
  await sessions.saveSession(session);
  res.json(session);
}));

app.delete('/api/sessions/:id/tests/:index', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const i = Number(req.params.index);
  if (!session.tests[i]) return res.status(404).json({ error: 'Test bulunamadı' });
  session.tests.splice(i, 1);
  await sessions.saveSession(session);
  res.json(session);
}));

app.post('/api/sessions/:id/tests/:index/move', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const i = Number(req.params.index);
  const j = i + (req.body.direction === 'up' ? -1 : 1);
  if (!session.tests[i] || !session.tests[j]) return res.status(400).json({ error: 'Taşınamaz' });
  [session.tests[i], session.tests[j]] = [session.tests[j], session.tests[i]];
  await sessions.saveSession(session);
  res.json(session);
}));

app.get('/api/sessions/:id/excel', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const outPath = await generateExcel(session);
  res.download(outPath, path.basename(outPath));
}));

app.post('/api/sessions/:id/complete', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const outPath = await generateExcel(session);
  await sessions.deleteSession(session.id);
  res.json({ ok: true, outPath });
}));

app.delete('/api/sessions/:id', wrap(async (req, res) => {
  const ok = await sessions.deleteSession(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Oturum bulunamadı' });
  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`edesis Excel Filler: http://localhost:${PORT}`);
});
