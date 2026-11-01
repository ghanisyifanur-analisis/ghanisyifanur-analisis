# WhatsApp Auto-Reply Server

Backend Node.js untuk menerima pesan dari fitur **Server** aplikasi WhatsAuto Android, memilih balasan berdasarkan kata kunci, dan menyimpan log ke PostgreSQL. Integrasi ini memakai endpoint callback WhatsAuto; ini **bukan** WhatsApp Cloud API dan tidak melakukan pembacaan SMS/OTP.

## Arsitektur

WhatsApp di Android → WhatsAuto → HTTPS callback `/reply` → Node.js → PostgreSQL → JSON `{ "reply": "..." }` → WhatsAuto mengirim balasan melalui aplikasi WhatsApp.

## Nomor yang dikonfigurasi

Nomor pemilik bot disetel di file lokal `.env` sebagai `BOT_PHONE_NUMBER=+62895622668417`. Nomor harus milik Anda dan aktif di WhatsApp pada perangkat Android yang menjalankan WhatsAuto. Nomor ini tidak otomatis didaftarkan ke WhatsApp Business Platform.

## Persyaratan

- Windows 10/11 + PowerShell
- Docker Desktop (Linux containers) dan Docker Compose v2
- Aplikasi WhatsAuto pada Android dan WhatsApp dengan notifikasi aktif
- HTTPS publik untuk callback saat perangkat Android mengakses server dari internet (misalnya domain sendiri atau tunnel yang aman)

## Menjalankan dengan Docker

1. Salin `.env.example` menjadi `.env`.
2. Ubah `POSTGRES_PASSWORD` pada `docker-compose.yml` atau sesuaikan password pada `DATABASE_URL` di `.env` agar sama. Gunakan password kuat.
3. Jalankan `docker compose up -d --build`.
4. Periksa `docker compose ps` dan `docker compose logs -f app`.
5. Uji lokal: `Invoke-RestMethod http://localhost:3000/health`.

## Konfigurasi WhatsAuto Android

Di WhatsAuto, buka **Server** dan isi:
- Server URL: `https://DOMAIN-ATAU-TUNNEL-ANDA/reply`
- Method: `POST`
- Type: `JSON`
- Header (opsional tetapi wajib disarankan untuk endpoint publik): Key `X-Bot-Key`, Value sama dengan `WHATS_AUTO_HEADER_VALUE` di `.env`.

Aplikasi mengirim JSON dengan properti `app`, `sender`, `phone`, `message`, dan `group_name`. Server mengembalikan JSON `{ "reply": "teks balasan" }`. Jangan gunakan alamat `localhost` pada ponsel untuk server yang berjalan di PC; gunakan IP LAN (hanya saat satu jaringan) atau HTTPS publik.

## Uji endpoint dari PowerShell

```powershell
$body = @{
  app = "WhatsAuto"
  sender = "Penguji"
  phone = "+6281234567890"
  message = "Halo"
  group_name = ""
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/reply" -Method Post -ContentType "application/json" -Body $body
```

Hasil yang diharapkan berupa objek dengan properti `reply`.

## Menambah aturan balasan

Edit array `replies` di `src/server.js`, tambahkan kata kunci pada `keys` dan teks pada `reply`, lalu jalankan:

```powershell
docker compose up -d --build
```

## Perintah operasional

```powershell
docker compose ps
docker compose logs -f app
docker compose logs -f db
docker compose restart app
docker compose down
``

Data PostgreSQL tersimpan di named volume `whatsapp_pgdata`. `docker compose down` tidak menghapus volume. **Jangan** menjalankan `docker compose down -v` kecuali memang ingin menghapus seluruh data database.

## Keamanan & batasan

- Jangan commit `.env`, token, password, OTP, atau PIN.
- Aktifkan shared secret `WHATS_AUTO_HEADER_VALUE` dan isi header yang sama pada WhatsAuto sebelum membuka endpoint ke internet; gunakan HTTPS. Jangan memakai nilai contoh di produksi.
- Minta persetujuan penerima sebelum mengirim pesan; hindari spam/broadcast tanpa izin.
- WhatsAuto mengandalkan notifikasi dan izin Android; auto-reply dapat gagal jika notifikasi dimatikan, chat dibisukan, aplikasi dibatasi baterai, atau ponsel offline.
- Endpoint ini belum menggunakan AI generatif. Balasan saat ini berbasis kata kunci.
- Verifikasi nomor/OTP dilakukan langsung oleh pemilik nomor pada aplikasi resmi; server ini tidak meminta atau menyimpan OTP.
