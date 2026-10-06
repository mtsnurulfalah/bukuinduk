/**
 * Validasi NIK: 16 digit angka
 */
export function isValidNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik)
}

/**
 * Validasi NISN: 10 digit angka
 */
export function isValidNISN(nisn: string): boolean {
  return /^\d{10}$/.test(nisn)
}

/**
 * Validasi NIS: 3–20 karakter alfanumerik
 */
export function isValidNIS(nis: string): boolean {
  return /^[A-Za-z0-9]{3,20}$/.test(nis)
}

/**
 * Validasi email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validasi nomor telepon Indonesia (08xx atau +628xx)
 */
export function isValidPhone(phone: string): boolean {
  return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Validasi password: min 8 karakter, ada huruf dan angka
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
}

/**
 * Validasi kode pos: 5 digit
 */
export function isValidPostalCode(code: string): boolean {
  return /^\d{5}$/.test(code)
}

/**
 * Validasi tanggal kalender dalam format YYYY-MM-DD.
 */
export function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Aturan validasi Yup untuk form
 */
import * as yup from 'yup'

export const studentSchema = yup.object({
  nis: yup
    .string()
    .required('NIS wajib diisi')
    .trim()
    .matches(/^[A-Za-z0-9]{3,20}$/, 'NIS harus 3–20 karakter alfanumerik'),
  nisn: yup
    .string()
    .required('NISN wajib diisi')
    .trim()
    .matches(/^\d{10}$/, 'NISN harus 10 digit angka'),
  nik: yup
    .string()
    .optional()
    .trim()
    .test('nik', 'NIK harus 16 digit angka', v => !v || /^\d{16}$/.test(v)),
  fullName: yup
    .string()
    .required('Nama lengkap wajib diisi')
    .trim()
    .min(3, 'Nama minimal 3 karakter')
    .max(255, 'Nama maksimal 255 karakter'),
  gender: yup.string().required('Jenis kelamin wajib dipilih').oneOf(['L', 'P']),
  birthPlace: yup
    .string()
    .required('Tempat lahir wajib diisi')
    .trim()
    .min(2, 'Tempat lahir minimal 2 karakter')
    .max(100, 'Tempat lahir maksimal 100 karakter'),
  birthDate: yup
    .string()
    .required('Tanggal lahir wajib diisi')
    .test('date-only', 'Tanggal lahir harus valid dan berformat YYYY-MM-DD', v => Boolean(v && isValidDateOnly(v))),
  religion: yup.string().required('Agama wajib dipilih'),
  childOrder: yup
    .number()
    .transform((value, originalValue) => (
      originalValue === '' || originalValue == null ? undefined : value
    ))
    .optional()
    .integer('Anak ke- harus berupa angka bulat')
    .min(1, 'Anak ke- minimal 1')
    .max(20, 'Anak ke- maksimal 20'),
  siblingsCount: yup
    .number()
    .transform((value, originalValue) => (
      originalValue === '' || originalValue == null ? undefined : value
    ))
    .optional()
    .integer('Jumlah saudara harus berupa angka bulat')
    .min(0, 'Jumlah saudara minimal 0')
    .max(20, 'Jumlah saudara maksimal 20'),
  entryDate: yup
    .string()
    .required('Tanggal masuk wajib diisi')
    .test('date-only', 'Tanggal masuk harus valid dan berformat YYYY-MM-DD', v => Boolean(v && isValidDateOnly(v))),
  postalCode: yup
    .string()
    .optional()
    .trim()
    .test('postal-code', 'Kode pos harus 5 digit angka', v => !v || /^\d{5}$/.test(v)),
  phone: yup
    .string()
    .optional()
    .trim()
    .test('phone', 'Nomor HP tidak valid', v => !v || isValidPhone(v)),
  email: yup
    .string()
    .optional()
    .trim()
    .test('email', 'Format email tidak valid', v => !v || isValidEmail(v)),

  educationHistory: yup
    .object({
      schoolName: yup.string().optional(),
      level: yup.string().optional(),
      certificateNumber: yup.string().optional(),
      graduationYear: yup
        .number()
        .transform((value, originalValue) => (
          originalValue === '' || originalValue == null ? undefined : value
        ))
        .optional()
        .integer('Tahun lulus harus berupa angka bulat')
        .min(1990, 'Tahun lulus minimal 1990')
        .max(new Date().getFullYear(), 'Tahun lulus tidak boleh melebihi tahun ini'),
    })
    .optional(),

  father: yup
    .object({
      fullName: yup.string().optional(),
      nik: yup.string().optional().trim()
        .test('nik', 'NIK ayah harus 16 digit angka', v => !v || /^\d{16}$/.test(v)),
      birthDate: yup.string().optional()
        .test('date-only', 'Tanggal lahir ayah harus valid dan berformat YYYY-MM-DD', v => !v || isValidDateOnly(v)),
      phone: yup.string().optional().trim()
        .test('phone', 'Nomor HP ayah tidak valid', v => !v || isValidPhone(v)),
    })
    .optional(),

  mother: yup
    .object({
      fullName: yup.string().optional(),
      nik: yup.string().optional().trim()
        .test('nik', 'NIK ibu harus 16 digit angka', v => !v || /^\d{16}$/.test(v)),
      birthDate: yup.string().optional()
        .test('date-only', 'Tanggal lahir ibu harus valid dan berformat YYYY-MM-DD', v => !v || isValidDateOnly(v)),
      phone: yup.string().optional().trim()
        .test('phone', 'Nomor HP ibu tidak valid', v => !v || isValidPhone(v)),
    })
    .optional(),

  guardian: yup
    .object({
      fullName: yup.string().optional(),
      nik: yup.string().optional().trim()
        .test('nik', 'NIK wali harus 16 digit angka', v => !v || /^\d{16}$/.test(v)),
      birthDate: yup.string().optional()
        .test('date-only', 'Tanggal lahir wali harus valid dan berformat YYYY-MM-DD', v => !v || isValidDateOnly(v)),
      phone: yup.string().optional().trim()
        .test('phone', 'Nomor HP wali tidak valid', v => !v || isValidPhone(v)),
    })
    .optional(),

  health: yup
    .object({
      bloodType: yup.string().optional(),
      heightCm: yup
        .number()
        .transform((value, originalValue) => (
          originalValue === '' || originalValue == null ? undefined : value
        ))
        .optional()
        .min(50, 'Tinggi badan minimal 50 cm')
        .max(250, 'Tinggi badan maksimal 250 cm'),
      weightKg: yup
        .number()
        .transform((value, originalValue) => (
          originalValue === '' || originalValue == null ? undefined : value
        ))
        .optional()
        .min(5, 'Berat badan minimal 5 kg')
        .max(200, 'Berat badan maksimal 200 kg'),
      specialNeeds: yup.string().optional(),
      healthNotes: yup.string().optional(),
      allergies: yup.string().optional(),
    })
    .optional(),
})

export const loginSchema = yup.object({
  username: yup.string().required('Username wajib diisi').min(3, 'Username minimal 3 karakter'),
  password: yup.string().required('Password wajib diisi').min(6, 'Password minimal 6 karakter'),
})

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Password lama wajib diisi'),
  newPassword: yup
    .string()
    .required('Password baru wajib diisi')
    .min(8, 'Password minimal 8 karakter')
    .matches(/[a-zA-Z]/, 'Password harus mengandung huruf')
    .matches(/\d/, 'Password harus mengandung angka'),
  confirmPassword: yup
    .string()
    .required('Konfirmasi password wajib diisi')
    .oneOf([yup.ref('newPassword')], 'Konfirmasi password tidak cocok'),
})

export const userSchema = yup.object({
  username: yup
    .string()
    .required('Username wajib diisi')
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .matches(/^[a-zA-Z0-9._]+$/, 'Username hanya boleh huruf, angka, titik, dan underscore'),
  fullName: yup.string().required('Nama lengkap wajib diisi').min(3, 'Nama minimal 3 karakter'),
  email: yup.string().required('Email wajib diisi').email('Format email tidak valid'),
  role: yup.string().required('Role wajib dipilih').oneOf(['admin', 'principal', 'teacher']),
  password: yup.string().when('$isCreate', {
    is: true,
    then: schema =>
      schema
        .required('Password wajib diisi')
        .min(8, 'Password minimal 8 karakter'),
    otherwise: schema => schema.optional(),
  }),
})

export const classroomSchema = yup.object({
  name: yup.string().required('Nama kelas wajib diisi').min(2, 'Nama minimal 2 karakter'),
  gradeId: yup.string().required('Tingkat kelas wajib dipilih'),
  schoolYearId: yup.string().required('Tahun pelajaran wajib dipilih'),
})

export const schoolYearSchema = yup.object({
  name: yup
    .string()
    .required('Nama tahun pelajaran wajib diisi')
    .matches(/^\d{4}\/\d{4}$/, 'Format harus YYYY/YYYY, contoh: 2024/2025'),
  startDate: yup.string().required('Tanggal mulai wajib diisi'),
  endDate: yup
    .string()
    .required('Tanggal selesai wajib diisi')
    .test('endDate', 'Tanggal selesai harus setelah tanggal mulai', function (value) {
      const { startDate } = this.parent
      if (!startDate || !value) return true
      return new Date(value) > new Date(startDate)
    }),
})
