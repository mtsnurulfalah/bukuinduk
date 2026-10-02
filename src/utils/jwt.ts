import type { User } from '@/types'

/**
 * Decode JWT payload tanpa verifikasi signature
 * (verifikasi dilakukan di server GAS)
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    // Tambah padding base64 jika perlu
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Cek apakah token sudah expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || typeof payload.exp !== 'number') return true
  // exp dalam seconds, Date.now() dalam ms
  return payload.exp * 1000 < Date.now()
}

/**
 * Ambil user dari token (berdasarkan payload yang disisipkan GAS)
 */
export function getUserFromToken(token: string): User | null {
  const payload = decodeJWT(token)
  if (!payload) return null
  if (isTokenExpired(token)) return null

  return {
    id: String(payload.id ?? ''),
    username: String(payload.username ?? ''),
    fullName: String(payload.fullName ?? ''),
    email: String(payload.email ?? ''),
    role: payload.role as User['role'],
    isActive: Boolean(payload.isActive ?? true),
    teacherId: payload.teacherId ? String(payload.teacherId) : undefined,
    createdAt: String(payload.createdAt ?? ''),
  }
}

/**
 * Sisa waktu token dalam menit
 */
export function tokenExpiresInMinutes(token: string): number {
  const payload = decodeJWT(token)
  if (!payload || typeof payload.exp !== 'number') return 0
  const remaining = payload.exp * 1000 - Date.now()
  return Math.max(0, Math.floor(remaining / 60000))
}
