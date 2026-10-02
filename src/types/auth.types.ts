import type { Role } from '@/constants'

export interface User {
  id: string
  username: string
  fullName: string
  email: string
  role: Role
  isActive: boolean
  avatarUrl?: string
  teacherId?: string   // jika role teacher, link ke data guru
  lastLogin?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
