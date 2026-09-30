const OpenAI = require('openai');

const PROMPT = `Bu görseller bir soru bankası kitabındaki TEK BİR TESTİN ardışık sayfalarının fotoğraflarıdır (ilk sayfada konu/test başlığı, son sayfada cevap anahtarı olabilir).
Tüm sayfaları birlikte değerlendirip bu test için şu bilgileri çıkar:
- testNo: testin numarası (sayı; yoksa null)
- konuAdi: testin ait olduğu konu/bölüm adı (kitapta yazdığı gibi; yoksa null)
- testTuru: testin sayfada yazan türü/etiketi. Genellikle test başlığının yanında veya üstünde yazar (ör. "TEST", "ÖSYM TİPİ", "KAVRAMA TESTİ", "YAPRAK TEST", "TÜMEVARIM"); "Test 5" gibi sadece numara varsa "TEST" yaz; hiçbir etiket yoksa null. Bu alanı her zaman JSON'a yaz.
- cevaplar: cevap anahtarı, soru sırasına göre yalnızca A-E harflerinden oluşan tek string (ör. "ABCDEAB"); okunamıyorsa null
- not: okunamayan/emin olunmayan kısımlar varsa kısa açıklama, yoksa null
- guven: 0-100 arası tam sayı; cevap anahtarının ve test numarasının doğru okunduğuna ne kadar eminsin (bulanık, kesik, tahmin edilmiş harf varsa düşür)

Kurallar:
- Sadece JSON döndür, açıklama yazma.
- Format: {"tests":[{"testNo":1,"konuAdi":"Sözcükte Anlam","testTuru":"TEST","cevaplar":"ABCDE","not":null,"guven":95}]}
- Sayfalar tek bir teste aitse tek eleman döndür. Cevap anahtarı sayfasında birden fazla test varsa yalnızca önceki sayfalardaki teste ait olanı al; test numarası belirlenemiyorsa bulunan her testi ayrı eleman olarak döndür.
- Cevapları soru numarası sırasına göre birleştir. Emin olmadığın harfleri tahmin etme; okunamayan kısım varsa cevaplar alanını null yap ve "not" alanında belirt.
- Test bulunamazsa {"tests":[]} döndür.`;

function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY tanımlı değil (.env dosyasına ekle)');
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

function parseJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Yapay zeka geçerli JSON döndürmedi');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function buildPrompt(candidates) {
  if (!candidates || !candidates.length) return PROMPT;
  return `${PROMPT}
- Bu kitapta daha önce görülen test türleri: ${candidates.map((c) => `"${c}"`).join(', ')}. Sayfadaki etiket bunlardan birine karşılık geliyorsa testTuru alanına listedeki yazımı aynen kullan.`;
}

async function analyzeImages(files, options = {}) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const images = files.map((f, i) => [
    { type: 'text', text: `Sayfa ${i + 1}/${files.length}:` },
    {
      type: 'image_url',
      image_url: { url: `data:${f.mimetype || 'image/jpeg'};base64,${f.buffer.toString('base64')}`, detail: 'high' },
    },
  ]).flat();
  const started = Date.now();
  console.log(`[analiz] ${files.length} sayfa, ${(files.reduce((n, f) => n + f.size, 0) / 1024).toFixed(0)} KB, model=${model}`);
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [{ role: 'user', content: [{ type: 'text', text: buildPrompt(options.testTuruAdaylari) }, ...images] }],
  });
  console.log(`[analiz] yanıt ${((Date.now() - started) / 1000).toFixed(1)} sn`);
  const text = res.choices?.[0]?.message?.content || '';
  console.log(`[analiz] tokens: ${JSON.stringify(res.usage || {})}`);
  console.log(`[analiz] ham yanıt: ${text.slice(0, 500)}`);
  const parsed = parseJson(text);
  const tests = Array.isArray(parsed.tests) ? parsed.tests : [];
  return tests.map((t) => ({
    testNo: t.testNo === null || t.testNo === undefined || t.testNo === '' ? '' : Number(t.testNo),
    konuAdi: t.konuAdi ? String(t.konuAdi).trim() : '',
    testTuru: t.testTuru ? String(t.testTuru).trim() : '',
    cevaplar: t.cevaplar ? String(t.cevaplar).toUpperCase().replace(/[^ABCDE]/g, '') : '',
    not: t.not ? String(t.not) : '',
    guven: Number.isFinite(Number(t.guven)) ? Math.max(0, Math.min(100, Math.round(Number(t.guven)))) : 0,
  }));
}

module.exports = { analyzeImages };
