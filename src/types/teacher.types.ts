export interface Teacher {
  id: string
  userId?: string
  nip?: string
  nuptk?: string
  fullName: string
  gender?: 'L' | 'P'
  birthPlace?: string
  birthDate?: string
  religion?: string
  address?: string
  phone?: string
  email?: string
  educationLevel?: string
  major?: string
  status: 'active' | 'inactive'
  joinDate?: string
  photoUrl?: string
  createdAt: string
  updatedAt: string

  // Kelas yang diampu (opsional)
  classrooms?: { id: string; name: string; schoolYearName: string }[]
}

export interface TeacherFormData {
  nip?: string
  nuptk?: string
  fullName: string
  gender?: string
  birthPlace?: string
  birthDate?: string
  religion?: string
  address?: string
  phone?: string
  email?: string
  educationLevel?: string
  major?: string
  joinDate?: string
  status: string
}
