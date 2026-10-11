import type { ApiResponse } from '@/types'
import { getToken } from '@/utils'

// Fail fast when the deployment is misconfigured instead of surfacing a vague
// "Failed to fetch" message on the first user action.
const GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined
if (!GAS_URL?.trim()) {
  throw new Error(
    'VITE_GAS_URL belum dikonfigurasi. ' +
    'Tambahkan VITE_GAS_URL=<url_deployment_GAS> di file .env.local atau .env.production.'
  )
}

const DEFAULT_TIMEOUT_MS = 60_000
const MAX_READ_RETRIES = 3
const MAX_RETRY_DELAY_MS = 2_000

type GasRequestOptions = {
  skipAuth?: boolean
  timeout?: number
  /**
   * Additional retries for idempotent read operations only.
   * Do not enable this option for create/update/delete/import actions.
   */
  retryRead?: number
}

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler
}

function addCacheBust(url: string, attempt: number) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}__bid=${Date.now()}-${attempt}`
}

function formatGasActionError(action: string, message: string) {
  if (/Action "\s*[^"]+\s*" tidak ditemukan|method tidak ditemukan/i.test(message)) {
    return `Backend GAS belum memuat action "${action}". Deploy ulang versi Web App GAS terbaru (termasuk Main.gs, ReportHandler.gs, dan AcademicHandler.gs).`
  }
  return message
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 429 || (status >= 500 && status < 600)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function normalizeRetryCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0
  return Math.min(MAX_READ_RETRIES, Math.max(0, Math.floor(value)))
}

function retryDelayMs(retryNumber: number): number {
  const exponentialDelay = Math.min(250 * (2 ** Math.max(0, retryNumber - 1)), MAX_RETRY_DELAY_MS)
  // A small jitter prevents multiple browser tabs from retrying in lockstep.
  return exponentialDelay + Math.floor(Math.random() * 100)
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Request aborted.', 'AbortError'))
      return
    }

    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, delayMs)

    const onAbort = () => {
      clearTimeout(timer)
      cleanup()
      reject(new DOMException('Request aborted.', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Send a request to the Google Apps Script Web App.
 *
 * Use application/x-www-form-urlencoded rather than JSON: GAS parses the
 * simple form request through e.parameter and does not require a CORS preflight.
 * Retries are opt-in and intended for idempotent reads only because a network
 * failure cannot prove that a write did not reach the backend.
 */
export async function gasRequest<T = unknown>(
  action: string,
  payload?: unknown,
  options?: GasRequestOptions
): Promise<T> {
  const token = getToken()

  if (!options?.skipAuth && !token) {
    _onUnauthorized?.()
    throw new Error('Sesi tidak valid. Silakan login kembali.')
  }

  const formData = new URLSearchParams()
  formData.set('action', action)
  formData.set('payload', JSON.stringify(payload ?? {}))
  if (token) formData.set('token', token)

  const requestedTimeout = options?.timeout
  const timeoutMs =
    typeof requestedTimeout === 'number' && Number.isFinite(requestedTimeout) && requestedTimeout > 0
      ? requestedTimeout
      : DEFAULT_TIMEOUT_MS
  const maxReadRetries = normalizeRetryCount(options?.retryRead)
  const controller = new AbortController()
  let timedOut = false
  let requestAttempt = 0
  let retriesUsed = 0
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    while (true) {
      let response: Response

      try {
        response = await fetch(addCacheBust(GAS_URL, requestAttempt++), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
          redirect: 'follow',
          signal: controller.signal,
          cache: 'no-store',
        })
      } catch (error: unknown) {
        if (isAbortError(error)) throw error
        if (error instanceof TypeError && retriesUsed < maxReadRetries) {
          retriesUsed += 1
          await waitForRetry(retryDelayMs(retriesUsed), controller.signal)
          continue
        }
        throw error
      }

      if (!response.ok) {
        if (isRetryableStatus(response.status) && retriesUsed < maxReadRetries) {
          retriesUsed += 1
          await waitForRetry(retryDelayMs(retriesUsed), controller.signal)
          continue
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Permintaan gagal.'}`)
      }

      let text: string
      try {
        text = await response.text()
      } catch (error: unknown) {
        if (isAbortError(error)) throw error
        if (error instanceof TypeError && retriesUsed < maxReadRetries) {
          retriesUsed += 1
          await waitForRetry(retryDelayMs(retriesUsed), controller.signal)
          continue
        }
        throw error
      }

      // Detect common HTML responses caused by an inaccessible or stale GAS deployment.
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
        const match = text.match(/<title>([^<]+)<\/title>/)
        const title = match ? match[1] : 'Unknown error'
        throw new Error(
          `GAS mengembalikan HTML (${title}). ` +
          'Buat New Deployment di GAS dan pastikan URL sudah diupdate di .env.production.'
        )
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        // Never include response fragments here: they may contain personal or operational data.
        throw new Error('Response GAS bukan JSON. Periksa URL deployment dan akses Web App GAS.')
      }

      if (!isRecord(parsed) || typeof parsed.status !== 'number' || !Number.isFinite(parsed.status)) {
        throw new Error('Format response GAS tidak sesuai kontrak API.')
      }

      const data = parsed as unknown as ApiResponse<T>

      // GAS often returns HTTP 200 while expressing errors in the JSON status.
      // Retry is therefore evaluated for both HTTP responses and the API envelope.
      if (isRetryableStatus(data.status) && retriesUsed < maxReadRetries) {
        retriesUsed += 1
        await waitForRetry(retryDelayMs(retriesUsed), controller.signal)
        continue
      }

      if (data.status === 401) {
        _onUnauthorized?.()
        throw new Error('Sesi berakhir. Silakan login kembali.')
      }

      if (data.status === 403) {
        throw new Error('Anda tidak memiliki izin untuk melakukan tindakan ini.')
      }

      if (data.status < 200 || data.status >= 300) {
        const message = data.error ?? data.message ?? 'Terjadi kesalahan.'
        throw new Error(formatGasActionError(action, message))
      }

      return data.data as T
    }
  } catch (error: unknown) {
    if (isAbortError(error) || timedOut) {
      throw new Error(
        `Request timeout setelah ${Math.round(timeoutMs / 1000)} detik. ` +
        'GAS mungkin sedang cold start. Coba lagi dalam beberapa saat.'
      )
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Tidak dapat terhubung ke server GAS. ' +
        'Periksa koneksi internet dan pastikan URL GAS benar.'
      )
    }

    throw error
  } finally {
    clearTimeout(timer)
  }
}
