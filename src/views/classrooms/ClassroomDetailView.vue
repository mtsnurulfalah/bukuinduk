<template>
  <div class="w-full min-w-0 space-y-5 pb-6">
    <PageHeader
      :title="classroom?.name ?? 'Detail Kelas'"
      :subtitle="classroom?.schoolYearName"
      show-back
      :breadcrumbs="[
        { label: 'Kelas & Rombel', to: '/classrooms' },
        { label: classroom?.name ?? '...' },
      ]"
    >
      <template
        v-if="classroom && can(PERMISSIONS.CLASSROOM_MANAGE)"
        #actions
      >
        <BaseButton
          variant="outline"
          size="sm"
          @click="goEdit"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </BaseButton>
      </template>
    </PageHeader>

    <BaseRetry
      v-if="error"
      title="Data kelas gagal dimuat"
      :message="error"
      :loading="isRetryingClassroom"
      @retry="loadClassroom"
    />

    <template v-else-if="isLoading || classroom">
      <div
        v-if="isLoading"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <BaseSkeleton
          v-for="i in 4"
          :key="i"
          height="h-24"
        />
      </div>

      <template v-else-if="classroom">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Siswa"
            :value="students.length"
            :icon="Users"
            color="blue"
            :loading="isLoadingStudents"
          />
          <StatCard
            label="Laki-laki"
            :value="maleCount"
            :icon="User"
            color="blue"
            :loading="isLoadingStudents"
          />
          <StatCard
            label="Perempuan"
            :value="femaleCount"
            :icon="User"
            color="purple"
            :loading="isLoadingStudents"
          />
          <StatCard
            label="Kapasitas"
            :value="classroom.capacity ?? '–'"
            :subtitle="capacitySubtitle"
            :icon="School"
            color="teal"
          />
        </div>

        <BaseAlert
          v-if="capacityExceeded"
          type="warning"
          title="Kapasitas kelas terlampaui"
        >
          Jumlah siswa aktif melebihi kapasitas yang tercatat. Periksa
          enrollment dan kapasitas kelas sebelum menambahkan siswa.
        </BaseAlert>

        <BaseCard
          title="Informasi Kelas"
          subtitle="Ringkasan data rombel dan wali kelas."
        >
          <div
            class="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3"
          >
            <div class="min-w-0">
              <p class="text-xs text-slate-400">Nama Kelas</p>
              <p class="mt-0.5 break-words font-semibold text-slate-800">
                {{ classroom.name }}
              </p>
            </div>

            <div class="min-w-0">
              <p class="text-xs text-slate-400">Tingkat</p>
              <p class="mt-0.5 break-words font-medium text-slate-700">
                {{ classroom.gradeName ?? '–' }}
              </p>
            </div>

            <div class="min-w-0">
              <p class="text-xs text-slate-400">Tahun Pelajaran</p>
              <p class="mt-0.5 break-words font-medium text-slate-700">
                {{ classroom.schoolYearName ?? '–' }}
              </p>
            </div>

            <div class="min-w-0 sm:col-span-2 lg:col-span-1">
              <p class="text-xs text-slate-400">Wali Kelas</p>
              <p class="mt-0.5 break-words font-medium text-slate-700">
                {{ classroom.homeroomTeacherName || 'Belum ditetapkan' }}
              </p>
            </div>

            <div class="min-w-0">
              <p class="text-xs text-slate-400">Status</p>
              <div class="mt-1">
                <BaseBadge
                  :color="classroom.isActive ? 'green' : 'slate'"
                  dot
                >
                  {{ classroom.isActive ? 'Aktif' : 'Nonaktif' }}
                </BaseBadge>
              </div>
            </div>

            <div class="min-w-0">
              <p class="text-xs text-slate-400">Kapasitas Terpakai</p>
              <p class="mt-0.5 font-medium text-slate-700">
                {{ isLoadingStudents ? 'Memuat...' : students.length + ' / ' + (classroom.capacity ?? '–') }}
              </p>
            </div>
          </div>
        </BaseCard>

        <BaseCard
          :title="isLoadingStudents ? 'Daftar Siswa' : 'Daftar Siswa (' + students.length + ')'"
          subtitle="Siswa aktif yang terdaftar pada kelas dan tahun pelajaran ini."
        >
          <div class="mb-4 mt-1 min-w-0">
            <SearchFilter
              v-model:search="search"
              search-placeholder="Cari nama atau NIS..."
            />
          </div>

          <div
            v-if="isLoadingStudents"
            class="space-y-2"
            aria-live="polite"
          >
            <BaseSkeleton
              v-for="i in 6"
              :key="i"
              height="h-12"
            />
          </div>

          <BaseRetry
            v-else-if="studentsError"
            title="Daftar siswa gagal dimuat"
            :message="studentsError"
            :loading="isRetryingStudents"
            @retry="retryStudents"
          />

          <BaseEmpty
            v-else-if="!filtered.length"
            :title="search.trim() ? 'Siswa tidak ditemukan' : 'Belum ada siswa'"
            :description="
              search.trim()
                ? 'Coba gunakan nama atau NIS yang berbeda.'
                : 'Belum ada siswa aktif yang terdaftar pada kelas ini.'
            "
            type="students"
          />

          <div
            v-else
            class="overflow-hidden"
          >
            <div class="divide-y divide-slate-100">
              <RouterLink
                v-for="(s, i) in filtered"
                :key="s.id"
                :to="'/students/' + encodeURIComponent(String(s.id))"
                class="group -mx-5 flex min-w-0 items-center gap-3 px-2 py-2.5 transition-colors hover:bg-slate-50 sm:px-5"
              >
                <span
                  class="w-6 shrink-0 text-right text-xs tabular-nums text-slate-400"
                >
                  {{ i + 1 }}
                </span>

                <BaseAvatar
                  :name="s.fullName"
                  :src="s.photoUrl"
                  size="sm"
                  color="blue"
                />

                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-medium text-slate-800 group-hover:text-primary-700"
                  >
                    {{ s.fullName || 'Siswa tanpa nama' }}
                  </p>
                  <p class="truncate text-xs text-slate-400">
                    {{ s.nis || 'NIS belum tersedia' }}
                  </p>
                </div>

                <span
                  :class="genderTone(s.gender)"
                  class="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :title="genderTitle(s.gender)"
                >
                  {{ genderLabel(s.gender) }}
                </span>
              </RouterLink>
            </div>
          </div>
        </BaseCard>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from 'vue'
import {
  RouterLink,
  useRoute,
  useRouter,
} from 'vue-router'
import {
  Users,
  User,
  School,
  Pencil,
} from 'lucide-vue-next'
import {
  PageHeader,
  SearchFilter,
  StatCard,
} from '@/components/shared'
import {
  BaseCard,
  BaseButton,
  BaseRetry,
  BaseAvatar,
  BaseSkeleton,
  BaseEmpty,
  BaseBadge,
  BaseAlert,
} from '@/components/ui'
import { usePermission } from '@/composables'
import {
  classroomsService,
  studentsService,
} from '@/services'
import { PERMISSIONS } from '@/constants'
import type {
  Classroom,
  Student,
} from '@/types'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const classroom = ref<Classroom | null>(null)
const students = ref<Student[]>([])

const isLoading = ref(true)
const isLoadingStudents = ref(true)
const isRetryingClassroom = ref(false)
const isRetryingStudents = ref(false)

const error = ref('')
const studentsError = ref('')
const search = ref('')

let classroomRequestVersion = 0
let studentsRequestVersion = 0
let isMounted = false

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()

  if (!q) return students.value

  return students.value.filter(student => {
    const fullName =
      String(student.fullName ?? '').toLowerCase()

    const nis =
      String(student.nis ?? '').toLowerCase()

    return (
      fullName.includes(q) ||
      nis.includes(q)
    )
  })
})

const maleCount = computed(() =>
  students.value.filter(
    student => student.gender === 'L',
  ).length,
)

const femaleCount = computed(() =>
  students.value.filter(
    student => student.gender === 'P',
  ).length,
)

const capacityNumber = computed(() => {
  const value = Number(
    classroom.value?.capacity,
  )

  return Number.isFinite(value) &&
    value > 0
    ? value
    : null
})

const capacityExceeded = computed(() =>
  !isLoadingStudents.value &&
  capacityNumber.value !== null &&
  students.value.length >
    capacityNumber.value,
)

const capacitySubtitle = computed(() => {
  if (isLoadingStudents.value) {
    return 'Memuat jumlah siswa...'
  }

  if (capacityNumber.value === null) {
    return students.value.length + ' siswa terdaftar'
  }

  const remaining =
    capacityNumber.value -
    students.value.length

  if (remaining < 0) {
    return Math.abs(remaining) +
      ' siswa di atas kapasitas'
  }

  return remaining + ' slot tersisa'
})

function getRouteId(): string {
  const id =
    String(route.params.id ?? '').trim()

  return (
    id === 'undefined' ||
    id === 'null'
  )
    ? ''
    : id
}

async function loadClassroom() {
  const id = getRouteId()
  const requestVersion =
    ++classroomRequestVersion

  if (!id) {
    error.value = 'ID kelas tidak valid.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''
  studentsError.value = ''
  students.value = []
  search.value = ''

  try {
    const data =
      await classroomsService.get(id)

    if (
      !isMounted ||
      requestVersion !== classroomRequestVersion
    ) {
      return
    }

    if (!data) {
      throw new Error(
        'Data kelas tidak ditemukan.',
      )
    }

    classroom.value = data
    isLoading.value = false

    void loadStudents(
      data.schoolYearId,
    )
  } catch (e: unknown) {
    if (
      !isMounted ||
      requestVersion !== classroomRequestVersion
    ) {
      return
    }

    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal memuat data kelas.'
  } finally {
    if (
      isMounted &&
      requestVersion ===
        classroomRequestVersion
    ) {
      isLoading.value = false
    }
  }
}

async function loadStudents(
  schoolYearId?: string,
) {
  const id = getRouteId()
  const requestVersion =
    ++studentsRequestVersion

  if (!id) {
    studentsError.value =
      'ID kelas tidak valid.'
    isLoadingStudents.value = false
    return
  }

  isLoadingStudents.value = true
  studentsError.value = ''

  try {
    const response =
      await studentsService.list({
        classroomId: id,
        schoolYearId:
          String(
            schoolYearId ??
              classroom.value
                ?.schoolYearId ??
              '',
          ).trim(),
        status: 'active',
        page: 1,
        limit: 500,
      })

    if (
      !isMounted ||
      requestVersion !==
        studentsRequestVersion
    ) {
      return
    }

    students.value =
      Array.isArray(response?.items)
        ? response.items
        : []
  } catch (e: unknown) {
    if (
      !isMounted ||
      requestVersion !==
        studentsRequestVersion
    ) {
      return
    }

    studentsError.value =
      e instanceof Error
        ? e.message
        : 'Gagal memuat daftar siswa.'
  } finally {
    if (
      isMounted &&
      requestVersion ===
        studentsRequestVersion
    ) {
      isLoadingStudents.value = false
    }
  }
}

function retryStudents() {
  if (
    isRetryingStudents.value ||
    isLoadingStudents.value
  ) {
    return
  }

  isRetryingStudents.value = true

  void loadStudents(
    classroom.value?.schoolYearId,
  ).finally(() => {
    if (isMounted) {
      isRetryingStudents.value = false
    }
  })
}

function goEdit() {
  const id =
    String(
      classroom.value?.id ??
        getRouteId(),
    ).trim()

  if (!id) return

  void router.push(
    '/classrooms/' +
      encodeURIComponent(id) +
      '/edit',
  )
}

function genderLabel(
  value: unknown,
): string {
  if (value === 'L') return 'L'
  if (value === 'P') return 'P'
  return '–'
}

function genderTitle(
  value: unknown,
): string {
  if (value === 'L') return 'Laki-laki'
  if (value === 'P') return 'Perempuan'
  return 'Jenis kelamin tidak tersedia'
}

function genderTone(
  value: unknown,
): string {
  if (value === 'L') {
    return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
  }

  if (value === 'P') {
    return 'bg-pink-50 text-pink-700 ring-1 ring-pink-200'
  }

  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
}

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (
      newId === oldId ||
      !isMounted
    ) {
      return
    }

    ++classroomRequestVersion
    ++studentsRequestVersion

    classroom.value = null
    students.value = []
    studentsError.value = ''
    search.value = ''

    void loadClassroom()
  },
)

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
