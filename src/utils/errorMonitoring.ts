import type { App } from 'vue'
import { toast } from 'vue-sonner'

const reportedErrors = new WeakSet<object>()
let lastToastAt = 0
let errorSequence = 0

function errorName(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 80)
  if (typeof error === 'string') return 'StringRejection'
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    return error.name.slice(0, 80)
  }
  return 'UnknownError'
}

function reportUnexpectedError(error: unknown, source: string): void {
  if (error && (typeof error === 'object' || typeof error === 'function')) {
    const objectError = error as object
    if (reportedErrors.has(objectError)) return
    reportedErrors.add(objectError)
  }

  errorSequence += 1
  const code = `BID-${Date.now().toString(36).toUpperCase()}-${errorSequence.toString(36).toUpperCase()}`
  const occurredAt = new Date().toISOString()
  // Keep only the first route segment: detail routes can contain student IDs.
  const route = window.location.pathname.split('/').filter(Boolean)[0] || 'root'
  const diagnostic = {
    code,
    source: source.slice(0, 100),
    errorName: errorName(error),
    route,
    occurredAt,
  }

  // Production diagnostics deliberately omit error messages and stacks because
  // they can contain personal data. Development consoles retain the original
  // error to make local debugging practical.
  if (import.meta.env.DEV) {
    console.error('[Buku Induk Digital] Unexpected application error', error, diagnostic)
  } else {
    console.error('[Buku Induk Digital] Unexpected application error', diagnostic)
  }

  // Prevent a cascade of rejected promises from overwhelming the user with toasts.
  const now = Date.now()
  if (now - lastToastAt >= 3_000) {
    lastToastAt = now
    toast.error('Terjadi kesalahan aplikasi', {
      description: `Muat ulang halaman jika masalah berlanjut. Kode: ${code}`,
      duration: 7_000,
    })
  }
}

/**
 * Install global diagnostics once during application bootstrap.
 * This is local diagnostics only; no student data or error payload is sent
 * to a third-party monitoring service.
 */
export function installErrorMonitoring(app: App): void {
  app.config.errorHandler = (error, _instance, info) => {
    reportUnexpectedError(error, `vue:${info}`)
  }

  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignore resource loading events (for example, a broken image).
    if (event.target !== window) return
    reportUnexpectedError(event.error ?? new Error('Uncaught browser error'), 'window:error')
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    reportUnexpectedError(event.reason, 'window:unhandledrejection')
    // Avoid the browser printing an unredacted rejection reason to production console.
    event.preventDefault()
  })
}
