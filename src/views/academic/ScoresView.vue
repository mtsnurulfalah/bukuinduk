<template>
  <div class="space-y-5">
    <PageHeader
      title="Nilai Siswa"
      subtitle="Input nilai per siswa, mata pelajaran, semester, dan tahun pelajaran."
      :breadcrumbs="[{ label: 'Akademik' }, { label: 'Nilai Siswa' }]"
    />

    <BaseCard>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BaseSelect
          v-model="schoolYearId"
          label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions"
          @update:model-value="reloadContext"
        />
        <BaseSelect
          v-model="semester"
          label="Semester"
          :options="semesterOptions"
          @update:model-value="loadScores"
        />
        <BaseSelect
          v-model="classroomId"
          label="Kelas"
          :options="classroomOptions"
          clearable
          placeholder="Semua kelas"
          @update:model-value="loadStudentsAndScores"
        />
        <div class="flex items-end">
          <BaseButton class="w-full" :loading="isLoading" @click="loadStudentsAndScores">
            <RefreshCw class="h-4 w-4" />
            Muat Data
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseRetry v-if="error" title="Data nilai gagal dimuat" :message="error" @retry="loadStudentsAndScores" />

    <BaseCard v-else>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <p class="text-sm font-semibold text-slate-700">
            {{ students.length }} siswa · {{ subjects.length }} mata pelajaran
          </p>
          <p class="text-xs text-slate-400 mt-0.5">
            Hanya mata pelajaran aktif pada tahun pelajaran terpilih yang ditampilkan.
          </p>
        </div>
        <BaseButton :loading="isSaving" :disabled="!changedCount" @click="saveAll">
          <Save class="h-4 w-4" />
          Simpan Nilai<span v-if="changedCount"> ({{ changedCount }})</span>
        </BaseButton>
      </div>

      <div v-if="isLoading" class="space-y-2">
        <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
      </div>

      <div v-else-if="!schoolYearId" class="py-8 text-center text-sm text-slate-400">
        Pilih tahun pelajaran terlebih dahulu.
      </div>

      <div v-else-if="!subjects.length" class="py-8 text-center">
        <BookOpen class="h-10 w-10 mx-auto text-slate-200 mb-3" />
        <p class="text-sm text-slate-500">Belum ada mata pelajaran aktif untuk tahun pelajaran ini.</p>
        <RouterLink to="/subjects" class="text-xs text-primary-600 font-semibold mt-2 inline-block">
          Kelola mata pelajaran
        </RouterLink>
      </div>

      <div v-else-if="!students.length" class="py-8 text-center text-sm text-slate-400">
        Tidak ada siswa pada filter kelas yang dipilih.
      </div>

      <div v-else class="overflow-x-auto -mx-5 sm:mx-0">
        <table class="min-w-max w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-y border-slate-100 text-xs text-slate-500">
              <th class="px-4 py-3 text-left sticky left-0 bg-slate-50 z-10 min-w-[15rem]">Siswa</th>
              <th v-for="subject in subjects" :key="subject.id" class="px-3 py-3 text-center min-w-[7.5rem]">
                <span class="block font-semibold text-slate-700">{{ subject.shortName || subject.name }}</span>
                <span v-if="subject.code" class="font-mono text-[10px] text-slate-400">{{ subject.code }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="student in students" :key="student.id" class="align-top hover:bg-slate-50">
              <td class="px-4 py-3 sticky left-0 bg-white z-10">
                <p class="font-medium text-slate-800 truncate max-w-[15rem]">{{ student.fullName }}</p>
                <p class="text-xs font-mono text-slate-400 mt-0.5">{{ student.nis }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ student.classroomName || '—' }}</p>
              </td>
              <td v-for="subject in subjects" :key="subject.id" class="px-2 py-3">
                <input
                  v-model="scoreMap[scoreKey(student.id, subject.id)]"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputmode="decimal"
                  class="w-24 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold tabular-nums text-slate-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                  :aria-label="'Nilai ' + student.fullName + ' - ' + subject.name"
                  @input="normalizeScoreInput(student.id, subject.id)"
                />
                <p class="text-[10px] text-center text-slate-400 mt-1">{{ predicateFor(scoreMap[scoreKey(student.id, subject.id)]) }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { BookOpen, RefreshCw, Save } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { PageHeader } from '@/components/shared'
import { BaseButton, BaseCard, BaseRetry, BaseSelect, BaseSkeleton } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useAuthStore } from '@/stores/auth'
import { classroomsService, gradesService, studentsService, subjectsService } from '@/services'
import { usePermission } from '@/composables'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Classroom, Student, StudentGrade, Subject } from '@/types'

const schoolYearStore = useSchoolYearStore()
const authStore = useAuthStore()
const { can } = usePermission()

const schoolYearId = ref('')
const semester = ref<1 | 2>(1)
const classroomId = ref('')
const classrooms = ref<Classroom[]>([])
const subjects = ref<Subject[]>([])
const students = ref<Student[]>([])
const grades = ref<StudentGrade[]>([])
const scoreMap = reactive<Record<string, string>>({})
const originalMap = reactive<Record<string, string>>({})
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref('')

const semesterOptions = [
  { value: 1, label: 'Semester 1 (Ganjil)' },
  { value: 2, label: 'Semester 2 (Genap)' },
]

const classroomOptions = computed(() => [
  { value: '', label: 'Semua Kelas' },
  ...classrooms.value.map(c => ({ value: c.id, label: c.name })),
])

function scoreKey(studentId: string, subjectId: string) {
  return studentId + ':' + subjectId
}

function predicateFor(value: string | number | undefined) {
  const score = Number(value)
  if (!Number.isFinite(score) || value === '') return '—'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

function normalizeScoreInput(studentId: string, subjectId: string) {
  const key = scoreKey(studentId, subjectId)
  const value = scoreMap[key]
  if (value === undefined || value === '') return
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) scoreMap[key] = ''
  else if (numeric < 0) scoreMap[key] = '0'
  else if (numeric > 100) scoreMap[key] = '100'
}

const changedCount = computed(() =>
  Object.keys(scoreMap).filter(key => (scoreMap[key] ?? '') !== (originalMap[key] ?? '')).length
)

function resetMaps() {
  Object.keys(scoreMap).forEach(k => delete scoreMap[k])
  Object.keys(originalMap).forEach(k => delete originalMap[k])
}

async function loadContext() {
  if (!schoolYearId.value) return
  if (authStore.user?.role === 'teacher') {
    classrooms.value = (await classroomsService.getByTeacher(authStore.user.teacherId || ''))
      .filter(c => String(c.schoolYearId) === String(schoolYearId.value))
  } else {
    classrooms.value = await classroomsService.list(schoolYearId.value)
  }
  if (classroomId.value && !classrooms.value.some(c => String(c.id) === String(classroomId.value))) {
    classroomId.value = ''
  }
}

async function loadStudentsAndScores() {
  if (!schoolYearId.value) return
  isLoading.value = true
  error.value = ''
  resetMaps()
  try {
    await loadContext()
    const [subjectData, studentResponse, gradeData] = await Promise.all([
      subjectsService.list(schoolYearId.value, true),
      studentsService.list({
        schoolYearId: schoolYearId.value,
        classroomId: classroomId.value || undefined,
        page: 1,
        limit: 1000,
      }),
      gradesService.list({
        schoolYearId: schoolYearId.value,
        semester: semester.value,
        classroomId: classroomId.value || undefined,
      }),
    ])
    subjects.value = subjectData
    students.value = studentResponse.items
    grades.value = gradeData

    const activeStudentIds = new Set(students.value.map(s => s.id))
    grades.value.forEach(g => {
      if (!activeStudentIds.has(g.studentId)) return
      const key = scoreKey(g.studentId, g.subjectId)
      const value = g.score == null ? '' : String(g.score)
      scoreMap[key] = value
      originalMap[key] = value
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data nilai.'
  } finally {
    isLoading.value = false
  }
}

async function loadScores() {
  await loadStudentsAndScores()
}

async function reloadContext() {
  classroomId.value = ''
  await loadStudentsAndScores()
}

async function saveAll() {
  const changed = Object.keys(scoreMap)
    .filter(key => (scoreMap[key] ?? '') !== (originalMap[key] ?? ''))
    .map(key => {
      const [studentId, subjectId] = key.split(':')
      return {
        studentId,
        schoolYearId: schoolYearId.value,
        semester: semester.value,
        subjectId,
        score: scoreMap[key] === '' ? undefined : Number(scoreMap[key]),
      }
    })

  if (!changed.length) {
    toast.info('Belum ada perubahan nilai.')
    return
  }

  isSaving.value = true
  try {
    const result = await gradesService.saveBatch(changed)
    if (result.failed) {
      toast.warning('Sebagian nilai gagal disimpan: ' + result.errors.join(' '))
    } else {
      toast.success(result.success + ' nilai berhasil disimpan.')
    }
    await loadStudentsAndScores()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan nilai.')
  } finally {
    isSaving.value = false
  }
}

watch(() => schoolYearId.value, () => {
  if (schoolYearId.value) loadStudentsAndScores()
})

onMounted(async () => {
  await schoolYearStore.fetch()
  schoolYearId.value = schoolYearStore.activeSchoolYear?.id ?? schoolYearStore.schoolYears[0]?.id ?? ''
  semester.value = 1
  await loadStudentsAndScores()
})
</script>
