<template>
  <div class="space-y-6">

    <!-- ── Header ────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 leading-tight">
          Selamat datang, {{ firstName }} 👋
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Kelas yang Anda ampu hari ini
        </p>
      </div>

      <!-- Retry -->
      <button
        v-if="error"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors self-start sm:self-auto"
        @click="loadData"
      >
        <RefreshCw class="h-3.5 w-3.5" />
        Coba Lagi
      </button>
    </div>

    <!-- ── No teacherId warning ──────────────────────────────── -->
    <div
      v-if="!hasTeacherId && !isLoading"
      class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
      role="alert"
    >
      <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p class="font-medium">Profil guru belum terhubung</p>
        <p class="text-amber-700 mt-0.5">
          Akun Anda belum dikaitkan ke data guru. Hubungi administrator
          untuk menautkan akun ini ke profil guru.
        </p>
      </div>
    </div>

    <!-- ── Error ─────────────────────────────────────────────── -->
    <div
      v-else-if="error"
      class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
      role="alert"
    >
      <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- ── Loading skeleton ───────────────────────────────────── -->
    <div
      v-else-if="isLoading"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <BaseSkeleton v-for="i in 3" :key="i" height="h-36" />
    </div>

    <!-- ── Empty state ───────────────────────────────────────── -->
    <div
      v-else-if="!classrooms.length"
      class="bg-white rounded-xl border border-slate-200 shadow-sm"
    >
      <BaseEmpty
        title="Belum ada kelas yang diampu"
        description="Hubungi administrator untuk menambahkan kelas ke akun Anda."
        type="students"
      />
    </div>

    <!-- ── Daftar Kelas ───────────────────────────────────────── -->
    <template v-else>
      <!-- Stat ringkas -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div class="p-2.5 bg-primary-100 rounded-xl shrink-0">
            <School class="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-800 leading-none">
              {{ classrooms.length }}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">Kelas Diampu</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div class="p-2.5 bg-green-100 rounded-xl shrink-0">
            <Users class="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-800 leading-none">
              {{ totalStudents }}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">Total Siswa</p>
          </div>
        </div>
      </div>

      <!-- Grid kelas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RouterLink
          v-for="cls in classrooms"
          :key="cls.id"
          :to="`/classrooms/${cls.id}`"
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="p-2.5 bg-primary-100 rounded-xl">
              <School class="h-5 w-5 text-primary-600" />
            </div>
            <BaseBadge color="green" dot>Aktif</BaseBadge>
          </div>

          <h3 class="font-bold text-base text-slate-800 group-hover:text-primary-700 transition-colors truncate">
            Kelas {{ cls.name }}
          </h3>
          <p class="text-sm text-slate-500 mt-0.5 truncate">
            {{ cls.schoolYearName || 'Tahun pelajaran tidak diketahui' }}
          </p>

          <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <div class="flex items-center gap-1.5 text-sm text-slate-600">
              <Users class="h-4 w-4 text-slate-400" />
              <span class="font-semibold">{{ cls.studentCount ?? 0 }}</span>
              <span class="text-slate-400">siswa</span>
            </div>
            <span class="text-xs text-primary-500 font-medium group-hover:underline">
              Lihat detail →
            </span>
          </div>
        </RouterLink>
      </div>

      <!-- Aksi cepat -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Aksi Cepat</h3>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            to="/my-students"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Users class="h-4 w-4" />
            Daftar Siswa Saya
          </RouterLink>
          <!-- BUG FIX: Tombol "Lihat Kelas" sekarang ke /classrooms bukan hardcode ke classrooms[0] -->
          <RouterLink
            to="/classrooms"
            class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <School class="h-4 w-4" />
            Lihat Semua Kelas
          </RouterLink>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { School, Users, RefreshCw, AlertCircle } from 'lucide-vue-next'
import BaseBadge    from '@/components/ui/BaseBadge.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BaseEmpty    from '@/components/ui/BaseEmpty.vue'
import { useAuthStore } from '@/stores/auth'
import { classroomsService } from '@/services'
import type { Classroom } from '@/types'

const authStore  = useAuthStore()
const classrooms = ref<Classroom[]>([])
const isLoading  = ref(true)
const error      = ref('')

const firstName = computed(() =>
  authStore.user?.fullName?.split(' ')[0] ?? 'Guru'
)

// BUG FIX: Expose hasTeacherId agar template bisa membedakan
// "belum terhubung" vs "error fetch" vs "kosong"
const hasTeacherId = computed(() => !!authStore.user?.teacherId)

const totalStudents = computed(() =>
  classrooms.value.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)
)

async function loadData() {
  error.value = ''
  isLoading.value = true

  const teacherId = authStore.user?.teacherId
  if (!teacherId) {
    isLoading.value = false
    return
  }

  try {
    classrooms.value = await classroomsService.getByTeacher(teacherId)
  } catch (err: unknown) {
    // BUG FIX: Tampilkan error yang informatif, bukan silent catch
    error.value = err instanceof Error
      ? err.message
      : 'Gagal memuat data kelas. Coba lagi.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>
