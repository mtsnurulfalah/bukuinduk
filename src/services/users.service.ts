import { gasRequest } from './api'
import type { User } from '@/types'
import type { PaginatedResponse } from '@/types'

export interface CreateUserPayload {
  username: string
  fullName: string
  email: string
  role: string
  password: string
  teacherId?: string
  isActive?: boolean
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  role?: string
  teacherId?: string
  isActive?: boolean
}

/**
 * Spreadsheet legacy data can contain booleans as native values or strings.
 * Normalize them at the service boundary so every page sees a real boolean.
 */
function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'ya', 'aktif', 'active'].includes(normalized)) return true
    if (['false', '0', 'no', 'tidak', 'nonaktif', 'inactive', ''].includes(normalized)) return false
  }

  return fallback
}

function normalizeUser(user: User): User {
  return {
    ...user,
    isActive: normalizeBoolean(user?.isActive, false),
  }
}

export const usersService = {
  async list(params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<PaginatedResponse<User>> {
    const response = await gasRequest<PaginatedResponse<User>>('users.list', params, { retry404: 2 })
    return {
      ...response,
      items: Array.isArray(response?.items) ? response.items.map(normalizeUser) : [],
    }
  },

  async get(id: string): Promise<User> {
    const response = await gasRequest<User>('users.get', { id }, { retry404: 2 })
    return normalizeUser(response)
  },

  async create(data: CreateUserPayload): Promise<User> {
    const response = await gasRequest<User>('users.create', data)
    return normalizeUser(response)
  },

  async update(id: string, data: UpdateUserPayload): Promise<User> {
    const response = await gasRequest<User>('users.update', { id, ...data })
    return normalizeUser(response)
  },

  async toggleActive(id: string): Promise<User> {
    const response = await gasRequest<User>('users.toggleActive', { id })
    return normalizeUser(response)
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    return gasRequest<void>('users.resetPassword', { id, newPassword })
  },

  async delete(id: string): Promise<void> {
    return gasRequest<void>('users.delete', { id })
  },
}
