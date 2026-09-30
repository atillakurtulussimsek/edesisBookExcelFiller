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

module.exports = { suggestKonular };
