import { gasRequest } from './api'
import type { Subject, SubjectFormData } from '@/types'

type SubjectUpdateData = SubjectFormData & { id: string }

export const subjectsService = {
  async list(schoolYearId?: string, activeOnly = false): Promise<Subject[]> {
    return gasRequest<Subject[]>('subjects.list', { schoolYearId, activeOnly }, { retry404: 2 })
  },
  async create(data: SubjectFormData): Promise<Subject> {
    return gasRequest<Subject>('subjects.create', data)
  },
  async update(data: SubjectUpdateData): Promise<Subject> {
    return gasRequest<Subject>('subjects.update', data)
  },
  async remove(id: string): Promise<{ message: string }> {
    return gasRequest<{ message: string }>('subjects.delete', { id })
  },
}
