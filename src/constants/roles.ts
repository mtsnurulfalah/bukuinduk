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

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  principal: 'bg-blue-100 text-blue-700',
  teacher: 'bg-green-100 text-green-700',
}
