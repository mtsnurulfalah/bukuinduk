export interface Student {
  id: string
  nis: string
  nisn: string
  nik?: string
  fullName: string
  nickname?: string
  gender: 'L' | 'P'
  birthPlace?: string
  birthDate?: string
  religion?: string
  nationality: string

  // Status keluarga
  familyStatus?: string
  childOrder?: number
  siblingsCount?: number

  // Alamat
  address?: string
  rtRw?: string
  village?: string
  district?: string
  city?: string
  province?: string
  postalCode?: string

  // Kontak
  phone?: string
  email?: string

  // Status
  status: 'active' | 'inactive' | 'graduated' | 'transferred' | 'dropped_out'
  entryDate?: string
  exitDate?: string
  exitReason?: string

  photoUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: string

  // Relasi (opsional, tergantung endpoint)
  parents?: StudentParent[]
  health?: StudentHealth
  educationHistory?: StudentEducationHistory[]
  currentEnrollment?: StudentEnrollment
}

export interface StudentParent {
  id: string
  studentId: string
  relationship: 'father' | 'mother' | 'guardian'
  fullName?: string
  nik?: string
  birthPlace?: string
  birthDate?: string
  religion?: string
  education?: string
  occupation?: string
  incomeRange?: string
  phone?: string
  address?: string
  isAlive: boolean
}

export interface StudentHealth {
  id: string
  studentId: string
  bloodType?: string
  heightCm?: number
  weightKg?: number
  specialNeeds?: string
  healthNotes?: string
  allergies?: string
}

export interface StudentEducationHistory {
  id: string
  studentId: string
  level?: string
  schoolName?: string
  graduationYear?: number
  certificateNumber?: string
  participantNumber?: string
}

export interface StudentEnrollment {
  id: string
  studentId: string
  classroomId: string
  classroomName: string
  schoolYearId: string
  schoolYearName: string
  entryDate: string
  exitDate?: string
  status: string
  notes?: string
}

export interface StudentFilters {
  search?: string
  status?: string
  gender?: string
  classroomId?: string
  schoolYearId?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface StudentFormData {
  // Identitas
  nis: string
  nisn: string
  nik?: string
  fullName: string
  nickname?: string
  gender: string
  birthPlace: string
  birthDate: string
  religion: string
  nationality: string
  familyStatus?: string
  childOrder?: number
  siblingsCount?: number

  // Alamat
  address: string
  rtRw?: string
  village?: string
  district?: string
  city?: string
  province?: string
  postalCode?: string

  // Kontak
  phone?: string
  email?: string

  // Pendidikan masuk
  entryDate: string
  classroomId?: string
  schoolYearId?: string

  notes?: string

  // Parents
  father?: Partial<StudentParent>
  mother?: Partial<StudentParent>
  guardian?: Partial<StudentParent>

  // Kesehatan
  health?: Partial<StudentHealth>

  // Riwayat pendidikan sebelumnya
  educationHistory?: Partial<StudentEducationHistory>
}
