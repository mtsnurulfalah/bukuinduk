import { gasRequest } from './api'
import type { Classroom, ClassroomFormData, Grade, SchoolYear, SchoolYearFormData } from '@/types'
import type { ClassroomStats } from '@/types'

export const classroomsService = {
  // ── Classrooms ───────────────────────────────────────────────

  async list(schoolYearId?: string): Promise<Classroom[]> {
    return gasRequest<Classroom[]>('classrooms.list', { schoolYearId })
  },

  async get(id: string): Promise<Classroom> {
    return gasRequest<Classroom>('classrooms.get', { id })
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
    return gasRequest<ClassroomStats[]>('classrooms.getStats', { schoolYearId })
  },

  /** Kelas yang diampu guru tertentu */
  async getByTeacher(teacherId: string): Promise<Classroom[]> {
    return gasRequest<Classroom[]>('classrooms.getByTeacher', { teacherId })
  },

  // ── Grades ───────────────────────────────────────────────────

  async listGrades(): Promise<Grade[]> {
    return gasRequest<Grade[]>('grades.list')
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
    return gasRequest<SchoolYear[]>('schoolYears.list')
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
