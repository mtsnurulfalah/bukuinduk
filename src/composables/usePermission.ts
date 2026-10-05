import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_PERMISSIONS } from '@/constants'
import type { Permission } from '@/constants'

/**
 * Composable untuk cek permission user yang sedang login.
 * Digunakan di komponen dan view untuk conditional rendering.
 */
export function usePermission() {
  const authStore = useAuthStore()

  /**
   * Cek apakah user memiliki permission tertentu.
   */
  function can(permission: Permission): boolean {
    if (!authStore.user) return false
    const perms = ROLE_PERMISSIONS[authStore.user.role] ?? []
    return perms.includes(permission)
  }

  /**
   * Cek apakah user memiliki role tertentu.
   */
  function hasRole(role: string | string[]): boolean {
    if (!authStore.user) return false
    if (Array.isArray(role)) return role.includes(authStore.user.role)
    return authStore.user.role === role
  }

  const isAdmin = computed(() => hasRole('admin'))
  const isPrincipal = computed(() => hasRole('principal'))
  const isTeacher = computed(() => hasRole('teacher'))

  return { can, hasRole, isAdmin, isPrincipal, isTeacher }
}
