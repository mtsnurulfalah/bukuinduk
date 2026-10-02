import { gasRequest } from './api'
import type {
  Student, StudentFormData, StudentFilters,
  StudentParent, StudentHealth, StudentEducationHistory,
  StudentEnrollment,
} from '@/types'
import type { PaginatedResponse } from '@/types'

/**
 * Normalize values returned by Google Sheets/GAS before they reach the UI.
 * Spreadsheet numeric cells may arrive as numbers even when the domain contract
 * treats the value as a string (e.g. NISN, NIK, phone).
 */
function optionalString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  return String(value)
}

function requiredString(value: unknown): string {
  return value == null ? '' : String(value)
}

function normalizeParent(parent: StudentParent): StudentParent {
  return {
    ...parent,
    studentId: requiredString(parent.studentId),
    relationship: parent.relationship,
    fullName: optionalString(parent.fullName),
    nik: optionalString(parent.nik),
    birthPlace: optionalString(parent.birthPlace),
    birthDate: optionalString(parent.birthDate),
    religion: optionalString(parent.religion),
    education: optionalString(parent.education),
    occupation: optionalString(parent.occupation),
    incomeRange: optionalString(parent.incomeRange),
    phone: optionalString(parent.phone),
    address: optionalString(parent.address),
    isAlive: parent.isAlive !== false && parent.isAlive !== 'FALSE' && parent.isAlive !== 'false' && parent.isAlive !== 0,
  }
}

function normalizeEducationHistory(item: StudentEducationHistory): StudentEducationHistory {
  return {
    ...item,
    studentId: requiredString(item.studentId),
    level: optionalString(item.level),
    schoolName: optionalString(item.schoolName),
    graduationYear:
      item.graduationYear == null || item.graduationYear === ''
        ? undefined
        : Number(item.graduationYear),
    certificateNumber: optionalString(item.certificateNumber),
    participantNumber: optionalString(item.participantNumber),
  }
}

function normalizeEnrollment(enrollment: StudentEnrollment): StudentEnrollment {
  return {
    ...enrollment,
    studentId: requiredString(enrollment.studentId),
    classroomId: requiredString(enrollment.classroomId),
    classroomName: requiredString(enrollment.classroomName),
    schoolYearId: requiredString(enrollment.schoolYearId),
    schoolYearName: requiredString(enrollment.schoolYearName),
    entryDate: requiredString(enrollment.entryDate),
    exitDate: optionalString(enrollment.exitDate),
    status: requiredString(enrollment.status),
    notes: optionalString(enrollment.notes),
  }
}

function normalizeStudent(student: Student): Student {
  return {
    ...student,
    id: requiredString(student.id),
    nis: requiredString(student.nis),
    nisn: requiredString(student.nisn),
    nik: optionalString(student.nik),
    fullName: requiredString(student.fullName),
    nickname: optionalString(student.nickname),
    birthPlace: optionalString(student.birthPlace),
    birthDate: optionalString(student.birthDate),
    religion: optionalString(student.religion),
    nationality: requiredString(student.nationality),
    familyStatus: optionalString(student.familyStatus),
    address: optionalString(student.address),
    rtRw: optionalString(student.rtRw),
    village: optionalString(student.village),
    district: optionalString(student.district),
    city: optionalString(student.city),
    province: optionalString(student.province),
    postalCode: optionalString(student.postalCode),
    phone: optionalString(student.phone),
    email: optionalString(student.email),
    entryDate: optionalString(student.entryDate),
    exitDate: optionalString(student.exitDate),
    exitReason: optionalString(student.exitReason),
    photoUrl: optionalString(student.photoUrl),
    notes: optionalString(student.notes),
    createdAt: requiredString(student.createdAt),
    updatedAt: requiredString(student.updatedAt),
    createdBy: optionalString(student.createdBy),
    parents: Array.isArray(student.parents)
      ? student.parents.map(normalizeParent)
      : undefined,
    educationHistory: Array.isArray(student.educationHistory)
      ? student.educationHistory.map(normalizeEducationHistory)
      : undefined,
    currentEnrollment: student.currentEnrollment
      ? normalizeEnrollment(student.currentEnrollment)
      : undefined,
  }
}

function normalizeStudentList(response: PaginatedResponse<Student>): PaginatedResponse<Student> {
  return {
    ...response,
    items: Array.isArray(response.items) ? response.items.map(normalizeStudent) : [],
  }
}

export const studentsService = {
  /**
   * Ambil daftar siswa dengan filter & pagination.
   */
  async list(filters: StudentFilters): Promise<PaginatedResponse<Student>> {
    const response = await gasRequest<PaginatedResponse<Student>>('students.list', filters)
    return normalizeStudentList(response)
  },

  /**
   * Ambil detail satu siswa (tanpa sub-data sensitif).
   */
  async get(id: string): Promise<Student> {
    const student = await gasRequest<Student>('students.get', { id })
    return normalizeStudent(student)
  },

  /**
   * Ambil detail lengkap siswa termasuk relasi (parents, health, dll).
   */
  async getFull(id: string): Promise<Student> {
    const student = await gasRequest<Student>('students.getFull', { id })
    return normalizeStudent(student)
  },

  /**
   * Tambah siswa baru beserta data terkait.
   */
  async create(data: StudentFormData): Promise<Student> {
    const student = await gasRequest<Student>('students.create', data)
    return normalizeStudent(student)
  },

  /**
   * Update data siswa.
   */
  async update(id: string, data: Partial<StudentFormData>): Promise<Student> {
    const student = await gasRequest<Student>('students.update', { id, ...data })
    return normalizeStudent(student)
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
    const parents = await gasRequest<StudentParent[]>('students.getParents', { studentId })
    return Array.isArray(parents) ? parents.map(normalizeParent) : []
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
    const history = await gasRequest<StudentEducationHistory[]>(
      'students.getEducationHistory',
      { studentId },
    )
    return Array.isArray(history) ? history.map(normalizeEducationHistory) : []
  },

  // ── Enrollment ───────────────────────────────────────────────

  async getEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    const enrollments = await gasRequest<StudentEnrollment[]>(
      'students.getEnrollments',
      { studentId },
    )
    return Array.isArray(enrollments) ? enrollments.map(normalizeEnrollment) : []
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
    const students = await gasRequest<Student[]>('students.exportData', filters, { timeout: 60_000 })
    return Array.isArray(students) ? students.map(normalizeStudent) : []
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
