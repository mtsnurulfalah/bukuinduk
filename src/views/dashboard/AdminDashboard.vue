<template>
  <div class="space-y-6">

    <!-- ── Header ────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 leading-tight">
          Selamat datang, {{ firstName }} 👋
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          <span v-if="schoolYearStore.activeSchoolYearName">
            Tahun Pelajaran
            <span class="font-medium text-primary-600">
              {{ schoolYearStore.activeSchoolYearName }}
            </span>
          </span>
          <span v-else class="text-slate-400 italic">Tahun pelajaran aktif belum diatur</span>
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Tombol retry muncul jika ada error -->
        <button
          v-if="errorStats || errorClass"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          @click="loadData"
        >
          <RefreshCw class="h-3.5 w-3.5" />
          Coba Lagi
        </button>

        <RouterLink
          to="/students/create"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm"
        >
          <UserPlus class="h-4 w-4" />
          Tambah Siswa
        </RouterLink>
      </div>
    </div>

    <!-- ── Error Banner ───────────────────────────────────────── -->
    <div
      v-if="errorStats"
      class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
      role="alert"
    >
      <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
      <span>{{ errorStats }}</span>
    </div>

    <!-- ── Stat Cards ─────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Siswa Aktif"
        :value="stats?.activeStudents"
        :icon="Users"
        color="blue"
        :loading="isLoadingStats"
        subtitle="Terdaftar & aktif"
      />
      <StatCard
        label="Siswa Baru"
        :value="stats?.newStudentsThisYear"
        :icon="UserPlus"
        color="green"
        :loading="isLoadingStats"
        subtitle="Tahun ini"
      />
      <StatCard
        label="Total Guru"
        :value="stats?.totalTeachers"
        :icon="GraduationCap"
        color="purple"
        :loading="isLoadingStats"
        subtitle="Guru aktif"
      />
      <StatCard
        label="Total Kelas"
        :value="stats?.totalClassrooms"
        :icon="School"
        color="teal"
        :loading="isLoadingStats"
        subtitle="Rombel aktif"
      />
    </div>

    <!-- ── Row 2: Gender + Status ─────────────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Distribusi Gender -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 class="text-base font-semibold text-slate-800 mb-4">
          Distribusi Jenis Kelamin
        </h3>

        <div v-if="isLoadingStats" class="space-y-4">
          <BaseSkeleton v-for="i in 2" :key="i" height="h-8" />
        </div>

        <div v-else-if="!stats" class="py-6 text-center text-sm text-slate-400">
          Data tidak tersedia
        </div>

        <div v-else class="space-y-4">
          <!-- Laki-laki -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2 text-sm">
                <span class="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                <span class="text-slate-600 font-medium">Laki-laki</span>
              </div>
              <div class="text-sm font-semibold text-slate-700">
                {{ formatNumber(stats.maleStudents) }}
                <span class="text-slate-400 font-normal text-xs ml-1">
                  ({{ malePercent }}%)
                </span>
              </div>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all duration-700"
                :style="{ width: malePercent + '%' }"
              />
            </div>
          </div>

          <!-- Perempuan -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2 text-sm">
                <span class="h-2.5 w-2.5 rounded-full bg-pink-500 shrink-0" />
                <span class="text-slate-600 font-medium">Perempuan</span>
              </div>
              <div class="text-sm font-semibold text-slate-700">
                {{ formatNumber(stats.femaleStudents) }}
                <span class="text-slate-400 font-normal text-xs ml-1">
                  ({{ femalePercent }}%)
                </span>
              </div>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-pink-500 rounded-full transition-all duration-700"
                :style="{ width: femalePercent + '%' }"
              />
            </div>
          </div>

          <p class="text-xs text-slate-400 pt-1 border-t border-slate-50">
            Total keseluruhan: <span class="font-semibold text-slate-600">{{ formatNumber(stats.totalStudents) }}</span> siswa
          </p>
        </div>
      </div>

      <!-- Status Siswa -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 class="text-base font-semibold text-slate-800 mb-4">Status Siswa</h3>

        <div v-if="isLoadingStats" class="grid grid-cols-2 gap-3">
          <BaseSkeleton v-for="i in 4" :key="i" height="h-16" />
        </div>

        <div v-else-if="!stats" class="py-6 text-center text-sm text-slate-400">
          Data tidak tersedia
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="item in statusItems"
            :key="item.label"
            class="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div :class="['p-2 rounded-lg shrink-0', item.bg]">
              <component :is="item.icon" :class="['h-4 w-4', item.color]" />
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold text-slate-800 leading-none">
                {{ formatNumber(item.value) }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5 truncate">{{ item.label }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Rekap per Kelas ────────────────────────────────────── -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between p-5 pb-0">
        <div>
          <h3 class="text-base font-semibold text-slate-800">Rekap per Kelas</h3>
          <p v-if="schoolYearStore.activeSchoolYearName" class="text-sm text-slate-400 mt-0.5">
            TP {{ schoolYearStore.activeSchoolYearName }}
          </p>
        </div>
        <RouterLink
          to="/classrooms"
          class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          Lihat semua <ChevronRight class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingClass" class="p-5 space-y-2">
        <BaseSkeleton v-for="i in 4" :key="i" height="h-10" />
      </div>

      <!-- Error kelas -->
      <div
        v-else-if="errorClass"
        class="p-5 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-b-xl"
      >
        <AlertCircle class="h-4 w-4 shrink-0" />
        {{ errorClass }}
      </div>

      <!-- Empty -->
      <div
        v-else-if="!classStats.length"
        class="p-8 text-center text-sm text-slate-400"
      >
        <School class="h-10 w-10 text-slate-200 mx-auto mb-2" :stroke-width="1.5" />
        Belum ada data kelas untuk tahun pelajaran ini.
      </div>

      <!-- Tabel — wrapper overflow yang benar untuk mobile -->
      <div v-else class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-y border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wide">
              <th class="px-5 py-3 text-left">Kelas</th>
              <th class="px-4 py-3 text-center w-16">L</th>
              <th class="px-4 py-3 text-center w-16">P</th>
              <th class="px-4 py-3 text-center w-20">Total</th>
              <th class="px-5 py-3 text-left hidden sm:table-cell">Distribusi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              v-for="cls in classStats"
              :key="cls.classroomId"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">
                {{ cls.classroomName }}
                <span v-if="cls.gradeName" class="ml-1.5 text-xs text-slate-400 font-normal">
                  {{ cls.gradeName }}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-blue-600 font-semibold">{{ cls.maleStudents }}</td>
              <td class="px-4 py-3 text-center text-pink-600 font-semibold">{{ cls.femaleStudents }}</td>
              <td class="px-4 py-3 text-center font-bold text-slate-800">{{ cls.totalStudents }}</td>
              <td class="px-5 py-3 w-44 hidden sm:table-cell">
                <div class="flex h-2 rounded-full overflow-hidden bg-slate-100">
                  <div
                    class="bg-blue-400 transition-all duration-500"
                    :style="{
                      width: cls.totalStudents
                        ? (cls.maleStudents / cls.totalStudents * 100) + '%'
                        : '0%',
                    }"
                  />
                  <div
                    class="bg-pink-400 transition-all duration-500"
                    :style="{
                      width: cls.totalStudents
                        ? (cls.femaleStudents / cls.totalStudents * 100) + '%'
                        : '0%',
                    }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-700">
              <td class="px-5 py-3 text-slate-800">Total</td>
              <td class="px-4 py-3 text-center text-blue-700">
                {{ formatNumber(classStats.reduce((a, c) => a + c.maleStudents, 0)) }}
              </td>
              <td class="px-4 py-3 text-center text-pink-700">
                {{ formatNumber(classStats.reduce((a, c) => a + c.femaleStudents, 0)) }}
              </td>
              <td class="px-4 py-3 text-center text-slate-900 font-bold">
                {{ formatNumber(classStats.reduce((a, c) => a + c.totalStudents, 0)) }}
              </td>
              <td class="hidden sm:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ── Shortcut Navigasi ───────────────────────────────────── -->
    <div>
      <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Akses Cepat
      </h3>
      <!-- BUG FIX: grid-cols-2 untuk mobile, sm:grid-cols-4 untuk desktop -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RouterLink
          v-for="sc in shortcuts"
          :key="sc.label"
          :to="sc.to"
          class="flex flex-col items-center gap-2.5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div :class="['p-2.5 rounded-xl', sc.bg]">
            <component :is="sc.icon" :class="['h-5 w-5', sc.color]" />
          </div>
          <span class="text-xs font-medium text-slate-600 text-center group-hover:text-primary-700 transition-colors leading-tight">
            {{ sc.label }}
          </span>
        </RouterLink>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users, UserPlus, GraduationCap, School,
  CheckCircle, UserX, ArrowRightLeft, LogOut,
  FileText, Settings, UserCog, RefreshCw,
  AlertCircle, ChevronRight,
} from 'lucide-vue-next'
import { StatCard } from '@/components/shared'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { reportsService } from '@/services'
import { formatNumber } from '@/utils'
import type { DashboardStats, ClassroomStats } from '@/types'

const authStore       = useAuthStore()
const schoolYearStore = useSchoolYearStore()

// ── State ────────────────────────────────────────────────────────
const stats         = ref<DashboardStats | null>(null)
const classStats    = ref<ClassroomStats[]>([])
const isLoadingStats = ref(true)
const isLoadingClass = ref(true)  // BUG FIX: pisahkan loading state
const errorStats    = ref('')
const errorClass    = ref('')

// ── Computed ─────────────────────────────────────────────────────
const firstName = computed(() =>
  authStore.user?.fullName?.split(' ')[0] ?? 'Admin'
)

const malePercent = computed(() => {
  if (!stats.value?.totalStudents) return 0
  return Math.round((stats.value.maleStudents / stats.value.totalStudents) * 100)
})
const femalePercent = computed(() => 100 - malePercent.value)

const statusItems = computed(() => {
  const s = stats.value
  if (!s) return []

  // BUG FIX: Kalkulasi "Keluar" yang aman — gunakan Math.max(0,...) agar tidak negatif.
  // "Keluar" = total dikurangi semua status yang diketahui.
  const knownCount = (s.activeStudents ?? 0)
    + (s.graduatedStudents ?? 0)
    + (s.transferredStudents ?? 0)
  const exitCount = Math.max(0, (s.totalStudents ?? 0) - knownCount)

  return [
    {
      label: 'Aktif',
      value: s.activeStudents ?? 0,
      icon: CheckCircle,
      bg: 'bg-green-100',
      color: 'text-green-600',
    },
    {
      label: 'Lulus',
      value: s.graduatedStudents ?? 0,
      icon: GraduationCap,
      bg: 'bg-blue-100',
      color: 'text-blue-600',
    },
    {
      label: 'Pindah',
      value: s.transferredStudents ?? 0,
      icon: ArrowRightLeft,
      bg: 'bg-amber-100',
      color: 'text-amber-600',
    },
    {
      label: 'Keluar',
      value: exitCount,
      icon: LogOut,
      bg: 'bg-red-100',
      color: 'text-red-600',
    },
  ]
})

const shortcuts = [
  {
    label: 'Tambah Siswa',
    to: '/students/create',
    icon: UserPlus,
    bg: 'bg-blue-50',
    color: 'text-blue-600',
  },
  {
    label: 'Data Siswa',
    to: '/students',
    icon: Users,
    bg: 'bg-green-50',
    color: 'text-green-600',
  },
  {
    label: 'Laporan',
    to: '/reports',
    icon: FileText,
    bg: 'bg-purple-50',
    color: 'text-purple-600',
  },
  {
    label: 'Pengguna',
    to: '/users',
    icon: UserCog,
    bg: 'bg-amber-50',
    color: 'text-amber-600',
  },
]

// ── Data fetching ─────────────────────────────────────────────────

// BUG FIX: Pisahkan fetch agar error satu tidak memblokir yang lain.
// Juga tunggu schoolYearStore ter-fetch dulu agar syId valid.
async function loadData() {
  errorStats.value = ''
  errorClass.value = ''
  isLoadingStats.value = true
  isLoadingClass.value = true

  // Pastikan data tahun pelajaran sudah tersedia
  if (!schoolYearStore.initialized) {
    await schoolYearStore.fetch().catch(() => {})
  }
  const syId = schoolYearStore.activeSchoolYear?.id

  // Fetch stats dan classStats secara paralel tapi handle error masing-masing
  await Promise.allSettled([
    reportsService.getDashboardStats(syId)
      .then(s => { stats.value = s })
      .catch(err => {
        errorStats.value = err instanceof Error
          ? err.message
          : 'Gagal memuat statistik dashboard.'
      })
      .finally(() => { isLoadingStats.value = false }),

    reportsService.getClassroomStats(syId)
      .then(cs => { classStats.value = cs })
      .catch(err => {
        errorClass.value = err instanceof Error
          ? err.message
          : 'Gagal memuat data kelas.'
      })
      .finally(() => { isLoadingClass.value = false }),
  ])
}

onMounted(loadData)
</script>
