export interface Grade {
  id: string
  name: string   // "Kelas 7", "Kelas 8", "Kelas 9"
  level: number  // 7, 8, 9
  description?: string
}

export interface SchoolYear {
  id: string
  name: string       // "2024/2025"
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface Classroom {
  id: string
  name: string          // "7A", "8B", "9 IPA 1"
  gradeId: string
  gradeName?: string
  schoolYearId: string
  schoolYearName?: string
  homeroomTeacherId?: string
  homeroomTeacherName?: string
  capacity?: number
  isActive: boolean
  studentCount?: number
  createdAt: string
}

export interface ClassroomFormData {
  name: string
  gradeId: string
  schoolYearId: string
  homeroomTeacherId?: string
  capacity?: number
  isActive: boolean
}

export interface SchoolYearFormData {
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}
