import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Classroom } from '@/types'
import { classroomsService } from '@/services'

export const useClassroomsStore = defineStore('classrooms', () => {
  const list = ref<Classroom[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)
  const currentSchoolYearId = ref<string>('')

  // Opsi untuk dropdown — seluruh kelas yang sudah di-fetch (tanpa filter schoolYear).
  // Digunakan oleh filter di StudentListView yang memang ingin tampilkan semua kelas.
  const classroomOptions = computed(() =>
    list.value.map(c => ({ value: c.id, label: c.name }))
  )

  // Opsi kelas aktif saja — digunakan di form yang butuh pilihan kelas aktif.
  const activeClassroomOptions = computed(() =>
    list.value
      .filter(c => c.isActive)
      .map(c => ({ value: c.id, label: c.name }))
  )

  const activeClassrooms = computed(() =>
    list.value.filter(c => c.isActive)
  )

  /**
   * Fetch kelas dari backend.
   *
   * BUG-07 FIX (revisi): Guard cache sebelumnya terlalu agresif — setelah fetch
   * pertama tanpa argumen, semua panggilan fetch() berikutnya tanpa argumen
   * selalu di-skip, bahkan saat schoolYear aktif sudah berubah.
   *
   * Aturan cache yang benar:
   * 1. Jika schoolYearId EKSPLISIT diberikan dan sama dengan yang sudah di-cache → skip.
   * 2. Jika TIDAK ada schoolYearId (fetch "semua") dan sudah initialized → skip,
   *    KECUALI dipanggil dengan forceRefresh=true.
   * 3. Jika schoolYearId BERBEDA dari yang di-cache → selalu fetch ulang.
   */
  async function fetch(schoolYearId?: string, forceRefresh = false): Promise<void> {
    // Normalisasi: undefined dan '' diperlakukan sama — artinya "tidak difilter"
    const normalizedId = schoolYearId ?? ''

    // Skip jika data untuk schoolYearId yang sama sudah ada dan tidak dipaksa refresh
    if (initialized.value && !forceRefresh && normalizedId === currentSchoolYearId.value) {
      return
    }

    isLoading.value = true
    try {
      // Kirim ke backend: kosong = ambil semua, ada nilai = filter per tahun
      list.value = await classroomsService.list(normalizedId || undefined)
      currentSchoolYearId.value = normalizedId
      initialized.value = true
    } catch {
      // Tangani di view — tidak lempar agar tidak crash komponen lain
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Paksa refresh ulang — reset cache dan fetch ulang dengan schoolYearId yang sama
   * atau dengan schoolYearId baru.
   */
  async function refresh(schoolYearId?: string): Promise<void> {
    await fetch(schoolYearId, true)
  }

  /**
   * Kembalikan opsi kelas untuk dropdown, difilter per schoolYearId jika diberikan.
   * Digunakan oleh komponen yang perlu filter reaktif tanpa re-fetch ke backend.
   */
  function getOptionsForYear(schoolYearId: string): { value: string; label: string }[] {
    if (!schoolYearId) return classroomOptions.value
    return list.value
      .filter(c => String(c.schoolYearId) === String(schoolYearId))
      .map(c => ({ value: c.id, label: c.name }))
  }

  function addClassroom(c: Classroom) {
    list.value.push(c)
  }

  function updateClassroom(updated: Classroom) {
    const idx = list.value.findIndex(c => c.id === updated.id)
    if (idx !== -1) list.value[idx] = updated
  }

  function removeClassroom(id: string) {
    list.value = list.value.filter(c => c.id !== id)
  }

  return {
    list,
    isLoading,
    initialized,
    currentSchoolYearId,
    classroomOptions,
    activeClassroomOptions,
    activeClassrooms,
    fetch,
    refresh,
    getOptionsForYear,
    addClassroom,
    updateClassroom,
    removeClassroom,
  }
})
