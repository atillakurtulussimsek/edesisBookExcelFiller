const trLower = (s) => String(s ?? '').toLocaleLowerCase('tr');

function suggestKonularScored(konular, text, limit = 5) {
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
    .slice(0, limit);
}

function suggestKonular(konular, text, limit = 5) {
  return suggestKonularScored(konular, text, limit).map((x) => x.konu);
}

// Sayfadan okunan test türü etiketini Excel'deki TestTuru listesiyle eşleştirir.
// preferred: bu kitapta daha önce kullanılan türler (öncelikli).
const STOP = new Set(['test', 'testi', 'testleri', 'soru', 'sorulari', 'soruları', 've']);
function tokens(v) {
  return trLower(v)
    .replace(/[^a-z0-9çğıöşü\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
}
function similarity(a, b) {
  const ta = tokens(a); const tb = tokens(b);
  if (!ta.length || !tb.length) return trLower(a).trim() === trLower(b).trim() ? 1 : 0;
  const sb = new Set(tb);
  const inter = ta.filter((w) => sb.has(w)).length;
  return inter / Math.max(ta.length, tb.length);
}
function matchTestTuru(testTurleri, text, preferred = []) {
  const q = trLower(text).replace(/\s+/g, ' ').trim();
  if (!q) return '';
  const norm = (v) => trLower(v).replace(/\s+/g, ' ').trim();
  // 1) Tercih edilenlerde tam/benzer eşleşme
  for (const p of preferred) if (norm(p) === q) return p;
  for (const p of preferred) if (similarity(p, q) >= 0.6) return p;
  // 2) Tüm listede tam eşleşme
  const exact = testTurleri.find((t) => norm(t.ad) === q);
  if (exact) return exact.ad;
  // 3) Token benzerliği (en yüksek), eşitlikte en kısa ad
  let best = null; let bestScore = 0;
  for (const t of testTurleri) {
    const sc = similarity(t.ad, q);
    if (sc > bestScore || (sc === bestScore && best && t.ad.length < best.ad.length)) { best = t; bestScore = sc; }
  }
  if (best && bestScore >= 0.5) return best.ad;
  // 4) "Test 5" gibi sadece test kelimesi → TEST
  if (!tokens(q).length && /test/.test(q)) { const t = testTurleri.find((x) => norm(x.ad) === 'test'); if (t) return t.ad; }
  return '';
}

module.exports = { suggestKonular, suggestKonularScored, matchTestTuru };
