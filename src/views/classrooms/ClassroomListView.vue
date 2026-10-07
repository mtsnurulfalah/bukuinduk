<template>
  <div class="min-w-0 space-y-5">
    <PageHeader
      title="Kelas & Rombel"
      :subtitle="\`\${filteredClassrooms.length} dari \${classrooms.length} kelas\`"
    >
      <template #actions>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <BaseSelect
            v-model="selectedSchoolYearId"
            :options="schoolYearStore.schoolYearOptions"
            placeholder="Pilih Tahun Pelajaran"
            class="w-full sm:w-52"
            :disabled="isYearLoading"
            @update:model-value="handleSchoolYearChange"
          />
          <BaseButton
            v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
            size="sm"
            class="w-full sm:w-auto"
            @click="goCreate"
          >
            <Plus class="h-4 w-4" />
            Tambah Kelas
          </BaseButton>
        </div>
      </template>
    </PageHeader>

    <BaseCard :padding="true">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <SearchFilter
          v-model:search="search"
          search-placeholder="Cari nama kelas, tingkat, atau wali kelas..."
        />
        <BaseSelect
          v-model="statusFilter"
          :options="statusOptions"
          class="w-full sm:w-36"
          aria-label="Filter status kelas"
        />
      </div>
      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{{ activeCount }} aktif</span>
        <span>{{ inactiveCount }} nonaktif</span>
      </div>
    </BaseCard>

    <div v-if="isLoading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseSkeleton v-for="i in 6" :key="i" height="h-44" />
    </div>

    <BaseRetry
      v-else-if="error"
      title="Data kelas gagal dimuat"
      :message="error"
      @retry="loadClassrooms"
    />

    <BaseEmpty
      v-else-if="!filteredClassrooms.length"
      :title="classrooms.length ? 'Kelas tidak ditemukan' : 'Belum ada kelas'"
      :description="classrooms.length ? 'Coba ubah kata kunci pencarian atau filter status.' : 'Tambahkan kelas untuk tahun pelajaran ini.'"
      type="data"
    >
      <template #action>
        <BaseButton
          v-if="classrooms.length && (search || statusFilter !== 'all')"
          variant="outline"
          @click="resetFilters"
        >
          Reset Filter
        </BaseButton>
        <BaseButton
          v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
          @click="goCreate"
        >
          <Plus class="h-4 w-4" />
          Tambah Kelas
        </BaseButton>
      </template>
    </BaseEmpty>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="cls in filteredClassrooms"
        :key="cls.id"
        class="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
      >
        <RouterLink
          :to="\`/classrooms/\${cls.id}\`"
          class="block p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
          :aria-label="\`Buka detail kelas \${cls.name}\`"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <School class="h-5 w-5" />
            </div>
            <BaseBadge :color="cls.isActive ? 'green' : 'slate'" dot>
              {{ cls.isActive ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </div>
          <h3 class="truncate text-lg font-bold text-slate-800 transition-colors group-hover:text-primary-700">
            {{ cls.name }}
          </h3>
          <p class="mt-0.5 truncate text-sm text-slate-500">
            {{ cls.gradeName || 'Tingkat belum ditentukan' }}
          </p>
          <div class="mt-4 border-t border-slate-100 pt-3">
            <div class="flex items-center justify-between gap-3 text-sm">
              <div class="flex min-w-0 items-center gap-1.5 text-slate-600">
                <Users class="h-4 w-4 shrink-0 text-slate-400" />
                <span class="font-semibold">{{ cls.studentCount ?? 0 }}</span>
                <span class="shrink-0 text-slate-400">/ {{ cls.capacity ?? '–' }}</span>
              </div>
              <span
                class="min-w-0 truncate text-right text-xs text-slate-400"
                :title="cls.homeroomTeacherName || 'Belum ada wali kelas'"
              >
                {{ cls.homeroomTeacherName || 'Belum ada wali kelas' }}
              </span>
            </div>
          </div>
        </RouterLink>

        <div
          v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
          class="flex items-center gap-1 border-t border-slate-100 px-4 py-2.5"
        >
          <BaseButton
            variant="ghost"
            size="xs"
            class="flex-1 sm:flex-none"
            @click="goEdit(cls.id)"
          >
            <Pencil class="h-3.5 w-3.5" />
            Edit
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="xs"
            class="text-red-600 hover:bg-red-50 hover:text-red-700"
            :disabled="deletingId === cls.id"
            :title="\`Hapus \${cls.name}\`"
            @click="handleDelete(cls.id, cls.name)"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Hapus</span>
          </BaseButton>
        </div>
      </article>
    </div>

    <BaseConfirmDialog
      v-model="confirm.isOpen.value"
      title="Hapus Kelas"
      :message="\`Hapus kelas '\${confirm.options.value.message}'? Jika kelas sudah memiliki riwayat enrollment, sistem akan menolak penghapusan agar data historis tetap aman.\`"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="confirm.isLoading.value"
      @confirm="confirmDelete"
      @cancel="confirm.onCancel"
    />
  </div>
</template>
    </PageHeader>

    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseSkeleton v-for="i in 6" :key="i" height="h-32" />
    </div>

    <BaseRetry
      v-else-if="error"
      title="Data kelas gagal dimuat"
      :message="error"
      @retry="loadClassrooms"
    />

    <BaseEmpty v-else-if="!classrooms.length" title="Belum ada kelas" description="Tambah kelas untuk tahun pelajaran ini." type="data">
      <template #action>
        <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" @click="$router.push('/classrooms/create')">
          <Plus class="h-4 w-4" /> Tambah Kelas
        </BaseButton>
      </template>
    </BaseEmpty>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cls in classrooms"
        :key="cls.id"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-primary-200 hover:shadow-md transition-all group cursor-pointer"
        @click="$router.push(`/classrooms/${cls.id}`)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-primary-100 rounded-xl">
            <School class="h-5 w-5 text-primary-600" />
          </div>
          <div class="flex gap-1.5">
            <BaseBadge :color="cls.isActive ? 'green' : 'slate'" dot>
              {{ cls.isActive ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </div>
        </div>

        <h3 class="font-bold text-lg text-slate-800 group-hover:text-primary-700 transition-colors">
          {{ cls.name }}
        </h3>
        <p class="text-sm text-slate-500">{{ cls.gradeName }}</p>

        <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div class="flex items-center gap-1.5 text-sm text-slate-600">
            <Users class="h-4 w-4 text-slate-400" />
            <span class="font-semibold">{{ cls.studentCount ?? 0 }}</span>
            <span class="text-slate-400">/ {{ cls.capacity ?? '–' }}</span>
          </div>
          <div class="flex items-center gap-1 text-xs text-slate-400">
            <GraduationCap class="h-3.5 w-3.5" />
            {{ cls.homeroomTeacherName ?? 'Belum ada wali kelas' }}
          </div>
        </div>

        <!-- Action buttons -->
        <div
          v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
          class="flex gap-1 mt-3 pt-3 border-t border-slate-100"
          @click.stop
        >
          <BaseButton variant="ghost" size="xs" @click="$router.push(`/classrooms/${cls.id}/edit`)">
            <Pencil class="h-3.5 w-3.5" /> Edit
          </BaseButton>
          <BaseButton variant="ghost" size="xs" @click="handleDelete(cls.id, cls.name)">
            <Trash2 class="h-3.5 w-3.5 text-red-400" />
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseConfirmDialog
      v-model="confirm.isOpen.value"
      title="Hapus Kelas"
      :message="`Hapus kelas '${confirm.options.value.message}'? Tindakan ini tidak dapat dibatalkan.`"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="confirm.isLoading.value"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus, School, Users, Pencil, Trash2 } from 'lucide-vue-next'
import { PageHeader, SearchFilter } from '@/components/shared'
import { BaseButton, BaseSelect, BaseBadge, BaseSkeleton, BaseEmpty, BaseRetry, BaseCard, BaseConfirmDialog } from '@/components/ui'
import { useClassroomsStore } from '@/stores/classrooms'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { usePermission, useConfirm } from '@/composables'
import { classroomsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Classroom } from '@/types'

const router = useRouter()
const classroomsStore = useClassroomsStore()
const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const confirm = useConfirm()

const classrooms = ref<Classroom[]>([])
const isLoading = ref(false)
const isYearLoading = ref(false)
const error = ref('')
const search = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const selectedSchoolYearId = ref('')
const deletingId = ref('')

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

let loadVersion = 0
let isMounted = false
let manualYearSelection = false
let deleteTargetId = ''

const activeCount = computed(() => classrooms.value.filter(c => c.isActive).length)
const inactiveCount = computed(() => classrooms.value.length - activeCount.value)

const filteredClassrooms = computed(() => {
  const q = search.value.trim().toLowerCase()
  return classrooms.value.filter(cls => {
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' && cls.isActive) ||
      (statusFilter.value === 'inactive' && !cls.isActive)

    if (!matchesStatus) return false
    if (!q) return true

    return [
      cls.name,
      cls.gradeName,
      cls.homeroomTeacherName,
      cls.schoolYearName,
    ].some(value => String(value ?? '').toLowerCase().includes(q))
  })
})

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
}

function goCreate() {
  void router.push('/classrooms/create')
}

function goEdit(id: string) {
  void router.push(\`/classrooms/\${id}/edit\`)
}

async function loadClassrooms() {
  const requestVersion = ++loadVersion
  const schoolYearId = selectedSchoolYearId.value || undefined
  isLoading.value = true
  error.value = ''

  try {
    const data = await classroomsService.list(schoolYearId)
    if (!isMounted || requestVersion !== loadVersion) return
    classrooms.value = Array.isArray(data) ? data : []
    classroomsStore.currentSchoolYearId = selectedSchoolYearId.value
    classroomsStore.initialized = true
  } catch (e: unknown) {
    if (!isMounted || requestVersion !== loadVersion) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data kelas.'
  } finally {
    if (isMounted && requestVersion === loadVersion) {
      isLoading.value = false
    }
  }
}

function handleSchoolYearChange(value: string) {
  manualYearSelection = true
  selectedSchoolYearId.value = value
  void loadClassrooms()
}

function handleDelete(id: string, name: string) {
  deleteTargetId = id
  void confirm.confirm({ message: name, type: 'danger' })
}

async function confirmDelete() {
  if (!deleteTargetId || deletingId.value) return

  deletingId.value = deleteTargetId
  confirm.isLoading.value = true

  try {
    await classroomsService.delete(deleteTargetId)
    classrooms.value = classrooms.value.filter(c => c.id !== deleteTargetId)
    classroomsStore.removeClassroom(deleteTargetId)
    toast.success('Kelas berhasil dihapus.')
    confirm.isOpen.value = false
    confirm.onConfirm()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus kelas.')
  } finally {
    confirm.isLoading.value = false
    deletingId.value = ''
    deleteTargetId = ''
  }
}

watch(
  () => schoolYearStore.activeSchoolYear?.id,
  nextId => {
    if (!manualYearSelection && nextId && selectedSchoolYearId.value !== nextId) {
      selectedSchoolYearId.value = nextId
      void loadClassrooms()
    }
  },
)

onMounted(async () => {
  isMounted = true
  isYearLoading.value = true

  try {
    await schoolYearStore.fetch()
    if (!selectedSchoolYearId.value) {
      selectedSchoolYearId.value = schoolYearStore.activeSchoolYear?.id ?? ''
    }
    await loadClassrooms()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat tahun pelajaran.'
  } finally {
    if (isMounted) isYearLoading.value = false
  }
})

onUnmounted(() => {
  isMounted = false
  ++loadVersion
})
</script>