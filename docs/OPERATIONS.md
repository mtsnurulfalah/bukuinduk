# Reliability & Operations Runbook

Dokumen ini membantu memeriksa perubahan, menangani gangguan, dan menjaga sinkronisasi frontend Vercel dengan backend Google Apps Script (GAS).

## 1. Quality gate sebelum merge

Pull request ke `main` dan push ke `main` menjalankan workflow **Reliability checks**. Pastikan job **Typecheck and production build** berstatus hijau sebelum merge.

Secara lokal, jalankan:

```bash
npm ci
npm run typecheck
npm run build
```

Workflow menggunakan Node.js 20 dan `npm ci` agar dependency dipasang berdasarkan lockfile. Build menggunakan konfigurasi proyek saat ini dan tidak memerlukan kredensial GAS.

## 2. Pemeriksaan setelah deploy Vercel

1. Buka deployment yang terkait dengan commit yang baru digabungkan. Pastikan status deployment adalah **Ready**, bukan hanya bahwa preview PR berhasil.
2. Buka aplikasi di jendela baru, lakukan hard refresh, kemudian uji login dan halaman yang terdampak.
3. Uji satu operasi baca dan satu operasi tulis pada data uji yang aman. Pastikan perubahan tetap ada setelah halaman dimuat ulang.
4. Periksa DevTools Console dan Network untuk error JavaScript, request GAS gagal, error CSP, atau chunk yang tidak dapat dimuat.
5. Jika pengguna masih melihat versi lama, coba hard refresh terlebih dahulu. Jangan menghapus data browser atau cache secara massal sebelum penyebabnya dipastikan.

Status deployment Vercel dan keberhasilan build tidak membuktikan bahwa akun GAS, permission Spreadsheet, atau kuota Google masih sehat; ketiganya perlu diverifikasi secara terpisah.

## 3. Pemeriksaan backend GAS

Buka URL Web App GAS yang sama dengan nilai `VITE_GAS_URL` (tanpa menambahkan token atau payload ke query URL). Endpoint GET saat ini mengembalikan JSON informasi API, versi, dan timestamp. Respons ini hanya membuktikan bahwa runtime GAS merespons; belum merupakan pemeriksaan menyeluruh terhadap seluruh handler CRUD.

Untuk memvalidasi backend dengan aman:

1. Pastikan file di folder `gas-backend/` telah disalin ke project GAS yang benar.
2. Di GAS editor, jalankan `testConnection()` bila perlu dan periksa hasil log tanpa menyalin nama/isi data siswa ke tiket dukungan.
3. Untuk setiap perubahan file `.gs`, simpan file dan pilih **Deploy → Manage deployments → Edit → New version** untuk deployment Web App yang digunakan aplikasi.
4. Pastikan **Who has access** dan Script Properties sesuai konfigurasi deployment. Jangan pernah menaruh `JWT_SECRET`, token, password, ID siswa, atau isi Spreadsheet ke log publik maupun issue.

Folder `gas-backend/` di GitHub adalah source of truth. Memperbarui file di GitHub saja tidak memperbarui deployment GAS yang sudah diterbitkan.

## 4. Panduan gejala umum

| Gejala | Langkah pemeriksaan |
| --- | --- |
| `VITE_GAS_URL belum dikonfigurasi` | Periksa Environment Variables pada Vercel untuk environment yang tepat (Production/Preview), lalu redeploy setelah perubahan. |
| `Tidak dapat terhubung ke server GAS` | Periksa koneksi, URL deployment, akses Web App, dan apakah Google menampilkan halaman login. |
| `Action ... tidak ditemukan` atau `method tidak ditemukan` | Pastikan file handler/action terbaru sudah disalin ke GAS dan Web App diterbitkan sebagai versi baru. |
| Sesi berakhir / HTTP 401 | Login ulang; bila berulang, periksa konfigurasi JWT dan apakah akun aktif. Jangan membagikan token. |
| HTTP/API 429 atau 5xx | Periksa log eksekusi GAS, kuota Spreadsheet/GAS, dan apakah ada job/permintaan berulang. Hindari menekan tombol simpan berulang kali sebelum status operasi sebelumnya diketahui. |
| Build atau typecheck gagal | Buka detail workflow, temukan langkah pertama yang gagal, perbaiki di branch terpisah, lalu jalankan quality gate lagi. |

## 5. Backup dan pemulihan

- Buat backup JSON dari fitur backup aplikasi sebelum perubahan skema atau pemeliharaan besar.
- Simpan arsip backup pada lokasi yang memiliki akses terbatas; backup berisi data pribadi siswa.
- Sebelum memulihkan backup ke database aktif, periksa mode restore dan strategi konflik. Uji pemulihan dengan data uji atau salinan Spreadsheet terlebih dahulu.
- Catat waktu backup terakhir dan verifikasi bahwa file dapat dibuka. Backup yang belum pernah diuji belum tentu dapat dipulihkan.

## 6. Diagnostik error di frontend

Kesalahan Vue yang tidak tertangani dan Promise rejection global dicatat ke Console dengan kode diagnostik `BID-...`. Di production, log global hanya berisi metadata minimal (kode, sumber, nama error, segmen halaman, waktu); tidak mengirim data siswa atau pesan error ke layanan pihak ketiga.

Saat melaporkan masalah, sertakan kode diagnostik, commit/deployment yang sedang dipakai, halaman umum tempat masalah terjadi, langkah reproduksi, dan waktu kejadian. Jangan menyertakan password, JWT, NIK/NISN, identitas siswa, atau isi response yang sensitif.
