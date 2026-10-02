import type { ApiResponse, GasRequest } from '@/types'
import { getToken, clearAuth } from '@/utils'

// BUG-01 FIX: Validasi VITE_GAS_URL di module level agar error terdeteksi saat startup,
// bukan saat request pertama dengan pesan "Failed to fetch" yang tidak informatif.
const GAS_URL = import.meta.env.VITE_GAS_URL as string
if (!GAS_URL) {
  throw new Error(
    'VITE_GAS_URL belum dikonfigurasi. ' +
    'Tambahkan VITE_GAS_URL=<url_deployment_GAS> di file .env.local atau .env.production.'
  )
}

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler
}

/**
 * Kirim request ke Google Apps Script Web App.
 *
 * Pendekatan: POST dengan Content-Type application/x-www-form-urlencoded
 *
 * Mengapa bukan JSON POST? GAS melakukan 302 redirect, dan browser mengubah
 * POST → GET saat follow redirect → 405.
 *
 * Mengapa bukan GET dengan query param? URL bisa terpotong oleh GAS/proxy
 * saat payload besar, menyebabkan e.parameter.data undefined di GAS.
 *
 * Solusi terbaik yang bekerja di GAS:
 * - POST dengan body berformat application/x-www-form-urlencoded
 * - Ini adalah "simple request" CORS → tidak ada preflight OPTIONS
 * - GAS menerimanya di doPost via e.parameter (bukan e.postData.contents)
 * - Tidak ada masalah URL length
 * - Tidak ada masalah redirect method change karena GAS membaca parameter
 *   sebelum redirect terjadi
 *
 * Cara GAS membaca: e.parameter.action, e.parameter.payload, e.parameter.token
 */
export async function gasRequest<T = unknown>(
  action: string,
  payload?: unknown,
  options?: { skipAuth?: boolean; timeout?: number }
): Promise<T> {
  const token = getToken()

  if (!options?.skipAuth && !token) {
    _onUnauthorized?.()
    throw new Error('Sesi tidak valid. Silakan login kembali.')
  }

  // Kirim sebagai form fields terpisah agar GAS bisa baca via e.parameter
  const formData = new URLSearchParams()
  formData.set('action',  action)
  formData.set('payload', JSON.stringify(payload ?? {}))
  if (token) formData.set('token', token)

  const controller = new AbortController()
  const timeoutMs  = options?.timeout ?? 60_000   // GAS cold start bisa ~10–20 detik
  const timer      = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(GAS_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:     formData.toString(),
      redirect: 'follow',
      signal:   controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    // Deteksi HTML — tanda deployment GAS bermasalah
    if (text.trimStart().startsWith('<')) {
      if (text.includes('accounts.google.com') || text.includes('signin')) {
        throw new Error(
          'GAS meminta login Google. Buka GAS editor → Deploy → ' +
          'pastikan "Who has access" diset ke "Anyone".'
        )
      }
      if (text.includes('Script function not found') || text.includes('doPost')) {
        throw new Error(
          'Fungsi doPost tidak ditemukan. Pastikan Main.gs sudah disimpan ' +
          'dan buat New Deployment di GAS.'
        )
      }
      // Coba ekstrak pesan error dari HTML GAS jika ada
      const match = text.match(/<title>([^<]+)<\/title>/)
      const title = match ? match[1] : 'Unknown error'
      throw new Error(
        `GAS mengembalikan HTML (${title}). ` +
        'Buat New Deployment di GAS dan pastikan URL sudah diupdate di .env.production.'
      )
    }

    let data: ApiResponse<T>
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(
        `Response GAS bukan JSON. Isi awal response: "${text.slice(0, 150)}"`
      )
    }

    if (data.status === 401) {
      // BUG-03 FIX: Hapus auth data SEKALI lewat _onUnauthorized (yang memanggil logout()
      // yang sudah memanggil clearAuth()). Jangan clearAuth() di sini juga agar tidak
      // double-clear dan tidak memicu logout() GAS request dengan token yang sudah kosong.
      _onUnauthorized?.()
      throw new Error('Sesi berakhir. Silakan login kembali.')
    }

    if (data.status === 403) {
      throw new Error('Anda tidak memiliki izin untuk melakukan tindakan ini.')
    }

    if (data.status >= 400) {
      throw new Error(data.error ?? data.message ?? 'Terjadi kesalahan.')
    }

    return data.data as T

  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `Request timeout setelah ${timeoutMs / 1000} detik. ` +
        'GAS mungkin sedang cold start. Coba lagi dalam beberapa saat.'
      )
    }
    // BUG-02 FIX: TypeError check yang benar — TypeError adalah network error (fetch gagal),
    // tidak ada hubungannya dengan RangeError (RangeError BUKAN subclass TypeError).
    // Kondisi lama !(err instanceof RangeError) selalu true dan menyesatkan.
    if (err instanceof TypeError) {
      throw new Error(
        'Tidak dapat terhubung ke server GAS. ' +
        'Periksa koneksi internet dan pastikan URL GAS benar.'
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
