import { format, parseISO, differenceInYears, isValid, parse } from 'date-fns'
import { id } from 'date-fns/locale'

/**
 * Format tanggal dari ISO string ke format tampilan
 * @example formatDate('1990-01-15') => '15 Januari 1990'
 */
export function formatDate(dateStr?: string | null, fmt = 'dd MMMM yyyy'): string {
  if (!dateStr) return '-'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(date)) return '-'
    return format(date, fmt, { locale: id })
  } catch {
    return '-'
  }
}

/**
 * Format tanggal singkat: 15/01/1990
 */
export function formatDateShort(dateStr?: string | null): string {
  return formatDate(dateStr, 'dd/MM/yyyy')
}

/**
 * Format datetime: 15 Jan 1990, 08:30
 */
export function formatDateTime(dateStr?: string | null): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm')
}

/**
 * Hitung umur dari tanggal lahir
 */
export function calculateAge(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null
  try {
    const birth = parseISO(birthDateStr)
    if (!isValid(birth)) return null
    return differenceInYears(new Date(), birth)
  } catch {
    return null
  }
}

/**
 * Format tanggal ke ISO string (yyyy-MM-dd) untuk input value
 */
export function toISODate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return ''
    return format(date, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * Cek apakah string adalah tanggal yang valid
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false
  try {
    const date = parseISO(dateStr)
    return isValid(date)
  } catch {
    return false
  }
}

/**
 * Format dari dd/MM/yyyy ke yyyy-MM-dd
 */
export function parseDisplayDate(displayDate: string): string {
  try {
    const parsed = parse(displayDate, 'dd/MM/yyyy', new Date())
    if (!isValid(parsed)) return ''
    return format(parsed, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * Tanggal hari ini dalam format yyyy-MM-dd
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Tahun pelajaran aktif berdasarkan bulan (Juli = awal tahun pelajaran)
 */
export function currentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  if (month >= 7) {
    return `${year}/${year + 1}`
  }
  return `${year - 1}/${year}`
}
