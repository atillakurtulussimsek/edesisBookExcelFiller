# edesis Kitap Excel Doldurucu

edesis kitap yükleme Excel şablonunu form üzerinden dolduran lokal Node.js aracı.

## Kurulum

```bash
npm install
npm start        # ya da: npm run dev (kod değişince otomatik yeniden başlar)
```

Tarayıcı: http://localhost:3000

## Akış

1. Excel şablonunu yükle → oturum açılır, veriler `data/sessions/<id>.json` içinde tutulur.
2. Testleri tek tek ekle (konu ve test türü Excel'deki listelerden seçilir, cevap sayısı soru sayısı ile eşit olmalı).
3. **Excel İndir** ile ara çıktı al ya da **Tamamla** ile Excel'i `output/` klasörüne üret ve JSON kaydını kaldır.

Yarım kalan oturumlar ana sayfada listelenir, kaldığın yerden devam edersin.

## Fotoğraftan ekleme (mobil, Expo)

Telefonla kitap sayfasının fotoğrafını çekip yapay zeka ile test bilgilerini (test no, konu adı, cevaplar) okur, kontrol ettikten sonra oturuma ekler.

1. Kök dizinde `.env` oluştur (`.env.example` örnek): `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.
2. Bilgisayarda `npm start` — çıktıdaki "Telefon için" adresini not al.
3. `cd mobile && npm install && npx expo start` — telefonda Expo Go ile QR'ı okut.
4. Uygulamada sunucu adresini gir, kitabı seç, **Fotoğraf Çek**.

Telefon ve bilgisayar aynı Wi-Fi'da olmalı. Excel yükleme ve tamamlama bilgisayardaki web arayüzünden yapılır.
