# Penerjemah Laporan

Tempat investor baru yang awam bisa memasukkan satu laporan keuangan perusahaan
Tbk, lalu mendapat penjelasan sederhana tentang kondisi kesehatan perusahaan itu
beserta alasannya, dan titik-titik yang perlu diwaspadai.

Fokusnya membangun pemahaman pengguna terhadap laporan itu sendiri — **bukan**
memberi arahan untuk membeli, menahan, atau menjual.

## Yang ada di v1

1. **Upload PDF** — satu berkas laporan keuangan per proses.
2. **Ekstraksi & interpretasi** — sistem membaca isi PDF dan mengambil lima pos
   kunci: pendapatan, laba bersih, total aset, total liabilitas, dan arus kas
   operasional.
3. **Hasil terjemahan** dengan struktur tetap, selalu dalam urutan ini:
   - **Status kesehatan** — ringkasan satu-dua kalimat bahasa awam
   - **Alasan di balik status** — dikaitkan ke angka spesifik dari laporan
   - **Titik yang perlu diwaspadai** — maksimal 5 poin, spesifik ke laporan ini
4. **Kamus istilah ringan** — istilah akuntansi yang muncul di hasil bergaris
   putus-putus dan bisa diklik untuk memunculkan penjelasan singkat di tempat,
   tanpa keluar dari halaman. Ada juga kamus lengkap yang bisa dibuka di bawah
   hasil.
5. **Riwayat laporan** — daftar laporan yang pernah diunggah, bisa dibuka lagi.
6. **Catatan pribadi** — kolom teks bebas di halaman hasil, tersimpan otomatis
   bersama laporan itu.

## Yang sengaja tidak ada di v1

Batasan ini disengaja, bukan kekurangan yang belum sempat dikerjakan:

- Tidak ada rekomendasi beli / tahan / jual dalam bentuk apa pun, termasuk skor
  "layak beli", target harga, atau penilaian murah/mahal.
- Tidak ada perbandingan antar-perusahaan atau antar-periode.
- Tidak ada data harga saham atau data pasar.
- Tidak ada tanya-jawab bebas atau chat interaktif tentang laporan.
- Tidak ada integrasi otomatis ke IDX atau sumber data eksternal mana pun —
  laporan hanya masuk lewat upload manual.
- Tidak ada akun/login. Identitas pengguna cuma satu id acak di cookie, yang
  dipakai supaya riwayat dan catatan orang tidak tercampur.

Larangan saran investasi dijaga di dua lapis: instruksi ke model, lalu
pemeriksaan pola di sisi server (`lib/penjaga.ts`). Kalau hasil model masih
memuat kalimat bergaya saran, model diminta menulis ulang sekali; kalau masih
lolos juga, kalimatnya dibuang sebelum ditampilkan.

## Dua mesin baca

Aplikasi ini punya dua cara membaca laporan. Yang dipakai ditentukan otomatis
oleh ada-tidaknya `ANTHROPIC_API_KEY`, dan halaman hasil selalu menyebutkan yang
mana yang dipakai.

| | Tanpa API (default) | Dengan Anthropic API |
|---|---|---|
| Kapan aktif | `ANTHROPIC_API_KEY` kosong | `ANTHROPIC_API_KEY` terisi |
| Cara ambil angka | Cocokkan nama baris laporan keuangan (`lib/pembacaAngka.ts`) | Model membaca teksnya |
| Kalau nama barisnya tidak baku | Ditandai "tidak ditemukan", tidak menebak | Biasanya tetap ketemu |
| Status kesehatan | Ambang tetap di `ATURAN_STATUS`, ditampilkan terbuka ke pengguna | Disimpulkan dari angka |
| Alasan & titik waspada | Kalimat berpola, angkanya dari laporan | Disusun ulang tiap laporan |
| Biaya | Rp 0 | Sekitar Rp 5.000 per laporan |

Mesin tanpa API sengaja memilih diam daripada menebak: pos yang nama barisnya
tidak dikenali ditandai "tidak ditemukan" dan diangkat jadi titik waspada
pertama, supaya pengguna tahu kesimpulannya disusun tanpa angka itu.

## Cara menjalankan lokal

```bash
npm install
npm run dev          # jalan tanpa API, memakai mesin aturan
```

Buka http://localhost:3000. Untuk memakai mesin AI, salin `.env.example` jadi
`.env.local` lalu isi `ANTHROPIC_API_KEY`.

## Konfigurasi

| Variabel | Wajib | Keterangan |
|---|---|---|
| `ANTHROPIC_API_KEY` | tidak | Kalau diisi, penjelasan disusun model Claude. Kalau kosong, dipakai mesin aturan tanpa AI. |
| `ANTHROPIC_MODEL` | tidak | Default `claude-opus-5`. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | untuk produksi | Penyimpanan riwayat dan catatan. Terisi otomatis kalau menghubungkan Vercel KV / Upstash Redis lewat Marketplace. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` juga diterima. |

Kalau kredensial penyimpanan kosong, aplikasi tetap jalan tapi riwayat dan
catatan hanya disimpan di memori proses dan hilang saat server restart. Cukup
untuk coba-coba lokal, tidak layak untuk produksi.

## Deploy ke Vercel

1. Impor repositori ini di Vercel (framework terdeteksi otomatis: Next.js).
2. Di tab **Storage**, hubungkan sebuah Redis (Upstash) — Vercel akan mengisi
   `KV_REST_API_URL` dan `KV_REST_API_TOKEN` sendiri.
3. Opsional: tambahkan `ANTHROPIC_API_KEY` kalau mau penjelasan disusun AI.
4. Deploy. (Env var baru baru berlaku setelah deploy ulang.)

Rute `/api/analisis` diberi `maxDuration = 300` karena membaca laporan panjang
bisa memakan waktu lebih dari satu menit.

## Catatan teknis

**PDF dibaca di browser.** Ekstraksi teks memakai `pdfjs-dist` di sisi klien,
lalu hanya teksnya yang dikirim ke server. Dua alasannya: laporan tahunan Tbk
sering jauh melebihi batas ukuran body permintaan di Vercel (4,5 MB), dan berkas
PDF-nya sendiri jadi tidak perlu meninggalkan perangkat pengguna. Konsekuensinya,
PDF hasil pindaian yang isinya gambar tidak bisa diproses — pengguna diberi tahu
dengan jelas kalau ini terjadi.

Yang dipakai adalah build **legacy** `pdfjs-dist`, bukan build biasanya. Isinya
sama, bedanya sudah disertai polyfill core-js — di pustaka utamanya maupun di
worker-nya. Build biasa memanggil `Promise.withResolvers`, yang baru ada sejak
Safari/iOS 17.4, jadi di iPhone yang sistemnya sedikit lebih lama semua PDF akan
gagal dibuka. Sebabnya juga dibedakan sekarang (`lib/bacaPdf.ts`): terkunci kata
sandi, berkas cacat, kehabisan memori, atau peramban terlalu lama masing-masing
punya pesan sendiri, supaya pengguna tidak disuruh mengganti berkas yang
sebenarnya tidak bermasalah.

**Halaman yang dikirim ke model diseleksi.** Laporan tahunan bisa ratusan
halaman, sementara pos-pos kunci cuma ada di beberapa halaman laporan utama.
`lib/seleksiHalaman.ts` memberi skor tiap halaman berdasarkan kata kunci laporan
keuangan dan kepadatan angkanya, lalu mengirim halaman paling relevan sampai
mentok anggaran karakter — tetap dalam urutan aslinya.

**Mesin aturan memilih baris, bukan menebak angka.** `lib/pembacaAngka.ts`
mencocokkan label baris (mis. `JUMLAH ASET`, tapi bukan `JUMLAH ASET LANCAR`),
lalu mengambil angka pertama sesudah label itu — kolom periode terkini. Token
angka wajib berformat ribuan bertitik atau minimal empat digit, supaya nomor
referensi catatan seperti `2c,5` tidak ikut terbaca sebagai nilai.

**Keluaran model berbentuk terstruktur.** Panggilan ke Anthropic API memakai
structured outputs (`output_config.format`) dengan skema JSON, jadi bentuk
hasilnya dijamin konsisten dan tidak perlu diurai dari teks bebas.

### Struktur berkas

```
app/
  page.tsx                       beranda: unggah + riwayat
  laporan/[id]/page.tsx          halaman hasil
  api/analisis/route.ts          terima teks PDF -> terjemahkan -> simpan
  api/laporan/[id]/catatan/      simpan catatan pribadi (PUT dan POST)
components/
  FormUnggah.tsx                 pilih berkas, baca PDF, kirim
  TeksBerkamus.tsx               sorot istilah, tampilkan penjelasan di tempat
  CatatanPribadi.tsx             catatan dengan simpan otomatis
lib/
  pembacaAngka.ts                ambil pos kunci dari teks, tanpa AI
  analisisAturan.ts              status + alasan + titik waspada dari ambang tetap
  penerjemah.ts                  panggilan Anthropic API + skema hasil
  penjaga.ts                     larangan kalimat bergaya saran investasi
  seleksiHalaman.ts              pemilihan halaman relevan
  glossary.ts                    kamus istilah
  store.ts                       penyimpanan riwayat & catatan
  bacaPdf.ts                     ekstraksi teks PDF di browser
```
