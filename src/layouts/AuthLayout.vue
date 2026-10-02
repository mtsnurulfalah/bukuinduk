<template>
  <!--
    BUG-10 FIX: Tambahkan `relative` pada wrapper terluar agar `absolute inset-0`
    pada background pattern terkontain di dalam elemen ini, tidak overflow ke
    dokumen — penting di browser mobile tertentu.

    BUG-12 FIX: Tambahkan `overflow-y-auto` agar pada layar sangat kecil (<360px)
    atau orientasi landscape yang sempit, konten bisa di-scroll dan tidak terpotong
    viewport. Ini mencegah card terdorong keluar layar.

    BUG-11 FIX: Ubah max-w-sm (384px) → max-w-md (448px) agar form lebih luas
    dan pesan error panjang tidak terpotong/wrapping buruk. Masih ramping dan rapi
    di desktop, tapi lebih nyaman di tablet dan tidak sempit di mobile.
  -->
  <div class="relative min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4 overflow-y-auto">

    <!-- Decorative background blobs — pointer-events-none, tidak mengganggu interaksi -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
      <div class="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5" />
      <div class="absolute top-1/2 left-1/4 w-40 h-40 rounded-full bg-white/5" />
    </div>

    <!--
      Wrapper konten: relative agar z-index bekerja di atas blobs.
      py-8 memberikan breathing room atas-bawah saat layar pendek (landscape mobile).
    -->
    <div class="relative w-full max-w-md py-8">

      <!-- Branding / Logo -->
      <div class="text-center mb-6 sm:mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-lg mb-3 sm:mb-4">
          <img
            src="/favicon.svg"
            alt="Logo aplikasi"
            class="w-9 h-9 sm:w-10 sm:h-10"
            loading="eager"
          />
        </div>
        <!--
          BUG-5 FIX: Terima prop schoolName dari LoginView yang mengambilnya
          dari settingsStore.schoolName. Fallback ke APP_NAME jika belum ada.
          Ini menggantikan prop lama `appSettings` yang tidak pernah diteruskan,
          sehingga nama sekolah kini ditampilkan dengan benar.
        -->
        <h1 class="text-xl sm:text-2xl font-bold text-white leading-tight">
          {{ schoolName || APP_NAME }}
        </h1>
        <p class="text-primary-200 text-sm mt-1">Buku Induk Digital</p>
      </div>

      <!-- Card konten (slot dari LoginView) -->
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <slot />
      </div>

      <!-- Footer -->
      <p class="text-center text-primary-300 text-xs mt-5 sm:mt-6 leading-relaxed">
        &copy; {{ currentYear }} Buku Induk Digital.
        <span class="whitespace-nowrap">Hak cipta dilindungi.</span>
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { APP_NAME } from '@/constants'

/**
 * BUG-5 FIX: Ganti prop `appSettings` (yang tidak pernah diteruskan dari LoginView)
 * dengan prop `schoolName` (string langsung dari settingsStore.schoolName).
 * LoginView sekarang meneruskan prop ini secara eksplisit.
 * Ini lebih sederhana, type-safe, dan tidak perlu optional chaining di template.
 */
defineProps<{
  schoolName?: string | null
}>()

const currentYear = computed(() => new Date().getFullYear())
</script>
