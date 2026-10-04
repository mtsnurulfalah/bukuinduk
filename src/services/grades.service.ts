import { gasRequest } from './api'
import type { StudentGrade, GradeFormData } from '@/types'

export const gradesService = {
  async list(params?: {
    studentId?: string
    schoolYearId?: string
    semester?: 1 | 2
    classroomId?: string
  }): Promise<StudentGrade[]> {
    return gasRequest<StudentGrade[]>('scores.list', params, { retry404: 2 })
  },
  async save(data: GradeFormData): Promise<StudentGrade> {
    return gasRequest<StudentGrade>('scores.save', data)
  },
  async saveBatch(rows: GradeFormData[]): Promise<{ success: number; failed: number; errors: string[] }> {
    return gasRequest<{ success: number; failed: number; errors: string[] }>('scores.saveBatch', { rows }, { timeout: 120_000 })
  },

  async remove(id: string, studentId: string): Promise<{ message: string }> {
    return gasRequest<{ message: string }>('scores.delete', { id, studentId })
  },
}
