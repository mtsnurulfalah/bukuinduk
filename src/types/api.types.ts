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

export interface ClassroomStats {
  classroomId: string
  classroomName: string
  gradeName: string
  totalStudents: number
  maleStudents: number
  femaleStudents: number
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
