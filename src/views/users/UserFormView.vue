<template>
  <div class="space-y-5 max-w-xl">
    <PageHeader :title="isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'"
      show-back :breadcrumbs="[{ label: 'Pengguna', to: '/users' }, { label: isEdit ? 'Edit' : 'Tambah' }]" />

    <BaseAlert v-if="errorMsg" type="error" dismissible>{{ errorMsg }}</BaseAlert>

    <BaseCard>
      <form class="space-y-4 mt-2" @submit.prevent="handleSubmit">
        <BaseInput v-model="form.fullName" label="Nama Lengkap" placeholder="Nama lengkap pengguna" required :error-message="errors.fullName" />
        <BaseInput v-model="form.username" label="Username" placeholder="Huruf kecil, angka, titik" required :error-message="errors.username" :disabled="isEdit" />
        <BaseInput v-model="form.email" label="Email" type="email" placeholder="email@sekolah.id" required :error-message="errors.email" />
        <BaseSelect v-model="form.role" label="Role" :options="roleOptions" placeholder="Pilih role" required :error-message="errors.role" @update:model-value="onRoleChange" />

        <!-- Link ke guru jika role teacher -->
        <BaseSelect v-if="form.role === 'teacher'" v-model="form.teacherId" label="Hubungkan ke Guru"
          :options="teacherOptions" placeholder="Pilih guru yang terhubung (opsional)"
          hint="Wajib diisi agar guru dapat melihat data kelas yang diampu." />

        <!-- Password hanya untuk create -->
        <template v-if="!isEdit">
          <BaseInput v-model="form.password" label="Password" type="password" placeholder="Min. 8 karakter" required :error-message="errors.password" />
        </template>

        <div class="flex items-center gap-3">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600" />
          <label for="isActive" class="text-sm font-medium text-slate-700">Pengguna Aktif</label>
        </div>

        <div class="flex gap-3 justify-end pt-2">
          <BaseButton variant="outline" type="button" @click="$router.back()">Batal</BaseButton>
          <BaseButton type="submit" :loading="isSaving" loading-text="Menyimpan...">
            <Save class="h-4 w-4" /> {{ isEdit ? 'Simpan Perubahan' : 'Buat Pengguna' }}
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
import { BaseCard, BaseInput, BaseSelect, BaseButton, BaseAlert } from '@/components/ui'
import { usersService, teachersService } from '@/services'
import { ROLE_LABELS } from '@/constants'
import { userSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => Boolean(route.params.id))
const isSaving = ref(false)
const errorMsg = ref('')
const errors = reactive<Record<string, string>>({})
const teacherOptions = ref<{ value: string; label: string }[]>([])

const roleOptions = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))
const form = reactive({ fullName: '', username: '', email: '', role: '', password: '', teacherId: '', isActive: true })

function onRoleChange(role: string) { if (role !== 'teacher') form.teacherId = '' }

async function handleSubmit() {
  Object.keys(errors).forEach(k => delete errors[k])
  errorMsg.value = ''
  try {
    await userSchema.validate(form, { abortEarly: false, context: { isCreate: !isEdit.value } })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner: { path: string; message: string }[] }).inner
      inner.forEach(e => { errors[e.path] = e.message })
    }
    return
  }
  isSaving.value = true
  try {
    if (isEdit.value) {
      await usersService.update(route.params.id as string, {
        fullName: form.fullName, email: form.email, role: form.role,
        teacherId: form.teacherId || undefined, isActive: form.isActive,
      })
      toast.success('Pengguna berhasil diperbarui.')
    } else {
      await usersService.create({
        username: form.username, fullName: form.fullName, email: form.email,
        role: form.role, password: form.password,
        teacherId: form.teacherId || undefined, isActive: form.isActive,
      })
      toast.success('Pengguna berhasil dibuat.')
    }
    router.push('/users')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan pengguna.'
  } finally { isSaving.value = false }
}

onMounted(async () => {
  const teachers = await teachersService.listActive()
  teacherOptions.value = teachers.map(t => ({ value: t.id, label: t.fullName }))

  if (isEdit.value) {
    const user = await usersService.get(route.params.id as string)
    Object.assign(form, { fullName: user.fullName, username: user.username, email: user.email || '', role: user.role, teacherId: user.teacherId ?? '', isActive: user.isActive })
  }
})
</script>
