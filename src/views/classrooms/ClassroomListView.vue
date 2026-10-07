<template>
  <div class="min-w-0 space-y-5">
    <PageHeader
      title="Kelas & Rombel"
      :subtitle="`${filteredClassrooms.length} dari ${classrooms.length} kelas`"
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
const statusFilter = ref('all')
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
  void router.push(`/classrooms/${id}/edit`)
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
    classroomsStore.list = [...classrooms.value]
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