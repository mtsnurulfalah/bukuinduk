<template>
  <div class="space-y-5 max-w-2xl">
    <PageHeader :title="isEdit ? 'Edit Guru' : 'Tambah Guru'" show-back
      :breadcrumbs="[{ label: 'Data Guru', to: '/teachers' }, { label: isEdit ? 'Edit' : 'Tambah' }]" />
    <BaseAlert v-if="errorMsg" type="error" dismissible>{{ errorMsg }}</BaseAlert>
    <BaseCard>
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3" @submit.prevent="handleSubmit">
        <BaseInput v-model="form.fullName" label="Nama Lengkap" required class="sm:col-span-2" />
        <BaseInput v-model="form.nip" label="NIP" placeholder="Nomor Induk Pegawai" />
        <BaseInput v-model="form.nuptk" label="NUPTK" placeholder="Nomor Unik PTK" />
        <BaseSelect v-model="form.gender" label="Jenis Kelamin" :options="GENDER_OPTIONS" placeholder="Pilih" />
        <BaseInput v-model="form.birthDate" label="Tanggal Lahir" type="date" />
        <BaseInput v-model="form.birthPlace" label="Tempat Lahir" />
        <BaseSelect v-model="form.religion" label="Agama" :options="RELIGION_OPTIONS" placeholder="Pilih agama" />
        <BaseSelect v-model="form.educationLevel" label="Pendidikan Terakhir" :options="EDUCATION_LEVEL_OPTIONS" placeholder="Pilih" />
        <BaseInput v-model="form.major" label="Jurusan/Bidang Studi" />
        <BaseInput v-model="form.joinDate" label="Tanggal Bergabung" type="date" />
        <BaseInput v-model="form.phone" label="No. HP" />
        <BaseInput v-model="form.email" label="Email" type="email" />
        <BaseTextarea v-model="form.address" label="Alamat" class="sm:col-span-2" :rows="2" />
        <BaseSelect v-model="form.status" label="Status" :options="[{value:'active',label:'Aktif'},{value:'inactive',label:'Nonaktif'}]" />
        <div class="sm:col-span-2 flex gap-3 justify-end pt-2">
          <BaseButton variant="outline" type="button" @click="$router.back()">Batal</BaseButton>
          <BaseButton type="submit" :loading="isSaving">
            <Save class="h-4 w-4" /> {{ isEdit ? 'Simpan' : 'Tambah Guru' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseInput, BaseSelect, BaseTextarea, BaseButton, BaseAlert } from '@/components/ui'
import { teachersService } from '@/services'
import { GENDER_OPTIONS, RELIGION_OPTIONS, EDUCATION_LEVEL_OPTIONS } from '@/constants'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => Boolean(route.params.id))
const isSaving = ref(false)
const errorMsg = ref('')

const form = reactive({
  fullName: '', nip: '', nuptk: '', gender: '', birthDate: '', birthPlace: '',
  religion: '', educationLevel: '', major: '', joinDate: '', phone: '',
  email: '', address: '', status: 'active',
})

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.fullName.trim()) { errorMsg.value = 'Nama lengkap wajib diisi.'; return }
  isSaving.value = true
  try {
    if (isEdit.value) {
      await teachersService.update(route.params.id as string, form)
      toast.success('Data guru berhasil diperbarui.')
    } else {
      await teachersService.create(form)
      toast.success('Guru berhasil ditambahkan.')
    }
    router.push('/teachers')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan.'
  } finally { isSaving.value = false }
}

onMounted(async () => {
  if (isEdit.value) {
    const t = await teachersService.get(route.params.id as string)
    Object.assign(form, {
      fullName: t.fullName, nip: t.nip ?? '', nuptk: t.nuptk ?? '',
      gender: t.gender ?? '', birthDate: t.birthDate ?? '',
      birthPlace: t.birthPlace ?? '', religion: t.religion ?? '',
      educationLevel: t.educationLevel ?? '', major: t.major ?? '',
      joinDate: t.joinDate ?? '', phone: t.phone ?? '',
      email: t.email ?? '', address: t.address ?? '', status: t.status,
    })
  }
})
</script>
