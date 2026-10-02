import { TOKEN_KEY, USER_KEY } from '@/constants'
import type { User } from '@/types'

/**
 * Wrapper localStorage yang aman (tidak crash jika storage penuh/private mode)
 */
const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // silent fail
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // silent fail
    }
  },
  clear(): void {
    try {
      localStorage.clear()
    } catch {
      // silent fail
    }
  },
}

// ─── Auth Token ──────────────────────────────────────────────

export function getToken(): string | null {
  return storage.get(TOKEN_KEY)
}

export function setToken(token: string): void {
  storage.set(TOKEN_KEY, token)
}

export function removeToken(): void {
  storage.remove(TOKEN_KEY)
}

// ─── User ─────────────────────────────────────────────────────

export function getStoredUser(): User | null {
  const raw = storage.get(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  storage.set(USER_KEY, JSON.stringify(user))
}

export function removeStoredUser(): void {
  storage.remove(USER_KEY)
}

// ─── Clear Auth ───────────────────────────────────────────────

export function clearAuth(): void {
  removeToken()
  removeStoredUser()
}
