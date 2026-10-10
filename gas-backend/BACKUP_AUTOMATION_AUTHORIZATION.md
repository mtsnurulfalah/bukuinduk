# Otorisasi Backup Otomatis (Google Apps Script)

Perubahan pada ReportHandler.gs perlu disalin ke proyek Google Apps Script yang menjadi backend aplikasi. Merge di GitHub tidak memperbarui proyek GAS atau versi Web App secara otomatis.

## Memperbaiki izin ScriptApp.getProjectTriggers

1. Buka proyek Google Apps Script yang dipakai sebagai backend Buku Induk Digital.
2. Buka Project Settings, lalu aktifkan Show "appsscript.json" manifest file in editor.
3. Buka appsscript.json. Jika file tersebut sudah berisi array oauthScopes, tambahkan scope berikut ke daftar yang ada tanpa menghapus scope lama:

   https://www.googleapis.com/auth/script.scriptapp

   Jika oauthScopes belum ada, jangan menambahkan daftar baru yang hanya berisi scope di atas karena dapat membatasi izin lain yang sudah dipakai aplikasi. Lanjutkan ke langkah berikutnya untuk meminta otorisasi melalui editor.
4. Pastikan versi terbaru gas-backend/ReportHandler.gs sudah disalin ke proyek GAS, lalu pilih fungsi authorizeBackupAutomationAccess pada editor dan klik Run.
5. Tinjau dan setujui dialog otorisasi Google. Jika Google menampilkan pemilihan akun atau peringatan aplikasi belum diverifikasi, lanjutkan hanya jika proyek GAS tersebut memang milik/diotorisasi oleh sekolah.
6. Buka Deploy → Manage deployments → Edit pada deployment Web App yang digunakan aplikasi. Pilih New version, lalu Deploy. Pastikan URL deployment tetap sesuai dengan konfigurasi frontend.
7. Muat ulang aplikasi dan buka Pengaturan → Backup Data. Status dan riwayat seharusnya dapat dimuat tanpa memanggil ScriptApp.getProjectTriggers() dari endpoint pembacaan. Coba aktifkan backup otomatis hanya setelah otorisasi berhasil.

Fungsi authorizeBackupAutomationAccess hanya membaca daftar trigger yang ada; fungsi itu tidak membuat atau menghapus jadwal backup. Backup otomatis tetap nonaktif sampai admin mengaktifkannya dari halaman Pengaturan.

## Perubahan perilaku kode

- Endpoint pembacaan pengaturan menggunakan status trigger yang disimpan di Script Properties, sehingga membuka tab Backup Data tidak memerlukan scope script.scriptapp.
- Saat admin mencoba mengaktifkan jadwal tanpa izin, backend memberi pesan langkah pemulihan yang lebih jelas.
- Saat backup dinonaktifkan, konfigurasi diubah menjadi nonaktif dahulu. Trigger lama yang tidak berhasil dihapus tidak akan membuat snapshot karena runScheduledBackup memeriksa konfigurasi sebelum berjalan.
