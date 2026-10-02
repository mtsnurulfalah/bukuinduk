import { gasRequest } from './api'
import type { AppSettings } from '@/types'

export const settingsService = {
  async get(): Promise<AppSettings> {
    return gasRequest<AppSettings>('settings.get', undefined, { retry404: 2 })
  },

  async update(data: Partial<AppSettings>): Promise<AppSettings> {
    return gasRequest<AppSettings>('settings.update', data)
  },

  /** Backup: GAS export semua sheet ke array JSON */
  async exportBackup(): Promise<Record<string, unknown[]>> {
    return gasRequest<Record<string, unknown[]>>('settings.exportBackup', undefined, {
      timeout: 120_000,
    })
  },
}
