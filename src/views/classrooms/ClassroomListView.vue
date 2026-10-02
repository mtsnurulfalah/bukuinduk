<template>
  <div class="space-y-5">
    <PageHeader title="Kelas & Rombel" :subtitle="`${classrooms.length} kelas ditemukan`">
      <template #actions>
        <BaseSelect
          v-model="selectedSchoolYearId"
          :options="schoolYearStore.schoolYearOptions"
          placeholder="Pilih Tahun Pelajaran"
          class="w-44"
          @update:model-value="loadClassrooms"
        />
        <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" size="sm" @click="$router.push('/classrooms/create')">
          <Plus class="h-4 w-4" /> Tambah Kelas
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseSkeleton v-for="i in 6" :key="i" height="h-32" />
    </div>

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
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, School, Users, GraduationCap, Pencil, Trash2 } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseButton, BaseSelect, BaseBadge, BaseSkeleton, BaseEmpty, BaseConfirmDialog } from '@/components/ui'
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

// BUG-61 FIX: Gunakan computed agar selectedSchoolYearId reaktif terhadap
// perubahan activeSchoolYear. Sebelumnya ref() hanya di-set sekali saat
// komponen mount, tidak berubah jika admin mengubah tahun aktif.
const selectedSchoolYearId = computed({
  get: () => _selectedId.value || schoolYearStore.activeSchoolYear?.id || '',
  set: (v: string) => { _selectedId.value = v },
})
const _selectedId = ref('')

let deleteTargetId = ''

async function loadClassrooms() {
  isLoading.value = true
  try {
    classrooms.value = await classroomsService.list(selectedSchoolYearId.value || undefined)
  } catch { toast.error('Gagal memuat data kelas.') }
  finally { isLoading.value = false }
}

// BUG-61 FIX: Watch selectedSchoolYearId agar reload otomatis saat tahun pelajaran
// aktif berubah (misalnya admin mengubah di tab Settings).
watch(selectedSchoolYearId, () => {
  loadClassrooms()
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
  await schoolYearStore.fetch()
  // selectedSchoolYearId computed sudah mengambil activeSchoolYear dari store
  await loadClassrooms()
})
</script>
