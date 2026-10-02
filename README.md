# Buku Induk Digital

Sistem pengelolaan data induk siswa berbasis web untuk madrasah/sekolah.

**Stack:** Vue 3 + Vite + TypeScript + Tailwind CSS (Frontend/Vercel) · Google Apps Script (Backend) · Google Spreadsheet (Database)

---

## Fitur Utama

- Dashboard per role (Admin, Kepala Madrasah, Guru)
- Manajemen data siswa lengkap (CRUD, import Excel, export Excel/PDF)
- Manajemen kelas & rombongan belajar
- Manajemen data guru
- Manajemen pengguna & role (RBAC)
- Laporan & statistik siswa
- Pengaturan profil sekolah & tahun pelajaran
- Audit log aktivitas sistem
- Backup data ke JSON
- Responsif mobile-first

---

## Persyaratan

- Node.js 18+
- npm 9+
- Akun Google (untuk Google Apps Script & Spreadsheet)
- Akun Vercel (untuk deployment frontend)

---

## Cara Menjalankan (Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi `VITE_GAS_URL` dengan URL Google Apps Script setelah di-deploy.

### 3. Jalankan development server

```bash
npm run dev
```

Buka http://localhost:3000

---

## Setup Google Apps Script (Backend)

### 1. Buat Spreadsheet baru

1. Buka [Google Drive](https://drive.google.com)
2. Buat Spreadsheet baru
3. Catat **Spreadsheet ID** dari URL: `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`

### 2. Buat Google Apps Script project

1. Buka [script.google.com](https://script.google.com)
2. Klik **New Project**
3. Beri nama project: `Buku Induk Digital Backend`

### 3. Upload file GAS

Salin semua file dari folder `gas-backend/` ke editor GAS:
- `Config.gs`
- `Utils.gs`
- `Main.gs`
- `AuthHandler.gs`
- `StudentHandler.gs`
- `ClassroomHandler.gs`
- `TeacherHandler.gs`
- `UserHandler.gs`
- `ReportHandler.gs`
- `Setup.gs`

### 4. Konfigurasi Script Properties

Di GAS editor: **File → Project Properties → Script Properties**, tambahkan:

| Key | Value |
|-----|-------|
| `SPREADSHEET_ID` | ID Spreadsheet yang dibuat di langkah 1 |
| `JWT_SECRET` | String acak panjang (min. 32 karakter), contoh: `aBcDeFgHiJkLmNoPqRsTuVwXyZ123456` |
| `JWT_EXPIRES_IN` | `3600` (1 jam dalam detik) |
| `ALLOWED_ORIGIN` | URL frontend Vercel, contoh: `https://buku-induk.vercel.app` |

### 5. Inisialisasi database

Di GAS editor, jalankan fungsi `setupSpreadsheet()` sekali:
1. Pilih fungsi `setupSpreadsheet` di dropdown
2. Klik **Run**
3. Izinkan akses yang diminta

Fungsi ini akan membuat semua sheet dan akun admin default:
- **Username:** `admin`
- **Password:** `Admin@12345`

> ⚠️ **Segera ubah password default setelah login pertama!**

### 6. Deploy sebagai Web App

1. Klik **Deploy → New Deployment**
2. Pilih type: **Web app**
3. Konfigurasi:
   - **Execute as:** Me (akun Google Anda)
   - **Who has access:** Anyone
4. Klik **Deploy**
5. Salin **Web App URL** yang diberikan

### 7. Update .env.local

```env
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

---

## Deployment ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Buku Induk Digital"
git remote add origin https://github.com/USERNAME/buku-induk-digital.git
git push -u origin main
```

### 2. Import ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. Klik **Add New Project**
3. Import repository dari GitHub
4. Vercel otomatis mendeteksi Vite project

### 3. Konfigurasi Environment Variables

Di Vercel dashboard → Project Settings → Environment Variables:

| Name | Value |
|------|-------|
| `VITE_GAS_URL` | URL GAS Web App Anda |
| `VITE_APP_NAME` | `Buku Induk Digital` |

### 4. Deploy

Klik **Deploy**. Setiap push ke branch `main` akan otomatis di-deploy.

---

## Struktur Project

```
buku-induk-digital/
├── src/
│   ├── assets/styles/     # Tailwind CSS
│   ├── components/
│   │   ├── ui/            # Komponen UI dasar (Button, Input, dll)
│   │   └── shared/        # Komponen shared (DataTable, StatCard, dll)
│   ├── composables/       # Vue composables (usePermission, useExport, dll)
│   ├── constants/         # Roles, permissions, opsi dropdown
│   ├── layouts/           # AuthLayout, AppLayout
│   ├── router/            # Vue Router + navigation guards
│   ├── services/          # API layer (komunikasi ke GAS)
│   ├── stores/            # Pinia stores
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # Helper functions
│   └── views/             # Halaman-halaman aplikasi
│       ├── auth/
│       ├── dashboard/
│       ├── students/
│       ├── classrooms/
│       ├── teachers/
│       ├── reports/
│       ├── users/
│       ├── settings/
│       └── errors/
│
└── gas-backend/           # Google Apps Script files
    ├── Config.gs
    ├── Utils.gs
    ├── Main.gs
    ├── AuthHandler.gs
    ├── StudentHandler.gs
    ├── ClassroomHandler.gs
    ├── TeacherHandler.gs
    ├── UserHandler.gs
    ├── ReportHandler.gs
    └── Setup.gs
```

---

## Role & Hak Akses

| Fitur | Admin | Kepala Madrasah | Guru |
|-------|:-----:|:---------------:|:----:|
| Dashboard | ✅ | ✅ | ✅ |
| Lihat semua siswa | ✅ | ✅ | ❌ |
| Lihat siswa kelas sendiri | ✅ | ✅ | ✅ |
| Tambah/edit siswa | ✅ | ❌ | ❌ |
| Import siswa | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ✅ (kelas sendiri) |
| Manajemen kelas | ✅ | ❌ | ❌ |
| Manajemen guru | ✅ | 👁️ | ❌ |
| Laporan | ✅ | ✅ | ✅ (kelas sendiri) |
| Manajemen pengguna | ✅ | ❌ | ❌ |
| Pengaturan sistem | ✅ | ❌ | ❌ |
| Audit log | ✅ | ❌ | ❌ |

---

## Scripts

```bash
npm run dev        # Development server
npm run build      # Build production
npm run preview    # Preview production build
npm run typecheck  # TypeScript check
```

---

## Keterbatasan Arsitektur (GAS + Sheets)

- **Concurrency:** Tidak cocok untuk > 20 pengguna simultan yang menulis data bersamaan
- **Performa:** Respons awal (cold start) bisa 2–4 detik; caching diaktifkan untuk query berulang
- **Kuota:** GAS memiliki kuota harian — cukup untuk sekolah dengan < 500 siswa dan < 50 pengguna aktif
- **Kapasitas data:** Optimal untuk < 5.000 siswa per spreadsheet
- **Skala lebih besar:** Pertimbangkan migrasi ke Supabase jika jumlah siswa > 5.000

---

## Keamanan

- JWT disimpan di `localStorage` dengan expiry 1 jam
- Password di-hash dengan SHA-256 + salt di server GAS
- Validasi permission dilakukan di **client (router guard)** DAN **server (GAS handler)**
- Data sensitif (NIK, data kesehatan) hanya dapat diakses role Admin dan Kepala Madrasah
- Semua aktivitas dicatat di audit log

---

## Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan pendidikan.
