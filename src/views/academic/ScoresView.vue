<template>
  <div class="w-full min-w-0 space-y-5 pb-6">
    <PageHeader
      title="Nilai Siswa"
      subtitle="Input dan kelola nilai berdasarkan tahun pelajaran, kelas, semester, dan mata pelajaran."
      :breadcrumbs="[{ label: 'Akademik' }, { label: 'Nilai Siswa' }]"
    />

    <BaseCard>
      <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BaseSelect
          v-model="schoolYearId"
          label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions"
          required
          :disabled="isMutating || schoolYearStore.isLoading"
          @update:model-value="reloadContext"
        />

        <BaseSelect
          v-model="semester"
          label="Semester"
          :options="semesterOptions"
          required
          :disabled="isMutating || isLoading"
          @update:model-value="loadScores"
        />

        <BaseSelect
          v-model="classroomId"
          label="Kelas"
          :options="classroomOptions"
          clearable
          placeholder="Semua kelas"
          :disabled="isMutating || isLoading || !schoolYearId"
          @update:model-value="loadStudentsAndScores"
        />

        <div class="flex min-w-0 items-end">
          <BaseButton
            class="w-full"
            :loading="isLoading"
            loading-text="Memuat..."
            :disabled="isMutating || !schoolYearId"
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
      :padding="false"
      class="overflow-hidden"
    >
      <div class="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-slate-800">
                {{ filteredStudents.length }} siswa
              </p>
              <BaseBadge v-if="changedCount" color="amber" dot>
                {{ changedCount }} perubahan belum disimpan
              </BaseBadge>
            </div>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-400">
              {{ subjects.length }} mata pelajaran aktif · Semester {{ semester }} ·
              {{ selectedClassroomLabel }}
            </p>
          </div>

          <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <BaseInput
              v-model="studentSearch"
              class="w-full sm:min-w-[18rem] lg:w-72"
              placeholder="Cari nama, NIS, atau NISN..."
              :prefix-icon="Search"
              :disabled="isMutating || isLoading"
              aria-label="Cari siswa"
            />
            <BaseButton
              :loading="isSaving"
              loading-text="Menyimpan..."
              :disabled="!changedCount || isMutating || isLoading"
              class="w-full sm:w-auto"
              @click="saveAll"
            >
              <Save class="h-4 w-4" />
              Simpan
              <span v-if="changedCount">({{ changedCount }})</span>
            </BaseButton>
          </div>
        </div>

        <BaseAlert
          v-if="saveFeedback"
          class="mt-3"
          :type="saveFeedbackType"
          :title="saveFeedbackType === 'error' ? 'Penyimpanan gagal' : 'Perhatian'"
          dismissible
          @dismiss="saveFeedback = ''"
        >
          {{ saveFeedback }}
        </BaseAlert>
      </div>

      <div
        v-if="isLoading"
        class="space-y-2 p-5"
        aria-live="polite"
        aria-busy="true"
      >
        <BaseSkeleton v-for="i in 7" :key="i" height="h-12" />
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
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
          <BookOpen class="h-6 w-6 text-slate-300" aria-hidden="true" />
        </div>
        <p class="mt-4 text-sm font-medium text-slate-600">
          Belum ada mata pelajaran aktif.
        </p>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          Aktifkan atau tambahkan mata pelajaran pada tahun pelajaran ini sebelum memasukkan nilai.
        </p>
        <RouterLink
          to="/subjects"
          class="mt-4 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50"
        >
          Kelola mata pelajaran
        </RouterLink>
      </div>

      <div
        v-else-if="!students.length"
        class="px-5 py-12 text-center"
      >
        <Users class="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-slate-600">
          Tidak ada siswa pada kelas yang dipilih.
        </p>
        <p class="mt-1 text-xs text-slate-400">
          Coba pilih kelas lain atau gunakan filter "Semua Kelas".
        </p>
      </div>

      <div
        v-else-if="!filteredStudents.length"
        class="px-5 py-12 text-center"
      >
        <SearchX class="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-slate-600">
          Siswa tidak ditemukan.
        </p>
        <p class="mt-1 text-xs text-slate-400">
          Tidak ada siswa yang cocok dengan pencarian "{{ studentSearch }}".
        </p>
      </div>

      <template v-else>
        <!-- Mobile / tablet: kartu siswa agar tidak memaksa viewport melakukan horizontal scroll. -->
        <div class="divide-y divide-slate-100 lg:hidden">
          <article
            v-for="student in pagedStudents"
            :key="student.id"
            class="min-w-0 p-4 sm:p-5"
          >
            <div class="flex min-w-0 items-start gap-3">
              <div class="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700">
                {{ initials(student.fullName) }}
              </div>

              <div class="min-w-0 flex-1">
                <p class="break-words font-semibold leading-snug text-slate-800">
                  {{ student.fullName }}
                </p>
                <div class="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span class="font-mono">{{ student.nis || 'Tanpa NIS' }}</span>
                  <span>{{ student.classroomName || 'Tanpa kelas' }}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <div
                v-for="subject in subjects"
                :key="subject.id"
                class="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
              >
                <div class="mb-2 min-w-0">
                  <p class="break-words text-xs font-semibold leading-snug text-slate-700">
                    {{ subject.shortName || subject.name }}
                  </p>
                  <p v-if="subject.code" class="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                    {{ subject.code }}
                  </p>
                </div>

                <div class="flex min-w-0 items-center gap-2">
                  <input
                    v-model="scoreMap[scoreKey(student.id, subject.id)]"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-slate-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    :aria-label="'Nilai ' + student.fullName + ' - ' + subject.name"
                    @input="normalizeScoreInput(student.id, subject.id)"
                  />
                  <BaseBadge
                    :color="predicateColor(scoreMap[scoreKey(student.id, subject.id)])"
                    class="shrink-0"
                  >
                    {{ predicateFor(scoreMap[scoreKey(student.id, subject.id)]) }}
                  </BaseBadge>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Desktop: matriks nilai tetap dipertahankan untuk input cepat banyak siswa. -->
        <div class="hidden max-w-full overflow-x-auto overscroll-x-contain lg:block">
          <table class="w-full min-w-[760px] table-fixed text-sm">
            <thead>
              <tr class="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th class="sticky left-0 z-20 w-60 bg-slate-50 px-4 py-3 text-left font-semibold">
                  Siswa
                </th>
                <th
                  v-for="subject in subjects"
                  :key="subject.id"
                  class="w-[7.5rem] px-2 py-3 text-center"
                >
                  <span class="block break-words font-semibold leading-snug text-slate-700">
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
                <td class="sticky left-0 z-10 w-60 bg-white px-4 py-3">
                  <p class="break-words font-medium leading-snug text-slate-800">
                    {{ student.fullName }}
                  </p>
                  <p class="mt-0.5 text-xs font-mono text-slate-400">
                    {{ student.nis || 'Tanpa NIS' }}
                  </p>
                  <p class="mt-0.5 break-words text-[11px] text-slate-400">
                    {{ student.classroomName || '—' }}
                  </p>
                </td>

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
                    class="mx-auto block w-full max-w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-sm font-semibold tabular-nums text-slate-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    :aria-label="'Nilai ' + student.fullName + ' - ' + subject.name"
                    @input="normalizeScoreInput(student.id, subject.id)"
                  />
                  <p
                    class="mt-1 text-center text-[10px] font-medium text-slate-400"
                    aria-hidden="true"
                  >
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
            Menampilkan
            {{ pageStartIndex + 1 }}–{{ pageEndIndex }}
            dari {{ filteredStudents.length }} siswa
          </p>

          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="studentPage <= 1 || isMutating"
              aria-label="Halaman sebelumnya"
              @click="goToStudentPage(studentPage - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
              <span class="hidden sm:inline">Sebelumnya</span>
            </BaseButton>

            <span class="min-w-20 text-center text-xs font-medium text-slate-600">
              Halaman {{ studentPage }} / {{ totalStudentPages }}
            </span>

            <BaseButton
              variant="outline"
              size="sm"
              :disabled="studentPage >= totalStudentPages || isMutating"
              aria-label="Halaman berikutnya"
              @click="goToStudentPage(studentPage + 1)"
            >
              <span class="hidden sm:inline">Berikutnya</span>
              <ChevronRight class="h-4 w-4" />
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  Search,
  SearchX,
  Users,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { PageHeader } from '@/components/shared'
import {
  BaseAlert,
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseInput,
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
  GradeFormData,
  Student,
  StudentGrade,
  Subject,
} from '@/types'

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
const isRetrying = ref(false)
const isSaving = ref(false)
const error = ref('')
const saveFeedback = ref('')
const saveFeedbackType = ref<'error' | 'warning'>('error')
const studentSearch = ref('')
const studentPage = ref(1)

const isMutating = computed(
  () => isSaving.value || isRetrying.value,
)

const semesterOptions = [
  { value: '1', label: 'Semester 1 (Ganjil)' },
  { value: '2', label: 'Semester 2 (Genap)' },
]

const classroomOptions = computed(() => [
  { value: '', label: 'Semua Kelas' },
  ...classrooms.value.map(c => ({
    value: c.id,
    label: c.name,
  })),
])

const selectedClassroomLabel = computed(() => {
  if (!classroomId.value) return 'Semua kelas'

  return (
    classrooms.value.find(
      classroom =>
        String(classroom.id) ===
        String(classroomId.value),
    )?.name ?? 'Kelas terpilih'
  )
})

const changedCount = computed(
  () =>
    Object.keys(scoreMap).filter(
      key =>
        (scoreMap[key] ?? '') !==
        (originalMap[key] ?? ''),
    ).length,
)

const filteredStudents = computed(() => {
  const query = studentSearch.value
    .trim()
    .toLocaleLowerCase()

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
        String(value)
          .toLocaleLowerCase()
          .includes(query),
      ),
  )
})

const studentPageSize = 20

const totalStudentPages = computed(() =>
  Math.max(
    1,
    Math.ceil(
      filteredStudents.value.length /
        studentPageSize,
    ),
  ),
)

const visibleStudentPage = computed(() =>
  Math.min(
    Math.max(1, studentPage.value),
    totalStudentPages.value,
  ),
)

const pagedStudents = computed(() => {
  const start =
    (visibleStudentPage.value - 1) *
    studentPageSize

  return filteredStudents.value.slice(
    start,
    start + studentPageSize,
  )
})

const pageStartIndex = computed(() =>
  filteredStudents.value.length
    ? (visibleStudentPage.value - 1) *
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

watch(studentSearch, () => {
  studentPage.value = 1
})

function scoreKey(
  studentId: string,
  subjectId: string,
) {
  return (
    String(studentId) +
    ':' +
    String(subjectId)
  )
}

function initials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return '?'

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function predicateFor(
  value: string | number | undefined,
): string {
  if (value === undefined || value === '') {
    return '—'
  }

  const score = Number(value)

  if (!Number.isFinite(score)) return '—'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'

  return 'D'
}

function predicateColor(
  value: string | number | undefined,
): 'green' | 'blue' | 'amber' | 'red' | 'slate' {
  if (value === undefined || value === '') {
    return 'slate'
  }

  const score = Number(value)

  if (!Number.isFinite(score)) return 'slate'
  if (score >= 90) return 'green'
  if (score >= 80) return 'blue'
  if (score >= 70) return 'amber'

  return 'red'
}

function normalizeScoreInput(
  studentId: string,
  subjectId: string,
) {
  const key = scoreKey(
    studentId,
    subjectId,
  )
  const value = scoreMap[key]

  if (value === undefined || value === '') {
    return
  }

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
  Object.keys(scoreMap).forEach(key =>
    delete scoreMap[key],
  )
  Object.keys(originalMap).forEach(key =>
    delete originalMap[key],
  )
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
): Promise<void> {
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

    result = await classroomsService.getByTeacher(
      teacherId,
    )
    result = result.filter(
      classroom =>
        String(classroom.schoolYearId) ===
        String(yearId),
    )
  } else {
    result =
      await classroomsService.list(yearId)
  }

  if (
    !isMounted ||
    requestVersion !== loadVersion
  ) {
    return
  }

  classrooms.value = Array.isArray(result)
    ? result
    : []

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
}

async function loadScoreData(
  requestVersion: number,
): Promise<void> {
  const yearId = String(
    schoolYearId.value || '',
  ).trim()

  const currentClassroomId =
    String(classroomId.value || '').trim()

  const semesterValue =
    Number(semester.value) as 1 | 2

  const [subjectResult, studentResult, gradeResult] =
    await Promise.allSettled([
      subjectsService.list(
        yearId,
        true,
      ),
      studentsService.list({
        schoolYearId: yearId,
        classroomId:
          currentClassroomId || undefined,
        page: 1,
        limit: 1000,
      }),
      gradesService.list({
        schoolYearId: yearId,
        semester: semesterValue,
        classroomId:
          currentClassroomId || undefined,
      }),
    ])

  if (
    !isMounted ||
    requestVersion !== loadVersion
  ) {
    return
  }

  const errors: string[] = []

  if (subjectResult.status === 'rejected') {
    errors.push(
      'Mata pelajaran: ' +
        (subjectResult.reason instanceof Error
          ? subjectResult.reason.message
          : 'Gagal memuat mata pelajaran.'),
    )
  }

  if (studentResult.status === 'rejected') {
    errors.push(
      'Siswa: ' +
        (studentResult.reason instanceof Error
          ? studentResult.reason.message
          : 'Gagal memuat daftar siswa.'),
    )
  }

  if (gradeResult.status === 'rejected') {
    errors.push(
      'Nilai: ' +
        (gradeResult.reason instanceof Error
          ? gradeResult.reason.message
          : 'Gagal memuat data nilai.'),
    )
  }

  if (errors.length) {
    subjects.value = []
    students.value = []
    grades.value = []
    resetMaps()
    error.value = errors.join(' · ')
    return
  }

  const subjectData =
    subjectResult.value
  const studentData =
    studentResult.value
  const gradeData =
    gradeResult.value

  subjects.value = Array.isArray(
    subjectData,
  )
    ? [...subjectData].sort(
        (a, b) =>
          (Number(a.sortOrder) || 0) -
            (Number(b.sortOrder) || 0) ||
          String(a.name || '').localeCompare(
            String(b.name || ''),
          ),
      )
    : []

  students.value = Array.isArray(
    studentData.items,
  )
    ? studentData.items
    : []

  grades.value = Array.isArray(
    gradeData,
  )
    ? gradeData
    : []

  const activeStudentIds = new Set(
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
}

async function loadStudentsAndScores() {
  const yearId = String(
    schoolYearId.value || '',
  ).trim()

  const requestVersion = ++loadVersion

  studentPage.value = 1
  saveFeedback.value = ''

  if (!yearId) {
    subjects.value = []
    students.value = []
    grades.value = []
    classrooms.value = []
    resetMaps()
    isLoading.value = false
    error.value =
      'Pilih tahun pelajaran terlebih dahulu.'
    return
  }

  isLoading.value = true
  error.value = ''
  resetMaps()

  try {
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

    subjects.value = []
    students.value = []
    grades.value = []
    resetMaps()
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal memuat data nilai.'
  } finally {
    if (requestVersion === loadVersion) {
      isLoading.value = false
    }
  }
}

async function reloadContext() {
  const yearId = String(
    schoolYearId.value || '',
  ).trim()

  const requestVersion = ++loadVersion

  classroomId.value = ''
  studentPage.value = 1
  saveFeedback.value = ''
  error.value = ''
  resetMaps()

  if (!yearId) {
    classrooms.value = []
    subjects.value = []
    students.value = []
    grades.value = []
    isLoading.value = false
    error.value =
      'Pilih tahun pelajaran terlebih dahulu.'
    return
  }

  isLoading.value = true

  try {
    await loadClassroomsForYear(
      yearId,
      requestVersion,
    )

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

    classrooms.value = []
    subjects.value = []
    students.value = []
    grades.value = []
    resetMaps()
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal menyiapkan konteks data nilai.'
  } finally {
    if (requestVersion === loadVersion) {
      isLoading.value = false
    }
  }
}

async function retryLoad() {
  if (isRetrying.value || isSaving.value) {
    return
  }

  isRetrying.value = true

  try {
    await reloadContext()
  } finally {
    isRetrying.value = false
  }
}

function loadScores() {
  if (
    isSaving.value ||
    isLoading.value
  ) {
    return
  }

  void loadStudentsAndScores()
}

function saveAll() {
  if (
    isSaving.value ||
    isLoading.value
  ) {
    return
  }

  const changedKeys = Object.keys(
    scoreMap,
  ).filter(
    key =>
      (scoreMap[key] ?? '') !==
      (originalMap[key] ?? ''),
  )

  if (!changedKeys.length) {
    toast.info(
      'Belum ada perubahan nilai.',
    )
    return
  }

  const changed: GradeFormData[] = []

  for (const key of changedKeys) {
    const [studentId, subjectId] =
      key.split(':')

    if (!studentId || !subjectId) {
      saveFeedback.value =
        'Ada perubahan nilai dengan identitas data yang tidak valid. Muat ulang data sebelum menyimpan kembali.'
      saveFeedbackType.value = 'error'
      return
    }

    const rawScore =
      scoreMap[key] ?? ''

    if (rawScore !== '') {
      const numericScore =
        Number(rawScore)

      if (
        !Number.isFinite(
          numericScore,
        ) ||
        numericScore < 0 ||
        numericScore > 100
      ) {
        saveFeedback.value =
          'Nilai harus berupa angka antara 0 sampai 100.'
        saveFeedbackType.value =
          'error'
        return
      }
    }

    changed.push({
      studentId,
      schoolYearId:
        schoolYearId.value,
      semester:
        Number(semester.value) as
          | 1
          | 2,
      subjectId,
      score:
        rawScore === ''
          ? undefined
          : Number(rawScore),
    })
  }

  isSaving.value = true
  saveFeedback.value = ''

  void (async () => {
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

      saveFeedbackType.value =
        'warning'
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
        'Sebagian nilai gagal disimpan. Perubahan yang gagal tetap dipertahankan agar dapat diperbaiki dan disimpan ulang.',
      )
    } catch (e: unknown) {
      saveFeedbackType.value =
        'error'
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
  })()
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

    await reloadContext()
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
