<template>
  <div class="w-full min-w-0 space-y-6">

    <PageHeader :title="'Selamat datang, ' + firstName + ' 👋'">
      <template #subtitle>
        <span v-if="schoolYearStore.activeSchoolYearName">
          Ringkasan — Tahun Pelajaran
          <span class="font-medium text-primary-600">{{ schoolYearStore.activeSchoolYearName }}</span>
        </span>
        <span v-else class="italic text-slate-400">Tahun pelajaran aktif belum diatur</span>
      </template>
      <template #actions>
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isLoadingStats || isLoadingClass"
          aria-label="Segarkan data dashboard"
          @click="loadData"
        >
          <RefreshCw :class="['h-3.5 w-3.5', (isLoadingStats || isLoadingClass) ? 'animate-spin' : '']" aria-hidden="true" />
          <span>Segarkan</span>
        </button>
      </template>
    </PageHeader>

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
        label="Total Siswa"
        :value="stats?.totalStudents"
        :icon="Users"
        color="blue"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Siswa Aktif"
        :value="stats?.activeStudents"
        :icon="CheckCircle"
        color="green"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Laki-laki"
        :value="stats?.maleStudents"
        :icon="User"
        color="blue"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Perempuan"
        :value="stats?.femaleStudents"
        :icon="User"
        color="purple"
        :loading="isLoadingStats"
      />
    </div>

    <!-- ── Kualitas Data ──────────────────────────────────────── -->
    <DataQualityCard />

    <!-- ── Rekap Kelas ────────────────────────────────────────── -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between p-5 pb-0">
        <h3 class="text-base font-semibold text-slate-800">Rekap Siswa per Kelas</h3>
        <RouterLink
          to="/classrooms"
          class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          Lihat semua <ChevronRight class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingClass" class="p-5 space-y-2 mt-2">
        <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
      </div>

      <!-- Error -->
      <div
        v-else-if="errorClass"
        class="p-5 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 m-4 rounded-lg"
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
        Belum ada data kelas.
      </div>

      <!-- Tabel -->
      <div v-else class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-y border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wide">
              <th class="px-5 py-3 text-left">Kelas</th>
              <th class="px-4 py-3 text-center w-16">L</th>
              <th class="px-4 py-3 text-center w-16">P</th>
              <th class="px-4 py-3 text-center w-20 font-bold">Total</th>
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
              </td>
              <td class="px-4 py-3 text-center text-blue-600 font-semibold">
                {{ cls.maleStudents }}
              </td>
              <td class="px-4 py-3 text-center text-pink-600 font-semibold">
                {{ cls.femaleStudents }}
              </td>
              <td class="px-4 py-3 text-center font-bold text-slate-800">
                {{ cls.totalStudents }}
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
              <td class="px-4 py-3 text-center font-bold text-slate-900">
                {{ formatNumber(classStats.reduce((a, c) => a + c.totalStudents, 0)) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ── Status Summary ─────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="item in statusSummary"
        :key="item.label"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4"
      >
        <div :class="['p-3 rounded-xl shrink-0', item.bg]">
          <component :is="item.icon" :class="['h-5 w-5', item.color]" />
        </div>
        <div class="min-w-0">
          <p class="text-2xl font-bold text-slate-800 leading-none">
            <template v-if="isLoadingStats">
              <BaseSkeleton height="h-7" width="w-12" />
            </template>
            <template v-else>{{ formatNumber(item.value) }}</template>
          </p>
          <p class="text-sm text-slate-500 mt-1 truncate">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <!-- ── Quick Actions ──────────────────────────────────────── -->
    <div class="flex flex-wrap gap-3">
      <RouterLink
        to="/students"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
      >
        <Users class="h-4 w-4" />
        Lihat Data Siswa
      </RouterLink>
      <RouterLink
        to="/reports"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
      >
        <FileText class="h-4 w-4" />
        Laporan
      </RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users, User, CheckCircle, GraduationCap, ArrowRightLeft,
  FileText, RefreshCw, AlertCircle, ChevronRight, School,
} from 'lucide-vue-next'
import { DataQualityCard, PageHeader, StatCard } from '@/components/shared'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { formatNumber } from '@/utils'
import { useDashboardData } from '@/composables'

const authStore       = useAuthStore()
const schoolYearStore = useSchoolYearStore()

const {
  stats,
  classStats,
  isLoadingStats,
  isLoadingClass,
  errorStats,
  errorClass,
  load: loadDashboardData,
} = useDashboardData()

const firstName = computed(() =>
  authStore.user?.fullName?.trim().split(/\\s+/)[0] || 'Kepala Sekolah'
)

const statusSummary = computed(() => [
  {
    label: 'Siswa Lulus',
    value: stats.value?.graduatedStudents ?? 0,
    icon: GraduationCap,
    bg: 'bg-blue-100',
    color: 'text-blue-600',
  },
  {
    label: 'Siswa Pindah',
    value: stats.value?.transferredStudents ?? 0,
    icon: ArrowRightLeft,
    bg: 'bg-amber-100',
    color: 'text-amber-600',
  },
  {
    label: 'Siswa Baru Tahun Ini',
    value: stats.value?.newStudentsThisYear ?? 0,
    icon: Users,
    bg: 'bg-green-100',
    color: 'text-green-600',
  },
])

const dashboardMounted = ref(false)
const activeSchoolYearId = computed(() => schoolYearStore.activeSchoolYear?.id ?? '')

async function loadData() {
  if (!schoolYearStore.initialized) {
    await schoolYearStore.fetch().catch(() => {})
  }
  await loadDashboardData(activeSchoolYearId.value || undefined)
}

watch(activeSchoolYearId, (nextId, previousId) => {
  if (!dashboardMounted.value || nextId === previousId) return
  void loadData()
})

onMounted(async () => {
  await loadData()
  dashboardMounted.value = true
})

</script>
