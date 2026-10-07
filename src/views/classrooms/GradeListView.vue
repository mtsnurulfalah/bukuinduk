<template>
  <div class="w-full min-w-0 max-w-3xl space-y-5 pb-6">
    <PageHeader
      title="Tingkat Kelas"
      subtitle="Kelola tingkatan kelas seperti Kelas 7, Kelas 8, dan Kelas 9."
    >
      <template #actions>
        <BaseButton
          v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
          size="sm"
          class="w-full sm:w-auto"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          <span>Tambah Tingkat</span>
        </BaseButton>
      </template>
    </PageHeader>

    <BaseRetry
      v-if="loadError"
      title="Data tingkat kelas gagal dimuat"
      :message="loadError"
      :loading="isRetrying"
      @retry="retryLoad"
    />

    <BaseCard v-else-if="isLoading" :padding="false">
      <div class="divide-y divide-slate-100">
        <div
          v-for="i in 5"
          :key="i"
          class="flex min-w-0 items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5"
        >
          <BaseSkeleton height="h-10" width="w-10" class="rounded-xl" />
          <div class="min-w-0 flex-1 space-y-1.5">
            <BaseSkeleton height="h-4" width="w-32" />
            <BaseSkeleton height="h-3" width="w-48" />
          </div>
          <BaseSkeleton height="h-10" width="w-20" class="rounded-lg" />
        </div>
      </div>
    </BaseCard>

    <BaseCard v-else-if="!grades.length" :padding="true">
      <BaseEmpty
        title="Belum ada tingkat kelas"
        description="Tambahkan tingkat kelas seperti Kelas 7, Kelas 8, atau Kelas 9 untuk digunakan pada data kelas."
        type="data"
      >
        <template #action>
          <BaseButton
            v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
            @click="openCreate"
          >
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
          class="flex min-w-0 items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-base font-bold text-primary-700"
          >
            {{ grade.level }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="break-words font-semibold leading-snug text-slate-800">
              {{ grade.name }}
            </p>
            <p
              v-if="grade.description"
              class="mt-0.5 break-words text-sm text-slate-400"
            >
              {{ grade.description }}
            </p>
            <p v-else class="mt-0.5 text-sm text-slate-300">
              Tidak ada deskripsi
            </p>
          </div>

          <span
            class="hidden shrink-0 items-center gap-1.5 text-xs text-slate-400 sm:inline-flex"
          >
            <School class="h-3.5 w-3.5" />
            {{ classroomCountFor(grade.id) }} kelas
          </span>

          <div
            v-if="can(PERMISSIONS.CLASSROOM_MANAGE)"
            class="flex shrink-0 items-center gap-1"
          >
            <button
              type="button"
              class="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
              title="Edit tingkat"
              aria-label="Edit tingkat kelas"
              :disabled="isSaving"
              @click="openEdit(grade)"
            >
              <Pencil class="h-4 w-4" />
            </button>

            <button
              type="button"
              class="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
              title="Hapus tingkat"
              aria-label="Hapus tingkat kelas"
              :disabled="isSaving || confirmDialog.isLoading.value"
              @click="handleDelete(grade)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </li>
      </ul>
    </BaseCard>

    <BaseModal
      v-model="modalOpen"
      :title="editTarget ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas'"
      subtitle="Atur nama dan level untuk digunakan pada data kelas."
      size="sm"
      :show-close="!isSaving"
      :close-on-backdrop="!isSaving"
    >
      <form
        id="grade-form"
        class="space-y-4"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <BaseInput
          v-model="form.name"
          label="Nama Tingkat"
          placeholder="Contoh: Kelas 7"
          required
          autocomplete="off"
          :disabled="isSaving"
          :error-message="errors.name"
          autofocus
        />

        <BaseInput
          v-model.number="form.level"
          label="Urutan Level"
          type="number"
          min="1"
          max="99"
          step="1"
          inputmode="numeric"
          placeholder="7"
          hint="Gunakan angka 1–99. Nilai ini menentukan urutan pada dropdown tingkat kelas."
          required
          :disabled="isSaving"
          :error-message="errors.level"
        />

        <BaseInput
          v-model="form.description"
          label="Deskripsi"
          placeholder="Opsional"
          autocomplete="off"
          :disabled="isSaving"
        />
      </form>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <BaseButton
            variant="outline"
            type="button"
            class="w-full sm:w-auto"
            :disabled="isSaving"
            @click="onModalClose"
          >
            Batal
          </BaseButton>

          <BaseButton
            type="submit"
            form="grade-form"
            class="w-full sm:w-auto"
            :loading="isSaving"
            :disabled="isSaving"
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
      :message="'Hapus tingkat \''
        + confirmDialog.options.value.message
        + '\'? Tindakan ini tidak dapat dibatalkan.'"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.onCancel()"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from 'vue'
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  School,
} from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseEmpty,
  BaseSkeleton,
  BaseConfirmDialog,
  BaseRetry,
} from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { classroomsService } from '@/services'
import {
  usePermission,
  useConfirm,
} from '@/composables'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Grade } from '@/types'

const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()
const { can } = usePermission()
const confirmDialog = useConfirm()

const isLoading = ref(true)
const isRetrying = ref(false)
const isSaving = ref(false)

const grades = ref<Grade[]>([])
const loadError = ref('')

const modalOpen = ref(false)
const editTarget = ref<Grade | null>(null)

const form = reactive({
  name: '',
  level: undefined as number | undefined,
  description: '',
})

const errors = reactive<{
  name?: string
  level?: string
}>({})

let loadVersion = 0
let isMounted = false

const hasManagePermission = computed(() =>
  can(PERMISSIONS.CLASSROOM_MANAGE),
)

function sortGrades(items: Grade[]): Grade[] {
  return [...items].sort((a, b) => {
    const levelDiff = Number(a.level) - Number(b.level)
    if (levelDiff !== 0) return levelDiff

    return String(a.name ?? '').localeCompare(
      String(b.name ?? ''),
      'id',
    )
  })
}

function classroomCountFor(gradeId: string): number {
  return classroomsStore.list.filter(classroom =>
    String(classroom.gradeId) === String(gradeId),
  ).length
}

function resetForm() {
  form.name = ''
  form.level = undefined
  form.description = ''
  errors.name = undefined
  errors.level = undefined
}

function openCreate() {
  if (!hasManagePermission.value || isSaving.value) return

  editTarget.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(grade: Grade) {
  if (!hasManagePermission.value || isSaving.value) return

  editTarget.value = grade
  form.name = String(grade.name ?? '')
  form.level = Number(grade.level)
  form.description = String(grade.description ?? '')
  errors.name = undefined
  errors.level = undefined
  modalOpen.value = true
}

function onModalClose() {
  if (isSaving.value) return

  modalOpen.value = false
  editTarget.value = null
  resetForm()
}

function validate(): boolean {
  errors.name = undefined
  errors.level = undefined

  let valid = true
  const name = String(form.name ?? '').trim()
  const level = Number(form.level)

  if (!name) {
    errors.name = 'Nama tingkat wajib diisi.'
    valid = false
  } else if (name.length > 100) {
    errors.name = 'Nama tingkat maksimal 100 karakter.'
    valid = false
  }

  if (
    form.level === undefined ||
    form.level === null ||
    !Number.isFinite(level)
  ) {
    errors.level = 'Urutan level wajib diisi.'
    valid = false
  } else if (!Number.isInteger(level)) {
    errors.level = 'Level harus berupa angka bulat.'
    valid = false
  } else if (level < 1 || level > 99) {
    errors.level = 'Level harus berada antara 1 sampai 99.'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (
    isSaving.value ||
    isLoading.value ||
    !hasManagePermission.value ||
    !modalOpen.value
  ) {
    return
  }

  if (!validate()) return

  isSaving.value = true

  const payload = {
    name: String(form.name ?? '').trim(),
    level: Number(form.level),
    description: String(form.description ?? '').trim(),
  }

  try {
    if (editTarget.value) {
      const targetId =
        String(editTarget.value.id ?? '').trim()

      if (!targetId) {
        throw new Error('ID tingkat kelas tidak valid.')
      }

      const updated =
        await classroomsService.updateGrade(
          targetId,
          payload,
        )

      if (!isMounted) return

      schoolYearStore.updateGrade(updated)

      grades.value = sortGrades(
        grades.value.map(grade =>
          grade.id === updated.id
            ? updated
            : grade,
        ),
      )

      toast.success(
        'Tingkat kelas berhasil diperbarui.',
      )
    } else {
      const created =
        await classroomsService.createGrade(
          payload,
        )

      if (!isMounted) return

      schoolYearStore.addGrade(created)

      grades.value = sortGrades([
        ...grades.value,
        created,
      ])

      toast.success(
        'Tingkat kelas berhasil ditambahkan.',
      )
    }

    onModalClose()
  } catch (e: unknown) {
    toast.error(
      e instanceof Error
        ? e.message
        : 'Gagal menyimpan tingkat kelas.',
    )
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(grade: Grade) {
  if (
    !hasManagePermission.value ||
    isSaving.value ||
    confirmDialog.isLoading.value
  ) {
    return
  }

  const count =
    classroomCountFor(grade.id)

  const message =
    count > 0
      ? grade.name +
        ' (' +
        count +
        ' kelas masih menggunakan tingkat ini)'
      : grade.name

  const ok =
    await confirmDialog.confirm({
      message,
      type: 'danger',
    })

  if (!ok || !isMounted) return

  confirmDialog.isLoading.value = true

  try {
    await classroomsService.deleteGrade(
      grade.id,
    )

    if (!isMounted) return

    schoolYearStore.removeGrade(
      grade.id,
    )

    grades.value = grades.value.filter(
      item => item.id !== grade.id,
    )

    toast.success(
      'Tingkat kelas berhasil dihapus.',
    )
  } catch (e: unknown) {
    toast.error(
      e instanceof Error
        ? e.message
        : 'Gagal menghapus tingkat kelas.',
    )
  } finally {
    confirmDialog.isLoading.value = false
  }
}

async function loadData(
  forceRefresh = false,
) {
  const requestVersion = ++loadVersion
  isLoading.value = true
  loadError.value = ''

  try {
    const gradesData =
      await classroomsService.listGrades()

    if (
      !isMounted ||
      requestVersion !== loadVersion
    ) {
      return
    }

    schoolYearStore.grades =
      sortGrades(gradesData)

    grades.value =
      sortGrades(gradesData)

    if (
      forceRefresh ||
      !classroomsStore.initialized
    ) {
      await classroomsStore.fetch(
        undefined,
        forceRefresh,
      )
    }

    if (
      !isMounted ||
      requestVersion !== loadVersion
    ) {
      return
    }
  } catch (e: unknown) {
    if (
      !isMounted ||
      requestVersion !== loadVersion
    ) {
      return
    }

    loadError.value =
      e instanceof Error
        ? e.message
        : 'Gagal memuat data tingkat kelas.'
  } finally {
    if (
      isMounted &&
      requestVersion === loadVersion
    ) {
      isLoading.value = false
    }
  }
}

async function retryLoad() {
  if (
    isRetrying.value ||
    isSaving.value
  ) {
    return
  }

  isRetrying.value = true

  try {
    await loadData(true)
  } finally {
    if (isMounted) {
      isRetrying.value = false
    }
  }
}

watch(
  modalOpen,
  value => {
    if (!value && !isSaving.value) {
      editTarget.value = null
      resetForm()
    }
  },
)

onMounted(() => {
  isMounted = true
  void loadData()
})

onUnmounted(() => {
  isMounted = false
  ++loadVersion
})
</script>
