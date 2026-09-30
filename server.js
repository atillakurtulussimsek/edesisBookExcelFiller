require('dotenv').config();
const express = require('express');
const os = require('os');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { readTemplate } = require('./lib/template');
const { writeExcel } = require('./lib/writer');
const { analyzeImages } = require('./lib/analyze');
const sessions = require('./lib/sessions');

const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${Date.now() - started} ms)`);
  });
  next();
});
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const sseClients = new Set();
function broadcast(type, payload) {
  const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) client.write(data);
}

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('event: hello\ndata: {}\n\n');
  sseClients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
});

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

const trLower = (s) => String(s ?? '').toLocaleLowerCase('tr');

function suggestKonular(konular, text, limit = 5) {
  const q = trLower(text).trim();
  if (!q) return [];
  const words = q.split(/[^a-zçğıöşü0-9]+/).filter((w) => w.length > 2);
  return konular
    .map((k) => {
      const ad = trLower(k.ad);
      let score = 0;
      if (ad === q) score += 100;
      else if (ad.includes(q) || q.includes(ad)) score += 50;
      for (const w of words) if (ad.includes(w)) score += 10;
      return { konu: k, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.konu);
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
  const tmpPath = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'uploads', `tmp-${Date.now()}.xlsx`);
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
  broadcast('sessions', { sessionId: session.id });
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
  broadcast('session', { sessionId: session.id, session });
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
  broadcast('session', { sessionId: session.id, session });
  res.json(session);
}));

app.delete('/api/sessions/:id/tests/:index', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const i = Number(req.params.index);
  if (!session.tests[i]) return res.status(404).json({ error: 'Test bulunamadı' });
  session.tests.splice(i, 1);
  await sessions.saveSession(session);
  broadcast('session', { sessionId: session.id, session });
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
  broadcast('session', { sessionId: session.id, session });
  res.json(session);
}));

app.get('/api/sessions/:id/excel', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const outPath = await generateExcel(session);
  res.download(outPath, path.basename(outPath));
}));

app.post('/api/sessions/:id/analyze', upload.array('images', 10), wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'En az bir görsel gerekli' });
  const tpl = await readTemplate(session.templatePath);
  const tests = await analyzeImages(req.files);
  res.json({
    tests: tests.map((t) => ({ ...t, konuOnerileri: suggestKonular(tpl.konular, t.konuAdi) })),
  });
}));

app.post('/api/sessions/:id/complete', wrap(async (req, res) => {
  const session = await sessions.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
  const outPath = await generateExcel(session);
  await sessions.deleteSession(session.id);
  broadcast('sessions', { sessionId: session.id, removed: true });
  res.json({ ok: true, outPath });
}));

app.delete('/api/sessions/:id', wrap(async (req, res) => {
  const ok = await sessions.deleteSession(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Oturum bulunamadı' });
  broadcast('sessions', { sessionId: req.params.id, removed: true });
  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`edesis Excel Filler: http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) console.log(`  Telefon için: http://${ni.address}:${PORT}`);
    }
  }
});
