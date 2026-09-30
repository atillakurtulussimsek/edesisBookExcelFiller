const fs = require('fs/promises');
const path = require('path');
const sessions = require('./sessions');
const { analyzeImages } = require('./analyze');
const { readTemplate } = require('./template');

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

async function updateJob(sessionId, jobId, patch) {
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
  if (!job || job.status === 'ready') return;
  await updateJob(sessionId, jobId, { status: 'analyzing', error: '' });
  const started = Date.now();
  try {
    const files = [];
    for (const p of job.pages) files.push({ buffer: await fs.readFile(p.path), mimetype: p.mimetype, size: 0 });
    for (const f of files) f.size = f.buffer.length;
    const tpl = await readTemplate(session.templatePath);
    const { suggestKonular } = require('./konu');
    const tests = (await analyzeImages(files)).map((t) => ({ ...t, konuOnerileri: suggestKonular(tpl.konular, t.konuAdi) }));
    console.log(`[kuyruk] iş ${job.order} tamam: ${tests.length} test (${((Date.now() - started) / 1000).toFixed(1)} sn)`);
    await updateJob(sessionId, jobId, { status: 'ready', tests, finishedAt: new Date().toISOString() });
  } catch (e) {
    console.error(`[kuyruk] iş ${job.order} hata:`, e.message);
    await updateJob(sessionId, jobId, { status: 'error', error: e.message });
  }
}

async function resumePending() {
  const list = await sessions.listSessions();
  for (const s of list) {
    const session = await sessions.getSession(s.id);
    for (const job of session.jobs || []) {
      if (job.status === 'queued' || job.status === 'analyzing') enqueue(session.id, job.id);
    }
  }
}

module.exports = { enqueue, saveJobImages, deleteJobImages, resumePending, setOnChange };
