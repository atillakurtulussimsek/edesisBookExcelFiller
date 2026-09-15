# edesis Kitap Excel Doldurucu

edesis kitap yükleme Excel şablonunu form üzerinden dolduran lokal Node.js aracı.

## Kurulum

```bash
npm install
npm start
```

Tarayıcı: http://localhost:3000

## Akış

1. Excel şablonunu yükle → oturum açılır, veriler `data/sessions/<id>.json` içinde tutulur.
2. Testleri tek tek ekle (konu ve test türü Excel'deki listelerden seçilir, cevap sayısı soru sayısı ile eşit olmalı).
3. **Excel İndir** ile ara çıktı al ya da **Tamamla** ile Excel'i `output/` klasörüne üret ve JSON kaydını kaldır.

Yarım kalan oturumlar ana sayfada listelenir, kaldığın yerden devam edersin.
