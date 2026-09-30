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

// Sayfadan okunan test türü etiketini Excel'deki TestTuru listesiyle eşleştirir
function matchTestTuru(testTurleri, text) {
  const q = trLower(text).replace(/\s+/g, ' ').trim();
  if (!q) return '';
  const norm = (v) => trLower(v).replace(/\s+/g, ' ').trim();
  const exact = testTurleri.find((t) => norm(t.ad) === q);
  if (exact) return exact.ad;
  const qNoTest = q.replace(/\btest[iİı]?\b/g, '').trim();
  const loose = testTurleri.find((t) => { const n = norm(t.ad); return n === qNoTest || n.replace(/\btest[iİı]?\b/g, '').trim() === qNoTest; });
  if (loose) return loose.ad;
  const contains = testTurleri.filter((t) => { const n = norm(t.ad); return n.length >= 3 && (q.includes(n) || n.includes(q)); });
  if (contains.length) return contains.sort((a, b) => Math.abs(a.ad.length - q.length) - Math.abs(b.ad.length - q.length))[0].ad;
  return '';
}

module.exports = { suggestKonular, suggestKonularScored, matchTestTuru };
