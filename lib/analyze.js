const OpenAI = require('openai');

const PROMPT = `Bu görseller bir soru bankası kitabındaki TEK BİR TESTİN ardışık sayfalarının fotoğraflarıdır (ilk sayfada konu/test başlığı, son sayfada cevap anahtarı olabilir).
Tüm sayfaları birlikte değerlendirip bu test için şu bilgileri çıkar:
- testNo: testin numarası (sayı; yoksa null)
- konuAdi: testin ait olduğu konu/bölüm adı (kitapta yazdığı gibi; yoksa null)
- cevaplar: cevap anahtarı, soru sırasına göre yalnızca A-E harflerinden oluşan tek string (ör. "ABCDEAB"); okunamıyorsa null
- not: okunamayan/emin olunmayan kısımlar varsa kısa açıklama, yoksa null

Kurallar:
- Sadece JSON döndür, açıklama yazma.
- Format: {"tests":[{"testNo":1,"konuAdi":"Sözcükte Anlam","cevaplar":"ABCDE","not":null}]}
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

async function analyzeImages(files) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const images = files.map((f, i) => [
    { type: 'text', text: `Sayfa ${i + 1}/${files.length}:` },
    {
      type: 'image_url',
      image_url: { url: `data:${f.mimetype || 'image/jpeg'};base64,${f.buffer.toString('base64')}`, detail: 'high' },
    },
  ]).flat();
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, ...images] }],
  });
  const text = res.choices?.[0]?.message?.content || '';
  const parsed = parseJson(text);
  const tests = Array.isArray(parsed.tests) ? parsed.tests : [];
  return tests.map((t) => ({
    testNo: t.testNo === null || t.testNo === undefined || t.testNo === '' ? '' : Number(t.testNo),
    konuAdi: t.konuAdi ? String(t.konuAdi).trim() : '',
    cevaplar: t.cevaplar ? String(t.cevaplar).toUpperCase().replace(/[^ABCDE]/g, '') : '',
    not: t.not ? String(t.not) : '',
  }));
}

module.exports = { analyzeImages };
