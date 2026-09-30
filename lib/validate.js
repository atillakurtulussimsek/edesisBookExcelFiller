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


module.exports = { validateTest };
