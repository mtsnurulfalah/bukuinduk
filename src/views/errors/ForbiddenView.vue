<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] py-16 text-center px-4">
    <div class="p-4 bg-red-100 rounded-full mb-5">
      <ShieldOff class="h-10 w-10 text-red-500" />
    </div>
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h1>
    <p class="text-slate-500 mb-8 max-w-sm">
      Anda tidak memiliki izin untuk mengakses halaman ini.
      Hubungi administrator jika Anda merasa ini adalah kesalahan.
    </p>
    <div class="flex gap-3 justify-center">
      <RouterLink
        to="/dashboard"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
      >
        <LayoutDashboard class="h-4 w-4" />
        Ke Dashboard
      </RouterLink>
      <button
        class="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
        @click="$router.back()"
      >
        Kembali
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldOff, LayoutDashboard } from 'lucide-vue-next'
</script>
