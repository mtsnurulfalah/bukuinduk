import { ref } from 'vue'
import { reportsService } from '@/services'
import type { ClassroomStats, DashboardStats } from '@/types'

export function useDashboardData() {
  const stats = ref<DashboardStats | null>(null)
  const classStats = ref<ClassroomStats[]>([])
  const isLoadingStats = ref(true)
  const isLoadingClass = ref(true)
  const errorStats = ref('')
  const errorClass = ref('')

  let latestRequestId = 0

  async function load(schoolYearId?: string): Promise<void> {
    const requestId = ++latestRequestId

    errorStats.value = ''
    errorClass.value = ''
    isLoadingStats.value = true
    isLoadingClass.value = true

    const loadStats = async () => {
      try {
        const value = await reportsService.getDashboardStats(schoolYearId)
        if (requestId === latestRequestId) stats.value = value
      } catch (err: unknown) {
        if (requestId === latestRequestId) {
          errorStats.value = err instanceof Error
            ? err.message
            : 'Gagal memuat statistik dashboard.'
        }
      } finally {
        if (requestId === latestRequestId) isLoadingStats.value = false
      }
    }

    const loadClasses = async () => {
      try {
        const value = await reportsService.getClassroomStats(schoolYearId)
        if (requestId === latestRequestId) classStats.value = value
      } catch (err: unknown) {
        if (requestId === latestRequestId) {
          errorClass.value = err instanceof Error
            ? err.message
            : 'Gagal memuat data kelas.'
        }
      } finally {
        if (requestId === latestRequestId) isLoadingClass.value = false
      }
    }

    await Promise.allSettled([loadStats(), loadClasses()])
  }

  return {
    stats,
    classStats,
    isLoadingStats,
    isLoadingClass,
    errorStats,
    errorClass,
    load,
  }
}
