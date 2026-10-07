<template>
  <div class="w-full min-w-0 max-w-3xl space-y-5 pb-6">
    <PageHeader
      :title="isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru'"
      :subtitle="isEdit ? 'Perbarui data kelas tanpa mengubah riwayat yang sudah tersimpan.' : 'Tambahkan kelas baru untuk tahun pelajaran yang dipilih.'"
      show-back
      :breadcrumbs="[
        { label: 'Kelas & Rombel', to: '/classrooms' },
        { label: isEdit ? 'Edit' : 'Tambah' },
      ]"
    />

    <BaseRetry
      v-if="loadError"
      title="Data formulir gagal dimuat"
      :message="loadError"
      :loading="isRetryingInit"
      @retry="retryFormLoad"
    />

    <BaseAlert
      v-if="initWarning"
      type="warning"
      title="Data pendukung belum lengkap"
      dismissible
      @dismiss="initWarning = ''"
    >
      <div class="space-y-2">
        <p>{{ initWarning }}</p>
        <button
          type="button"
          class="font-semibold underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
          :disabled="isRetryingInit"
          @click="retryDependencies"
        >
          {{ isRetryingInit ? 'Memuat ulang...' : 'Muat ulang data pendukung' }}
        </button>
      </div>
    </BaseAlert>

    <BaseAlert
      v-if="errorMsg"
      type="error"
      dismissible
      @dismiss="errorMsg = ''"
    >
      {{ errorMsg }}
    </BaseAlert>

    <template v-if="isLoadingForm">
      <BaseCard>
        <div class="space-y-5">
          <div class="space-y-2">
            <BaseSkeleton height="h-5" width="w-40" />
            <BaseSkeleton height="h-4" width="w-72" />
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
          </div>
          <BaseSkeleton height="h-16" />
          <div class="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <BaseSkeleton height="h-10" width="w-full sm:w-24" />
            <BaseSkeleton height="h-10" width="w-full sm:w-40" />
          </div>
        </div>
      </BaseCard>
    </template>

    <BaseCard
      v-else
      title="Informasi Kelas"
      subtitle="Isi data kelas dengan benar. Field bertanda (*) wajib diisi."
    >
      <form
        class="mt-1 space-y-6"
        novalidate
        :aria-busy="isSaving"
        @submit.prevent="handleSubmit"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.name"
            label="Nama Kelas"
            placeholder="Contoh: 7A, 8B, 9 IPA 1"
            required
            autocomplete="off"
            :error-message="errors.name"
            :disabled="isSaving"
            class="sm:col-span-2"
          />

          <BaseSelect
            v-model="form.gradeId"
            label="Tingkat Kelas"
            :options="schoolYearStore.gradeOptions"
            placeholder="Pilih tingkat kelas"
            required
            :disabled="isSaving || !schoolYearStore.gradeOptions.length"
            :error-message="errors.gradeId"
            :hint="schoolYearStore.gradeOptions.length ? 'Contoh: Kelas 7, Kelas 8, Kelas 9.' : 'Data tingkat kelas belum tersedia.'"
          />

          <BaseSelect
            v-model="form.schoolYearId"
            label="Tahun Pelajaran"
            :options="schoolYearStore.schoolYearOptions"
            placeholder="Pilih tahun pelajaran"
            required
            :disabled="isSaving || !schoolYearStore.schoolYearOptions.length"
            :error-message="errors.schoolYearId"
            :hint="schoolYearStore.schoolYearOptions.length ? 'Gunakan tahun pelajaran yang sesuai dengan kelas.' : 'Data tahun pelajaran belum tersedia.'"
          />

          <BaseSelect
            v-model="form.homeroomTeacherId"
            label="Wali Kelas"
            :options="teacherOptions"
            placeholder="Pilih wali kelas (opsional)"
            :disabled="isSaving || isLoadingTeachers"
            :hint="isLoadingTeachers ? 'Memuat daftar guru aktif...' : teacherOptions.length ? 'Opsional. Dapat diubah kembali saat data guru diperbarui.' : 'Belum ada guru aktif yang tersedia.'"
          />

          <BaseInput
            v-model="form.capacity"
            label="Kapasitas Siswa"
            type="number"
            min="1"
            max="50"
            step="1"
            inputmode="numeric"
            placeholder="30"
            hint="1–50 siswa. Jika dikosongkan, sistem menggunakan 30."
            :disabled="isSaving"
            :error-message="errors.capacity"
          />
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-start gap-3">
            <input
              id="isActive"
              v-model="form.isActive"
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              :disabled="isSaving"
            />
            <div class="min-w-0">
              <label for="isActive" class="block cursor-pointer text-sm font-semibold text-slate-700">
                Kelas Aktif
              </label>
              <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
                Kelas aktif dapat digunakan untuk proses administrasi siswa dan rombel.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <BaseButton
            variant="outline"
            type="button"
            class="w-full sm:w-auto"
            :disabled="isSaving"
            @click="goBack"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            class="w-full sm:w-auto"
            :loading="isSaving"
            :loading-text="isEdit ? 'Menyimpan perubahan...' : 'Menambahkan kelas...'"
          >
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Simpan Perubahan' : 'Tambah Kelas' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseInput, BaseSelect, BaseButton, BaseAlert, BaseRetry, BaseSkeleton } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { classroomsService, teachersService } from '@/services'
import { classroomSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'
import type { ClassroomFormData } from '@/types'

interface ClassroomFormState extends ClassroomFormData {
  capacity?: number
}

const route = useRoute()
const router = useRouter()
const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()

const editId = computed(() => String(route.params.id ?? '').trim())
const isEdit = computed(() => Boolean(editId.value))

const isLoadingForm = ref(true)
const isSaving = ref(false)
const isRetryingInit = ref(false)
const isLoadingTeachers = ref(false)

const loadError = ref('')
const initWarning = ref('')
const errorMsg = ref('')
const errors = reactive<Record<string, string>>({})
const teacherOptions = ref<{ value: string; label: string }[]>([])

const form = reactive<ClassroomFormState>({
  name: '',
  gradeId: '',
  schoolYearId: '',
  homeroomTeacherId: '',
  capacity: 30,
  isActive: true,
})

let formLoadVersion = 0
let isMounted = false

function clearErrors() {
  Object.keys(errors).forEach(key => delete errors[key])
}

function resetFormState() {
  Object.assign(form, {
    name: '',
    gradeId: '',
    schoolYearId: '',
    homeroomTeacherId: '',
    capacity: 30,
    isActive: true,
  })
  clearErrors()
  errorMsg.value = ''
}

function collectDependencyIssues(teacherResult: PromiseSettledResult<Array<{ id: string; fullName: string }>>): string[] {
  const issues: string[] = []

  if (!schoolYearStore.schoolYears.length) {
    issues.push('Belum ada tahun pelajaran yang tersedia.')
  }

  if (!schoolYearStore.grades.length) {
    issues.push('Belum ada tingkat kelas yang tersedia.')
  }

  if (teacherResult.status === 'rejected') {
    issues.push('Daftar guru aktif gagal dimuat; wali kelas dapat dipilih setelah data dimuat ulang.')
  }

  return issues
}

async function loadDependencies(forceRefresh = false): Promise<string[]> {
  if (forceRefresh) {
    await schoolYearStore.refresh()
  } else {
    await schoolYearStore.fetch()
  }

  const gradesTask = schoolYearStore.grades.length
    ? Promise.resolve()
    : schoolYearStore.fetchGrades()

  isLoadingTeachers.value = true
  const [gradesResult, teacherResult] = await Promise.allSettled([
    gradesTask,
    teachersService.listActive(),
  ])
  isLoadingTeachers.value = false

  if (gradesResult.status === 'rejected') {
    // fetchGrades currently swallows errors, so this is defensive only.
  }

  if (teacherResult.status === 'fulfilled') {
    teacherOptions.value = Array.isArray(teacherResult.value)
      ? teacherResult.value
          .filter(teacher => teacher && teacher.id)
          .map(teacher => ({
            value: String(teacher.id),
            label: String(teacher.fullName ?? '').trim() || 'Guru tanpa nama',
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'id'))
      : []
  } else {
    teacherOptions.value = []
  }

  const issues = collectDependencyIssues(teacherResult)

  if (!issues.length && !isEdit.value && !form.schoolYearId) {
    form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
  }

  return issues
}

function applyClassroomData(cls: {
  name: string
  gradeId: string
  schoolYearId: string
  homeroomTeacherId?: string
  capacity?: number
  isActive: boolean
}) {
  const capacity = Number(cls.capacity)

  Object.assign(form, {
    name: String(cls.name ?? '').trim(),
    gradeId: String(cls.gradeId ?? '').trim(),
    schoolYearId: String(cls.schoolYearId ?? '').trim(),
    homeroomTeacherId: String(cls.homeroomTeacherId ?? '').trim(),
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 30,
    isActive: Boolean(cls.isActive),
  })
}

async function loadCurrentForm() {
  const requestVersion = ++formLoadVersion
  isLoadingForm.value = true
  loadError.value = ''
  initWarning.value = ''
  errorMsg.value = ''

  if (!isEdit.value) {
    resetFormState()
  }

  try {
    const issues = await loadDependencies()

    if (!isMounted || requestVersion !== formLoadVersion) return

    if (isEdit.value) {
      const id = editId.value
      if (!id) throw new Error('ID kelas tidak valid.')

      const cls = await classroomsService.get(id)

      if (!isMounted || requestVersion !== formLoadVersion) return

      if (!cls) throw new Error('Data kelas tidak ditemukan.')
      applyClassroomData(cls)
    }

    initWarning.value = issues.join(' ')
  } catch (e: unknown) {
    if (!isMounted || requestVersion !== formLoadVersion) return
    loadError.value = e instanceof Error
      ? e.message
      : 'Gagal memuat data formulir kelas.'
  } finally {
    if (isMounted && requestVersion === formLoadVersion) {
      isLoadingForm.value = false
    }
  }
}

async function retryDependencies() {
  if (isSaving.value || isRetryingInit.value) return

  const requestVersion = ++formLoadVersion
  isRetryingInit.value = true
  initWarning.value = ''

  try {
    const issues = await loadDependencies(true)

    if (!isMounted || requestVersion !== formLoadVersion) return

    if (!isEdit.value && !form.schoolYearId) {
      form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
    }

    initWarning.value = issues.join(' ')
  } catch (e: unknown) {
    if (isMounted && requestVersion === formLoadVersion) {
      initWarning.value = e instanceof Error
        ? e.message
        : 'Gagal memuat ulang data pendukung.'
    }
  } finally {
    if (isMounted && requestVersion === formLoadVersion) {
      isRetryingInit.value = false
    }
  }
}

async function retryFormLoad() {
  if (isSaving.value || isRetryingInit.value) return

  isRetryingInit.value = true
  try {
    await loadCurrentForm()
  } finally {
    if (isMounted) {
      isRetryingInit.value = false
    }
  }
}

function buildPayload(): ClassroomFormData {
  const capacity = form.capacity == null || Number.isNaN(Number(form.capacity))
    ? 30
    : Number(form.capacity)

  return {
    name: String(form.name ?? '').trim(),
    gradeId: String(form.gradeId ?? '').trim(),
    schoolYearId: String(form.schoolYearId ?? '').trim(),
    // Pertahankan string kosong agar wali kelas lama tetap dapat dikosongkan saat edit.
    homeroomTeacherId: String(form.homeroomTeacherId ?? '').trim(),
    capacity,
    isActive: Boolean(form.isActive),
  }
}

async function handleSubmit() {
  if (isSaving.value) return

  clearErrors()
  errorMsg.value = ''

  const payload = buildPayload()

  try {
    const validated = await classroomSchema.validate(payload, {
      abortEarly: false,
    }) as ClassroomFormData

    isSaving.value = true

    if (isEdit.value) {
      const id = editId.value
      if (!id) throw new Error('ID kelas tidak valid.')

      const updated = await classroomsService.update(id, validated)
      classroomsStore.updateClassroom(updated)
      toast.success('Kelas berhasil diperbarui.')
    } else {
      const created = await classroomsService.create(validated)
      classroomsStore.addClassroom(created)
      toast.success('Kelas berhasil ditambahkan.')
    }

    await router.push('/classrooms')
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'inner' in e) {
      const inner = Array.isArray((e as { inner?: unknown }).inner)
        ? (e as { inner: { path?: string; message?: string }[] }).inner
        : []

      if (inner.length) {
        inner.forEach(item => {
          if (item?.path) {
            errors[item.path] = item.message ?? 'Field ini perlu diperbaiki.'
          }
        })
        errorMsg.value = 'Periksa kembali data yang ditandai sebelum menyimpan.'
        return
      }
    }

    errorMsg.value = e instanceof Error
      ? e.message
      : 'Gagal menyimpan data kelas.'
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  void router.push('/classrooms')
}

onMounted(() => {
  isMounted = true
  void loadCurrentForm()
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId === oldId || !isMounted) return
    void loadCurrentForm()
  },
)

onUnmounted(() => {
  isMounted = false
  ++formLoadVersion
})
</script>
