import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SchoolYear, Grade } from '@/types'
import { classroomsService } from '@/services'

export const useSchoolYearStore = defineStore('schoolYear', () => {
  const schoolYears = ref<SchoolYear[]>([])
  const grades = ref<Grade[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)

  const activeSchoolYear = computed<SchoolYear | null>(
    () => schoolYears.value.find(sy => sy.isActive) ?? null
  )

  const activeSchoolYearName = computed(() => activeSchoolYear.value?.name ?? '')

  const schoolYearOptions = computed(() =>
    schoolYears.value.map(sy => ({
      value: sy.id,
      label: sy.name + (sy.isActive ? ' (Aktif)' : ''),
    }))
  )

  const gradeOptions = computed(() =>
    grades.value.map(g => ({ value: g.id, label: g.name }))
  )

  async function fetch(): Promise<void> {
    if (initialized.value) return
    isLoading.value = true
    try {
      // Jalankan keduanya paralel, tapi tangani masing-masing secara independen
      // agar kegagalan fetch grades tidak memblokir schoolYears (dan sebaliknya).
      const results = await Promise.allSettled([
        classroomsService.listSchoolYears(),
        classroomsService.listGrades(),
      ])

      if (results[0].status === 'fulfilled') {
        schoolYears.value = results[0].value
      }
      if (results[1].status === 'fulfilled') {
        grades.value = results[1].value
      }

      // Tandai initialized jika minimal schoolYears berhasil.
      // grades yang kosong/gagal bisa di-retry via refresh().
      if (results[0].status === 'fulfilled') {
        initialized.value = true
      }
    } catch {
      // Tidak perlu catch — Promise.allSettled tidak pernah reject
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch ulang hanya data grades tanpa reset seluruh store.
   * Digunakan saat gradeOptions kosong setelah fetch() berhasil
   * (misalnya grades gagal sementara schoolYears sukses).
   */
  async function fetchGrades(): Promise<void> {
    try {
      grades.value = await classroomsService.listGrades()
    } catch {
      // Tangani di caller
    }
  }

  async function refresh(): Promise<void> {
    initialized.value = false
    await fetch()
  }

  function addSchoolYear(sy: SchoolYear) {
    schoolYears.value.push(sy)
  }

  function updateSchoolYear(updated: SchoolYear) {
    const idx = schoolYears.value.findIndex(s => s.id === updated.id)

    // BUG-08 FIX: Jika id tidak ditemukan di list (misalnya data belum di-fetch),
    // tambahkan sebagai item baru daripada silent fail.
    if (idx !== -1) {
      schoolYears.value[idx] = updated
    } else {
      schoolYears.value.push(updated)
    }

    // Jika tahun ini di-set aktif, nonaktifkan semua yang lain
    if (updated.isActive) {
      schoolYears.value = schoolYears.value.map(s =>
        s.id === updated.id ? s : { ...s, isActive: false }
      )
    }
  }

  function removeSchoolYear(id: string) {
    schoolYears.value = schoolYears.value.filter(s => s.id !== id)
  }

  // ── Grade mutations ───────────────────────────────────────────
  // Digunakan oleh GradeListView setelah create/update/delete agar
  // gradeOptions computed diperbarui secara reaktif di seluruh app
  // (ClassroomFormView, StudentFormView, dll.) tanpa perlu refetch.

  function addGrade(grade: Grade) {
    grades.value.push(grade)
    grades.value.sort((a, b) => a.level - b.level)
  }

  function updateGrade(updated: Grade) {
    const idx = grades.value.findIndex(g => g.id === updated.id)
    if (idx !== -1) {
      grades.value[idx] = updated
    } else {
      grades.value.push(updated)
    }
    grades.value.sort((a, b) => a.level - b.level)
  }

  function removeGrade(id: string) {
    grades.value = grades.value.filter(g => g.id !== id)
  }

  return {
    schoolYears,
    grades,
    isLoading,
    initialized,
    activeSchoolYear,
    activeSchoolYearName,
    schoolYearOptions,
    gradeOptions,
    fetch,
    fetchGrades,
    refresh,
    addSchoolYear,
    updateSchoolYear,
    removeSchoolYear,
    addGrade,
    updateGrade,
    removeGrade,
  }
})
