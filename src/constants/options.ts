// Opsi dropdown yang digunakan di berbagai form

export const GENDER_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
]

export const RELIGION_OPTIONS = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen', label: 'Kristen' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Konghucu', label: 'Konghucu' },
]

export const BLOOD_TYPE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
  { value: 'Tidak Tahu', label: 'Tidak Diketahui' },
]

export const STUDENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Tidak Aktif' },
  { value: 'graduated', label: 'Lulus' },
  { value: 'transferred', label: 'Pindah' },
  { value: 'dropped_out', label: 'Keluar' },
]

export const FAMILY_STATUS_OPTIONS = [
  { value: 'kandung', label: 'Anak Kandung' },
  { value: 'tiri', label: 'Anak Tiri' },
  { value: 'angkat', label: 'Anak Angkat' },
  { value: 'yatim', label: 'Yatim' },
  { value: 'piatu', label: 'Piatu' },
  { value: 'yatim_piatu', label: 'Yatim Piatu' },
]

export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'Tidak Sekolah', label: 'Tidak Sekolah' },
  { value: 'SD/MI', label: 'SD/MI' },
  { value: 'SMP/MTs', label: 'SMP/MTs' },
  { value: 'SMA/MA/SMK', label: 'SMA/MA/SMK' },
  { value: 'D1', label: 'D1' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'S1', label: 'S1' },
  { value: 'S2', label: 'S2' },
  { value: 'S3', label: 'S3' },
]

export const INCOME_RANGE_OPTIONS = [
  { value: '< 500rb', label: '< Rp 500.000' },
  { value: '500rb-1jt', label: 'Rp 500.000 – Rp 1.000.000' },
  { value: '1jt-2jt', label: 'Rp 1.000.000 – Rp 2.000.000' },
  { value: '2jt-3jt', label: 'Rp 2.000.000 – Rp 3.000.000' },
  { value: '3jt-5jt', label: 'Rp 3.000.000 – Rp 5.000.000' },
  { value: '> 5jt', label: '> Rp 5.000.000' },
]

export const PREVIOUS_SCHOOL_LEVEL_OPTIONS = [
  { value: 'TK/RA', label: 'TK/RA' },
  { value: 'SD/MI', label: 'SD/MI' },
  { value: 'SMP/MTs', label: 'SMP/MTs' },
]

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'promoted', label: 'Naik Kelas' },
  { value: 'retained', label: 'Tinggal Kelas' },
  { value: 'graduated', label: 'Lulus' },
  { value: 'transferred', label: 'Pindah' },
]

export const PROVINCES_ID = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan',
  'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo',
  'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara', 'Papua Barat', 'Papua',
].map(p => ({ value: p, label: p }))
