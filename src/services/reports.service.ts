import { gasRequest } from './api'
import type { DashboardStats, ClassroomStats, AuditLog } from '@/types'
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
    return gasRequest<DashboardStats>('reports.dashboardStats', { schoolYearId })
  },

  /** Statistik per kelas */
  async getClassroomStats(schoolYearId?: string): Promise<ClassroomStats[]> {
    return gasRequest<ClassroomStats[]>('reports.classroomStats', { schoolYearId })
  },

  /** Distribusi jenis kelamin per kelas */
  async getGenderDistribution(filters?: ReportFilters) {
    return gasRequest<{ label: string; male: number; female: number }[]>(
      'reports.genderDistribution', filters
    )
  },

  /** Distribusi usia siswa */
  async getAgeDistribution(filters?: ReportFilters) {
    return gasRequest<{ ageGroup: string; count: number }[]>(
      'reports.ageDistribution', filters
    )
  },

  /** Distribusi status siswa */
  async getStatusDistribution(filters?: ReportFilters) {
    return gasRequest<{ status: string; label: string; count: number }[]>(
      'reports.statusDistribution', filters
    )
  },

  /** Tren penerimaan siswa per tahun pelajaran */
  async getEnrollmentTrend() {
    return gasRequest<{ schoolYear: string; count: number }[]>('reports.enrollmentTrend')
  },

  /** Data lengkap untuk export laporan siswa */
  async getStudentReport(filters: ReportFilters) {
    return gasRequest<Record<string, unknown>[]>('reports.studentReport', filters, { timeout: 60_000 })
  },

  /** Laporan rekapitulasi per kelas */
  async getClassReport(filters: ReportFilters) {
    return gasRequest<Record<string, unknown>[]>('reports.classReport', filters, { timeout: 60_000 })
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
    return gasRequest<PaginatedResponse<AuditLog>>('audit.list', params)
  },
}
