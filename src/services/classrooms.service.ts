import { gasRequest } from './api'
import type { Classroom, ClassroomFormData, Grade, SchoolYear, SchoolYearFormData } from '@/types'
import type { ClassroomStats } from '@/types'

function normalizeArrayResponse<T>(
  value: unknown,
  keys: string[] = [],
): T[] {
  if (Array.isArray(value)) return value as T[]
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>

  for (const key of ['items', ...keys, 'data']) {
    const candidate = record[key]
    if (Array.isArray(candidate)) return candidate as T[]
  }

  return []
}

export const classroomsService = {
  // ── Classrooms ───────────────────────────────────────────────

  async list(schoolYearId?: string): Promise<Classroom[]> {
    const response = await gasRequest<unknown>(
      'classrooms.list',
      { schoolYearId },
      { retry404: 2 },
    )
    return normalizeArrayResponse<Classroom>(response, ['classrooms'])
  },

  async get(id: string): Promise<Classroom> {
    return gasRequest<Classroom>('classrooms.get', { id }, { retry404: 2 })
  },

  async create(data: ClassroomFormData): Promise<Classroom> {
    return gasRequest<Classroom>('classrooms.create', data)
  },

  async update(id: string, data: Partial<ClassroomFormData>): Promise<Classroom> {
    return gasRequest<Classroom>('classrooms.update', { id, ...data })
  },

  async delete(id: string): Promise<void> {
    return gasRequest<void>('classrooms.delete', { id })
  },

  async getStats(schoolYearId?: string): Promise<ClassroomStats[]> {
    const response = await gasRequest<unknown>(
      'classrooms.getStats',
      { schoolYearId },
      { retry404: 2 },
    )
    return normalizeArrayResponse<ClassroomStats>(response, ['stats'])
  },

  /** Kelas yang diampu guru tertentu */
  async getByTeacher(teacherId: string): Promise<Classroom[]> {
    const response = await gasRequest<unknown>(
      'classrooms.getByTeacher',
      { teacherId },
      { retry404: 2 },
    )
    return normalizeArrayResponse<Classroom>(response, ['classrooms'])
  },

  // ── Grades ───────────────────────────────────────────────────

  async listGrades(): Promise<Grade[]> {
    const response = await gasRequest<unknown>(
      'grades.list',
      undefined,
      { retry404: 2 },
    )
    return normalizeArrayResponse<Grade>(response, ['grades'])
  },

  async createGrade(data: { name: string; level: number }): Promise<Grade> {
    return gasRequest<Grade>('grades.create', data)
  },

  async updateGrade(id: string, data: { name: string; level: number }): Promise<Grade> {
    return gasRequest<Grade>('grades.update', { id, ...data })
  },

  async deleteGrade(id: string): Promise<void> {
    return gasRequest<void>('grades.delete', { id })
  },

  // ── School Years ─────────────────────────────────────────────

  async listSchoolYears(): Promise<SchoolYear[]> {
    const response = await gasRequest<unknown>(
      'schoolYears.list',
      undefined,
      { retry404: 2 },
    )
    return normalizeArrayResponse<SchoolYear>(response, ['schoolYears'])
  },

  async createSchoolYear(data: SchoolYearFormData): Promise<SchoolYear> {
    return gasRequest<SchoolYear>('schoolYears.create', data)
  },

  async updateSchoolYear(id: string, data: Partial<SchoolYearFormData>): Promise<SchoolYear> {
    return gasRequest<SchoolYear>('schoolYears.update', { id, ...data })
  },

  async setActiveSchoolYear(id: string): Promise<SchoolYear> {
    return gasRequest<SchoolYear>('schoolYears.setActive', { id })
  },

  async deleteSchoolYear(id: string): Promise<void> {
    return gasRequest<void>('schoolYears.delete', { id })
  },
}
