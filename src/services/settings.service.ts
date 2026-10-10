import { gasRequest } from './api'
import type { AppSettings } from '@/types'

export type BackupRestoreMode = 'merge' | 'replace'
export type BackupConflictStrategy = 'keepExisting' | 'overwriteExisting'

export interface BackupRestoreRequestOptions {
  selectedSheets: string[]
  mode: BackupRestoreMode
  conflictStrategy: BackupConflictStrategy
}

export interface BackupRestoreSheetPreview {
  sheetName: string
  backupRecords: number
  currentRecords: number
  added: number
  updated: number
  skipped: number
  deleted: number
  finalRecords: number
}

export interface BackupRestorePreview {
  fingerprint: string
  mode: BackupRestoreMode
  conflictStrategy: BackupConflictStrategy | 'none'
  selectedSheets: string[]
  sheets: BackupRestoreSheetPreview[]
  totals: Omit<BackupRestoreSheetPreview, 'sheetName'>
  generatedAt: string
}

export interface BackupRestoreSheetResult {
  added: number
  updated: number
  skipped: number
  deleted: number
  finalRecords: number
}

export interface BackupRestoreResult {
  restoredAt: string
  mode: BackupRestoreMode
  conflictStrategy: BackupConflictStrategy | 'none'
  restoredSheets: string[]
  preservedSheets: string[]
  unselectedSheets: string[]
  counts: Record<string, BackupRestoreSheetResult>
  totalRecords: number
}

export type BackupHistorySource = 'manual' | 'scheduled'
export type BackupHistoryStatus = 'success' | 'failed'

export interface BackupHistoryItem {
  id: string
  fileName: string
  generatedAt: string
  source: BackupHistorySource
  sheetCount: number
  recordCount: number
  sizeBytes: number
  status: BackupHistoryStatus
  error: string
}

export interface BackupAutomationOptions {
  enabled: boolean
  frequency: 'daily' | 'weekly'
  retention: 5 | 10 | 20
}

export interface BackupAutomationState extends BackupAutomationOptions {
  timezone: string
  triggerInstalled: boolean
  lastRun: BackupHistoryItem | null
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    return gasRequest<AppSettings>('settings.get', undefined, { retry404: 2 })
  },

  async update(data: Partial<AppSettings>): Promise<AppSettings> {
    return gasRequest<AppSettings>('settings.update', data)
  },

  /** Backup: GAS export semua sheet ke array JSON */
  async exportBackup(): Promise<Record<string, unknown>> {
    return gasRequest<Record<string, unknown[]>>('settings.exportBackup', undefined, {
      timeout: 120_000,
    })
  },

  /** Buat snapshot JSON privat di Google Drive dan simpan metadata riwayat. */
  async createBackupSnapshot(): Promise<BackupHistoryItem> {
    return gasRequest<BackupHistoryItem>('settings.createBackupSnapshot', undefined, { timeout: 120_000 })
  },

  async listBackupHistory(): Promise<BackupHistoryItem[]> {
    return gasRequest<BackupHistoryItem[]>('settings.listBackupHistory', undefined, { timeout: 120_000 })
  },

  async getBackupAutomation(): Promise<BackupAutomationState> {
    return gasRequest<BackupAutomationState>('settings.getBackupAutomation', undefined, { timeout: 30_000 })
  },

  async configureBackupAutomation(options: BackupAutomationOptions): Promise<BackupAutomationState> {
    return gasRequest<BackupAutomationState>('settings.configureBackupAutomation', options, { timeout: 60_000 })
  },

  async readBackupSnapshot(historyId: string): Promise<Record<string, unknown>> {
    return gasRequest<Record<string, unknown>>('settings.readBackupSnapshot', { historyId }, { timeout: 120_000 })
  },

  /** Hitung pratinjau restore di backend tanpa menulis ke Spreadsheet. */
  async previewRestore(
    backup: Record<string, unknown>,
    options: BackupRestoreRequestOptions,
  ): Promise<BackupRestorePreview> {
    return gasRequest<BackupRestorePreview>('settings.previewRestore', {
      backup,
      selectedSheets: options.selectedSheets,
      mode: options.mode,
      conflictStrategy: options.conflictStrategy,
    }, { timeout: 120_000 })
  },

  /** Terapkan rencana restore yang sudah dipratinjau; backend memvalidasi ulang fingerprint. */
  async restoreBackup(
    backup: Record<string, unknown>,
    options: BackupRestoreRequestOptions & {
      expectedFingerprint: string
      confirmation: 'GABUNGKAN' | 'GANTI'
    },
  ): Promise<BackupRestoreResult> {
    return gasRequest<BackupRestoreResult>('settings.restoreBackup', {
      backup,
      selectedSheets: options.selectedSheets,
      mode: options.mode,
      conflictStrategy: options.conflictStrategy,
      expectedFingerprint: options.expectedFingerprint,
      confirmation: options.confirmation,
    }, { timeout: 120_000 })
  },
}
