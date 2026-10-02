<template>
  <AuthLayout :school-name="settingsStore.schoolName">
    <div class="px-6 py-7 sm:px-8 sm:py-8">

      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-xl font-bold text-slate-800 leading-tight">Masuk ke Sistem</h2>
        <p class="text-sm text-slate-500 mt-1">Masukkan username dan password Anda untuk melanjutkan</p>
      </div>

      <!-- Error alert -->
      <!--
        BUG-3 FIX: BaseAlert tidak me-reset `visible` saat konten berubah karena
        `visible` adalah internal ref. Solusi: paksa re-mount komponen setiap kali
        errorMsg berubah menggunakan :key="errorMsg". Dengan ini setiap pesan baru
        akan selalu muncul, bahkan setelah user dismiss pesan sebelumnya.
      -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <BaseAlert
          v-if="errorMsg"
          :key="errorMsg"
          type="error"
          dismissible
          class="mb-5"
          @dismiss="errorMsg = ''"
        >
          {{ errorMsg }}
        </BaseAlert>
      </Transition>

      <!-- Form -->
      <!--
        BUG-14 FIX: Tambahkan novalidate agar browser native validation tidak
        muncul bersamaan dengan Yup validation — mencegah double-validation UX.
      -->
      <form novalidate class="space-y-4" @submit.prevent="handleLogin">

        <!-- Username -->
        <!--
          BUG-13 (partial): username sudah pakai BaseInput.
          Tambahkan autocapitalize="none" autocorrect="off" spellcheck="false"
          agar keyboard mobile tidak mengkapitalisasi atau mengkoreksi username.
          Atribut ini diteruskan via inheritAttrs ke <input> karena BaseInput
          menggunakan `inheritAttrs: false` dan v-bind="$attrs" pada element input.
        -->
        <BaseInput
          ref="usernameInputRef"
          v-model="form.username"
          label="Username"
          placeholder="Masukkan username"
          required
          :prefix-icon="UserIcon"
          :error-message="errors.username"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="authStore.isLoading"
        />

        <!-- Password -->
        <!--
          BUG-13 FIX: Sebelumnya password field adalah raw <input> custom yang
          menduplikasi semua styling BaseInput. Sekarang menggunakan BaseInput
          dengan slot suffix untuk toggle show/hide — satu sumber kebenaran untuk
          styling, dan otomatis mendapat semua perbaikan styling BaseInput di masa depan.
          
          BUG-4 & BUG-8 FIX: Toggle button sekarang memiliki aria-label dinamis
          ("Tampilkan password" / "Sembunyikan password") dan aria-pressed state
          yang benar untuk aksesibilitas screen reader.
        -->
        <div class="w-full">
          <BaseInput
            id="password-input"
            v-model="form.password"
            label="Password"
            :placeholder="showPassword ? 'Masukkan password' : '••••••••'"
            :type="showPassword ? 'text' : 'password'"
            required
            :prefix-icon="LockIcon"
            :error-message="errors.password"
            autocomplete="current-password"
            :disabled="authStore.isLoading"
          >
            <template #suffix>
              <button
                type="button"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                :aria-pressed="showPassword"
                class="flex items-center justify-center w-5 h-5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-primary-600 transition-colors rounded"
                @click="togglePassword"
              >
                <EyeOffIcon v-if="showPassword" class="h-4 w-4" aria-hidden="true" />
                <EyeIcon v-else class="h-4 w-4" aria-hidden="true" />
              </button>
            </template>
          </BaseInput>
        </div>

        <!-- Submit button -->
        <!--
          Mobile touch target: BaseButton size="lg" menghasilkan py-2.5 (≈44px height)
          yang memenuhi Apple HIG minimum 44px dan Material Design 48dp.
          BUG-6 FIX: Gunakan authStore.isLoading sebagai sumber tunggal loading state.
        -->
        <div class="pt-1">
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="authStore.isLoading"
            loading-text="Memverifikasi..."
            hide-content-when-loading
            class="w-full"
          >
            <LogInIcon class="h-4 w-4" aria-hidden="true" />
            Masuk
          </BaseButton>
        </div>

      </form>

      <!-- Footer hint -->
      <p class="text-center text-xs text-slate-400 mt-6 leading-relaxed">
        Lupa password? Hubungi<br class="sm:hidden" />
        administrator sistem.
      </p>

    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User as UserIcon, Lock as LockIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, LogIn as LogInIcon } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { loginSchema } from '@/utils/validation'

const authStore = useAuthStore()
// BUG-5 FIX: Ambil settingsStore agar nama sekolah bisa diteruskan ke AuthLayout.
// settingsStore.schoolName adalah computed yang sudah aman (fallback ke 'Madrasah/Sekolah').
const settingsStore = useSettingsStore()

const router = useRouter()
const route = useRoute()

// ── Refs ──────────────────────────────────────────────────────
const usernameInputRef = ref<InstanceType<typeof BaseInput> | null>(null)
const form = reactive({ username: '', password: '' })
const errors = reactive<{ username?: string; password?: string }>({})
const errorMsg = ref('')
const showPassword = ref(false)

// ── BUG-6 FIX: Hapus ref isLoading lokal. Gunakan authStore.isLoading sebagai
// satu-satunya sumber state loading. Ini menghilangkan potensi desync antara
// state lokal dan store, serta mengurangi boilerplate di template.

// ── Helpers ───────────────────────────────────────────────────

/**
 * Toggle show/hide password.
 * BUG-8 FIX: Setelah toggle, kembalikan focus ke input agar keyboard
 * tidak hilang pada mobile dan state aria-pressed diperbarui dengan benar.
 */
function togglePassword() {
  showPassword.value = !showPassword.value
  nextTick(() => {
    const input = document.getElementById('password-input') as HTMLInputElement | null
    input?.focus()
  })
}

/**
 * Sanitasi pesan error dari server/API sebelum ditampilkan ke user.
 * BUG-15 FIX: Pesan teknis internal (HTTP error, GAS HTML response, dsb.)
 * disaring dan diganti dengan pesan yang ramah pengguna.
 * Pesan yang sudah user-friendly (dari AuthHandler.gs) dilewatkan apa adanya.
 */
function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  // Pesan user-friendly dari GAS AuthHandler — tampilkan apa adanya
  const userFriendlyPhrases = [
    'Username atau password salah',
    'Akun Anda tidak aktif',
    'Sesi berakhir',
    'Sesi tidak valid',
    'Token tidak valid',
    'Username dan password wajib',
    'Tidak dapat terhubung ke server',
    'Request timeout',
    'Terlalu banyak request',
  ]
  if (userFriendlyPhrases.some(phrase => raw.includes(phrase))) {
    return raw
  }

  // Pesan teknis internal — ganti dengan fallback ramah
  if (
    raw.includes('HTTP ') ||
    raw.includes('GAS mengembalikan') ||
    raw.includes('doPost') ||
    raw.includes('Script function') ||
    raw.includes('accounts.google.com') ||
    raw.includes('VITE_GAS_URL') ||
    raw.includes('Response GAS bukan JSON') ||
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError')
  ) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.'
  }

  // Fallback umum
  return raw || 'Login gagal. Silakan coba lagi.'
}

// ── Main handler ──────────────────────────────────────────────

async function handleLogin() {
  // Reset state error
  errors.username = undefined
  errors.password = undefined
  errorMsg.value = ''

  // Validasi client-side dengan Yup
  try {
    await loginSchema.validate(form, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const validationErrors = (err as { inner: { path: string; message: string }[] }).inner
      for (const e of validationErrors) {
        if (e.path === 'username') errors.username = e.message
        if (e.path === 'password') errors.password = e.message
      }
    }
    return
  }

  // Panggil store — error dari authService.login() bubble up ke sini
  // karena store tidak punya catch block (hanya finally).
  // BUG-6 FIX: isLoading sekarang dikelola penuh oleh store (authStore.isLoading).
  try {
    await authStore.login({ username: form.username, password: form.password })

    // Redirect: gunakan query redirect jika valid, fallback ke dashboard.
    // Guard: harus diawali '/' dan bukan '/login' agar tidak open redirect.
    const redirect = route.query.redirect as string | undefined
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/login') {
      await router.push(redirect)
    } else {
      await router.push('/dashboard')
    }
  } catch (err: unknown) {
    // BUG-15 FIX: Saring pesan error teknis sebelum ditampilkan ke user.
    errorMsg.value = sanitizeErrorMessage(err)

    // BUG-65 (pertahankan): Kosongkan password setelah gagal untuk keamanan.
    form.password = ''

    // BUG-9 FIX: Kembalikan focus ke username input agar user langsung bisa
    // mengetik ulang tanpa harus klik manual — penting terutama di mobile.
    await nextTick()
    const inputEl = usernameInputRef.value?.$el?.querySelector('input') as HTMLInputElement | null
    inputEl?.focus()
  }
}
</script>
