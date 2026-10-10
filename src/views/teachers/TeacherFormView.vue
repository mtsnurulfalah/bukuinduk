<template>
  <div class="w-full min-w-0 max-w-3xl space-y-5 pb-6">
    <PageHeader
      :title="isEdit ? 'Edit Guru' : 'Tambah Guru'"
      :subtitle="
        isEdit
          ? 'Perbarui data guru tanpa mengubah hubungan akun dan riwayat yang sudah tersimpan.'
          : 'Lengkapi data guru. Field bertanda (*) wajib diisi.'
      "
      show-back
      :breadcrumbs="[
        { label: 'Data Guru', to: '/teachers' },
        { label: isEdit ? 'Edit' : 'Tambah' },
      ]"
    />

    <BaseRetry
      v-if="isEdit && loadError"
      title="Data guru gagal dimuat"
      :message="loadError"
      :loading="isLoading"
      @retry="loadTeacher"
    />

    <BaseAlert
      v-if="errorMsg"
      type="error"
      title="Data belum tersimpan"
      dismissible
      @dismiss="errorMsg = ''"
    >
      {{ errorMsg }}
    </BaseAlert>

    <template v-if="isEdit && isLoading">
      <BaseCard>
        <div class="space-y-6" aria-hidden="true">
          <div class="space-y-2">
            <BaseSkeleton height="h-5" width="w-40" />
            <BaseSkeleton height="h-4" width="w-80" />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseSkeleton class="sm:col-span-2" height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton height="h-10" />
            <BaseSkeleton class="sm:col-span-2" height="h-24" />
            <BaseSkeleton height="h-10" />

            <div class="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
              <BaseSkeleton height="h-10" width="w-full sm:w-24" />
              <BaseSkeleton height="h-10" width="w-full sm:w-36" />
            </div>
          </div>
        </div>
      </BaseCard>
    </template>

    <BaseCard
      v-else-if="!isEdit || !loadError"
      title="Informasi Guru"
      subtitle="Pastikan data identitas, kontak, dan status guru diisi dengan benar."
    >
      <form
        class="mt-1 space-y-7"
        novalidate
        :aria-busy="isSaving"
        @submit.prevent="handleSubmit"
      >
        <section class="space-y-4" aria-labelledby="teacher-basic-heading">
          <div class="border-b border-slate-100 pb-3">
            <h2 id="teacher-basic-heading" class="text-sm font-semibold text-slate-800">
              Identitas Utama
            </h2>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
              Informasi utama yang digunakan untuk mengenali guru.
            </p>
          </div>

          <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <BaseInput
                id="teacher-full-name"
                v-model="form.fullName"
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap"
                autocomplete="name"
                required
                :error-message="errors.fullName"
                :disabled="isSaving"
              />
            </div>

            <BaseInput
              id="teacher-nip"
              v-model="form.nip"
              label="NIP"
              placeholder="Nomor Induk Pegawai"
              inputmode="numeric"
              autocomplete="off"
              :error-message="errors.nip"
              :disabled="isSaving"
            />

            <BaseInput
              id="teacher-nuptk"
              v-model="form.nuptk"
              label="NUPTK"
              placeholder="Nomor Unik PTK"
              inputmode="numeric"
              autocomplete="off"
              :error-message="errors.nuptk"
              :disabled="isSaving"
            />

            <BaseSelect
              id="teacher-gender"
              v-model="form.gender"
              label="Jenis Kelamin"
              :options="GENDER_OPTIONS"
              placeholder="Pilih jenis kelamin"
              :error-message="errors.gender"
              :disabled="isSaving"
            />

            <BaseSelect
              id="teacher-religion"
              v-model="form.religion"
              label="Agama"
              :options="RELIGION_OPTIONS"
              placeholder="Pilih agama"
              :error-message="errors.religion"
              :disabled="isSaving"
            />
          </div>
        </section>

        <section class="space-y-4" aria-labelledby="teacher-profile-heading">
          <div class="border-b border-slate-100 pb-3">
            <h2 id="teacher-profile-heading" class="text-sm font-semibold text-slate-800">
              Profil & Pendidikan
            </h2>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
              Data kelahiran, pendidikan terakhir, dan masa bergabung.
            </p>
          </div>

          <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              id="teacher-birth-place"
              v-model="form.birthPlace"
              label="Tempat Lahir"
              placeholder="Contoh: Palembang"
              autocomplete="address-level2"
              :error-message="errors.birthPlace"
              :disabled="isSaving"
            />

            <BaseInput
              id="teacher-birth-date"
              v-model="form.birthDate"
              label="Tanggal Lahir"
              type="date"
              :error-message="errors.birthDate"
              :disabled="isSaving"
            />

            <BaseSelect
              id="teacher-education"
              v-model="form.educationLevel"
              label="Pendidikan Terakhir"
              :options="EDUCATION_LEVEL_OPTIONS"
              placeholder="Pilih pendidikan"
              :error-message="errors.educationLevel"
              :disabled="isSaving"
            />

            <BaseInput
              id="teacher-major"
              v-model="form.major"
              label="Jurusan/Bidang Studi"
              placeholder="Contoh: Pendidikan Agama Islam"
              :error-message="errors.major"
              :disabled="isSaving"
            />

            <BaseInput
              id="teacher-join-date"
              v-model="form.joinDate"
              label="Tanggal Bergabung"
              type="date"
              :error-message="errors.joinDate"
              :disabled="isSaving"
            />
          </div>
        </section>

        <section class="space-y-4" aria-labelledby="teacher-contact-heading">
          <div class="border-b border-slate-100 pb-3">
            <h2 id="teacher-contact-heading" class="text-sm font-semibold text-slate-800">
              Kontak
            </h2>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
              Gunakan nomor dan alamat email yang masih aktif untuk komunikasi administrasi.
            </p>
          </div>

          <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              id="teacher-phone"
              v-model="form.phone"
              label="No. HP"
              placeholder="Contoh: 081234567890"
              inputmode="tel"
              autocomplete="tel"
              :hint="errors.phone ? undefined : 'Boleh menggunakan format 08xx atau +628xx.'"
              :error-message="errors.phone"
              :disabled="isSaving"
            />

            <BaseInput
              id="teacher-email"
              v-model="form.email"
              label="Email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              autocomplete="email"
              :error-message="errors.email"
              :disabled="isSaving"
            />

            <div class="sm:col-span-2">
              <BaseTextarea
                id="teacher-address"
                v-model="form.address"
                label="Alamat"
                placeholder="Masukkan alamat lengkap"
                autocomplete="street-address"
                :rows="3"
                :error-message="errors.address"
                :disabled="isSaving"
              />
            </div>
          </div>
        </section>

        <section class="space-y-4" aria-labelledby="teacher-status-heading">
          <div class="border-b border-slate-100 pb-3">
            <h2 id="teacher-status-heading" class="text-sm font-semibold text-slate-800">
              Status Kepegawaian
            </h2>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
              Status menentukan apakah guru masih tersedia sebagai data aktif di aplikasi.
            </p>
          </div>

          <div class="max-w-sm">
            <BaseSelect
              id="teacher-status"
              v-model="form.status"
              label="Status"
              :options="statusOptions"
              placeholder="Pilih status"
              required
              :error-message="errors.status"
              :disabled="isSaving"
            />
          </div>
        </section>

        <div class="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
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
            :loading-text="isValidating ? 'Memeriksa data...' : 'Menyimpan...'"
          >
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Simpan Perubahan' : 'Tambah Guru' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isNavigationFailure, useRoute, useRouter } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseInput,
  BaseRetry,
  BaseSelect,
  BaseSkeleton,
  BaseTextarea,
} from '@/components/ui'
import { teachersService } from '@/services'
import {
  EDUCATION_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  RELIGION_OPTIONS,
} from '@/constants'
import { teacherSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'
import type { TeacherFormData } from '@/types'

const route = useRoute()
const router = useRouter()

const editId = computed(() => {
  const id = String(route.params.id ?? '').trim()
  return id === 'undefined' || id === 'null' ? '' : id
})
const isEdit = computed(() => Boolean(editId.value))

const isLoading = ref(Boolean(editId.value))
const isSaving = ref(false)
const isValidating = ref(false)
const errorMsg = ref('')
const loadError = ref('')
const errors = reactive<Record<string, string>>({})

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const createInitialForm = (): TeacherFormData => ({
  fullName: '',
  nip: '',
  nuptk: '',
  gender: '',
  birthDate: '',
  birthPlace: '',
  religion: '',
  educationLevel: '',
  major: '',
  joinDate: '',
  phone: '',
  email: '',
  address: '',
  status: 'active',
})

const form = reactive<TeacherFormData>(createInitialForm())

let formLoadVersion = 0
let isMounted = false

function clearErrors() {
  Object.keys(errors).forEach(key => delete errors[key])
}

function resetFormState() {
  Object.assign(form, createInitialForm())
  clearErrors()
  errorMsg.value = ''
}

function applyTeacherData(teacher: Awaited<ReturnType<typeof teachersService.get>>) {
  // Normalisasi seluruh nilai API sebelum masuk ke v-model form yang bertipe string.
  Object.assign(form, {
    fullName: normalizeFormString(teacher.fullName).trim(),
    nip: normalizeFormString(teacher.nip),
    nuptk: normalizeFormString(teacher.nuptk),
    gender: normalizeFormString(teacher.gender),
    birthDate: normalizeDateInput(teacher.birthDate),
    birthPlace: normalizeFormString(teacher.birthPlace),
    religion: normalizeFormString(teacher.religion),
    educationLevel: normalizeFormString(teacher.educationLevel),
    major: normalizeFormString(teacher.major),
    joinDate: normalizeDateInput(teacher.joinDate),
    phone: normalizeFormString(teacher.phone),
    email: normalizeFormString(teacher.email),
    address: normalizeFormString(teacher.address),
    status: normalizeFormString(teacher.status).toLowerCase() === 'inactive' ? 'inactive' : 'active',
  })
}

/**
 * Google Sheets dapat mengembalikan ID atau nomor telepon sebagai angka
 * meskipun form memperlakukannya sebagai teks. Normalisasi di batas API
 * mencegah pemanggilan .trim()/.toLowerCase() pada nilai non-string.
 */
function normalizeFormString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return String(value)
  return ''
}

function normalizeDateInput(value?: string | number | null) {
  const date = normalizeFormString(value).trim()
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : ''
}

function getValidationErrors(error: unknown) {
  if (!error || typeof error !== 'object' || !('inner' in error)) {
    return []
  }

  const inner = (error as { inner?: unknown }).inner
  if (!Array.isArray(inner)) return []

  return inner.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const path = 'path' in item ? String((item as { path?: unknown }).path ?? '') : ''
    const message =
      'message' in item ? String((item as { message?: unknown }).message ?? '') : ''

    return path && message ? [{ path, message }] : []
  })
}

function mapServerError(message: string) {
  if (/NIP sudah digunakan/i.test(message)) {
    errors.nip = 'NIP sudah digunakan.'
  } else if (/NUPTK sudah digunakan/i.test(message)) {
    errors.nuptk = 'NUPTK sudah digunakan.'
  } else if (/Email guru sudah digunakan/i.test(message)) {
    errors.email = 'Email guru sudah digunakan.'
  } else if (/Status guru tidak valid/i.test(message)) {
    errors.status = 'Status guru tidak valid.'
  } else if (/Nama lengkap wajib diisi/i.test(message)) {
    errors.fullName = 'Nama lengkap wajib diisi.'
  }
}

async function loadTeacher() {
  const version = ++formLoadVersion
  const id = editId.value

  clearErrors()
  errorMsg.value = ''
  loadError.value = ''

  if (!id) {
    resetFormState()
    isLoading.value = false
    return
  }

  isLoading.value = true
  resetFormState()

  try {
    const teacher = await teachersService.get(id)

    if (!isMounted || version !== formLoadVersion || editId.value !== id) return
    if (
      !teacher ||
      typeof teacher !== 'object' ||
      String(teacher.id ?? '').trim() !== id ||
      !String(teacher.fullName ?? '').trim()
    ) {
      throw new Error('Respons data guru tidak lengkap atau ID tidak sesuai. Silakan muat ulang data guru.')
    }

    applyTeacherData(teacher)
  } catch (e: unknown) {
    if (!isMounted || version !== formLoadVersion || editId.value !== id) return

    loadError.value = e instanceof Error
      ? e.message
      : 'Gagal memuat data guru.'
  } finally {
    if (isMounted && version === formLoadVersion && editId.value === id) {
      isLoading.value = false
    }
  }
}

function buildPayload(): TeacherFormData {
  return {
    fullName: normalizeFormString(form.fullName).trim(),
    nip: normalizeFormString(form.nip).trim(),
    nuptk: normalizeFormString(form.nuptk).trim(),
    gender: normalizeFormString(form.gender).trim(),
    birthPlace: normalizeFormString(form.birthPlace).trim(),
    birthDate: normalizeDateInput(form.birthDate),
    religion: normalizeFormString(form.religion).trim(),
    educationLevel: normalizeFormString(form.educationLevel).trim(),
    major: normalizeFormString(form.major).trim(),
    joinDate: normalizeDateInput(form.joinDate),
    phone: normalizeFormString(form.phone).trim(),
    email: normalizeFormString(form.email).trim().toLowerCase(),
    address: normalizeFormString(form.address).trim(),
    status: normalizeFormString(form.status).trim() || 'active',
  }
}

async function handleSubmit() {
  // Kunci sejak awal, termasuk selama validasi async, untuk mencegah submit ganda.
  if (isSaving.value || (isEdit.value && (isLoading.value || Boolean(loadError.value)))) return

  const submitIsEdit = isEdit.value
  const submittedId = editId.value

  clearErrors()
  errorMsg.value = ''
  isSaving.value = true
  isValidating.value = true

  try {
    const payload = buildPayload()
    let validated: TeacherFormData

    try {
      validated = await teacherSchema.validate(payload, {
        abortEarly: false,
      }) as TeacherFormData
    } catch (validationError: unknown) {
      const validationErrors = getValidationErrors(validationError)
      if (!validationErrors.length) throw validationError

      validationErrors.forEach(({ path, message }) => {
        errors[path] = message
      })

      const invalidPaths = [...new Set(validationErrors.map(({ path }) => path))]
      errorMsg.value = `Periksa ${invalidPaths.length} field yang ditandai sebelum menyimpan.`

      await nextTick()
      const fieldIds: Record<string, string> = {
        fullName: 'teacher-full-name',
        nip: 'teacher-nip',
        nuptk: 'teacher-nuptk',
        gender: 'teacher-gender',
        birthPlace: 'teacher-birth-place',
        birthDate: 'teacher-birth-date',
        religion: 'teacher-religion',
        educationLevel: 'teacher-education',
        major: 'teacher-major',
        joinDate: 'teacher-join-date',
        phone: 'teacher-phone',
        email: 'teacher-email',
        address: 'teacher-address',
        status: 'teacher-status',
      }
      const firstErrorPath = validationErrors[0]?.path
      const firstErrorId = firstErrorPath ? fieldIds[firstErrorPath] : undefined
      if (firstErrorId) document.getElementById(firstErrorId)?.focus()
      return
    }

    isValidating.value = false

    // Route bisa berubah saat Yup masih memvalidasi. Jangan sampai payload
    // dari form sebelumnya tersimpan ke ID guru yang berbeda.
    if (
      submitIsEdit !== isEdit.value ||
      (submitIsEdit && editId.value !== submittedId)
    ) {
      errorMsg.value = 'Halaman guru berubah saat validasi berlangsung. Periksa kembali data sebelum menyimpan.'
      return
    }

    try {
      if (submitIsEdit) {
        if (!submittedId) throw new Error('ID guru tidak valid.')
        await teachersService.update(submittedId, validated)
        toast.success('Data guru berhasil diperbarui.')
      } else {
        await teachersService.create(validated)
        toast.success('Guru berhasil ditambahkan.')
      }
    } catch (saveError: unknown) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Gagal menyimpan data guru.'
      const routeChanged = submitIsEdit !== isEdit.value ||
        (submitIsEdit && editId.value !== submittedId)

      if (routeChanged) {
        toast.error(`Penyimpanan data guru tidak berhasil: ${message}`)
        return
      }

      mapServerError(message)
      errorMsg.value = message
      return
    }

    // Kegagalan navigasi setelah API sukses tidak boleh dilaporkan sebagai
    // kegagalan penyimpanan, karena data sudah tersimpan di backend.
    try {
      const navigationFailure = await router.push({ name: 'teachers' })
      if (isNavigationFailure(navigationFailure)) {
        errorMsg.value = 'Data guru berhasil disimpan, tetapi halaman daftar belum terbuka. Gunakan tombol Batal untuk kembali ke Data Guru.'
      }
    } catch {
      errorMsg.value = 'Data guru berhasil disimpan, tetapi halaman daftar belum terbuka. Gunakan tombol Batal untuk kembali ke Data Guru.'
    }
  } catch (e: unknown) {
    const message = e instanceof Error
      ? e.message
      : 'Gagal memvalidasi atau menyimpan data guru.'
    mapServerError(message)
    errorMsg.value = message
  } finally {
    isValidating.value = false
    isSaving.value = false
  }
}

function goBack() {
  void router.push('/teachers')
}

onMounted(() => {
  isMounted = true

  if (isEdit.value) {
    void loadTeacher()
  } else {
    resetFormState()
    isLoading.value = false
  }
})

watch(
  () => editId.value,
  (newId, oldId) => {
    if (!isMounted || newId === oldId) return

    if (!newId) {
      ++formLoadVersion
      resetFormState()
      loadError.value = ''
      isLoading.value = false
      return
    }

    void loadTeacher()
  },
)

onUnmounted(() => {
  isMounted = false
  ++formLoadVersion
})
</script>
