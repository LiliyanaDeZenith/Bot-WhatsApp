# Open Bot WhatsApp

Website untuk mengubah sebuah nomor WhatsApp jadi bot lewat pairing code (tanpa scan QR). Jalan di hosting gratis, tanpa Termux. Login WhatsApp dan data bot disimpan di Supabase supaya tidak hilang saat server restart.

## Deploy gratis

1. **Supabase.** Buat proyek di supabase.com, buka SQL Editor, jalankan:

       create table if not exists kv (id text primary key, value text not null);
       alter table kv enable row level security;

   Ambil Project URL dan key `service_role` di Project Settings > API. Key ini rahasia: jangan dibagikan dan jangan diunggah ke GitHub.
2. **Key lain** (opsional, daftar lengkap di `.env.example`):
   - Gemini untuk `!ai` dan chat pribadi: aistudio.google.com/app/apikey
   - RapidAPI untuk `!ytmp3`, `!ytmp4`, `!ig`: rapidapi.com, subscribe ke `youtube-mp36` dan `social-download-all-in-one` (pilih paket gratis kalau ada)
3. **GitHub.** Unggah semua file proyek, kecuali `.env`.
4. **Render.** New > Web Service > pilih repo. Build Command `npm install`, Start Command `npm start`, Instance Type Free. Isi Environment sesuai `.env.example`.
5. Buka alamat `.onrender.com` dari Render, isi nomor, lalu di WhatsApp pilih Perangkat tertaut > Tautkan dengan nomor telepon > masukkan kode.
6. Render menidurkan web gratis setelah 15 menit tanpa kunjungan. Buat monitor HTTP gratis di uptimerobot.com ke `https://NAMA-APP.onrender.com/health` tiap 5 menit supaya bot tetap hidup.

## Jalankan di komputer

    npm install
    npm start

Tanpa `SUPABASE_URL`, data disimpan di file lokal (`store.json` dan `data.json`). Salin `.env.example` jadi `.env` untuk mengisi key.

## Struktur

    server.js           web dan API (pair, status, stop, health)
    lib/api.js          API pihak ketiga dan key-nya
    lib/auth.js         simpan login WhatsApp ke penyimpanan
    lib/bot.js          koneksi WhatsApp, banyak sesi
    lib/commands.js     perintah dan proteksi grup
    lib/downloader.js   perintah YouTube dan Instagram
    lib/store.js        penyimpanan: Supabase atau file lokal
    lib/utils.js        data bot, anti spam, filter
    public/index.html   tampilan website
    test/test.js        tes

Ketik `!menu` di WhatsApp untuk daftar perintah.

## Catatan

- Baileys bukan API resmi WhatsApp. Nomor yang dipakai spam bisa diblokir.
- Pesan yang dikirim ke Gemini paket gratis bisa dipakai Google untuk meningkatkan produknya.
- Batas paket gratis (Gemini, RapidAPI, Supabase, Render) bisa berubah. Cek di situs masing-masing.
- Perintah YouTube dan Instagram butuh `RAPIDAPI_KEY`. Kalau API-nya diganti, ubah `lib/api.js`.
- `!restart` mematikan proses, lalu Render menyalakannya lagi otomatis.
