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

export const usersService = {
  async list(params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<PaginatedResponse<User>> {
    return gasRequest<PaginatedResponse<User>>('users.list', params)
  },

  async get(id: string): Promise<User> {
    return gasRequest<User>('users.get', { id })
  },

  async create(data: CreateUserPayload): Promise<User> {
    return gasRequest<User>('users.create', data)
  },

  async update(id: string, data: UpdateUserPayload): Promise<User> {
    return gasRequest<User>('users.update', { id, ...data })
  },

  async toggleActive(id: string): Promise<User> {
    return gasRequest<User>('users.toggleActive', { id })
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    return gasRequest<void>('users.resetPassword', { id, newPassword })
  },

  async delete(id: string): Promise<void> {
    return gasRequest<void>('users.delete', { id })
  },
}
