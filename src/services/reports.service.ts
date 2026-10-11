import { gasRequest } from './api'
import type { DashboardStats, ClassroomStats, AuditLog, DataCompleteness, IntelligenceReport } from '@/types'
import type { PaginatedResponse } from '@/types'

export interface ReportFilters {
  schoolYearId?: string
  classroomId?: string
  gender?: string
  status?: string
  startDate?: string
  endDate?: string
}

export const reportsService = {
  /** Statistik utama untuk dashboard */
  async getDashboardStats(schoolYearId?: string): Promise<DashboardStats> {
    return gasRequest<DashboardStats>('reports.dashboardStats', { schoolYearId }, { retryRead: 2 })
  },

  /** Kualitas & kelengkapan data siswa aktif */
  async getDataCompleteness(): Promise<DataCompleteness> {
    return gasRequest<DataCompleteness>('reports.dataCompleteness', undefined, { retryRead: 3, timeout: 90_000 })
  },

  /** Intelligence Center — temuan otomatis dan antrian tindak lanjut */
  async getIntelligence(): Promise<IntelligenceReport> {
    return gasRequest<IntelligenceReport>('reports.intelligence', undefined, { retryRead: 2 })
  },

  /** Statistik per kelas */
  async getClassroomStats(filters?: string | Pick<ReportFilters, 'schoolYearId' | 'classroomId'>): Promise<ClassroomStats[]> {
    const payload = typeof filters === 'string' || filters === undefined
      ? { schoolYearId: filters }
      : filters
    return gasRequest<ClassroomStats[]>('reports.classroomStats', payload, { retryRead: 2 })
  },

  /** Distribusi jenis kelamin per kelas */
  async getGenderDistribution(filters?: ReportFilters) {
    return gasRequest<{ label: string; male: number; female: number }[]>(
      'reports.genderDistribution', filters, { retryRead: 2 }
    )
  },

  /** Distribusi usia siswa */
  async getAgeDistribution(filters?: ReportFilters) {
    return gasRequest<{ ageGroup: string; count: number }[]>(
      'reports.ageDistribution', filters, { retryRead: 2 }
    )
  },

  /** Distribusi status siswa */
  async getStatusDistribution(filters?: ReportFilters) {
    return gasRequest<{ status: string; label: string; count: number }[]>(
      'reports.statusDistribution', filters, { retryRead: 2 }
    )
  },

  /** Tren penerimaan siswa per tahun pelajaran */
  async getEnrollmentTrend() {
    return gasRequest<{ schoolYear: string; count: number }[]>('reports.enrollmentTrend', undefined, { retryRead: 2 })
  },

  /** Data lengkap untuk export laporan siswa */
  async getStudentReport(filters: ReportFilters) {
    return gasRequest<Record<string, unknown>[]>('reports.studentReport', filters, { timeout: 60_000, retryRead: 2 })
  },

  /** Laporan rekapitulasi per kelas */
  async getClassReport(filters: ReportFilters) {
    return gasRequest<Record<string, unknown>[]>('reports.classReport', filters, { timeout: 60_000, retryRead: 2 })
  },

  // ── Audit Log ─────────────────────────────────────────────────

  async getAuditLogs(params?: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<AuditLog>> {
    return gasRequest<PaginatedResponse<AuditLog>>('audit.list', params, { retryRead: 2 })
  },
}
