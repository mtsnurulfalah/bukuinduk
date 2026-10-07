<template>
  <div class="w-full min-w-0 space-y-5 pb-6">
    <PageHeader
      title="Mata Pelajaran"
      subtitle="Kelola mata pelajaran berdasarkan tahun pelajaran yang dipilih."
      :breadcrumbs="[{ label: 'Akademik' }, { label: 'Mata Pelajaran' }]"
    >
      <template #actions>
        <BaseButton
          v-if="canManage"
          size="sm"
          class="w-full sm:w-auto"
          :disabled="isMutating || isLoading"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          <span>Tambah Mata Pelajaran</span>
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard>
      <div class="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-end">
        <BaseSelect
          v-model="schoolYearId"
          label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions"
          :disabled="schoolYearStore.isLoading || isMutating"
          required
          class="w-full"
          @update:model-value="handleSchoolYearChange"
        />
        <div class="flex min-w-0 items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          <BookOpen class="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
          <p class="min-w-0 break-words">
            Daftar mata pelajaran dipisahkan per tahun pelajaran. Perubahan di sini hanya memengaruhi tahun yang sedang dipilih.
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseRetry
      v-if="error"
      title="Data mata pelajaran gagal dimuat"
      :message="error"
      :loading="isRetrying"
      @retry="retryLoad"
    />

    <BaseCard
      v-else
      title="Daftar Mata Pelajaran"
      :subtitle="subjects.length ? subjects.length + ' mata pelajaran pada tahun pelajaran ini.' : 'Belum ada data pada tahun pelajaran ini.'"
      :padding="false"
      class="overflow-hidden"
    >
      <div v-if="isLoading" class="space-y-2 p-5" aria-live="polite" aria-busy="true">
        <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
      </div>

      <div v-else-if="!subjects.length" class="px-5 py-12 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
          <BookOpen class="h-6 w-6 text-slate-300" aria-hidden="true" />
        </div>
        <p class="mt-4 text-sm font-medium text-slate-600">Belum ada mata pelajaran.</p>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          Tambahkan mata pelajaran untuk menjadi acuan input nilai pada tahun pelajaran ini.
        </p>
        <BaseButton
          v-if="canManage"
          size="sm"
          class="mt-4"
          :disabled="isMutating"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          Tambah Mata Pelajaran
        </BaseButton>
      </div>

      <template v-else>
        <!-- Mobile: card list untuk menjaga layout tetap nyaman tanpa horizontal scroll. -->
        <div class="divide-y divide-slate-100 md:hidden">
          <article
            v-for="subject in subjects"
            :key="subject.id"
            class="min-w-0 px-4 py-4"
          >
            <div class="flex min-w-0 items-start gap-3">
              <div class="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <BookOpen class="h-4 w-4" aria-hidden="true" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="break-words font-semibold leading-snug text-slate-800">{{ subject.name }}</p>
                    <p v-if="subject.shortName" class="mt-0.5 break-words text-xs text-slate-400">
                      {{ subject.shortName }}
                    </p>
                  </div>
                  <BaseBadge
                    :color="subject.isActive ? 'green' : 'slate'"
                    dot
                    class="shrink-0"
                  >
                    {{ subject.isActive ? 'Aktif' : 'Nonaktif' }}
                  </BaseBadge>
                </div>

                <div class="mt-3 grid min-w-0 grid-cols-2 gap-2 text-xs">
                  <div class="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                    <span class="block text-[11px] text-slate-400">Kode</span>
                    <span class="mt-0.5 block break-all font-mono text-slate-600">{{ subject.code || '—' }}</span>
                  </div>
                  <div class="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                    <span class="block text-[11px] text-slate-400">Kelompok</span>
                    <span class="mt-0.5 block break-words text-slate-600">{{ subject.groupName || '—' }}</span>
                  </div>
                </div>

                <div v-if="canManage" class="mt-3 flex gap-2">
                  <button
                    type="button"
                    class="action-btn flex-1 gap-2"
                    :disabled="isMutating"
                    aria-label="Edit mata pelajaran"
                    title="Edit"
                    @click="openEdit(subject)"
                  >
                    <Pencil class="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    class="action-btn danger flex-1 gap-2"
                    :disabled="isMutating"
                    aria-label="Hapus mata pelajaran"
                    title="Hapus"
                    @click="remove(subject)"
                  >
                    <Trash2 class="h-4 w-4" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Desktop/tablet: tabel tetap dipertahankan, tetapi scroll hanya terjadi di area tabel. -->
        <div class="hidden max-w-full overflow-x-auto overscroll-x-contain md:block">
          <table class="w-full min-w-[720px] table-fixed text-sm">
            <thead>
              <tr class="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th class="w-14 px-4 py-3 text-left font-medium">No</th>
                <th class="w-28 px-4 py-3 text-left font-medium">Kode</th>
                <th class="px-4 py-3 text-left font-medium">Mata Pelajaran</th>
                <th class="w-44 px-4 py-3 text-left font-medium">Kelompok</th>
                <th class="w-28 px-4 py-3 text-center font-medium">Status</th>
                <th v-if="canManage" class="w-28 px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr
                v-for="(subject, index) in subjects"
                :key="subject.id"
                class="align-top transition-colors hover:bg-slate-50"
              >
                <td class="px-4 py-3 text-xs text-slate-400">{{ index + 1 }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-500">
                  <span class="break-all">{{ subject.code || '—' }}</span>
                </td>
                <td class="min-w-0 px-4 py-3">
                  <p class="break-words font-medium text-slate-800">{{ subject.name }}</p>
                  <p v-if="subject.shortName" class="mt-0.5 break-words text-xs text-slate-400">
                    {{ subject.shortName }}
                  </p>
                </td>
                <td class="px-4 py-3 break-words text-slate-600">{{ subject.groupName || '—' }}</td>
                <td class="px-4 py-3 text-center">
                  <BaseBadge :color="subject.isActive ? 'green' : 'slate'" dot>
                    {{ subject.isActive ? 'Aktif' : 'Nonaktif' }}
                  </BaseBadge>
                </td>
                <td v-if="canManage" class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="action-btn"
                      :disabled="isMutating"
                      aria-label="Edit mata pelajaran"
                      title="Edit"
                      @click="openEdit(subject)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="action-btn danger"
                      :disabled="isMutating"
                      aria-label="Hapus mata pelajaran"
                      title="Hapus"
                      @click="remove(subject)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </BaseCard>

    <BaseModal
      v-model="showModal"
      :title="editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'"
      :subtitle="editingId ? 'Perbarui data mata pelajaran tanpa mengubah riwayat nilai.' : 'Isi data mata pelajaran untuk tahun pelajaran yang sedang dipilih.'"
      size="md"
      :show-close="!isSaving"
      :close-on-backdrop="!isSaving"
    >
      <form id="subject-form" class="space-y-4" novalidate @submit.prevent="save">
        <BaseAlert v-if="formError" type="error" title="Periksa data yang diisi">
          {{ formError }}
        </BaseAlert>

        <BaseInput
          v-model="form.name"
          label="Nama Mata Pelajaran"
          required
          maxlength="100"
          autocomplete="off"
          placeholder="Contoh: Bahasa Indonesia"
          :disabled="isSaving"
        />

        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="form.code"
            label="Kode"
            maxlength="30"
            autocomplete="off"
            placeholder="Contoh: BIND"
            hint="Opsional. Disimpan dalam huruf kapital."
            :disabled="isSaving"
          />
          <BaseInput
            v-model="form.shortName"
            label="Singkatan"
            maxlength="50"
            autocomplete="off"
            placeholder="Contoh: B. Indonesia"
            :disabled="isSaving"
          />
        </div>

        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="form.groupName"
            label="Kelompok"
            maxlength="60"
            autocomplete="off"
            placeholder="Umum / Keagamaan / Muatan Lokal"
            :disabled="isSaving"
          />
          <BaseInput
            v-model.number="form.sortOrder"
            label="Urutan"
            type="number"
            min="0"
            max="9999"
            step="1"
            inputmode="numeric"
            hint="Angka lebih kecil tampil lebih dahulu. Kosong = 0."
            :disabled="isSaving"
          />
        </div>

        <label
          :class="[
            'flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3',
            isSaving ? 'cursor-not-allowed bg-slate-50 opacity-70' : 'cursor-pointer bg-white hover:bg-slate-50',
            'border-slate-200',
          ]"
        >
          <input
            v-model="form.isActive"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-200"
            :disabled="isSaving"
          />
          <span class="min-w-0 text-sm leading-relaxed text-slate-700">
            Aktif dan dapat digunakan untuk input nilai.
            <span class="block text-xs text-slate-400">Nonaktifkan tanpa menghapus agar riwayat nilai tetap aman.</span>
          </span>
        </label>
      </form>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <BaseButton
            type="button"
            variant="outline"
            class="w-full sm:w-auto"
            :disabled="isSaving"
            @click="closeModal"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            form="subject-form"
            class="w-full sm:w-auto"
            :loading="isSaving"
            loading-text="Menyimpan..."
            :disabled="isSaving"
          >
            <Save class="h-4 w-4" />
            Simpan
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Hapus Mata Pelajaran"
      :message="confirmDialog.options.value.message"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="isDeleting"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.onCancel()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { BookOpen, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseInput,
  BaseModal,
  BaseRetry,
  BaseSelect,
  BaseSkeleton,
} from '@/components/ui'
import { PageHeader } from '@/components/shared'
import { useConfirm, usePermission } from '@/composables'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { subjectsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'
import type { Subject } from '@/types'

type SubjectFormState = {
  name: string
  code: string
  shortName: string
  groupName: string
  sortOrder: number | undefined
  isActive: boolean
}

const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const confirmDialog = useConfirm()

const canManage = computed(() => can(PERMISSIONS.SUBJECT_MANAGE))
const isMutating = computed(() => isSaving.value || isDeleting.value)

const schoolYearId = ref('')
const subjects = ref<Subject[]>([])
const isLoading = ref(false)
const isRetrying = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const error = ref('')
const formError = ref('')
const showModal = ref(false)
const editingId = ref('')

const form = reactive<SubjectFormState>({
  name: '',
  code: '',
  shortName: '',
  groupName: '',
  sortOrder: 0,
  isActive: true,
})

let loadVersion = 0
let isMounted = false

function sortSubjects(items: Subject[]): Subject[] {
  return [...items].sort((a, b) => {
    const orderA = Number(a.sortOrder) || 0
    const orderB = Number(b.sortOrder) || 0
    return orderA - orderB || String(a.name || '').localeCompare(String(b.name || ''))
  })
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

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
  if (!canManage.value || isMutating.value || isLoading.value || !schoolYearId.value) return
  resetForm()
  showModal.value = true
}

function openEdit(subject: Subject) {
  if (!canManage.value || isMutating.value) return

  editingId.value = String(subject.id || '')
  form.name = String(subject.name || '')
  form.code = String(subject.code || '')
  form.shortName = String(subject.shortName || '')
  form.groupName = String(subject.groupName || '')
  form.sortOrder = Number.isFinite(Number(subject.sortOrder)) ? Number(subject.sortOrder) : 0
  form.isActive = Boolean(subject.isActive)
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  if (isSaving.value) return
  showModal.value = false
}

function validateForm(): boolean {
  const name = normalizeText(form.name)
  const code = normalizeText(form.code).toUpperCase()
  const shortName = normalizeText(form.shortName)
  const groupName = normalizeText(form.groupName)
  const rawSortOrder = form.sortOrder
  const sortOrder = rawSortOrder == null || rawSortOrder === ('' as never) ? 0 : Number(rawSortOrder)

  if (!schoolYearId.value) {
    formError.value = 'Tahun pelajaran wajib dipilih.'
    return false
  }
  if (!name) {
    formError.value = 'Nama mata pelajaran wajib diisi.'
    return false
  }
  if (name.length < 2) {
    formError.value = 'Nama mata pelajaran minimal 2 karakter.'
    return false
  }
  if (name.length > 100) {
    formError.value = 'Nama mata pelajaran maksimal 100 karakter.'
    return false
  }
  if (code.length > 30) {
    formError.value = 'Kode mata pelajaran maksimal 30 karakter.'
    return false
  }
  if (shortName.length > 50) {
    formError.value = 'Singkatan maksimal 50 karakter.'
    return false
  }
  if (groupName.length > 60) {
    formError.value = 'Kelompok maksimal 60 karakter.'
    return false
  }
  if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    formError.value = 'Urutan harus berupa angka bulat antara 0 sampai 9999.'
    return false
  }

  const currentId = String(editingId.value || '')
  const duplicateName = subjects.value.some(subject =>
    String(subject.id) !== currentId &&
    String(subject.name || '').trim().toLocaleLowerCase() === name.toLocaleLowerCase()
  )
  if (duplicateName) {
    formError.value = 'Nama mata pelajaran tersebut sudah digunakan pada tahun pelajaran ini.'
    return false
  }

  if (code) {
    const duplicateCode = subjects.value.some(subject =>
      String(subject.id) !== currentId &&
      normalizeText(subject.code).toUpperCase() === code
    )
    if (duplicateCode) {
      formError.value = 'Kode mata pelajaran tersebut sudah digunakan pada tahun pelajaran ini.'
      return false
    }
  }

  return true
}

function buildPayload() {
  const rawSortOrder = form.sortOrder
  const sortOrder = rawSortOrder == null || rawSortOrder === ('' as never) ? 0 : Number(rawSortOrder)

  return {
    schoolYearId: String(schoolYearId.value),
    name: normalizeText(form.name),
    code: normalizeText(form.code).toUpperCase(),
    shortName: normalizeText(form.shortName),
    groupName: normalizeText(form.groupName),
    sortOrder,
    isActive: Boolean(form.isActive),
  }
}

async function loadSubjectsForYear(yearId: string, requestVersion: number): Promise<boolean> {
  const result = await subjectsService.list(yearId)
  if (!isMounted || requestVersion !== loadVersion || String(schoolYearId.value) !== yearId) {
    return false
  }
  subjects.value = sortSubjects(result)
  return true
}

async function load() {
  const yearId = String(schoolYearId.value || '').trim()
  const requestVersion = ++loadVersion

  if (!yearId) {
    subjects.value = []
    isLoading.value = false
    error.value = 'Pilih tahun pelajaran untuk menampilkan mata pelajaran.'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await loadSubjectsForYear(yearId, requestVersion)
  } catch (e: unknown) {
    if (!isMounted || requestVersion !== loadVersion) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat mata pelajaran.'
    subjects.value = []
  } finally {
    if (requestVersion === loadVersion) isLoading.value = false
  }
}

async function initialize(forceYearRefresh = false) {
  const requestVersion = ++loadVersion
  isLoading.value = true
  error.value = ''

  try {
    if (forceYearRefresh) {
      await schoolYearStore.refresh()
    } else {
      await schoolYearStore.fetch()
    }

    if (!isMounted || requestVersion !== loadVersion) return

    const years = schoolYearStore.schoolYears
    if (!years.length) {
      throw new Error('Belum ada tahun pelajaran yang tersedia. Tambahkan tahun pelajaran terlebih dahulu.')
    }

    const currentIsValid = schoolYearId.value && years.some(year => String(year.id) === String(schoolYearId.value))
    if (!currentIsValid) {
      schoolYearId.value = schoolYearStore.activeSchoolYear?.id ?? String(years[0]?.id ?? '')
    }

    const selectedYearId = String(schoolYearId.value || '').trim()
    if (!selectedYearId) {
      throw new Error('Tahun pelajaran belum dapat ditentukan.')
    }

    const subjectRequestVersion = requestVersion + 1
    loadVersion = subjectRequestVersion
    await loadSubjectsForYear(selectedYearId, subjectRequestVersion)
  } catch (e: unknown) {
    if (!isMounted || requestVersion > loadVersion) return
    error.value = e instanceof Error ? e.message : 'Gagal menyiapkan data mata pelajaran.'
    subjects.value = []
  } finally {
    if (requestVersion === loadVersion) isLoading.value = false
  }
}

function handleSchoolYearChange() {
  if (isMutating.value) return
  void load()
}

async function retryLoad() {
  if (isRetrying.value || isMutating.value) return
  isRetrying.value = true
  try {
    await initialize(true)
  } finally {
    isRetrying.value = false
  }
}

async function save() {
  if (!canManage.value || isMutating.value || !showModal.value) return
  if (!validateForm()) return

  isSaving.value = true
  formError.value = ''

  try {
    const payload = buildPayload()

    if (editingId.value) {
      const id = String(editingId.value).trim()
      if (!id) throw new Error('ID mata pelajaran tidak valid.')

      const updated = await subjectsService.update({ id, ...payload })
      if (String(updated.schoolYearId) === String(schoolYearId.value)) {
        const index = subjects.value.findIndex(subject => String(subject.id) === String(updated.id))
        if (index >= 0) {
          subjects.value[index] = updated
        } else {
          subjects.value.push(updated)
        }
        subjects.value = sortSubjects(subjects.value)
      } else {
        subjects.value = subjects.value.filter(subject => String(subject.id) !== String(updated.id))
      }
    } else {
      const created = await subjectsService.create(payload)
      if (String(created.schoolYearId) === String(schoolYearId.value)) {
        subjects.value = sortSubjects([...subjects.value, created])
      }
    }

    toast.success(editingId.value ? 'Mata pelajaran berhasil diperbarui.' : 'Mata pelajaran berhasil ditambahkan.')
    showModal.value = false
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan mata pelajaran.'
  } finally {
    isSaving.value = false
  }
}

async function remove(subject: Subject) {
  if (!canManage.value || isMutating.value || confirmDialog.isLoading.value) return

  confirmDialog.isLoading.value = false
  const ok = await confirmDialog.confirm({
    title: 'Hapus Mata Pelajaran',
    message: 'Hapus mata pelajaran "' + String(subject.name || '') + '"? Data dengan nilai tidak dapat dihapus dan harus dinonaktifkan.',
    type: 'danger',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
  })

  if (!ok || !isMounted) return

  isDeleting.value = true
  try {
    await subjectsService.remove(String(subject.id))
    if (isMounted) {
      subjects.value = subjects.value.filter(item => String(item.id) !== String(subject.id))
    }
    toast.success('Mata pelajaran berhasil dihapus.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus mata pelajaran.')
  } finally {
    isDeleting.value = false
    confirmDialog.isLoading.value = false
  }
}

watch(showModal, value => {
  if (!value && !isSaving.value) {
    resetForm()
  }
})

onMounted(async () => {
  isMounted = true
  await initialize(false)
})

onUnmounted(() => {
  isMounted = false
  loadVersion += 1
  confirmDialog.onCancel()
  confirmDialog.isLoading.value = false
})
</script>

<style scoped>
.action-btn {
  @apply inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 hover:text-slate-700;
}

.action-btn.danger {
  @apply border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600;
}
</style>
