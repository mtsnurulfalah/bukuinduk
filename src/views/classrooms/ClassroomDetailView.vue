<template>
  <div class="min-w-0 space-y-5">
    <PageHeader
      :title="classroom?.name ?? 'Detail Kelas'"
      :subtitle="classroom?.schoolYearName"
      show-back
      :breadcrumbs="[{ label: 'Kelas & Rombel', to: '/classrooms' }, { label: classroom?.name ?? '...' }]"
    >
      <template v-if="classroom && can(PERMISSIONS.CLASSROOM_MANAGE)" #actions>
        <BaseButton variant="outline" size="sm" @click="goEdit">
          <Pencil class="h-4 w-4" />
          Edit
        </BaseButton>
      </template>
    </PageHeader>

    <BaseSkeleton v-if="isLoading" height="h-32" />

    <BaseRetry
      v-else-if="error"
      title="Data kelas gagal dimuat"
      :message="error"
      @retry="loadClassroom"
    />

    <template v-else-if="classroom">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Siswa" :value="students.length" :icon="Users" color="blue" />
        <StatCard label="Laki-laki" :value="maleCount" :icon="User" color="blue" />
        <StatCard label="Perempuan" :value="femaleCount" :icon="User" color="purple" />
        <StatCard label="Kapasitas" :value="classroom.capacity ?? '–'" :icon="School" color="teal" />
      </div>

      <BaseCard title="Informasi Kelas">
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div class="min-w-0">
            <p class="mb-0.5 text-xs text-slate-400">Nama Kelas</p>
            <p class="truncate font-semibold text-slate-800" :title="classroom.name">{{ classroom.name }}</p>
          </div>
          <div class="min-w-0">
            <p class="mb-0.5 text-xs text-slate-400">Tingkat</p>
            <p class="truncate font-medium text-slate-700">{{ classroom.gradeName || '–' }}</p>
          </div>
          <div class="min-w-0">
            <p class="mb-0.5 text-xs text-slate-400">Tahun Pelajaran</p>
            <p class="truncate font-medium text-slate-700">{{ classroom.schoolYearName || '–' }}</p>
          </div>
          <div class="min-w-0">
            <p class="mb-0.5 text-xs text-slate-400">Wali Kelas</p>
            <p class="truncate font-medium text-slate-700" :title="classroom.homeroomTeacherName || undefined">
              {{ classroom.homeroomTeacherName || 'Belum ditetapkan' }}
            </p>
          </div>
          <div>
            <p class="mb-0.5 text-xs text-slate-400">Status</p>
            <BaseBadge :color="classroom.isActive ? 'green' : 'slate'" dot>
              {{ classroom.isActive ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </div>
          <div v-if="classroom.capacity" class="min-w-0">
            <p class="mb-0.5 text-xs text-slate-400">Terisi</p>
            <p class="font-medium text-slate-700">{{ students.length }} / {{ classroom.capacity }}</p>
          </div>
        </div>

        <div v-if="classroom.capacity" class="mt-4">
          <div class="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Okupansi</span>
            <span>{{ occupancyPercent }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-primary-500 transition-all" :style="{ width: `${occupancyPercent}%` }" />
          </div>
        </div>
      </BaseCard>

      <BaseCard :title="`Daftar Siswa (${filteredStudents.length} ditampilkan / ${students.length} total)`">
        <div class="mb-3 mt-1">
          <SearchFilter v-model:search="search" search-placeholder="Cari nama atau NIS..." />
        </div>

        <div v-if="isLoadingStudents" class="space-y-2">
          <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
        </div>

        <BaseRetry
          v-else-if="studentsError"
          title="Daftar siswa gagal dimuat"
          :message="studentsError"
          @retry="loadStudents"
        />

        <BaseEmpty
          v-else-if="!filteredStudents.length"
          :title="students.length ? 'Siswa tidak ditemukan' : 'Belum ada siswa di kelas ini'"
          :description="students.length ? 'Coba ubah kata kunci pencarian.' : 'Siswa aktif pada tahun pelajaran kelas ini akan muncul di sini.'"
          type="students"
        >
          <template #action>
            <BaseButton v-if="students.length && search" variant="outline" @click="search = ''">
              Reset Pencarian
            </BaseButton>
          </template>
        </BaseEmpty>

        <template v-else>
          <div class="divide-y divide-slate-100">
            <RouterLink
              v-for="(s, i) in pagedStudents"
              :key="s.id"
              :to="`/students/${s.id}`"
              class="group -mx-2 flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:-mx-5 sm:px-5"
            >
              <span class="w-7 shrink-0 text-right text-xs text-slate-400">{{ pageStartIndex + i + 1 }}</span>
              <BaseAvatar :name="s.fullName" :src="s.photoUrl" size="sm" color="blue" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800 group-hover:text-primary-700">{{ s.fullName || 'Siswa' }}</p>
                <p class="truncate text-xs text-slate-400">{{ s.nis || '—' }}</p>
              </div>
              <span :class="s.gender === 'L' ? 'text-blue-600' : 'text-pink-600'" class="shrink-0 text-xs font-medium">
                {{ s.gender === 'L' ? 'L' : 'P' }}
              </span>
            </RouterLink>
          </div>

          <div v-if="pageCount > 1" class="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-slate-500">
              Menampilkan {{ pageStartIndex + 1 }}–{{ pageEndIndex }} dari {{ filteredStudents.length }} siswa
            </p>
            <div class="flex items-center gap-2">
              <BaseButton variant="outline" size="sm" :disabled="page <= 1" @click="page--">
                Sebelumnya
              </BaseButton>
              <span class="min-w-16 text-center text-xs font-medium text-slate-600">{{ page }} / {{ pageCount }}</span>
              <BaseButton variant="outline" size="sm" :disabled="page >= pageCount" @click="page++">
                Berikutnya
              </BaseButton>
            </div>
          </div>
        </template>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Users, User, School, Pencil } from 'lucide-vue-next'
import { PageHeader, SearchFilter, StatCard } from '@/components/shared'
import { BaseCard, BaseButton, BaseRetry, BaseAvatar, BaseSkeleton, BaseEmpty, BaseBadge } from '@/components/ui'
import { usePermission } from '@/composables'
import { classroomsService, studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import type { Classroom, Student } from '@/types'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const classroom = ref<Classroom | null>(null)
const students = ref<Student[]>([])
const isLoading = ref(true)
const isLoadingStudents = ref(false)
const error = ref('')
const studentsError = ref('')
const search = ref('')
const page = ref(1)
const pageSize = 20

let classroomRequestVersion = 0
let studentsRequestVersion = 0
let isMounted = false

const maleCount = computed(() => students.value.filter(s => s.gender === 'L').length)
const femaleCount = computed(() => students.value.filter(s => s.gender === 'P').length)

const filteredStudents = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return students.value
  return students.value.filter(s =>
    String(s.fullName ?? '').toLowerCase().includes(q) ||
    String(s.nis ?? '').toLowerCase().includes(q),
  )
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize)))
const pageStartIndex = computed(() => (page.value - 1) * pageSize)
const pageEndIndex = computed(() => Math.min(pageStartIndex.value + pageSize, filteredStudents.value.length))
const pagedStudents = computed(() => filteredStudents.value.slice(pageStartIndex.value, pageEndIndex.value))

const occupancyPercent = computed(() => {
  const capacity = Number(classroom.value?.capacity ?? 0)
  if (!Number.isFinite(capacity) || capacity <= 0) return 0
  return Math.min(100, Math.round((students.value.length / capacity) * 100))
})

function goEdit() {
  if (!classroom.value) return
  void router.push(`/classrooms/${classroom.value.id}/edit`)
}

async function loadClassroom() {
  const id = String(route.params.id ?? '').trim()
  const requestId = ++classroomRequestVersion

  if (!id || id === 'undefined' || id === 'null') {
    error.value = 'ID kelas tidak valid.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const data = await classroomsService.get(id)
    if (!isMounted || requestId !== classroomRequestVersion) return

    classroom.value = data
    await loadStudents(data.schoolYearId)
  } catch (e: unknown) {
    if (!isMounted || requestId !== classroomRequestVersion) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data kelas.'
  } finally {
    if (isMounted && requestId === classroomRequestVersion) {
      isLoading.value = false
    }
  }
}

async function loadStudents(schoolYearId = classroom.value?.schoolYearId) {
  const id = String(route.params.id ?? '').trim()
  const requestId = ++studentsRequestVersion

  if (!id || id === 'undefined' || id === 'null') {
    studentsError.value = 'ID kelas tidak valid.'
    isLoadingStudents.value = false
    return
  }

  isLoadingStudents.value = true
  studentsError.value = ''

  try {
    const response = await studentsService.list({
      classroomId: id,
      schoolYearId,
      status: 'active',
      limit: 500,
    })
    if (!isMounted || requestId !== studentsRequestVersion) return

    students.value = Array.isArray(response.items) ? response.items : []
    page.value = 1
  } catch (e: unknown) {
    if (!isMounted || requestId !== studentsRequestVersion) return
    studentsError.value = e instanceof Error ? e.message : 'Gagal memuat daftar siswa.'
  } finally {
    if (isMounted && requestId === studentsRequestVersion) {
      isLoadingStudents.value = false
    }
  }
}

watch(search, () => {
  page.value = 1
})

watch(pageCount, count => {
  if (page.value > count) page.value = count
})

watch(() => route.params.id, () => {
  if (!isMounted) return
  ++classroomRequestVersion
  ++studentsRequestVersion
  classroom.value = null
  students.value = []
  error.value = ''
  studentsError.value = ''
  search.value = ''
  page.value = 1
  void loadClassroom()
})

onMounted(() => {
  isMounted = true
  void loadClassroom()
})

onUnmounted(() => {
  isMounted = false
  ++classroomRequestVersion
  ++studentsRequestVersion
})
</script>
