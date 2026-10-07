<template>
  <div class="space-y-5">
    <PageHeader title="Kelas & Rombel" :subtitle="`${filteredClassrooms.length} dari ${classrooms.length} kelas`">
      <template #actions>
        <BaseSelect
          v-model="selectedSchoolYearId"
          :options="schoolYearStore.schoolYearOptions"
          placeholder="Pilih Tahun Pelajaran"
          class="w-full sm:w-52"
        />
        <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" size="sm" @click="$router.push('/classrooms/create')">
          <Plus class="h-4 w-4" /> Tambah Kelas
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padding="true">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <SearchFilter v-model:search="search" search-placeholder="Cari nama kelas, tingkat, atau wali kelas..." />
        <BaseSelect v-model="statusFilter" :options="statusOptions" class="w-full sm:w-40" aria-label="Filter status kelas" />
      </div>
    </BaseCard>

    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseSkeleton v-for="i in 6" :key="i" height="h-32" />
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
      :description="classrooms.length ? 'Coba ubah pencarian atau filter status.' : 'Tambah kelas untuk tahun pelajaran ini.'"
      type="data"
    >
      <template #action>
        <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" @click="$router.push('/classrooms/create')">
          <Plus class="h-4 w-4" /> Tambah Kelas
        </BaseButton>
      </template>
    </BaseEmpty>

    <div v-else class="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cls in filteredClassrooms"
        :key="cls.id"
        class="min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-primary-200 hover:shadow-md transition-all group cursor-pointer"
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
import { Plus, School, Users, GraduationCap, Pencil, Trash2 } from 'lucide-vue-next'
import { PageHeader, SearchFilter } from '@/components/shared'
import { BaseButton, BaseSelect, BaseBadge, BaseSkeleton, BaseEmpty, BaseRetry, BaseConfirmDialog } from '@/components/ui'
import { useClassroomsStore } from '@/stores/classrooms'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { usePermission, useConfirm } from '@/composables'
import { classroomsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Classroom } from '@/types'

const classroomsStore = useClassroomsStore()
const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const confirm = useConfirm()

const classrooms = ref<Classroom[]>([])
const isLoading = ref(true)
const error = ref('')
const search = ref('')
const statusFilter = ref('all')
const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

// BUG-61 FIX: Gunakan computed agar selectedSchoolYearId reaktif terhadap
// perubahan activeSchoolYear. Sebelumnya ref() hanya di-set sekali saat
// komponen mount, tidak berubah jika admin mengubah tahun aktif.
const selectedSchoolYearId = computed({
  get: () => _selectedId.value || schoolYearStore.activeSchoolYear?.id || '',
  set: (v: string) => { _selectedId.value = v },
})
const _selectedId = ref('')

let deleteTargetId = ''
let loadVersion = 0
let isMounted = false
let bootstrapped = false

async function loadClassrooms() {
  const requestVersion = ++loadVersion
  isLoading.value = true
  error.value = ''
  try {
    const data = await classroomsService.list(selectedSchoolYearId.value || undefined)
    if (!isMounted || requestVersion !== loadVersion) return
    classrooms.value = Array.isArray(data) ? data : []
    classroomsStore.list = [...classrooms.value]
    classroomsStore.currentSchoolYearId = selectedSchoolYearId.value
    classroomsStore.initialized = true
  } catch (e: unknown) {
    if (!isMounted || requestVersion !== loadVersion) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data kelas.'
  } finally {
    if (isMounted && requestVersion === loadVersion) isLoading.value = false
  }
}

const filteredClassrooms = computed(() => {
  const q = search.value.trim().toLowerCase()
  return classrooms.value.filter(cls => {
    const statusOk = statusFilter.value === 'all' ||
      (statusFilter.value === 'active' && cls.isActive) ||
      (statusFilter.value === 'inactive' && !cls.isActive)
    if (!statusOk) return false
    if (!q) return true
    return [cls.name, cls.gradeName, cls.homeroomTeacherName, cls.schoolYearName]
      .some(value => String(value ?? '').toLowerCase().includes(q))
  })
})

// BUG-61 FIX: Watch selectedSchoolYearId agar reload otomatis saat tahun pelajaran
// aktif berubah (misalnya admin mengubah di tab Settings).
watch(selectedSchoolYearId, () => {
  if (bootstrapped) void loadClassrooms()
})

function handleDelete(id: string, name: string) {
  deleteTargetId = id
  confirm.options.value.message = name
  confirm.isOpen.value = true
}

async function confirmDelete() {
  confirm.isLoading.value = true
  try {
    await classroomsService.delete(deleteTargetId)
    classrooms.value = classrooms.value.filter(c => c.id !== deleteTargetId)
    classroomsStore.removeClassroom(deleteTargetId)
    toast.success('Kelas berhasil dihapus.')
    confirm.isOpen.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus kelas.')
  } finally { confirm.isLoading.value = false }
}

onMounted(async () => {
  isMounted = true
  try {
    await schoolYearStore.fetch()
    bootstrapped = true
    await loadClassrooms()
  } catch (e: unknown) {
    if (isMounted) error.value = e instanceof Error ? e.message : 'Gagal memuat tahun pelajaran.'
  }
})

onUnmounted(() => {
  isMounted = false
  ++loadVersion
})
</script>
