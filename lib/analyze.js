const OpenAI = require('openai');

const PROMPT = `Bu görsel bir soru bankası kitabının sayfasının fotoğrafıdır (cevap anahtarı ya da test sayfası olabilir).
Görseldeki her test için şu bilgileri çıkar:
- testNo: testin numarası (sayı; yoksa null)
- konuAdi: testin ait olduğu konu/bölüm adı (kitapta yazdığı gibi; yoksa null)
- cevaplar: cevap anahtarı, soru sırasına göre yalnızca A-E harflerinden oluşan tek string (ör. "ABCDEAB"); okunamıyorsa null

Kurallar:
- Sadece JSON döndür, açıklama yazma.
- Format: {"tests":[{"testNo":1,"konuAdi":"Sözcükte Anlam","cevaplar":"ABCDE"}]}
- Cevapları soru numarası sırasına göre birleştir. Emin olmadığın harfleri tahmin etme; okunamayan kısımları atlama yerine tüm cevaplar alanını null yap ve "not" alanına neyin okunamadığını yaz.
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

async function analyzeImage(buffer, mimeType) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
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

module.exports = { analyzeImage };
