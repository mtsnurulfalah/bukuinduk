<template>
  <div class="space-y-5 max-w-3xl">

    <PageHeader title="Tingkat Kelas" subtitle="Kelola tingkatan kelas (Kelas 7, 8, 9, dll.)">
      <template #actions>
        <BaseButton
          v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
          size="sm"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" /> Tambah Tingkat
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Loading skeleton -->
    <BaseCard v-if="isLoading" :padding="false">
      <div class="divide-y divide-slate-100">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-5 py-4">
          <BaseSkeleton height="h-10" class="w-10 rounded-xl" />
          <div class="flex-1 space-y-1.5">
            <BaseSkeleton height="h-4" class="w-32" />
            <BaseSkeleton height="h-3" class="w-48" />
          </div>
          <BaseSkeleton height="h-8" class="w-20 rounded-lg" />
        </div>
      </div>
    </BaseCard>

    <!-- Empty state -->
    <BaseCard v-else-if="!grades.length" :padding="true">
      <BaseEmpty
        title="Belum ada tingkat kelas"
        description="Tambahkan tingkat kelas seperti Kelas 7, Kelas 8, atau Kelas 9."
        type="data"
      >
        <template #action>
          <BaseButton
            v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" /> Tambah Tingkat
          </BaseButton>
        </template>
      </BaseEmpty>
    </BaseCard>

    <!-- Daftar tingkat kelas -->
    <BaseCard v-else :padding="false">
      <ul class="divide-y divide-slate-100">
        <li
          v-for="grade in grades"
          :key="grade.id"
          class="flex items-center gap-4 px-5 py-4 group hover:bg-slate-50 transition-colors"
        >
          <!-- Badge level -->
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 text-primary-700 font-bold text-base shrink-0">
            {{ grade.level }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 leading-snug">{{ grade.name }}</p>
            <p v-if="grade.description" class="text-sm text-slate-400 truncate mt-0.5">
              {{ grade.description }}
            </p>
            <p v-else class="text-sm text-slate-300 mt-0.5">Tidak ada deskripsi</p>
          </div>

          <!-- Jumlah kelas yang pakai tingkat ini -->
          <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <School class="h-3.5 w-3.5" />
            {{ classroomCountFor(grade.id) }} kelas
          </span>

          <!-- Aksi -->
          <div
            v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
            class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200"
              title="Edit"
              @click="openEdit(grade)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
              title="Hapus"
              @click="handleDelete(grade)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </li>
      </ul>
    </BaseCard>

    <!-- ── Modal Form Tambah / Edit ─────────────────────────── -->
    <BaseModal
      v-model="modalOpen"
      :title="editTarget ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas'"
      size="sm"
      @update:model-value="onModalClose"
    >
      <form
        id="grade-form"
        novalidate
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <BaseInput
          v-model="form.name"
          label="Nama Tingkat"
          placeholder="Contoh: Kelas 7"
          required
          :error-message="errors.name"
          autofocus
        />
        <BaseInput
          v-model.number="form.level"
          label="Urutan Level"
          type="number"
          min="1"
          max="99"
          placeholder="7"
          hint="Digunakan untuk mengurutkan tingkat kelas di dropdown."
          required
          :error-message="errors.level"
        />
        <BaseInput
          v-model="form.description"
          label="Deskripsi"
          placeholder="Opsional"
        />
      </form>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="outline" type="button" @click="onModalClose">
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            form="grade-form"
            :loading="isSaving"
            loading-text="Menyimpan..."
          >
            <Save class="h-4 w-4" />
            {{ editTarget ? 'Simpan Perubahan' : 'Tambah Tingkat' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── Confirm Dialog Hapus ─────────────────────────────── -->
    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Hapus Tingkat Kelas"
      :message="`Hapus tingkat '${confirmDialog.options.value.message}'? Tindakan ini tidak dapat dibatalkan.`"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.onCancel()"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Save, School } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseButton, BaseInput, BaseModal,
  BaseEmpty, BaseSkeleton, BaseConfirmDialog,
} from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { classroomsService } from '@/services'
import { usePermission, useConfirm } from '@/composables'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Grade } from '@/types'

const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()
const { can } = usePermission()
const confirmDialog = useConfirm()

// ── State ─────────────────────────────────────────────────────
const isLoading = ref(false)
const grades = ref<Grade[]>([])

// ── Modal / Form ──────────────────────────────────────────────
const modalOpen = ref(false)
const isSaving = ref(false)
const editTarget = ref<Grade | null>(null)

const form = reactive({ name: '', level: undefined as number | undefined, description: '' })
const errors = reactive<{ name?: string; level?: string }>({})

// ── Helpers ───────────────────────────────────────────────────

/**
 * Hitung berapa kelas yang menggunakan tingkat ini dari classroomsStore.list.
 * Digunakan untuk konfirmasi sebelum hapus dan info di baris list.
 */
function classroomCountFor(gradeId: string): number {
  return classroomsStore.list.filter(c => String(c.gradeId) === String(gradeId)).length
}

function resetForm() {
  form.name = ''
  form.level = undefined
  form.description = ''
  errors.name = undefined
  errors.level = undefined
}

function openCreate() {
  editTarget.value = null
  resetForm()
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

function onModalClose() {
  modalOpen.value = false
  editTarget.value = null
  resetForm()
}

// ── Validasi lokal (ringan, tidak butuh Yup) ──────────────────
function validate(): boolean {
  let valid = true
  errors.name = undefined
  errors.level = undefined

  if (!form.name.trim()) {
    errors.name = 'Nama tingkat wajib diisi.'
    valid = false
  }
  if (form.level === undefined || form.level === null || form.level === ('' as unknown) || isNaN(Number(form.level))) {
    errors.level = 'Urutan level wajib diisi.'
    valid = false
  } else if (Number(form.level) < 1) {
    errors.level = 'Level minimal 1.'
    valid = false
  }
  return valid
}

// ── CRUD ──────────────────────────────────────────────────────

async function handleSubmit() {
  if (!validate()) return

  isSaving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      level: Number(form.level),
      description: form.description.trim(),
    }

    if (editTarget.value) {
      // Update
      const updated = await classroomsService.updateGrade(editTarget.value.id, payload)
      // Sinkronisasi ke store agar gradeOptions di seluruh app terupdate
      schoolYearStore.updateGrade(updated)
      // Update list lokal dan urutkan ulang — level bisa berubah saat edit
      const idx = grades.value.findIndex(g => g.id === updated.id)
      if (idx !== -1) grades.value[idx] = updated
      grades.value.sort((a, b) => a.level - b.level)
      toast.success('Tingkat kelas berhasil diperbarui.')
    } else {
      // Create
      const created = await classroomsService.createGrade(payload)
      schoolYearStore.addGrade(created)
      grades.value.push(created)
      // Urutkan ulang berdasarkan level
      grades.value.sort((a, b) => a.level - b.level)
      toast.success('Tingkat kelas berhasil ditambahkan.')
    }

    onModalClose()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan tingkat kelas.')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(grade: Grade) {
  // Peringatan jika tingkat ini masih dipakai kelas
  const count = classroomCountFor(grade.id)
  const message = count > 0
    ? `${grade.name} (${count} kelas masih menggunakan tingkat ini)`
    : grade.name

  const ok = await confirmDialog.confirm({ message, type: 'danger' })
  if (!ok) return

  confirmDialog.isLoading.value = true
  try {
    await classroomsService.deleteGrade(grade.id)
    schoolYearStore.removeGrade(grade.id)
    grades.value = grades.value.filter(g => g.id !== grade.id)
    toast.success('Tingkat kelas berhasil dihapus.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus tingkat kelas.')
  } finally {
    confirmDialog.isLoading.value = false
  }
}

// ── Load ──────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true
  try {
    // Selalu fetch fresh — halaman ini adalah sumber kebenaran untuk grades
    await schoolYearStore.fetchGrades()
    grades.value = [...schoolYearStore.grades].sort((a, b) => a.level - b.level)
    // Muat juga classrooms agar classroomCountFor() bisa menampilkan jumlah kelas
    await classroomsStore.fetch()
  } finally {
    isLoading.value = false
  }
})
</script>
