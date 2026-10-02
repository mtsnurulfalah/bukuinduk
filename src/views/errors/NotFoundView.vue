<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div class="text-center">
      <p class="text-8xl font-black text-slate-200 select-none leading-none">404</p>
      <h1 class="text-2xl font-bold text-slate-800 mt-4 mb-2">Halaman Tidak Ditemukan</h1>
      <p class="text-slate-500 mb-8 max-w-sm mx-auto">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
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
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LayoutDashboard } from 'lucide-vue-next'
</script>
