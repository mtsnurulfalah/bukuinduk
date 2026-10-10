<template>
  <div class="min-w-0 max-w-3xl space-y-5">
    <PageHeader
      :title="isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'"
      :subtitle="isEdit ? 'Perbarui identitas dan hak akses pengguna.' : 'Buat akun dan tetapkan peran akses aplikasi.'"
      show-back
      :breadcrumbs="[{ label: 'Pengguna', to: '/users' }, { label: isEdit ? 'Edit' : 'Tambah' }]"
    />

    <BaseAlert
      v-if="errorMsg"
      :key="errorMsg"
      type="error"
      title="Data belum dapat disimpan"
      dismissible
      @dismiss="errorMsg = ''"
    >
      {{ errorMsg }}
    </BaseAlert>

    <BaseAlert
      v-if="teacherLoadError"
      :key="teacherLoadError"
      type="warning"
      title="Daftar guru tidak dapat dimuat"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="min-w-0 break-words">{{ teacherLoadError }}</p>
        <BaseButton
          class="shrink-0"
          variant="outline"
          size="sm"
          :loading="isLoadingTeachers"
          @click="loadTeacherOptions"
        >
          Muat ulang guru
        </BaseButton>
      </div>
    </BaseAlert>

    <BaseCard v-if="isEdit && isLoadingUser" class="space-y-4" aria-live="polite">
      <div class="space-y-2">
        <BaseSkeleton height="h-4" width="w-32" />
        <BaseSkeleton height="h-10" />
      </div>
      <div class="space-y-2">
        <BaseSkeleton height="h-4" width="w-28" />
        <BaseSkeleton height="h-10" />
      </div>
      <div class="space-y-2">
        <BaseSkeleton height="h-4" width="w-20" />
        <BaseSkeleton height="h-10" />
      </div>
      <BaseSkeleton height="h-10" width="w-40" />
    </BaseCard>

    <BaseRetry
      v-else-if="isEdit && userLoadError"
      title="Data pengguna belum dapat dimuat"
      :message="userLoadError"
      :loading="isLoadingUser"
      button-text="Coba lagi"
      @retry="loadCurrentUser"
    />

    <BaseCard v-else class="min-w-0">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <fieldset
          :disabled="isSaving || isValidating"
          class="min-w-0 w-full space-y-5 border-0 p-0"
        >
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-base font-semibold text-slate-800">Informasi akun</h2>
            <p class="mt-1 text-sm leading-relaxed text-slate-500">
              Lengkapi identitas login dan pilih hak akses yang sesuai.
            </p>
          </div>

          <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.fullName"
            label="Nama Lengkap"
            placeholder="Nama lengkap pengguna"
            autocomplete="name"
            required
            :error-message="errors.fullName"
          />

          <BaseInput
            v-model="form.username"
            label="Username"
            placeholder="Huruf kecil, angka, titik, atau underscore"
            autocomplete="username"
            required
            :disabled="isEdit"
            :error-message="errors.username"
            hint="Username minimal 3 karakter dan tidak dapat diubah setelah akun dibuat."
          />

          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="email@sekolah.id"
            autocomplete="email"
            required
            :error-message="errors.email"
          />

          <BaseSelect
            v-model="form.role"
            label="Role"
            :options="roleOptions"
            placeholder="Pilih role"
            required
            :error-message="errors.role"
            @update:model-value="onRoleChange"
          />

          <div v-if="form.role === 'teacher'" class="min-w-0 space-y-1 sm:col-span-2">
            <BaseSelect
              v-model="form.teacherId"
              label="Hubungkan ke Guru"
              :options="teacherOptions"
              placeholder="Pilih data guru"
              :required="form.role === 'teacher'"
              :disabled="isLoadingTeachers || teacherOptions.length === 0"
              :error-message="errors.teacherId"
              :hint="teacherSelectHint"
            />
            <p v-if="!isLoadingTeachers && !teacherLoadError && teacherOptions.length === 0" class="text-xs text-amber-700">
              Belum ada data guru aktif yang tersedia. Tambahkan atau aktifkan data guru terlebih dahulu.
            </p>
          </div>

          <BaseInput
            v-if="!isEdit"
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="Minimal 8 karakter"
            autocomplete="new-password"
            required
            :error-message="errors.password"
            hint="Gunakan password minimal 8 karakter."
          />
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label for="isActive" class="flex min-h-10 cursor-pointer items-center gap-3">
            <input
              id="isActive"
              v-model="form.isActive"
              type="checkbox"
              class="h-5 w-5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <span class="min-w-0">
              <span class="block text-sm font-medium text-slate-800">Pengguna Aktif</span>
              <span class="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Akun aktif dapat masuk sesuai dengan hak akses role-nya.
              </span>
            </span>
          </label>
        </div>
        </fieldset>

        <div class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
          <BaseButton
            class="w-full sm:w-auto"
            variant="outline"
            type="button"
            :disabled="isSaving"
            @click="router.push('/users')"
          >
            Batal
          </BaseButton>
          <BaseButton
            class="w-full sm:w-auto"
            type="submit"
            :loading="isSaving || isValidating"
            :disabled="isEdit && (isLoadingUser || Boolean(userLoadError))"
            :loading-text="isValidating ? 'Memvalidasi...' : 'Menyimpan...'"
          >
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Simpan Perubahan' : 'Buat Pengguna' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard,
  BaseInput,
  BaseSelect,
  BaseButton,
  BaseAlert,
  BaseRetry,
  BaseSkeleton,
} from '@/components/ui'
import { usersService, teachersService } from '@/services'
import { ROLE_LABELS } from '@/constants'
import { userSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => Boolean(route.params.id))
const isSaving = ref(false)
const isValidating = ref(false)
const isLoadingUser = ref(false)
const isLoadingTeachers = ref(false)
const errorMsg = ref('')
const userLoadError = ref('')
const teacherLoadError = ref('')
const errors = reactive<Record<string, string>>({})
const teacherOptions = ref<{ value: string; label: string }[]>([])

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
const form = reactive({
  fullName: '',
  username: '',
  email: '',
  role: '',
  password: '',
  teacherId: '',
  isActive: true,
})

const teacherSelectHint = computed(() => {
  if (isLoadingTeachers.value) return 'Memuat daftar guru...'
  return 'Wajib diisi untuk role Guru agar akun terhubung ke data guru.'
})

let latestUserRequestId = 0
let latestTeacherRequestId = 0

function clearValidationErrors() {
  Object.keys(errors).forEach(key => delete errors[key])
}

function clearFieldError(field: string) {
  if (errors[field]) delete errors[field]
  if (errorMsg.value) errorMsg.value = ''
}

function resetForm() {
  Object.assign(form, {
    fullName: '',
    username: '',
    email: '',
    role: '',
    password: '',
    teacherId: '',
    isActive: true,
  })
  clearValidationErrors()
}

function routeUserId(): string {
  const value = route.params.id
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function onRoleChange(role: string) {
  clearFieldError('role')
  if (role !== 'teacher') {
    form.teacherId = ''
    clearFieldError('teacherId')
  }
}

// Clear stale validation/API feedback as the user corrects the affected field.
watch(() => form.fullName, () => clearFieldError('fullName'))
watch(() => form.username, () => clearFieldError('username'))
watch(() => form.email, () => clearFieldError('email'))
watch(() => form.password, () => clearFieldError('password'))
watch(() => form.teacherId, () => clearFieldError('teacherId'))

async function loadTeacherOptions() {
  const requestId = ++latestTeacherRequestId
  isLoadingTeachers.value = true
  teacherLoadError.value = ''

  try {
    const teachers = await teachersService.listActive()
    if (requestId !== latestTeacherRequestId) return

    teacherOptions.value = Array.isArray(teachers)
      ? teachers
          .filter(teacher => teacher && teacher.id != null)
          .map(teacher => ({
            value: String(teacher.id),
            label: String(teacher.fullName || 'Guru tanpa nama'),
          }))
      : []
  } catch (e: unknown) {
    if (requestId === latestTeacherRequestId) {
      teacherLoadError.value = e instanceof Error
        ? e.message
        : 'Gagal mengambil daftar guru aktif.'
    }
  } finally {
    if (requestId === latestTeacherRequestId) isLoadingTeachers.value = false
  }
}

async function loadUser(id: string) {
  const requestId = ++latestUserRequestId
  isLoadingUser.value = true
  userLoadError.value = ''
  errorMsg.value = ''
  clearValidationErrors()

  try {
    const user = await usersService.get(id)
    if (requestId !== latestUserRequestId || routeUserId() !== id) return

    Object.assign(form, {
      fullName: String(user.fullName ?? ''),
      username: String(user.username ?? ''),
      email: String(user.email ?? ''),
      role: String(user.role ?? ''),
      password: '',
      teacherId: String(user.teacherId ?? ''),
      isActive: user.isActive === true,
    })
  } catch (e: unknown) {
    if (requestId === latestUserRequestId) {
      userLoadError.value = e instanceof Error ? e.message : 'Gagal memuat data pengguna.'
    }
  } finally {
    if (requestId === latestUserRequestId) isLoadingUser.value = false
  }
}

function loadCurrentUser() {
  const id = routeUserId()
  if (id) void loadUser(id)
}

watch(
  () => route.params.id,
  (rawId) => {
    const id = Array.isArray(rawId) ? String(rawId[0] ?? '') : String(rawId ?? '')
    errorMsg.value = ''
    if (id) {
      void loadUser(id)
    } else {
      latestUserRequestId += 1
      isLoadingUser.value = false
      userLoadError.value = ''
      resetForm()
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (
    isSaving.value ||
    isValidating.value ||
    isLoadingUser.value ||
    (isEdit.value && userLoadError.value)
  ) return

  const submitIsEdit = isEdit.value
  const submitUserId = submitIsEdit ? routeUserId() : ''

  clearValidationErrors()
  errorMsg.value = ''

  // Normalize common text fields before validation and submission.
  form.fullName = form.fullName.trim()
  form.username = form.username.trim().toLowerCase()
  form.email = form.email.trim().toLowerCase()
  form.teacherId = form.teacherId.trim()

  // Validate and submit the same snapshot so the saved payload cannot differ
  // from the values that were checked.
  const values = { ...form }
  isValidating.value = true

  try {
    await userSchema.validate(values, {
      abortEarly: false,
      context: { isCreate: !submitIsEdit },
    })
  } catch (err: unknown) {
    let mappedFieldError = false

    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner?: { path?: string; message?: string }[] }).inner
      if (Array.isArray(inner)) {
        inner.forEach((item) => {
          if (item.path && item.message && !errors[item.path]) {
            errors[item.path] = item.message
            mappedFieldError = true
          }
        })
      }
    }

    if (!mappedFieldError) {
      errorMsg.value = err instanceof Error
        ? err.message
        : 'Validasi data gagal. Periksa kembali isian formulir.'
    }

    isValidating.value = false
    return
  }

  // Ignore a validation result if navigation changed the record while it ran.
  if (
    submitIsEdit !== isEdit.value ||
    (submitIsEdit && submitUserId !== routeUserId())
  ) {
    isValidating.value = false
    return
  }

  if (values.role === 'teacher' && !values.teacherId) {
    errors.teacherId = 'Akun dengan role Guru wajib dihubungkan ke data guru.'
    isValidating.value = false
    return
  }

  if (submitIsEdit && !submitUserId) {
    errorMsg.value = 'ID pengguna tidak ditemukan. Muat ulang halaman dan coba lagi.'
    isValidating.value = false
    return
  }

  isValidating.value = false
  isSaving.value = true

  try {
    if (submitIsEdit) {
      await usersService.update(submitUserId, {
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        teacherId: values.teacherId || undefined,
        isActive: values.isActive,
      })
    } else {
      await usersService.create({
        username: values.username,
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        password: values.password,
        teacherId: values.teacherId || undefined,
        isActive: values.isActive,
      })
    }

    // Do not let a stale request redirect a newly opened form.
    if (
      submitIsEdit !== isEdit.value ||
      (submitIsEdit && submitUserId !== routeUserId()) ||
      (!submitIsEdit && isEdit.value)
    ) return

    toast.success(submitIsEdit
      ? 'Pengguna berhasil diperbarui.'
      : 'Pengguna berhasil dibuat.')
    await router.push('/users')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan pengguna.'
  } finally {
    isSaving.value = false
  }
}
onMounted(() => {
  void loadTeacherOptions()
})

onUnmounted(() => {
  latestUserRequestId += 1
  latestTeacherRequestId += 1
})
</script>
