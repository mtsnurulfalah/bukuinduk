import { gasRequest } from './api'
import type { Teacher, TeacherFormData } from '@/types'
import type { PaginatedResponse } from '@/types'

export const teachersService = {
  async list(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Teacher>> {
    return gasRequest<PaginatedResponse<Teacher>>('teachers.list', params, { retry404: 2 })
  },

  async get(id: string): Promise<Teacher> {
    return gasRequest<Teacher>('teachers.get', { id }, { retry404: 2 })
  },

  async create(data: TeacherFormData): Promise<Teacher> {
    return gasRequest<Teacher>('teachers.create', data)
  },

  async update(id: string, data: Partial<TeacherFormData>): Promise<Teacher> {
    return gasRequest<Teacher>('teachers.update', { id, ...data })
  },

  async delete(id: string): Promise<void> {
    return gasRequest<void>('teachers.delete', { id })
  },

  /** Semua guru aktif (untuk dropdown wali kelas) */
  async listActive(): Promise<Pick<Teacher, 'id' | 'fullName'>[]> {
    return gasRequest('teachers.listActive', undefined, { retry404: 2 })
  },
}
