// Struktur standar semua response dari GAS backend
export interface ApiResponse<T = unknown> {
  status: number
  data?: T
  error?: string
  message?: string
}

// Respon list dengan pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Payload request ke GAS
export interface GasRequest<T = unknown> {
  action: string
  payload?: T
  token?: string
}

// Statistik untuk dashboard
export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  newStudentsThisYear: number
  totalTeachers: number
  totalClassrooms: number
  maleStudents: number
  femaleStudents: number
  graduatedStudents: number
  transferredStudents: number
}

export interface DataCompletenessSection {
  key: string
  label: string
  percent: number
  completed: number
  missing: number
}

export interface DataCompleteness {
  totalStudents: number
  completeStudents: number
  needsAttention: number
  overallPercent: number
  sections: DataCompletenessSection[]
  insights: string[]
  generatedAt: string
}

export interface ClassroomStats {
  classroomId: string
  classroomName: string
  gradeName: string
  totalStudents: number
  maleStudents: number
  femaleStudents: number
}

export type VerificationStatus = 'unverified' | 'verified' | 'needs_revision'

export interface StudentVerification {
  id: string
  studentId: string
  section: string
  label: string
  status: VerificationStatus
  verifiedBy?: string
  verifiedAt?: string
  notes?: string
}

export type StudentDocumentStatus = 'available' | 'needs_update'

export interface StudentDocument {
  id: string
  studentId: string
  documentType: string
  documentName: string
  documentNumber?: string
  fileUrl?: string
  status: StudentDocumentStatus
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resourceType: string
  resourceId?: string
  description: string
  ipAddress?: string
  createdAt: string
}

export interface AppSettings {
  schoolName: string
  schoolNpsn?: string
  schoolAddress?: string
  schoolPhone?: string
  schoolEmail?: string
  schoolWebsite?: string
  principalName?: string
  principalNip?: string
  logoUrl?: string
  academicYear?: string
  [key: string]: string | undefined
}
