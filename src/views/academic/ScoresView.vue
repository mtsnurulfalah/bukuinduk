<template>
  <div class="w-full min-w-0 space-y-5 pb-6">
    <PageHeader
      title="Nilai Siswa"
      subtitle="Input nilai per siswa, mata pelajaran, semester, dan tahun pelajaran."
      :breadcrumbs="[{ label: 'Akademik' }, { label: 'Nilai Siswa' }]"
    />

    <BaseCard>
      <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BaseSelect
          v-model="schoolYearId"
          label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions"
          required
          :disabled="isSaving || isRetrying || isLoading"
          @update:model-value="reloadContext"
        />

        <BaseSelect
          v-model="semester"
          label="Semester"
          :options="semesterOptions"
          required
          :disabled="isSaving || isRetrying || isLoading"
          @update:model-value="loadScores"
        />

        <BaseSelect
          v-model="classroomId"
          label="Kelas"
          :options="classroomOptions"
          clearable
          placeholder="Semua kelas"
          :disabled="isSaving || isRetrying || isLoading || !schoolYearId"
          @update:model-value="loadStudentsAndScores"
        />

        <div class="flex min-w-0 items-end">
          <BaseButton
            class="w-full"
            :loading="isLoading"
            loading-text="Memuat..."
            :disabled="isSaving || isRetrying || !schoolYearId"
            @click="loadStudentsAndScores"
          >
            <RefreshCw class="h-4 w-4" />
            Muat Data
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseRetry
      v-if="error"
      title="Data nilai gagal dimuat"
      :message="error"
      :loading="isRetrying"
      @retry="retryLoad"
    />

    <BaseCard
      v-else
      title="Daftar Nilai"
      :padding="false"
      class="overflow-hidden"
    >
      <div class="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-700">
              {{ filteredStudents.length }} siswa · {{ subjects.length }} mata pelajaran
            </p>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-400">
              {{ selectedClassroomLabel }} · Semester {{ semester }}
              <span v-if="changedCount"> · {{ changedCount }} perubahan belum disimpan</span>
            </p>
          </div>

          <div class="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto">
            <div class="relative min-w-0 flex-1 sm:min-w-[18rem] lg:w-72 lg:flex-none">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                v-model="studentSearch"
                type="search"
                placeholder="Cari nama, NIS, atau NISN..."
                aria-label="Cari siswa"
                :disabled="isSaving || isRetrying || isLoading"
                class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50"
              />
            </div>

            <BaseButton
              :loading="isSaving"
              loading-text="Menyimpan..."
              :disabled="!changedCount || isSaving || isRetrying || isLoading"
              class="w-full sm:w-auto"
              @click="saveAll"
            >
              <Save class="h-4 w-4" />
              Simpan
              <span v-if="changedCount">({{ changedCount }})</span>
            </BaseButton>
          </div>
        </div>

        <p
          v-if="saveFeedback"
          :class="[
            'mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed',
            saveFeedbackIsError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-700',
          ]"
          role="status"
        >
          {{ saveFeedback }}
        </p>
      </div>

      <div
        v-if="isLoading"
        class="space-y-2 p-5"
        aria-live="polite"
        aria-busy="true"
      >
        <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
      </div>

      <div
        v-else-if="!schoolYearId"
        class="px-5 py-12 text-center text-sm text-slate-400"
      >
        Pilih tahun pelajaran terlebih dahulu.
      </div>

      <div
        v-else-if="!subjects.length"
        class="px-5 py-12 text-center"
      >
        <BookOpen class="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-slate-600">
          Belum ada mata pelajaran aktif.
        </p>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          Tambahkan atau aktifkan mata pelajaran pada tahun pelajaran ini sebelum memasukkan nilai.
        </p>
        <RouterLink
          to="/subjects"
          class="mt-3 inline-flex rounded-lg px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50"
        >
          Kelola mata pelajaran
        </RouterLink>
      </div>

      <div
        v-else-if="!students.length"
        class="px-5 py-12 text-center text-sm text-slate-400"
      >
        Tidak ada siswa pada kelas yang dipilih.
      </div>

      <div
        v-else-if="!filteredStudents.length"
        class="px-5 py-12 text-center text-sm text-slate-400"
      >
        Siswa tidak ditemukan. Coba ubah kata kunci pencarian.
      </div>

      <template v-else>
        <div
          class="border-b border-slate-100 px-4 py-2 text-[11px] text-slate-400 lg:hidden"
          aria-hidden="true"
        >
          Geser tabel ke samping untuk melihat semua mata pelajaran.
        </div>

        <div class="max-w-full overflow-x-auto overscroll-x-contain">
          <table class="w-full min-w-[760px] table-fixed text-sm">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th
                  scope="col"
                  class="sticky left-0 z-20 w-60 border-r border-slate-100 bg-slate-50 px-4 py-3 text-left font-semibold"
                >
                  Siswa
                </th>

                <th
                  v-for="subject in subjects"
                  :key="subject.id"
                  scope="col"
                  class="w-[7.5rem] px-2 py-3 text-center font-medium"
                >
                  <span class="block break-words leading-snug text-slate-700">
                    {{ subject.shortName || subject.name }}
                  </span>
                  <span
                    v-if="subject.code"
                    class="mt-0.5 block break-all font-mono text-[10px] text-slate-400"
                  >
                    {{ subject.code }}
                  </span>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-50">
              <tr
                v-for="student in pagedStudents"
                :key="student.id"
                class="align-top transition-colors hover:bg-slate-50"
              >
                <th
                  scope="row"
                  class="sticky left-0 z-10 w-60 border-r border-slate-100 bg-white px-4 py-3 text-left"
                >
                  <p class="break-words font-medium leading-snug text-slate-800">
                    {{ student.fullName }}
                  </p>
                  <p class="mt-0.5 font-mono text-xs text-slate-400">
                    {{ student.nis || 'Tanpa NIS' }}
                  </p>
                  <p class="mt-0.5 break-words text-[11px] text-slate-400">
                    {{ student.classroomName || '—' }}
                  </p>
                </th>

                <td
                  v-for="subject in subjects"
                  :key="subject.id"
                  class="px-2 py-3"
                >
                  <input
                    v-model="scoreMap[scoreKey(student.id, subject.id)]"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    class="mx-auto block w-full max-w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-center text-sm font-semibold tabular-nums text-slate-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    :aria-label="'Nilai ' + student.fullName + ' - ' + subject.name"
                    @input="normalizeScoreInput(student.id, subject.id)"
                  />
                  <p class="mt-1 text-center text-[10px] font-medium text-slate-400">
                    {{ predicateFor(scoreMap[scoreKey(student.id, subject.id)]) }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="totalStudentPages > 1"
          class="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p class="text-xs text-slate-400">
            Menampilkan {{ pageStartIndex + 1 }}–{{ pageEndIndex }} dari {{ filteredStudents.length }} siswa
          </p>

          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="currentStudentPage <= 1 || isSaving || isRetrying"
              aria-label="Halaman sebelumnya"
              @click="goToStudentPage(currentStudentPage - 1)"
            >
              <span aria-hidden="true">‹</span>
              <span class="hidden sm:inline">Sebelumnya</span>
            </BaseButton>

            <span class="min-w-20 text-center text-xs font-medium text-slate-600">
              {{ currentStudentPage }} / {{ totalStudentPages }}
            </span>

            <BaseButton
              variant="outline"
              size="sm"
              :disabled="currentStudentPage >= totalStudentPages || isSaving || isRetrying"
              aria-label="Halaman berikutnya"
              @click="goToStudentPage(currentStudentPage + 1)"
            >
              <span class="hidden sm:inline">Berikutnya</span>
              <span aria-hidden="true">›</span>
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import {
  BookOpen,
  RefreshCw,
  Save,
  Search,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { PageHeader } from '@/components/shared'
import {
  BaseButton,
  BaseCard,
  BaseRetry,
  BaseSelect,
  BaseSkeleton,
} from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useAuthStore } from '@/stores/auth'
import {
  classroomsService,
  gradesService,
  studentsService,
  subjectsService,
} from '@/services'
import { toast } from 'vue-sonner'
import type {
  Classroom,
  Student,
  StudentGrade,
  Subject,
} from '@/types'

type ScoreBatchRow = {
  studentId: string
  schoolYearId: string
  semester: 1 | 2
  subjectId: string
  score?: number
}

const schoolYearStore = useSchoolYearStore()
const authStore = useAuthStore()

const schoolYearId = ref('')
const semester = ref<'1' | '2'>('1')
const classroomId = ref('')
const classrooms = ref<Classroom[]>([])
const subjects = ref<Subject[]>([])
const students = ref<Student[]>([])
const grades = ref<StudentGrade[]>([])

const scoreMap = reactive<Record<string, string>>({})
const originalMap = reactive<Record<string, string>>({})

const isLoading = ref(false)
const isSaving = ref(false)
const isRetrying = ref(false)
const error = ref('')
const saveFeedback = ref('')
const saveFeedbackIsError = ref(false)
const studentSearch = ref('')
const studentPage = ref(1)

const studentPageSize = 20
let loadVersion = 0
let isMounted = false

const semesterOptions = [
  { value: '1', label: 'Semester 1 (Ganjil)' },
  { value: '2', label: 'Semester 2 (Genap)' },
]

const classroomOptions = computed(() => [
  { value: '', label: 'Semua Kelas' },
  ...classrooms.value.map(classroom => ({
    value: classroom.id,
    label: classroom.name,
  })),
])

const selectedClassroomLabel = computed(() => {
  if (!classroomId.value) return 'Semua kelas'

  return classrooms.value.find(
    classroom =>
      String(classroom.id) === String(classroomId.value),
  )?.name ?? 'Kelas terpilih'
})

const filteredStudents = computed(() => {
  const query = studentSearch.value.trim().toLocaleLowerCase()

  if (!query) return students.value

  return students.value.filter(student =>
    [
      student.fullName,
      student.nis,
      student.nisn,
      student.nickname,
    ]
      .filter(Boolean)
      .some(value =>
        String(value).toLocaleLowerCase().includes(query),
      ),
  )
})

const totalStudentPages = computed(() =>
  Math.max(
    1,
    Math.ceil(
      filteredStudents.value.length /
        studentPageSize,
    ),
  ),
)

const currentStudentPage = computed(() =>
  Math.min(
    Math.max(1, studentPage.value),
    totalStudentPages.value,
  ),
)

const pagedStudents = computed(() => {
  const start =
    (currentStudentPage.value - 1) *
    studentPageSize

  return filteredStudents.value.slice(
    start,
    start + studentPageSize,
  )
})

const pageStartIndex = computed(() =>
  filteredStudents.value.length
    ? (currentStudentPage.value - 1) *
        studentPageSize
    : 0,
)

const pageEndIndex = computed(() =>
  Math.min(
    pageStartIndex.value +
      pagedStudents.value.length,
    filteredStudents.value.length,
  ),
)

const changedCount = computed(() =>
  Object.keys(scoreMap).filter(
    key =>
      (scoreMap[key] ?? '') !==
      (originalMap[key] ?? ''),
  ).length,
)

watch(studentSearch, () => {
  studentPage.value = 1
})

function scoreKey(
  studentId: string,
  subjectId: string,
): string {
  return String(studentId) + ':' + String(subjectId)
}


function predicateFor(
  value: string | number | undefined,
): string {
  if (value === undefined || value === '') return '—'

  const score = Number(value)
  if (!Number.isFinite(score)) return '—'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

function normalizeScoreInput(
  studentId: string,
  subjectId: string,
) {
  const key = scoreKey(studentId, subjectId)
  const value = scoreMap[key]

  if (value === undefined || value === '') return

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    scoreMap[key] = ''
  } else if (numeric < 0) {
    scoreMap[key] = '0'
  } else if (numeric > 100) {
    scoreMap[key] = '100'
  }
}

function resetMaps() {
  Object.keys(scoreMap).forEach(key => delete scoreMap[key])
  Object.keys(originalMap).forEach(key => delete originalMap[key])
}

function resetData() {
  classrooms.value = []
  subjects.value = []
  students.value = []
  grades.value = []
  resetMaps()
}

function goToStudentPage(page: number) {
  studentPage.value = Math.min(
    Math.max(1, page),
    totalStudentPages.value,
  )
}

async function loadClassroomsForYear(
  yearId: string,
  requestVersion: number,
): Promise<boolean> {
  let result: Classroom[]

  if (authStore.user?.role === 'teacher') {
    const teacherId = String(
      authStore.user.teacherId || '',
    ).trim()

    if (!teacherId) {
      throw new Error(
        'Akun guru belum terhubung dengan data guru.',
      )
    }

    result = await classroomsService.getByTeacher(teacherId)
    result = result.filter(
      classroom =>
        String(classroom.schoolYearId) === String(yearId),
    )
  } else {
    result = await classroomsService.list(yearId)
  }

  if (!isMounted || requestVersion !== loadVersion) {
    return false
  }

  classrooms.value = Array.isArray(result) ? result : []

  if (
    classroomId.value &&
    !classrooms.value.some(
      classroom =>
        String(classroom.id) ===
        String(classroomId.value),
    )
  ) {
    classroomId.value = ''
  }

  return true
}

async function loadScoreData(
  requestVersion: number,
): Promise<boolean> {
  const yearId = String(schoolYearId.value || '').trim()

  if (!yearId) return false

  const currentClassroomId =
    String(classroomId.value || '').trim()

  const currentSemester =
    Number(semester.value) as 1 | 2

  let subjectData: Subject[]
  let studentData: { items: Student[] }
  let gradeData: StudentGrade[]

  try {
    subjectData =
      await subjectsService.list(
        yearId,
        true,
      )
  } catch (e: unknown) {
    if (
      isMounted &&
      requestVersion === loadVersion
    ) {
      resetData()
      error.value =
        e instanceof Error
          ? 'Mata pelajaran: ' + e.message
          : 'Gagal memuat mata pelajaran.'
    }
    return false
  }

  try {
    studentData =
      await studentsService.list({
        schoolYearId: yearId,
        classroomId:
          currentClassroomId ||
          undefined,
        page: 1,
        limit: 1000,
      })
  } catch (e: unknown) {
    if (
      isMounted &&
      requestVersion === loadVersion
    ) {
      resetData()
      error.value =
        e instanceof Error
          ? 'Siswa: ' + e.message
          : 'Gagal memuat daftar siswa.'
    }
    return false
  }

  try {
    gradeData =
      await gradesService.list({
        schoolYearId: yearId,
        semester: currentSemester,
        classroomId:
          currentClassroomId ||
          undefined,
      })
  } catch (e: unknown) {
    if (
      isMounted &&
      requestVersion === loadVersion
    ) {
      resetData()
      error.value =
        e instanceof Error
          ? 'Nilai: ' + e.message
          : 'Gagal memuat data nilai.'
    }
    return false
  }

  if (
    !isMounted ||
    requestVersion !== loadVersion
  ) {
    return false
  }

  subjects.value =
    Array.isArray(subjectData)
      ? [...subjectData].sort(
          (a, b) =>
            (Number(a.sortOrder) || 0) -
              (Number(b.sortOrder) || 0) ||
            String(a.name || '').localeCompare(
              String(b.name || ''),
            ),
        )
      : []

  students.value =
    Array.isArray(studentData.items)
      ? studentData.items
      : []

  grades.value =
    Array.isArray(gradeData)
      ? gradeData
      : []

  const activeStudentIds =
    new Set(
      students.value.map(student =>
        String(student.id),
      ),
    )

  resetMaps()

  grades.value.forEach(grade => {
    const studentId =
      String(grade.studentId || '')
    const subjectId =
      String(grade.subjectId || '')

    if (
      !studentId ||
      !subjectId ||
      !activeStudentIds.has(studentId)
    ) {
      return
    }

    const key = scoreKey(
      studentId,
      subjectId,
    )

    const value =
      grade.score == null
        ? ''
        : String(grade.score)

    scoreMap[key] = value
    originalMap[key] = value
  })

  return true
}

async function loadScoresData(
  reloadClassrooms: boolean,
): Promise<void> {
  const requestVersion = ++loadVersion
  studentPage.value = 1
  saveFeedback.value = ''
  error.value = ''

  const yearId = String(
    schoolYearId.value || '',
  ).trim()

  if (!yearId) {
    resetData()
    isLoading.value = false
    error.value =
      'Pilih tahun pelajaran terlebih dahulu.'
    return
  }

  isLoading.value = true
  resetMaps()

  try {
    if (reloadClassrooms) {
      const classroomLoaded =
        await loadClassroomsForYear(
          yearId,
          requestVersion,
        )

      if (!classroomLoaded) return
    }

    if (
      !isMounted ||
      requestVersion !== loadVersion
    ) {
      return
    }

    await loadScoreData(
      requestVersion,
    )
  } catch (e: unknown) {
    if (
      !isMounted ||
      requestVersion !== loadVersion
    ) {
      return
    }

    resetData()
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal memuat data nilai.'
  } finally {
    if (
      requestVersion === loadVersion
    ) {
      isLoading.value = false
    }
  }
}

function loadStudentsAndScores() {
  if (
    isSaving.value ||
    isRetrying.value ||
    isLoading.value
  ) {
    return
  }

  void loadScoresData(false)
}

function loadScores() {
  if (
    isSaving.value ||
    isRetrying.value ||
    isLoading.value
  ) {
    return
  }

  void loadScoresData(false)
}

function reloadContext() {
  if (
    isSaving.value ||
    isRetrying.value
  ) {
    return
  }

  classroomId.value = ''
  void loadScoresData(true)
}

async function retryLoad() {
  if (
    isRetrying.value ||
    isSaving.value
  ) {
    return
  }

  isRetrying.value = true

  try {
    await loadScoresData(true)
  } finally {
    isRetrying.value = false
  }
}

async function saveAll() {
  if (
    isSaving.value ||
    isLoading.value ||
    !schoolYearId.value
  ) {
    return
  }

  const changedKeys =
    Object.keys(scoreMap).filter(
      key =>
        (scoreMap[key] ?? '') !==
        (originalMap[key] ?? ''),
    )

  if (!changedKeys.length) {
    toast.info('Belum ada perubahan nilai.')
    return
  }

  const changed: ScoreBatchRow[] = []

  for (const key of changedKeys) {
    const parts = key.split(':')
    const studentId = parts[0] || ''
    const subjectId = parts[1] || ''
    const rawScore = scoreMap[key] ?? ''

    if (!studentId || !subjectId) {
      saveFeedbackIsError.value = true
      saveFeedback.value =
        'Ada perubahan nilai dengan identitas data yang tidak valid. Muat ulang data sebelum menyimpan.'
      return
    }

    if (rawScore === '') {
      changed.push({
        studentId,
        schoolYearId:
          String(schoolYearId.value),
        semester:
          Number(semester.value) as 1 | 2,
        subjectId,
      })
      continue
    }

    const score = Number(rawScore)

    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      saveFeedbackIsError.value = true
      saveFeedback.value =
        'Nilai harus berupa angka antara 0 sampai 100.'
      return
    }

    changed.push({
      studentId,
      schoolYearId:
        String(schoolYearId.value),
      semester:
        Number(semester.value) as 1 | 2,
      subjectId,
      score,
    })
  }

  isSaving.value = true
  saveFeedback.value = ''

  try {
    const result =
      await gradesService.saveBatch(
        changed,
      )

    if (
      result.failed === 0 &&
      result.success ===
        changed.length
    ) {
      changedKeys.forEach(key => {
        originalMap[key] =
          scoreMap[key] ?? ''
      })

      toast.success(
        result.success +
          ' nilai berhasil disimpan.',
      )
      return
    }

    saveFeedbackIsError.value = false
    saveFeedback.value =
      'Sebagian nilai belum tersimpan. ' +
      (
        result.errors?.length
          ? result.errors
              .slice(0, 3)
              .join(' | ')
          : 'Periksa kembali data yang bermasalah.'
      )

    toast.info(
      'Perubahan yang belum tersimpan tetap dipertahankan untuk diperbaiki.',
    )
  } catch (e: unknown) {
    saveFeedbackIsError.value = true
    saveFeedback.value =
      e instanceof Error
        ? e.message
        : 'Gagal menyimpan nilai.'

    toast.error(
      saveFeedback.value,
    )
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  isMounted = true

  try {
    await schoolYearStore.fetch()

    if (!isMounted) return

    const years =
      schoolYearStore.schoolYears

    if (!years.length) {
      throw new Error(
        'Belum ada tahun pelajaran yang tersedia. Tambahkan tahun pelajaran terlebih dahulu.',
      )
    }

    schoolYearId.value =
      schoolYearStore.activeSchoolYear?.id ??
      years[0]?.id ??
      ''

    await loadScoresData(true)
  } catch (e: unknown) {
    if (!isMounted) return

    isLoading.value = false
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal menyiapkan data nilai.'
  }
})

onUnmounted(() => {
  isMounted = false
  loadVersion += 1
})
</script>
