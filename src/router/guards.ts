import type { Router, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useSettingsStore } from '@/stores/settings'
import { ROLE_PERMISSIONS } from '@/constants'
import type { Permission } from '@/constants'

export function setupGuards(router: Router): void {
  router.beforeEach(async (to, _from) => {
    const authStore = useAuthStore()

    // BUG-11 FIX: initFromStorage() sekarang memiliki internal flag _initialized
    // sehingga hanya efektif berjalan sekali meskipun dipanggil tiap navigasi.
    // Ini memastikan state diinisialisasi dari localStorage pada navigasi pertama
    // tanpa overhead membaca localStorage & meresetting reactive state setiap kali.
    authStore.initFromStorage()

    const isAuthenticated = authStore.isAuthenticated

    // ── Guest-only routes (misal /login) ──────────────────
    if (to.meta.guest) {
      if (isAuthenticated) return { name: 'dashboard' }
      return true
    }

    // ── Protected routes ──────────────────────────────────
    if (to.meta.requiresAuth || to.matched.some(r => r.meta.requiresAuth)) {
      if (!isAuthenticated) {
        return {
          name: 'login',
          query: { redirect: to.fullPath !== '/' ? to.fullPath : undefined },
        }
      }
    }

    // ── Permission check (dari meta.permission) ───────────
    const requiredPermission = getMostSpecificPermission(to)
    if (requiredPermission && authStore.user) {
      const userPerms = ROLE_PERMISSIONS[authStore.user.role] ?? []
      if (!userPerms.includes(requiredPermission as Permission)) {
        return { name: 'forbidden' }
      }
    }

    // ── Role check (dari meta.roles) ──────────────────────
    const requiredRoles = getMostSpecificRoles(to)
    if (requiredRoles?.length && authStore.user) {
      if (!requiredRoles.includes(authStore.user.role)) {
        return { name: 'forbidden' }
      }
    }

    return true
  })

  // Setelah navigasi — fetch data awal yang dibutuhkan semua halaman
  router.afterEach(async (to) => {
    // Set page title
    const title = to.meta.title as string | undefined
    if (title) document.title = `${title} — Buku Induk Digital`

    // Fetch master data hanya jika sudah login
    // Store schoolYear & settings sudah memiliki guard `initialized` internal
    // sehingga fetch() berikutnya tidak akan re-request ke GAS jika sudah ada data.
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      const schoolYearStore = useSchoolYearStore()
      const settingsStore = useSettingsStore()
      // Fire-and-forget — tidak blocking navigasi
      schoolYearStore.fetch().catch(() => {})
      settingsStore.fetch().catch(() => {})
    }
  })
}

/**
 * Ambil permission dari route yang paling spesifik (leaf route),
 * fallback ke parent jika tidak ada.
 */
function getMostSpecificPermission(to: RouteLocationNormalized): string | undefined {
  const matched = [...to.matched].reverse()
  for (const r of matched) {
    if (r.meta.permission) return r.meta.permission as string
  }
  return undefined
}

function getMostSpecificRoles(to: RouteLocationNormalized): string[] | undefined {
  const matched = [...to.matched].reverse()
  for (const r of matched) {
    if (r.meta.roles) return r.meta.roles as string[]
  }
  return undefined
}
