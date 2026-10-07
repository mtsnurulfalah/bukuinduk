<template>
  <div class="w-full min-w-0 max-w-3xl space-y-5">
    <PageHeader
      title="Tingkat Kelas"
      subtitle="Kelola tingkatan kelas seperti Kelas 7, 8, dan 9."
    >
      <template #actions>
        <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" size="sm" @click="openCreate">
          <Plus class="h-4 w-4" />
          Tambah Tingkat
        </BaseButton>
      </template>
    </PageHeader>

    <BaseRetry
      v-if="error"
      title="Data tingkat kelas gagal dimuat"
      :message="error"
      @retry="loadData"
    />

    <BaseCard v-else-if="isLoading" :padding="false">
      <div class="divide-y divide-slate-100">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-5 py-4">
          <BaseSkeleton height="h-10" class="w-10 rounded-xl" />
          <div class="min-w-0 flex-1 space-y-1.5">
            <BaseSkeleton height="h-4" class="w-32" />
            <BaseSkeleton height="h-3" class="w-48" />
          </div>
          <BaseSkeleton height="h-8" class="w-20 rounded-lg" />
        </div>
      </div>
    </BaseCard>

    <BaseCard v-else-if="!grades.length">
      <BaseEmpty
        title="Belum ada tingkat kelas"
        description="Tambahkan tingkat kelas seperti Kelas 7, Kelas 8, atau Kelas 9."
        type="data"
      >
        <template #action>
          <BaseButton v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" @click="openCreate">
            <Plus class="h-4 w-4" />
            Tambah Tingkat
          </BaseButton>
        </template>
      </BaseEmpty>
    </BaseCard>

    <BaseCard v-else :padding="false">
      <ul class="divide-y divide-slate-100">
        <li
          v-for="grade in grades"
          :key="grade.id"
          class="flex min-w-0 items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:items-center sm:px-5"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 font-bold">
            {{ grade.level }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold leading-snug text-slate-800" :title="grade.name">
              {{ grade.name }}
            </p>
            <p class="mt-0.5 text-sm text-slate-400 break-words">
              {{ grade.description || 'Tidak ada deskripsi' }}
            </p>
            <span class="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400 sm:hidden">
              <School class="h-3.5 w-3.5" />
              {{ classroomCountFor(grade.id) }} kelas
            </span>
          </div>

          <span class="hidden shrink-0 items-center gap-1.5 text-xs text-slate-400 sm:inline-flex">
            <School class="h-3.5 w-3.5" />
            {{ classroomCountFor(grade.id) }} kelas
          </span>

          <div v-if="can(PERMISSIONS.CLASSROOM_MANAGE)" class="flex shrink-0 items-center gap-1">
            <BaseButton
              variant="ghost"
              size="xs"
              title="Edit tingkat"
              :disabled="Boolean(deletingId)"
              @click="openEdit(grade)"
            >
              <Pencil class="h-4 w-4" />
              <span class="hidden sm:inline">Edit</span>
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="xs"
              class="text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Hapus tingkat"
              :disabled="Boolean(deletingId)"
              @click="handleDelete(grade)"
            >
              <Trash2 class="h-4 w-4" />
              <span class="hidden sm:inline">Hapus</span>
            </BaseButton>
          </div>
        </li>
      </ul>
    </BaseCard>

    <BaseModal
      v-model="modalOpen"
      :title="editTarget ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas'"
      size="sm"
    >
      <form id="grade-form" novalidate class="space-y-4" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="form.name"
          label="Nama Tingkat"
          placeholder="Contoh: Kelas 7"
          required
          :error-message="errors.name"
        />
        <BaseInput
          v-model.number="form.level"
          label="Urutan Level"
          type="number"
          min="1"
          max="99"
          placeholder="7"
          hint="Digunakan untuk mengurutkan tingkat pada dropdown."
          required
          :error-message="errors.level"
        />
        <BaseInput v-model="form.description" label="Deskripsi" placeholder="Opsional" />
      </form>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <BaseButton variant="outline" type="button" class="w-full sm:w-auto" :disabled="isSaving" @click="closeModal">
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            form="grade-form"
            class="w-full sm:w-auto"
            :loading="isSaving"
            loading-text="Menyimpan..."
          >
            <Save class="h-4 w-4" />
            {{ editTarget ? 'Simpan Perubahan' : 'Tambah Tingkat' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Hapus Tingkat Kelas"
      :message="\`Hapus tingkat '\${confirmDialog.options.value.message}'? Penghapusan akan ditolak jika masih dipakai oleh kelas.\`"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmDelete"
      @cancel="confirmDialog.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Save, School } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseButton, BaseInput, BaseModal,
  BaseEmpty, BaseSkeleton, BaseConfirmDialog, BaseRetry,
} from '@/components/ui'
import { classroomsService } from '@/services'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { usePermission, useConfirm } from '@/composables'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Classroom, Grade } from '@/types'

const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const confirmDialog = useConfirm()

const isLoading = ref(true)
const isSaving = ref(false)
const grades = ref<Grade[]>([])
const classrooms = ref<Classroom[]>([])
const error = ref('')
const deletingId = ref('')

const modalOpen = ref(false)
const editTarget = ref<Grade | null>(null)
const form = reactive({
  name: '',
  level: undefined as number | undefined,
  description: '',
})
const errors = reactive<{ name?: string; level?: string }>({})

function classroomCountFor(gradeId: string): number {
  return classrooms.value.filter(c => String(c.gradeId) === String(gradeId)).length
}

function clearForm() {
  form.name = ''
  form.level = undefined
  form.description = ''
  errors.name = undefined
  errors.level = undefined
}

function openCreate() {
  editTarget.value = null
  clearForm()
  modalOpen.value = true
}

function openEdit(grade: Grade) {
  editTarget.value = grade
  form.name = grade.name
  form.level = grade.level
  form.description = grade.description ?? ''
  errors.name = undefined
  errors.level = undefined
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editTarget.value = null
  clearForm()
}

function validate(): boolean {
  errors.name = undefined
  errors.level = undefined

  if (!form.name.trim()) {
    errors.name = 'Nama tingkat wajib diisi.'
  }

  const level = Number(form.level)
  if (!Number.isFinite(level) || !Number.isInteger(level) || level < 1 || level > 99) {
    errors.level = 'Level harus berupa angka bulat 1–99.'
  }

  return !errors.name && !errors.level
}

async function handleSubmit() {
  if (isSaving.value || !validate()) return
  const wasEdit = Boolean(editTarget.value)
  isSaving.value = true

  try {
    const payload = {
      name: form.name.trim(),
      level: Number(form.level),
      description: form.description.trim(),
    }

    if (editTarget.value) {
      const updated = await classroomsService.updateGrade(editTarget.value.id, payload)
      schoolYearStore.updateGrade(updated)

      const index = grades.value.findIndex(g => g.id === updated.id)
      if (index >= 0) grades.value[index] = updated
      else grades.value.push(updated)
    } else {
      const created = await classroomsService.createGrade(payload)
      schoolYearStore.addGrade(created)
      grades.value.push(created)
    }

    grades.value.sort((a, b) => a.level - b.level)
    closeModal()
    toast.success(wasEdit ? 'Tingkat kelas berhasil diperbarui.' : 'Tingkat kelas berhasil ditambahkan.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan tingkat kelas.')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(grade: Grade) {
  if (deletingId.value) return

  const ok = await confirmDialog.confirm({
    message: grade.name,
    type: 'danger',
  })
  if (!ok) return

  deletingId.value = grade.id
  confirmDialog.isLoading.value = true

  try {
    await classroomsService.deleteGrade(grade.id)
    schoolYearStore.removeGrade(grade.id)
    grades.value = grades.value.filter(g => g.id !== grade.id)
    toast.success('Tingkat kelas berhasil dihapus.')
    confirmDialog.isOpen.value = false
    confirmDialog.onConfirm()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus tingkat kelas.')
  } finally {
    confirmDialog.isLoading.value = false
    deletingId.value = ''
  }
}

async function loadData() {
  isLoading.value = true
  error.value = ''

  const [gradeResult, classroomResult] = await Promise.allSettled([
    classroomsService.listGrades(),
    classroomsService.list(),
  ])

  const errorsFound: string[] = []

  if (gradeResult.status === 'fulfilled') {
    grades.value = [...gradeResult.value].sort((a, b) => a.level - b.level)
    schoolYearStore.grades = [...grades.value]
  } else {
    errorsFound.push('tingkat kelas')
  }

  if (classroomResult.status === 'fulfilled') {
    classrooms.value = classroomResult.value
  } else {
    errorsFound.push('data kelas')
  }

  if (errorsFound.length) {
    error.value = \`Gagal memuat \${errorsFound.join(' dan ')}. Coba lagi.\`
  }

  isLoading.value = false
}

onMounted(() => {
  void loadData()
})
</script>
