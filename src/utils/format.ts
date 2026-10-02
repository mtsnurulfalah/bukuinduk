/**
 * Kapitalisasi huruf pertama setiap kata
 */
export function titleCase(str?: string | null): string {
  if (!str) return '-'
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Kapitalisasi huruf pertama saja
 */
export function capitalize(str?: string | null): string {
  if (!str) return '-'
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Format gender: 'L' => 'Laki-laki', 'P' => 'Perempuan'
 */
export function formatGender(gender?: string | null): string {
  if (gender === 'L') return 'Laki-laki'
  if (gender === 'P') return 'Perempuan'
  return '-'
}

/**
 * Inisial dari nama lengkap (maks 2 huruf)
 * @example initials('Ahmad Fauzi') => 'AF'
 */
export function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Format nomor telepon Indonesia
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '-'
  return phone.replace(/(\d{4})(\d{4})(\d{4,})/, '$1-$2-$3')
}

/**
 * Truncate teks panjang
 */
export function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

/**
 * Format status siswa ke label Indonesia
 */
export function formatStudentStatus(status?: string | null): string {
  const map: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    graduated: 'Lulus',
    transferred: 'Pindah',
    dropped_out: 'Keluar',
  }
  return map[status ?? ''] ?? status ?? '-'
}

/**
 * Warna badge untuk status siswa
 */
export function studentStatusColor(status?: string | null): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-600',
    graduated: 'bg-blue-100 text-blue-700',
    transferred: 'bg-amber-100 text-amber-700',
    dropped_out: 'bg-red-100 text-red-700',
  }
  return map[status ?? ''] ?? 'bg-slate-100 text-slate-600'
}

/**
 * Format angka ribuan: 1234 => '1.234'
 */
export function formatNumber(num?: number | null): string {
  if (num == null) return '0'
  return num.toLocaleString('id-ID')
}

/**
 * Bersihkan string dari karakter HTML berbahaya
 */
export function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Buat ID unik sederhana (untuk key Vue, bukan UUID)
 */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}
