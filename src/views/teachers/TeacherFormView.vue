<template>
  <div class="mx-auto max-w-3xl space-y-5 min-w-0">
    <PageHeader
      :title="isEdit ? 'Edit Guru' : 'Tambah Guru'"
      show-back
      :breadcrumbs="[
        { label: 'Data Guru', to: '/teachers' },
        { label: isEdit ? 'Edit' : 'Tambah' },
      ]"
    />

    <BaseAlert
      v-if="errorMsg"
      type="error"
      dismissible
      @dismiss="errorMsg = ''"
    >
      {{ errorMsg }}
    </BaseAlert>

    <BaseCard>
      <template v-if="isEdit && isLoading">
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
          <BaseSkeleton height="h-10" />
          <BaseSkeleton height="h-10" />
          <BaseSkeleton class="sm:col-span-2" height="h-20" />
          <BaseSkeleton height="h-10" />
          <div class="flex justify-end sm:col-span-2">
            <BaseSkeleton height="h-10" class="w-36" />
          </div>
        </div>
      </template>

      <BaseRetry
        v-else-if="isEdit && loadError"
        title="Data guru gagal dimuat"
        :message="loadError"
        @retry="loadTeacher"
      />

      <form
        v-else
        class="grid grid-cols-1 gap-4 sm:grid-cols-2"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <BaseInput
          v-model="form.fullName"
          label="Nama Lengkap"
          placeholder="Masukkan nama lengkap"
          autocomplete="name"
          required
          class="sm:col-span-2"
        />
        <BaseInput
          v-model="form.nip"
          label="NIP"
          placeholder="Nomor Induk Pegawai"
          inputmode="numeric"
        />
        <BaseInput
          v-model="form.nuptk"
          label="NUPTK"
          placeholder="Nomor Unik PTK"
          inputmode="numeric"
        />
        <BaseSelect
          v-model="form.gender"
          label="Jenis Kelamin"
          :options="GENDER_OPTIONS"
          placeholder="Pilih"
        />
        <BaseInput
          v-model="form.birthDate"
          label="Tanggal Lahir"
          type="date"
        />
        <BaseInput
          v-model="form.birthPlace"
          label="Tempat Lahir"
          placeholder="Contoh: Palembang"
        />
        <BaseSelect
          v-model="form.religion"
          label="Agama"
          :options="RELIGION_OPTIONS"
          placeholder="Pilih agama"
        />
        <BaseSelect
          v-model="form.educationLevel"
          label="Pendidikan Terakhir"
          :options="EDUCATION_LEVEL_OPTIONS"
          placeholder="Pilih"
        />
        <BaseInput
          v-model="form.major"
          label="Jurusan/Bidang Studi"
          placeholder="Contoh: Pendidikan Agama Islam"
        />
        <BaseInput
          v-model="form.joinDate"
          label="Tanggal Bergabung"
          type="date"
        />
        <BaseInput
          v-model="form.phone"
          label="No. HP"
          placeholder="Contoh: 08xxxxxxxxxx"
          inputmode="tel"
          autocomplete="tel"
        />
        <BaseInput
          v-model="form.email"
          label="Email"
          type="email"
          placeholder="nama@sekolah.sch.id"
          autocomplete="email"
        />
        <BaseTextarea
          v-model="form.address"
          label="Alamat"
          placeholder="Masukkan alamat lengkap"
          autocomplete="street-address"
          class="sm:col-span-2"
          :rows="3"
        />
        <BaseSelect
          v-model="form.status"
          label="Status"
          :options="statusOptions"
          placeholder="Pilih status"
          required
        />

        <div
          class="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end"
        >
          <BaseButton
            variant="outline"
            type="button"
            :disabled="isSaving"
            class="w-full sm:w-auto"
            @click="goBack"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            :loading="isSaving"
            loading-text="Menyimpan..."
            class="w-full sm:w-auto"
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => Boolean(route.params.id))
const isLoading = ref(Boolean(route.params.id))
const isSaving = ref(false)
const errorMsg = ref('')
const loadError = ref('')

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const form = reactive({
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

function resetForm() {
  Object.assign(form, {
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
}

async function loadTeacher() {
  const id = String(route.params.id ?? '').trim()

  if (!id) {
    resetForm()
    loadError.value = ''
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const teacher = await teachersService.get(id)

    Object.assign(form, {
      fullName: teacher.fullName ?? '',
      nip: teacher.nip ?? '',
      nuptk: teacher.nuptk ?? '',
      gender: teacher.gender ?? '',
      birthDate: teacher.birthDate ?? '',
      birthPlace: teacher.birthPlace ?? '',
      religion: teacher.religion ?? '',
      educationLevel: teacher.educationLevel ?? '',
      major: teacher.major ?? '',
      joinDate: teacher.joinDate ?? '',
      phone: teacher.phone ?? '',
      email: teacher.email ?? '',
      address: teacher.address ?? '',
      status: teacher.status === 'inactive' ? 'inactive' : 'active',
    })
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Gagal memuat data guru.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  errorMsg.value = ''

  if (isSaving.value || (isEdit.value && isLoading.value)) return

  const fullName = form.fullName.trim()
  if (!fullName) {
    errorMsg.value = 'Nama lengkap wajib diisi.'
    return
  }

  isSaving.value = true

  const payload = {
    ...form,
    fullName,
    nip: form.nip.trim(),
    nuptk: form.nuptk.trim(),
    birthPlace: form.birthPlace.trim(),
    major: form.major.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
  }

  try {
    if (isEdit.value) {
      await teachersService.update(String(route.params.id), payload)
      toast.success('Data guru berhasil diperbarui.')
    } else {
      await teachersService.create(payload)
      toast.success('Guru berhasil ditambahkan.')
    }

    await router.push('/teachers')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan data guru.'
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  void loadTeacher()
})
</script>
