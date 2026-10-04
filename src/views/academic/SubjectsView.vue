<template>
  <div class="space-y-5">
    <PageHeader
      title="Mata Pelajaran"
      subtitle="Kelola mata pelajaran aktif berdasarkan tahun pelajaran."
      :breadcrumbs="[{ label: 'Akademik' }, { label: 'Mata Pelajaran' }]"
    >
      <template #actions>
        <BaseButton v-if="canManage" size="sm" @click="openCreate">
          <Plus class="h-4 w-4" />
          Tambah Mata Pelajaran
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-end gap-3">
        <BaseSelect
          v-model="schoolYearId"
          label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions"
          class="w-full sm:w-56"
          @update:model-value="load"
        />
        <p class="text-xs text-slate-400 pb-2">
          Perubahan mata pelajaran berlaku untuk tahun pelajaran yang dipilih.
        </p>
      </div>
    </BaseCard>

    <BaseRetry v-if="error" title="Data mata pelajaran gagal dimuat" :message="error" @retry="load" />

    <BaseCard v-else title="Daftar Mata Pelajaran">
      <div v-if="isLoading" class="space-y-2">
        <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
      </div>

      <div v-else-if="!subjects.length" class="py-10 text-center">
        <BookOpen class="h-10 w-10 mx-auto text-slate-200 mb-3" />
        <p class="text-sm text-slate-500">Belum ada mata pelajaran pada tahun pelajaran ini.</p>
        <p v-if="canManage" class="text-xs text-slate-400 mt-1">Tambahkan mata pelajaran untuk menjadi acuan input nilai.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-y border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3 text-left">No</th>
              <th class="px-4 py-3 text-left">Kode</th>
              <th class="px-4 py-3 text-left">Mata Pelajaran</th>
              <th class="px-4 py-3 text-left">Kelompok</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th v-if="canManage" class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="(subject, index) in subjects" :key="subject.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 text-xs text-slate-400">{{ index + 1 }}</td>
              <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ subject.code || '—' }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-slate-800">{{ subject.name }}</p>
                <p v-if="subject.shortName" class="text-xs text-slate-400 mt-0.5">{{ subject.shortName }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ subject.groupName || '—' }}</td>
              <td class="px-4 py-3 text-center">
                <BaseBadge :color="subject.isActive ? 'green' : 'slate'">{{ subject.isActive ? 'Aktif' : 'Nonaktif' }}</BaseBadge>
              </td>
              <td v-if="canManage" class="px-4 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <button type="button" class="action-btn hover:text-primary-600 hover:bg-primary-50" title="Edit" @click="openEdit(subject)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button type="button" class="action-btn hover:text-red-600 hover:bg-red-50" title="Hapus" @click="remove(subject)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <BaseModal v-model="showModal" :title="editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'" size="md">
      <div class="space-y-4">
        <BaseAlert v-if="formError" type="error">{{ formError }}</BaseAlert>
        <BaseInput v-model="form.name" label="Nama Mata Pelajaran" required placeholder="Contoh: Bahasa Indonesia" />
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="form.code" label="Kode" placeholder="BIND" />
          <BaseInput v-model="form.shortName" label="Singkatan" placeholder="Bahasa Indonesia" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="form.groupName" label="Kelompok" placeholder="Umum / Keagamaan / Muatan Lokal" />
          <BaseInput v-model.number="form.sortOrder" label="Urutan" type="number" min="0" placeholder="1" />
        </div>
        <BaseSelect
          v-model="form.isActive"
          label="Status"
          :options="[{ value: true, label: 'Aktif' }, { value: false, label: 'Nonaktif' }]"
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" @click="showModal = false">Batal</BaseButton>
          <BaseButton :loading="isSaving" @click="save">
            <Save class="h-4 w-4" />
            Simpan
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { BookOpen, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseInput, BaseModal, BaseRetry, BaseSelect, BaseSkeleton } from '@/components/ui'
import { PageHeader } from '@/components/shared'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { usePermission } from '@/composables'
import { subjectsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Subject } from '@/types'

const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const canManage = computed(() => can(PERMISSIONS.SUBJECT_MANAGE))

const schoolYearId = ref('')
const subjects = ref<Subject[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref('')
const formError = ref('')
const showModal = ref(false)
const editingId = ref('')

const form = reactive({
  name: '',
  code: '',
  shortName: '',
  groupName: '',
  sortOrder: 0,
  isActive: true,
})

function resetForm() {
  form.name = ''
  form.code = ''
  form.shortName = ''
  form.groupName = ''
  form.sortOrder = subjects.value.length + 1
  form.isActive = true
  editingId.value = ''
  formError.value = ''
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(subject: Subject) {
  editingId.value = subject.id
  form.name = subject.name
  form.code = subject.code || ''
  form.shortName = subject.shortName || ''
  form.groupName = subject.groupName || ''
  form.sortOrder = subject.sortOrder || 0
  form.isActive = subject.isActive
  formError.value = ''
  showModal.value = true
}

async function load() {
  if (!schoolYearId.value) return
  isLoading.value = true
  error.value = ''
  try {
    subjects.value = await subjectsService.list(schoolYearId.value)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat mata pelajaran.'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!schoolYearId.value || !form.name.trim()) {
    formError.value = 'Tahun pelajaran dan nama mata pelajaran wajib diisi.'
    return
  }
  isSaving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      const updated = await subjectsService.update({ id: editingId.value, schoolYearId: schoolYearId.value, ...form })
      const index = subjects.value.findIndex(s => s.id === updated.id)
      if (index >= 0) subjects.value[index] = updated
      else subjects.value.push(updated)
    } else {
      const created = await subjectsService.create({ schoolYearId: schoolYearId.value, ...form })
      subjects.value.push(created)
      subjects.value.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    }
    toast.success('Mata pelajaran berhasil disimpan.')
    showModal.value = false
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan mata pelajaran.'
  } finally {
    isSaving.value = false
  }
}

async function remove(subject: Subject) {
  const ok = window.confirm('Hapus mata pelajaran "' + subject.name + '"? Data dengan nilai tidak dapat dihapus.')
  if (!ok) return
  try {
    await subjectsService.remove(subject.id)
    subjects.value = subjects.value.filter(s => s.id !== subject.id)
    toast.success('Mata pelajaran berhasil dihapus.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus mata pelajaran.')
  }
}

onMounted(async () => {
  await schoolYearStore.fetch()
  schoolYearId.value = schoolYearStore.activeSchoolYear?.id ?? schoolYearStore.schoolYears[0]?.id ?? ''
  await load()
})
</script>

<style scoped>
.action-btn {
  @apply p-1.5 rounded-lg text-slate-400 transition-colors min-w-[2rem] min-h-[2rem] flex items-center justify-center;
}
</style>
