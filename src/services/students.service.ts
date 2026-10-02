import { gasRequest } from './api'
import type {
  Student, StudentFormData, StudentFilters,
  StudentParent, StudentHealth, StudentEducationHistory,
  StudentEnrollment,
} from '@/types'
import type { PaginatedResponse } from '@/types'

export const studentsService = {
  /**
   * Ambil daftar siswa dengan filter & pagination.
   */
  async list(filters: StudentFilters): Promise<PaginatedResponse<Student>> {
    return gasRequest<PaginatedResponse<Student>>('students.list', filters)
  },

  /**
   * Ambil detail satu siswa (tanpa sub-data sensitif).
   */
  async get(id: string): Promise<Student> {
    return gasRequest<Student>('students.get', { id })
  },

  /**
   * Ambil detail lengkap siswa termasuk relasi (parents, health, dll).
   */
  async getFull(id: string): Promise<Student> {
    return gasRequest<Student>('students.getFull', { id })
  },

  /**
   * Tambah siswa baru beserta data terkait.
   */
  async create(data: StudentFormData): Promise<Student> {
    return gasRequest<Student>('students.create', data)
  },

  /**
   * Update data siswa.
   */
  async update(id: string, data: Partial<StudentFormData>): Promise<Student> {
    return gasRequest<Student>('students.update', { id, ...data })
  },

  /**
   * Arsipkan / ubah status siswa menjadi inactive.
   */
  async archive(id: string, reason?: string): Promise<void> {
    return gasRequest<void>('students.archive', { id, reason })
  },

  /**
   * Aktifkan kembali siswa yang diarsipkan.
   */
  async restore(id: string): Promise<void> {
    return gasRequest<void>('students.restore', { id })
  },

  // ── Parents ─────────────────────────────────────────────────

  async getParents(studentId: string): Promise<StudentParent[]> {
    return gasRequest<StudentParent[]>('students.getParents', { studentId })
  },

  async updateParent(
    studentId: string,
    relationship: 'father' | 'mother' | 'guardian',
    data: Partial<StudentParent>
  ): Promise<StudentParent> {
    return gasRequest<StudentParent>('students.updateParent', {
      studentId, relationship, ...data,
    })
  },

  // ── Health ───────────────────────────────────────────────────

  async getHealth(studentId: string): Promise<StudentHealth> {
    return gasRequest<StudentHealth>('students.getHealth', { studentId })
  },

  async updateHealth(studentId: string, data: Partial<StudentHealth>): Promise<StudentHealth> {
    return gasRequest<StudentHealth>('students.updateHealth', { studentId, ...data })
  },

  // ── Education history ────────────────────────────────────────

  async getEducationHistory(studentId: string): Promise<StudentEducationHistory[]> {
    return gasRequest<StudentEducationHistory[]>('students.getEducationHistory', { studentId })
  },

  // ── Enrollment ───────────────────────────────────────────────

  async getEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    return gasRequest<StudentEnrollment[]>('students.getEnrollments', { studentId })
  },

  async enroll(studentId: string, classroomId: string, schoolYearId: string): Promise<StudentEnrollment> {
    return gasRequest<StudentEnrollment>('students.enroll', {
      studentId, classroomId, schoolYearId,
    })
  },

  // ── Import / Export ──────────────────────────────────────────

  /**
   * Import siswa dari array data (hasil parse Excel di frontend).
   */
  async importBatch(rows: Partial<StudentFormData>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    return gasRequest('students.importBatch', { rows }, { timeout: 60_000 })
  },

  /**
   * Export data siswa (GAS mengembalikan array, frontend yang format ke Excel/PDF).
   */
  async exportData(filters: Partial<StudentFilters>): Promise<Student[]> {
    return gasRequest<Student[]>('students.exportData', filters, { timeout: 60_000 })
  },

  // ── Stats ─────────────────────────────────────────────────────

  /**
   * BUG-62 FIX: Return type sekarang cocok dengan nama field yang dikembalikan GAS backend
   * (totalStudents, activeStudents, maleStudents, dll.) — bukan alias yang salah
   * (total, active, male, dll.).
   */
  async getStats(): Promise<{
    totalStudents: number
    activeStudents: number
    maleStudents: number
    femaleStudents: number
    graduatedStudents: number
    transferredStudents: number
    newStudentsThisYear: number
    totalTeachers: number
    totalClassrooms: number
  }> {
    return gasRequest('students.getStats')
  },
}
