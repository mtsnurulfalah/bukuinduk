import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Student, StudentFilters } from '@/types'
import type { PaginatedResponse } from '@/types'
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
    isLoading.value = true
    error.value = null
    try {
      const params = { ...filters.value, ...overrides }
      // Hapus key kosong agar tidak dikirim ke GAS
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      ) as StudentFilters

      const res = await studentsService.list(cleaned)
      list.value = res.items
      total.value = res.total
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat data siswa.'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDetail(id: string): Promise<Student | null> {
    isLoadingDetail.value = true
    error.value = null
    try {
      const student = await studentsService.getFull(id)
      current.value = student
      return student
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat data siswa.'
      // BUG-19 FIX: Lempar ulang error agar caller (view) bisa catch dan
      // menampilkan error state. Sebelumnya silent fail menyebabkan halaman kosong
      // tanpa loading, tanpa error, karena view mengecek error.value via try/catch
      // yang tidak pernah masuk blok catch.
      throw new Error(error.value ?? 'Gagal memuat data siswa.')
    } finally {
      isLoadingDetail.value = false
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
    list.value = list.value.filter(s => s.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  function clearCurrent() {
    current.value = null
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
