import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginPayload } from '@/types'
import type { Permission } from '@/constants'
import { ROLE_PERMISSIONS } from '@/constants'
import { authService } from '@/services'
import { setUnauthorizedHandler } from '@/services'
import { getToken, setToken, setStoredUser, getStoredUser, clearAuth, isTokenExpired } from '@/utils'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(getStoredUser())
  const token = ref<string | null>(getToken())
  const isLoading = ref(false)

  // Flag agar initFromStorage() hanya efektif dijalankan sekali per sesi.
  // Guard ini dipakai oleh router guard (BUG-11 fix di guards.ts).
  let _initialized = false

  const isAuthenticated = computed(() =>
    !!token.value && !!user.value && !isTokenExpired(token.value)
  )

  const userRole = computed(() => user.value?.role ?? null)

  // ── Setup unauthorized handler ────────────────────────────────
  // BUG-04 NOTE: setUnauthorizedHandler di-call sekali saat store pertama kali dibuat.
  // Ini aman karena Pinia store factory hanya berjalan sekali.
  setUnauthorizedHandler(() => {
    logout()
    // Redirect ditangani di router guard yang memantau isAuthenticated
  })

  // ── Actions ──────────────────────────────────────────────────

  async function login(payload: LoginPayload): Promise<void> {
    isLoading.value = true
    try {
      const res = await authService.login(payload)
      token.value = res.token
      user.value = res.user
      setToken(res.token)
      setStoredUser(res.user)
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    // Best-effort — tidak perlu await agar tidak blocking
    authService.logout().catch(() => {})
    token.value = null
    user.value = null
    clearAuth()
  }

  async function refreshUser(): Promise<void> {
    if (!token.value) return
    try {
      const me = await authService.me()
      user.value = me
      setStoredUser(me)
    } catch (err: unknown) {
      // BUG-06 FIX: Jangan logout() pada semua error.
      // Hanya logout jika server dengan tegas menolak (401/403),
      // bukan saat network error atau timeout sementara.
      // gasRequest() sudah melempar Error dengan message 'Sesi berakhir...' untuk 401.
      const msg = err instanceof Error ? err.message : ''
      const isAuthError =
        msg.includes('Sesi berakhir') ||
        msg.includes('Token tidak valid') ||
        msg.includes('Sesi tidak valid')
      if (isAuthError) {
        logout()
      }
      // Network error / timeout: biarkan sesi tetap aktif
    }
  }

  /**
   * Inisialisasi dari storage saat app pertama kali load.
   * BUG-11 FIX: Dipanggil sekali saja via flag _initialized,
   * sehingga tidak re-evaluasi setiap navigasi.
   */
  function initFromStorage(): void {
    if (_initialized) return
    _initialized = true

    const storedToken = getToken()
    const storedUser = getStoredUser()
    if (storedToken && storedUser && !isTokenExpired(storedToken)) {
      token.value = storedToken
      user.value = storedUser
    } else {
      clearAuth()
      token.value = null
      user.value = null
    }
  }

  function hasPermission(permission: Permission): boolean {
    if (!user.value) return false
    const perms = ROLE_PERMISSIONS[user.value.role] ?? []
    return perms.includes(permission)
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    userRole,
    login,
    logout,
    refreshUser,
    initFromStorage,
    hasPermission,
  }
})
