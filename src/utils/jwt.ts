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

