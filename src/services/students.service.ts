import { gasRequest } from './api'
import type {
  Student, StudentFormData, StudentFilters, StudentVerification, StudentDocument,
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

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (value == null || value === '') return fallback
  if (value === false || value === 0) return false

  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true

  return Boolean(value)
}

function normalizeParent(parent: StudentParent): StudentParent {
  const rawIsAlive = parent.isAlive as unknown

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
    isAlive: normalizeBoolean(rawIsAlive, true),
  }
}

function normalizeEducationHistory(item: StudentEducationHistory): StudentEducationHistory {
  return {
    ...item,
    studentId: requiredString(item.studentId),
    level: optionalString(item.level),
    schoolName: optionalString(item.schoolName),
    graduationYear: optionalNumber(item.graduationYear),
    certificateNumber: optionalString(item.certificateNumber),
    participantNumber: optionalString(item.participantNumber),
  }
}

function normalizeHealth(health: StudentHealth): StudentHealth {
  return {
    ...health,
    studentId: requiredString(health.studentId),
    bloodType: optionalString(health.bloodType),
    heightCm: optionalNumber(health.heightCm),
    weightKg: optionalNumber(health.weightKg),
    specialNeeds: optionalString(health.specialNeeds),
    healthNotes: optionalString(health.healthNotes),
    allergies: optionalString(health.allergies),
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
    childOrder: optionalNumber(student.childOrder),
    siblingsCount: optionalNumber(student.siblingsCount),
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
    photoUrl: optionalString(
      (student as Student & Record<string, unknown>).photoUrl ??
      (student as Student & Record<string, unknown>).photoURL ??
      (student as Student & Record<string, unknown>).photo_url,
    ),
    notes: optionalString(student.notes),
    createdAt: requiredString(student.createdAt),
    updatedAt: requiredString(student.updatedAt),
    createdBy: optionalString(student.createdBy),
    parents: Array.isArray(student.parents)
      ? student.parents.map(normalizeParent)
      : undefined,
    health: student.health
      ? normalizeHealth(student.health)
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
    const response = await gasRequest<PaginatedResponse<Student>>('students.list', filters, { retry404: 2 })
    return normalizeStudentList(response)
  },

  /**
   * Ambil detail satu siswa (tanpa sub-data sensitif).
   */
  async get(id: string): Promise<Student> {
    const student = await gasRequest<Student>('students.get', { id }, { retry404: 2 })
    return normalizeStudent(student)
  },

  /**
   * Ambil detail lengkap siswa termasuk relasi (parents, health, dll).
   */
  async getFull(id: string): Promise<Student> {
    const student = await gasRequest<Student>('students.getFull', { id }, { retry404: 2 })
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
    const targetId = String(id ?? '').trim()
    if (!targetId) throw new Error('ID siswa diperlukan untuk proses edit.')

    // ID route adalah identitas target update dan tidak boleh ditimpa oleh payload form.
    const student = await gasRequest<Student>('students.update', {
      ...data,
      id: targetId,
    })
    return normalizeStudent(student)
  },

  async uploadPhoto(
    studentId: string,
    base64: string,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<Student> {
    const student = await gasRequest<Student>('students.uploadPhoto', {
      studentId, base64, mimeType,
    }, { timeout: 60_000 })
    return normalizeStudent(student)
  },

  async deletePhoto(studentId: string): Promise<Student> {
    const student = await gasRequest<Student>('students.deletePhoto', { studentId })
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
    const parents = await gasRequest<StudentParent[]>('students.getParents', { studentId }, { retry404: 2 })
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
    return gasRequest<StudentHealth>('students.getHealth', { studentId }, { retry404: 2 })
  },

  async updateHealth(studentId: string, data: Partial<StudentHealth>): Promise<StudentHealth> {
    return gasRequest<StudentHealth>('students.updateHealth', { studentId, ...data })
  },

  // ── Education history ────────────────────────────────────────

  async getEducationHistory(studentId: string): Promise<StudentEducationHistory[]> {
    const history = await gasRequest<StudentEducationHistory[] | StudentEducationHistory>(
      'students.getEducationHistory',
      { studentId },
      { retry404: 2 },
    )

    const items = Array.isArray(history)
      ? history
      : history && typeof history === 'object'
        ? [history]
        : []

    return items.map(normalizeEducationHistory)
  },

  // ── Enrollment ───────────────────────────────────────────────

  async getEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    const enrollments = await gasRequest<StudentEnrollment[]>(
      'students.getEnrollments',
      { studentId },
      { retry404: 2 },
    )
    return Array.isArray(enrollments) ? enrollments.map(normalizeEnrollment) : []
  },

  async enroll(studentId: string, classroomId: string, schoolYearId: string): Promise<StudentEnrollment> {
    return gasRequest<StudentEnrollment>('students.enroll', {
      studentId, classroomId, schoolYearId,
    })
  },

  // ── Administrasi siswa ─────────────────────────────────────
  async getVerifications(studentId: string): Promise<StudentVerification[]> {
    return gasRequest<StudentVerification[]>(
      'students.getVerifications',
      { studentId },
      { retry404: 2 },
    )
  },

  async updateVerification(
    studentId: string,
    section: string,
    status: StudentVerification['status'],
    notes?: string,
  ): Promise<StudentVerification> {
    return gasRequest<StudentVerification>('students.updateVerification', {
      studentId,
      section,
      status,
      notes,
    })
  },

  async getDocuments(studentId: string): Promise<StudentDocument[]> {
    return gasRequest<StudentDocument[]>(
      'students.getDocuments',
      { studentId },
      { retry404: 2 },
    )
  },

  async createDocument(
    studentId: string,
    data: Omit<StudentDocument, 'id' | 'studentId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  ): Promise<StudentDocument> {
    return gasRequest<StudentDocument>('students.createDocument', {
      studentId,
      ...data,
    })
  },

  async updateDocument(
    id: string,
    data: Partial<Pick<StudentDocument, 'documentType' | 'documentName' | 'documentNumber' | 'fileUrl' | 'status' | 'notes'>>,
  ): Promise<StudentDocument> {
    return gasRequest<StudentDocument>('students.updateDocument', { id, ...data })
  },

  async deleteDocument(id: string): Promise<void> {
    return gasRequest<void>('students.deleteDocument', { id })
  },

  // ── Import / Export ──────────────────────────────────────────

  /**
   * Import siswa dari array data (hasil parse Excel di frontend).
   */
  async importBatch(rows: Partial<StudentFormData>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Tidak ada data siswa yang siap diimpor.')
    }

    const result = await gasRequest<unknown>(
      'students.importBatch',
      { rows },
      { timeout: 120_000 },
    )

    if (!result || typeof result !== 'object') {
      throw new Error('Response import dari server tidak valid.')
    }

    const payload = result as {
      success?: unknown
      failed?: unknown
      errors?: unknown
    }

    return {
      success: Number.isFinite(Number(payload.success)) ? Math.max(0, Number(payload.success)) : 0,
      failed: Number.isFinite(Number(payload.failed)) ? Math.max(0, Number(payload.failed)) : 0,
      errors: Array.isArray(payload.errors)
        ? payload.errors.map(message => String(message))
        : [],
    }
  },

  /**
   * Export data siswa (GAS mengembalikan array, frontend yang format ke Excel/PDF).
   */
  async exportData(filters: Partial<StudentFilters>): Promise<Student[]> {
    const students = await gasRequest<Student[]>('students.exportData', filters, { timeout: 60_000, retry404: 2 })
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
    return gasRequest('students.getStats', undefined, { retry404: 2 })
  },
}
