import { gasRequest } from './api'
import type { LoginPayload, LoginResponse, ChangePasswordPayload, User } from '@/types'

export const authService = {
  /**
   * Login dengan username & password.
   * GAS akan memvalidasi credential, menghasilkan JWT, dan mengembalikannya.
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    return gasRequest<LoginResponse>('auth.login', payload, { skipAuth: true })
  },

  /**
   * Logout — GAS dapat mencatat waktu logout di audit log.
   */
  async logout(): Promise<void> {
    await gasRequest<void>('auth.logout').catch(() => {
      // Jika gagal (offline), tetap lanjutkan logout di client
    })
  },

  /**
   * Ambil data user yang sedang login dari token.
   */
  async me(): Promise<User> {
    return gasRequest<User>('auth.me')
  },

  /**
   * Ubah password sendiri.
   */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    return gasRequest<void>('auth.changePassword', payload)
  },
}
