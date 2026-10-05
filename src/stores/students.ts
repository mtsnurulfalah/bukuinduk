import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Student, StudentFilters } from '@/types'
import { studentsService } from '@/services'
import { DEFAULT_PAGE_SIZE } from '@/constants'

export const useStudentsStore = defineStore('students', () => {
  // ── State ────────────────────────────────────────────────────
  const list = ref<Student[]>([])
  const current = ref<Student | null>(null)
  const total = ref(0)
  const isLoading = ref(false)
  const isLoadingDetail = ref(false)
  const error = ref<string | null>(null)

  // Token request mencegah respons lama menimpa hasil terbaru saat filter berubah cepat.
  let listRequestVersion = 0
  let detailRequestVersion = 0

  // Filters yang aktif saat ini (dipertahankan saat navigasi back)
  const filters = ref<StudentFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
    gender: '',
    classroomId: '',
    schoolYearId: '',
    sortBy: 'fullName',
    sortDir: 'asc',
  })

  // ── Actions ──────────────────────────────────────────────────

  async function fetchList(overrides?: Partial<StudentFilters>): Promise<void> {
    const requestVersion = ++listRequestVersion
    if (overrides && Object.keys(overrides).length) {
      filters.value = { ...filters.value, ...overrides }
    }
    isLoading.value = true
    error.value = null
    try {
      const cleaned = Object.fromEntries(
        Object.entries(filters.value).filter(([, v]) => v !== '' && v != null)
      ) as StudentFilters

      const res = await studentsService.list(cleaned)
      if (requestVersion !== listRequestVersion) return
      list.value = res.items
      total.value = res.total
    } catch (err: unknown) {
      if (requestVersion !== listRequestVersion) return
      error.value = err instanceof Error ? err.message : 'Gagal memuat data siswa.'
    } finally {
      if (requestVersion === listRequestVersion) isLoading.value = false
    }
  }

  async function fetchDetail(id: string): Promise<Student | null> {
    const requestVersion = ++detailRequestVersion
    isLoadingDetail.value = true
    error.value = null
    try {
      const student = await studentsService.getFull(id)
      // Hanya request terbaru yang boleh memperbarui state global.
      if (requestVersion === detailRequestVersion) {
        current.value = student
      }
      return student
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data siswa.'
      if (requestVersion === detailRequestVersion) error.value = message
      // Caller tetap menerima error agar dapat menampilkan error state.
      throw new Error(message)
    } finally {
      if (requestVersion === detailRequestVersion) isLoadingDetail.value = false
    }
  }

  function setFilters(newFilters: Partial<StudentFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      search: '',
      status: '',
      gender: '',
      classroomId: '',
      schoolYearId: '',
      sortBy: 'fullName',
      sortDir: 'asc',
    }
  }

  /** Optimistic update — perbarui item di list tanpa refetch */
  function updateInList(updated: Student) {
    const idx = list.value.findIndex(s => s.id === updated.id)
    if (idx !== -1) list.value[idx] = updated
    if (current.value?.id === updated.id) current.value = updated
  }

  /** Hapus item dari list (setelah arsip/delete) */
  function removeFromList(id: string) {
    const previousLength = list.value.length
    list.value = list.value.filter(s => s.id !== id)

    // Jangan kurangi total jika ID tidak ditemukan (misalnya respons archive
    // datang terlambat atau list sudah berubah karena request lain).
    if (list.value.length !== previousLength) {
      total.value = Math.max(0, total.value - 1)
    }
  }

  function clearCurrent() {
    // Batalkan efek request detail yang masih berjalan.
    detailRequestVersion++
    current.value = null
    isLoadingDetail.value = false
  }

  return {
    list,
    current,
    total,
    isLoading,
    isLoadingDetail,
    error,
    filters,
    fetchList,
    fetchDetail,
    setFilters,
    resetFilters,
    updateInList,
    removeFromList,
    clearCurrent,
  }
})
