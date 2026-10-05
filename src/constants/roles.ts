export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  principal: 'Kepala Madrasah',
  teacher: 'Guru',
}

