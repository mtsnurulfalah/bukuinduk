import { gasRequest } from './api'
import type { StudentGrade, GradeFormData } from '@/types'

export const gradesService = {
  async list(params?: {
    studentId?: string
    schoolYearId?: string
    semester?: 1 | 2
    classroomId?: string
  }): Promise<StudentGrade[]> {
    return gasRequest<StudentGrade[]>('grades.list', params, { retry404: 2 })
  },
  async save(data: GradeFormData): Promise<StudentGrade> {
    return gasRequest<StudentGrade>('grades.save', data)
  },
  async remove(id: string): Promise<{ message: string }> {
    return gasRequest<{ message: string }>('grades.delete', { id })
  },
}
