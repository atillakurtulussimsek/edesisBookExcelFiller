const $ = (id) => document.getElementById(id);

const state = {
  session: null,
  konular: [],
  testTurleri: [],
  editIndex: null,
};

/* ---------- yardımcılar ---------- */

async function api(url, opts = {}) {
  const res = await fetch(url, opts);
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new Error((body && body.error) || `Hata: ${res.status}`);
  return body;
}

async function apiJson(url, method, data) {
  return api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5000 : 2500);
}

const trLower = (s) => String(s).toLocaleLowerCase('tr');

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleString('tr-TR') : '';
}

/* ---------- combobox ---------- */

function setupCombo(comboId, { getItems, render, onSelect, hiddenId, filter }) {
  const combo = $(comboId);
  const input = combo.querySelector('input[type=text]');
  const hidden = $(hiddenId);
  const list = combo.querySelector('.dropdown');
  let active = -1;
  let current = [];

  function close() { list.hidden = true; active = -1; }

  function open() {
    const q = trLower(input.value.trim());
    current = getItems().filter((it) => filter(it, q)).slice(0, 60);
    list.innerHTML = '';
    if (!current.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Sonuç yok';
      list.appendChild(li);
    }
    current.forEach((it, i) => {
      const li = document.createElement('li');
      li.innerHTML = render(it);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
      list.appendChild(li);
    });
    active = -1;
    list.hidden = false;
  }

  function choose(i) {
    const it = current[i];
    if (!it) return;
    onSelect(it, input, hidden);
    close();
  }

  function highlight() {
    [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));
    const li = list.children[active];
    if (li) li.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => { hidden.value = ''; open(); });
  input.addEventListener('focus', open);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { open(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, current.length - 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); highlight(); }
    else if (e.key === 'Enter') {
      if (!list.hidden) {
        e.preventDefault();
        if (active >= 0) choose(active);
        else if (current.length === 1) choose(0);
      }
    } else if (e.key === 'Escape') close();
  });

  return { refresh: () => { if (!list.hidden) open(); } };
}

const konuCombo = setupCombo('konuCombo', {
  hiddenId: 'konuKodu',
  getItems: () => {
    const sinif = $('sinifFilter').value;
    return sinif ? state.konular.filter((k) => k.sinif === sinif) : state.konular;
  },
  filter: (k, q) => !q || String(k.kod).includes(q) || trLower(k.ad).includes(q),
  render: (k) => `<span class="code">${k.kod}</span><span>${escapeHtml(k.ad)}</span><span class="tag">${escapeHtml(k.sinif)} · ${escapeHtml(k.ders)}</span>`,
  onSelect: (k, input, hidden) => {
    input.value = `${k.kod} - ${k.ad}`;
    hidden.value = k.kod;
    $('konuInfo').textContent = `${k.sinif} · ${k.ders}`;
    $('konuAdiKitap').focus();
  },
});

setupCombo('turCombo', {
  hiddenId: 'testTuru',
  getItems: () => state.testTurleri,
  filter: (t, q) => !q || trLower(t.ad).includes(q),
  render: (t) => `<span>${escapeHtml(t.ad)}</span>`,
  onSelect: (t, input, hidden) => {
    input.value = t.ad;
    hidden.value = t.ad;
    $('cevaplar').focus();
  },
});

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------- görünümler ---------- */

function show(view) {
  $('homeView').hidden = view !== 'home';
  $('sessionView').hidden = view !== 'session';
}

async function loadHome() {
  show('home');
  state.session = null;
  const list = await api('/api/sessions');
  const el = $('sessionList');
  el.innerHTML = '';
  if (!list.length) {
    el.innerHTML = '<div class="empty">Devam eden kitap yok.</div>';
    return;
  }
  for (const s of list) {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="info">
        <b>${escapeHtml(s.header.kitapAdi || s.sourceFileName)}</b>
        <span>${s.testCount} test · son güncelleme ${fmtDate(s.updatedAt)}</span>
      </div>
      <div class="actions">
        <button class="primary" data-open="${s.id}">Devam Et</button>
        <button class="danger" data-del="${s.id}">Sil</button>
      </div>`;
    el.appendChild(item);
  }
}

$('sessionList').addEventListener('click', async (e) => {
  const openId = e.target.dataset.open;
  const delId = e.target.dataset.del;
  if (openId) { location.hash = openId; }
  if (delId) {
    if (!confirm('Bu oturum ve içindeki testler silinecek. Emin misin?')) return;
    try {
      await api(`/api/sessions/${delId}`, { method: 'DELETE' });
      toast('Oturum silindi');
      loadHome();
    } catch (err) { toast(err.message, true); }
  }
});

$('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('excelFile').files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('excel', file);
  try {
    const session = await api('/api/sessions', { method: 'POST', body: fd });
    $('excelFile').value = '';
    location.hash = session.id;
  } catch (err) { toast(err.message, true); }
});

async function loadSession(id) {
  try {
    const data = await api(`/api/sessions/${id}`);
    state.session = data.session;
    state.konular = data.konular;
    state.testTurleri = data.testTurleri;
    state.editIndex = null;
    show('session');
    renderHeader();
    renderSinifFilter();
    resetForm(true);
    renderTests();
  } catch (err) {
    toast(err.message, true);
    location.hash = '';
  }
}

function renderHeader() {
  const h = state.session.header;
  $('kitapAdi').textContent = h.kitapAdi || state.session.sourceFileName;
  $('isbn').textContent = h.isbn;
  $('yayinevi').textContent = h.yayinevi;
  $('kitapId').textContent = h.kitapId;
}

function renderSinifFilter() {
  const sel = $('sinifFilter');
  const siniflar = [...new Set(state.konular.map((k) => k.sinif))];
  sel.innerHTML = '<option value="">Tüm sınıflar</option>' +
    siniflar.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}. sınıf</option>`).join('');
}

$('sinifFilter').addEventListener('change', () => konuCombo.refresh());

function renderTests() {
  const tests = state.session.tests;
  $('testCount').textContent = `(${tests.length})`;
  const tbody = $('testTable').querySelector('tbody');
  tbody.innerHTML = '';
  tests.forEach((t, i) => {
    const tr = document.createElement('tr');
    if (i === state.editIndex) tr.className = 'editing';
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${t.konuKodu}</td>
      <td>${escapeHtml(t.konuAdiUks)}</td>
      <td>${escapeHtml(t.konuAdiKitap)}</td>
      <td>${t.testId === '' ? '' : t.testId}</td>
      <td>${t.soruSayisi}</td>
      <td>${escapeHtml(t.testTuru)}</td>
      <td class="mono">${t.cevaplar}</td>
      <td><div class="btns">
        <button class="small" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="small" data-act="down" data-i="${i}" ${i === tests.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="small" data-act="edit" data-i="${i}">Düzenle</button>
        <button class="small danger" data-act="del" data-i="${i}">Sil</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}

$('testTable').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const id = state.session.id;
  try {
    if (btn.dataset.act === 'del') {
      if (!confirm(`${i + 1}. test silinsin mi?`)) return;
      state.session = await api(`/api/sessions/${id}/tests/${i}`, { method: 'DELETE' });
      if (state.editIndex === i) resetForm(true);
      toast('Test silindi');
    } else if (btn.dataset.act === 'up' || btn.dataset.act === 'down') {
      state.session = await apiJson(`/api/sessions/${id}/tests/${i}/move`, 'POST', { direction: btn.dataset.act });
      if (state.editIndex !== null) resetForm(true);
    } else if (btn.dataset.act === 'edit') {
      startEdit(i);
    }
    renderTests();
  } catch (err) { toast(err.message, true); }
});

/* ---------- form ---------- */

function startEdit(i) {
  const t = state.session.tests[i];
  state.editIndex = i;
  const konu = state.konular.find((k) => k.kod === t.konuKodu);
  $('konuInput').value = konu ? `${konu.kod} - ${konu.ad}` : String(t.konuKodu);
  $('konuKodu').value = t.konuKodu;
  $('konuInfo').textContent = konu ? `${konu.sinif} · ${konu.ders}` : '';
  $('konuAdiKitap').value = t.konuAdiKitap;
  $('testId').value = t.testId;
  $('soruSayisi').value = t.soruSayisi;
  $('turInput').value = t.testTuru;
  $('testTuru').value = t.testTuru;
  $('cevaplar').value = t.cevaplar;
  $('formTitle').textContent = `${i + 1}. Testi Düzenle`;
  $('submitBtn').textContent = 'Kaydet';
  $('cancelEditBtn').hidden = false;
  updateCevapSayac();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('cevaplar').focus();
}

function resetForm(full) {
  state.editIndex = null;
  $('formTitle').textContent = 'Test Ekle';
  $('submitBtn').textContent = 'Ekle';
  $('cancelEditBtn').hidden = true;
  $('formError').textContent = '';
  if (full) {
    $('konuInput').value = '';
    $('konuKodu').value = '';
    $('konuInfo').textContent = '';
    $('konuAdiKitap').value = '';
    $('turInput').value = '';
    $('testTuru').value = '';
  }
  $('testId').value = '';
  $('soruSayisi').value = '';
  $('cevaplar').value = '';
  updateCevapSayac();
}

$('cancelEditBtn').addEventListener('click', () => { resetForm(true); renderTests(); });

function updateCevapSayac() {
  const n = $('cevaplar').value.replace(/\s+/g, '').length;
  const s = Number($('soruSayisi').value) || 0;
  const el = $('cevapSayac');
  el.textContent = `${n} / ${s || '?'}`;
  el.className = s && n !== s ? 'error' : (s && n === s ? 'ok' : '');
}

$('cevaplar').addEventListener('input', (e) => {
  const clean = e.target.value.toUpperCase().replace(/[^ABCDE]/g, '');
  if (clean !== e.target.value) e.target.value = clean;
  updateCevapSayac();
});
$('soruSayisi').addEventListener('input', updateCevapSayac);
$('cevaplar').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('testForm').requestSubmit(); }
});

$('testForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('formError').textContent = '';
  const payload = {
    konuKodu: $('konuKodu').value,
    konuAdiKitap: $('konuAdiKitap').value,
    testId: $('testId').value,
    soruSayisi: $('soruSayisi').value,
    testTuru: $('testTuru').value,
    cevaplar: $('cevaplar').value,
  };
  if (!payload.konuKodu) { $('formError').textContent = 'Konu listeden seçilmeli'; $('konuInput').focus(); return; }
  if (!payload.testTuru) { $('formError').textContent = 'Test türü listeden seçilmeli'; $('turInput').focus(); return; }
  const id = state.session.id;
  try {
    if (state.editIndex !== null) {
      state.session = await apiJson(`/api/sessions/${id}/tests/${state.editIndex}`, 'PUT', payload);
      toast('Test güncellendi');
      resetForm(true);
    } else {
      state.session = await apiJson(`/api/sessions/${id}/tests`, 'POST', payload);
      toast(`Test eklendi (${state.session.tests.length})`);
      resetForm(false);
      $('testId').focus();
    }
    renderTests();
  } catch (err) {
    $('formError').textContent = err.message;
  }
});

/* ---------- excel ---------- */

$('downloadBtn').addEventListener('click', () => {
  window.location.href = `/api/sessions/${state.session.id}/excel`;
});

$('completeBtn').addEventListener('click', async () => {
  const n = state.session.tests.length;
  if (!confirm(`${n} test ile Excel üretilecek ve bu oturumun JSON kaydı kaldırılacak. Devam?`)) return;
  try {
    const r = await api(`/api/sessions/${state.session.id}/complete`, { method: 'POST' });
    alert(`Excel üretildi:\n${r.outPath}`);
    location.hash = '';
  } catch (err) { toast(err.message, true); }
});

/* ---------- yönlendirme ---------- */

$('homeLink').addEventListener('click', (e) => { e.preventDefault(); location.hash = ''; });

function route() {
  const id = location.hash.replace('#', '');
  if (id) loadSession(id); else loadHome();
}
window.addEventListener('hashchange', route);
route();
