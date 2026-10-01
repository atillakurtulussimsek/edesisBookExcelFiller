const fs = require('fs/promises');
const path = require('path');
const sessions = require('./sessions');
const { analyzeImages } = require('./analyze');
const { readTemplate } = require('./template');
const { suggestKonularScored, matchTestTuru } = require('./konu');
const { validateTest } = require('./validate');

const AUTO_THRESHOLD = Number(process.env.AUTO_APPROVE_THRESHOLD || 90);

const CONCURRENCY = 2;
const pending = []; // { sessionId, jobId }
let running = 0;
let onChange = () => {};

function setOnChange(fn) { onChange = fn; }

function jobsDir() {
  return path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'uploads', 'jobs');
}

async function saveJobImages(jobId, files) {
  const dir = jobsDir();
  await fs.mkdir(dir, { recursive: true });
  const pages = [];
  for (let i = 0; i < files.length; i++) {
    const p = path.join(dir, `${jobId}-${i + 1}.jpg`);
    await fs.writeFile(p, files[i].buffer);
    pages.push({ path: p, mimetype: files[i].mimetype || 'image/jpeg' });
  }
  return pages;
}

async function deleteJobImages(job) {
  for (const p of job.pages || []) await fs.rm(p.path, { force: true });
}

function enqueue(sessionId, jobId) {
  pending.push({ sessionId, jobId });
  tick();
}

function tick() {
  while (running < CONCURRENCY && pending.length) {
    const item = pending.shift();
    running++;
    run(item).catch((e) => console.error('[kuyruk] beklenmeyen hata', e)).finally(() => { running--; tick(); });
  }
}

function updateJob(sessionId, jobId, patch) {
  return sessions.withSessionLock(sessionId, () => updateJobUnlocked(sessionId, jobId, patch));
}

async function updateJobUnlocked(sessionId, jobId, patch) {
  const session = await sessions.getSession(sessionId);
  if (!session) return null;
  const job = (session.jobs || []).find((j) => j.id === jobId);
  if (!job) return null;
  Object.assign(job, patch);
  await sessions.saveSession(session);
  onChange(session);
  return session;
}

async function run({ sessionId, jobId }) {
  const session = await sessions.getSession(sessionId);
  const job = session && (session.jobs || []).find((j) => j.id === jobId);
  if (!job) return;
  await updateJob(sessionId, jobId, { status: 'analyzing', error: '' });
  const started = Date.now();
  try {
    const files = [];
    for (const p of job.pages) files.push({ buffer: await fs.readFile(p.path), mimetype: p.mimetype, size: 0 });
    for (const f of files) f.size = f.buffer.length;
    const tpl = await readTemplate(session.templatePath);
    const adaylar = [...new Set(session.tests.map((t) => t.testTuru))].slice(-10);
    const konuAdaylari = konuCandidates(tpl, session);
    const tests = (await analyzeImages(files, { testTuruAdaylari: adaylar, konuAdaylari })).map((t) => scoreTest(t, tpl, adaylar));
    console.log(`[kuyruk] iş ${job.order} tamam: ${tests.length} test, puan ${tests.map((t) => t.puan).join('/')} (${((Date.now() - started) / 1000).toFixed(1)} sn)`);
    await updateJob(sessionId, jobId, { status: 'ready', tests, finishedAt: new Date().toISOString() });
    await autoApprove(sessionId);
  } catch (e) {
    console.error(`[kuyruk] iş ${job.order} hata:`, e.message);
    await updateJob(sessionId, jobId, { status: 'error', error: e.message });
  }
}

const MAX_KONU_CANDIDATES = 800;
// Modele verilecek konu listesi: liste büyükse kitapta kullanılan sınıflara daraltılır
function konuCandidates(tpl, session) {
  let list = tpl.konular;
  if (list.length > MAX_KONU_CANDIDATES) {
    const used = new Set(session.tests.map((t) => t.konuKodu));
    const siniflar = new Set(list.filter((k) => used.has(k.kod)).map((k) => k.sinif));
    if (siniflar.size) list = list.filter((k) => siniflar.has(k.sinif));
  }
  return list.slice(0, MAX_KONU_CANDIDATES).map((k) => ({ kod: k.kod, ad: k.ad }));
}

// Doğruluk puanı: modelin güveni + sunucu tarafı kontroller
function scoreTest(t, tpl, adaylar = []) {
  const scored = suggestKonularScored(tpl.konular, t.konuAdi);
  let konuOnerileri = scored.map((x) => x.konu);
  let konuSkor = scored[0]?.score || 0; // 100 tam eşleşme, 50 içerme, 10/kelime
  const modelKonu = t.konuKodu !== null ? tpl.konular.find((k) => k.kod === t.konuKodu) : null;
  if (modelKonu) {
    konuOnerileri = [modelKonu, ...konuOnerileri.filter((k) => k.kod !== modelKonu.kod)];
    konuSkor = 100;
  }
  let puan = t.guven || 0;
  const nedenler = [];
  if (!t.cevaplar) { puan = 0; nedenler.push('cevap anahtarı okunamadı'); }
  if (t.not) { puan = Math.min(puan, 80); nedenler.push('modelin notu var'); }
  if (t.testNo === '') { puan = Math.min(puan, 85); nedenler.push('test no yok'); }
  if (!modelKonu) {
    if (!t.konuAdi) { puan = Math.min(puan, 60); nedenler.push('konu belirlenemedi'); }
    else if (konuSkor < 50) { puan = Math.min(puan, 85); nedenler.push('konu eşleşmesi zayıf'); }
  }
  const testTuruOneri = matchTestTuru(tpl.testTurleri, t.testTuru, adaylar);
  return { ...t, konuOnerileri, konuSkor, testTuruOneri, puan, nedenler };
}

function autoApprove(sessionId) {
  return sessions.withSessionLock(sessionId, () => autoApproveUnlocked(sessionId));
}

const AUTO_APPROVE = process.env.AUTO_APPROVE === '1';

async function autoApproveUnlocked(sessionId) {
  if (!AUTO_APPROVE) return; // cevap anahtarı manuel girilir; otomatik onay kapalı
  const session = await sessions.getSession(sessionId);
  if (!session) return;
  const jobs = [...(session.jobs || [])].sort((a, b) => a.order - b.order);
  const tpl = await readTemplate(session.templatePath);
  let changed = false;
  for (const job of jobs) {
    if (job.status !== 'ready') break; // sıra korunur: önceki iş hazır değilse dur
    const lastTuru = session.tests.length ? session.tests[session.tests.length - 1].testTuru : '';
    const reasons = [];
    if (!job.tests.length) reasons.push('test bulunamadı');
    if (!lastTuru && job.tests.some((t) => !t.testTuruOneri)) reasons.push('test türü okunamadı ve önceki test yok');
    const payloads = [];
    for (const t of job.tests) {
      if ((t.puan ?? 0) < AUTO_THRESHOLD) reasons.push(`puan ${t.puan} < ${AUTO_THRESHOLD}`);
      const konu = t.konuOnerileri?.[0];
      if (!konu || (t.konuSkor ?? 0) < 50) reasons.push('konu eşleşmesi zayıf');
      if (reasons.length) break;
      const { errors, test } = validateTest(
        { konuKodu: konu.kod, konuAdiKitap: t.konuAdi, testId: t.testNo, soruSayisi: t.cevaplar.length, testTuru: t.testTuruOneri || lastTuru, cevaplar: t.cevaplar },
        tpl,
      );
      if (errors) { reasons.push(errors.join('. ')); break; }
      payloads.push({ ...test, otomatik: true, puan: t.puan });
    }
    if (reasons.length) {
      if (job.otoRed !== reasons.join('; ')) { job.otoRed = reasons.join('; '); changed = true; }
      break; // manuel onay bekliyor; sıradakilere geçme
    }
    session.tests.push(...payloads);
    session.jobs = session.jobs.filter((j) => j.id !== job.id);
    await deleteJobImages(job);
    console.log(`[oto-onay] iş ${job.order} otomatik eklendi (puan ${job.tests.map((t) => t.puan).join('/')})`);
    changed = true;
  }
  if (changed) {
    await sessions.saveSession(session);
    onChange(session);
  }
}

async function resumePending() {
  const list = await sessions.listSessions();
  for (const s of list) {
    const session = await sessions.getSession(s.id);
    for (const job of session.jobs || []) {
      const unscored = job.status === 'ready' && job.tests.some((t) => t.puan === undefined);
      if (job.status === 'queued' || job.status === 'analyzing' || unscored) enqueue(session.id, job.id);
    }
    await autoApprove(session.id);
  }
}

module.exports = { enqueue, saveJobImages, deleteJobImages, resumePending, setOnChange, autoApprove };
