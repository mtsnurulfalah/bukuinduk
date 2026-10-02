<template>
  <div>
    <PageHeader title="Profil Saya" subtitle="Kelola informasi akun Anda" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Info akun -->
      <BaseCard class="lg:col-span-1">
        <div class="flex flex-col items-center text-center gap-3 py-4">
          <BaseAvatar :name="user?.fullName" size="xl" color="blue" />
          <div>
            <p class="font-semibold text-slate-800 text-lg">{{ user?.fullName }}</p>
            <p class="text-sm text-slate-500">@{{ user?.username }}</p>
            <BaseBadge :color="roleBadgeColor" size="md" class="mt-2">
              {{ roleLabel }}
            </BaseBadge>
          </div>
          <div class="w-full border-t border-slate-100 pt-4 text-sm text-left space-y-2">
            <div class="flex justify-between">
              <span class="text-slate-500">Email</span>
              <span class="text-slate-700 font-medium truncate ml-2 max-w-[160px]">{{ user?.email || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Status</span>
              <BaseBadge :color="user?.isActive ? 'green' : 'slate'">
                {{ user?.isActive ? 'Aktif' : 'Nonaktif' }}
              </BaseBadge>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Terakhir masuk</span>
              <span class="text-slate-700 text-xs">{{ user?.lastLogin ? formatDateTime(user.lastLogin) : '-' }}</span>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Ganti password -->
      <BaseCard title="Ganti Password" subtitle="Direkomendasikan rutin mengganti password" class="lg:col-span-2">
        <BaseAlert v-if="successMsg" type="success" dismissible class="mb-4">{{ successMsg }}</BaseAlert>
        <BaseAlert v-if="errorMsg" type="error" dismissible class="mb-4">{{ errorMsg }}</BaseAlert>

        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <BaseInput
            v-model="pwForm.currentPassword"
            label="Password Lama"
            type="password"
            placeholder="Masukkan password lama"
            required
            :error-message="pwErrors.currentPassword"
          />
          <BaseInput
            v-model="pwForm.newPassword"
            label="Password Baru"
            type="password"
            placeholder="Min. 8 karakter, kombinasi huruf & angka"
            required
            :error-message="pwErrors.newPassword"
          />
          <BaseInput
            v-model="pwForm.confirmPassword"
            label="Konfirmasi Password Baru"
            type="password"
            placeholder="Ulangi password baru"
            required
            :error-message="pwErrors.confirmPassword"
          />
          <div class="flex justify-end pt-2">
            <BaseButton type="submit" :loading="isLoading" loading-text="Menyimpan...">
              Simpan Password
            </BaseButton>
          </div>
        </form>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import { PageHeader } from '@/components/shared'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services'
import { ROLE_LABELS } from '@/constants'
import { formatDateTime } from '@/utils'
import { changePasswordSchema } from '@/utils/validation'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const roleLabel = computed(() => user.value ? ROLE_LABELS[user.value.role] : '')
const roleBadgeColor = computed(() => {
  const map: Record<string, 'purple' | 'blue' | 'green'> = {
    admin: 'purple', principal: 'blue', teacher: 'green',
  }
  return map[user.value?.role ?? ''] ?? 'slate'
})

const pwForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwErrors = reactive<Record<string, string | undefined>>({})
const isLoading = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

async function handleChangePassword() {
  Object.keys(pwErrors).forEach(k => delete pwErrors[k])
  successMsg.value = ''
  errorMsg.value = ''

  try {
    await changePasswordSchema.validate(pwForm, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner: { path: string; message: string }[] }).inner
      inner.forEach(e => { pwErrors[e.path] = e.message })
    }
    return
  }

  isLoading.value = true
  try {
    await authService.changePassword(pwForm)
    successMsg.value = 'Password berhasil diubah.'
    pwForm.currentPassword = ''
    pwForm.newPassword = ''
    pwForm.confirmPassword = ''
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal mengubah password.'
  } finally {
    isLoading.value = false
  }
}
</script>
