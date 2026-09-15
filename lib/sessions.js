const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'sessions');
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

async function ensureDirs() {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function sessionPath(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

async function listSessions() {
  await ensureDirs();
  const files = await fs.readdir(SESSIONS_DIR);
  const sessions = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const s = JSON.parse(await fs.readFile(path.join(SESSIONS_DIR, f), 'utf8'));
      sessions.push({
        id: s.id,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        sourceFileName: s.sourceFileName,
        header: s.header,
        testCount: s.tests.length,
      });
    } catch (_) {
      /* bozuk dosya atla */
    }
  }
  sessions.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return sessions;
}

async function createSession(uploadedBuffer, sourceFileName, header) {
  await ensureDirs();
  const id = crypto.randomUUID();
  const templatePath = path.join(UPLOADS_DIR, `${id}.xlsx`);
  await fs.writeFile(templatePath, uploadedBuffer);
  const now = new Date().toISOString();
  const session = {
    id,
    createdAt: now,
    updatedAt: now,
    sourceFileName,
    templatePath,
    header,
    tests: [],
  };
  await saveSession(session);
  return session;
}

async function getSession(id) {
  try {
    return JSON.parse(await fs.readFile(sessionPath(id), 'utf8'));
  } catch (_) {
    return null;
  }
}

async function saveSession(session) {
  session.updatedAt = new Date().toISOString();
  const tmp = sessionPath(session.id) + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(session, null, 2));
  await fs.rename(tmp, sessionPath(session.id));
  return session;
}

async function deleteSession(id) {
  const s = await getSession(id);
  if (!s) return false;
  await fs.rm(sessionPath(id), { force: true });
  await fs.rm(s.templatePath, { force: true });
  return true;
}

module.exports = { listSessions, createSession, getSession, saveSession, deleteSession };
