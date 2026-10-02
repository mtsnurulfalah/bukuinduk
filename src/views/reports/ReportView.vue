<template>
  <div class="space-y-5">
    <PageHeader title="Laporan" subtitle="Rekap dan statistik data siswa">
      <template #actions>
        <BaseButton variant="outline" size="sm" :loading="isExporting" @click="handleExportExcel">
          <FileSpreadsheet class="h-4 w-4" /> Export Excel
        </BaseButton>
        <BaseButton variant="outline" size="sm" :loading="isExporting" @click="handleExportPDF">
          <FileText class="h-4 w-4" /> Export PDF
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="printPage">
          <Printer class="h-4 w-4" /> Cetak
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Filter -->
    <BaseCard :padding="true">
      <div class="flex flex-wrap gap-3 items-end">
        <BaseSelect v-model="filters.schoolYearId" label="Tahun Pelajaran"
          :options="schoolYearStore.schoolYearOptions" placeholder="Semua Tahun"
          class="w-44" @update:model-value="loadAll" />
        <BaseSelect v-model="filters.classroomId" label="Kelas"
          :options="[{ value: '', label: 'Semua Kelas' }, ...classroomsStore.classroomOptions]"
          class="w-40" @update:model-value="loadAll" />
        <BaseSelect v-model="filters.gender" label="Jenis Kelamin"
          :options="[{ value: '', label: 'Semua' }, ...GENDER_OPTIONS]"
          class="w-36" @update:model-value="loadAll" />
        <BaseSelect v-model="filters.status" label="Status"
          :options="[{ value: '', label: 'Semua' }, ...STUDENT_STATUS_OPTIONS]"
          class="w-36" @update:model-value="loadAll" />
        <BaseButton v-if="hasFilters" variant="ghost" size="sm" class="self-end" @click="resetFilters">
          <X class="h-4 w-4" /> Reset
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Total Siswa" :value="stats?.totalStudents" :icon="Users" color="blue" :loading="isLoading" />
      <StatCard label="Aktif" :value="stats?.activeStudents" :icon="CheckCircle" color="green" :loading="isLoading" />
      <StatCard label="Laki-laki" :value="stats?.maleStudents" :icon="User" color="blue" :loading="isLoading" />
      <StatCard label="Perempuan" :value="stats?.femaleStudents" :icon="User" color="purple" :loading="isLoading" />
      <StatCard label="Lulus" :value="stats?.graduatedStudents" :icon="GraduationCap" color="teal" :loading="isLoading" />
      <StatCard label="Pindah/Keluar" :value="stats?.transferredStudents" :icon="ArrowRightLeft" color="amber" :loading="isLoading" />
    </div>

    <!-- Tabel Rekapitulasi per Kelas -->
    <BaseCard title="Rekapitulasi per Kelas" id="report-content">
      <div class="mb-3 mt-1 flex justify-between items-center">
        <p class="text-xs text-slate-400">
          {{ schoolYearStore.activeSchoolYearName
            ? 'Tahun Pelajaran ' + schoolYearStore.activeSchoolYearName : 'Semua Tahun Pelajaran' }}
        </p>
        <p class="text-xs text-slate-400 hidden print:block">
          Dicetak: {{ formatDate(new Date().toISOString()) }}
        </p>
      </div>

      <div v-if="isLoading" class="space-y-2">
        <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
      </div>
      <BaseEmpty v-else-if="!classStats.length" title="Tidak ada data" type="data" />
      <div v-else class="overflow-x-auto -mx-5 sm:mx-0">
        <table class="min-w-full text-sm" id="print-table">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <th class="px-4 py-3 text-left">No</th>
              <th class="px-4 py-3 text-left">Kelas</th>
              <th class="px-4 py-3 text-center">Laki-laki</th>
              <th class="px-4 py-3 text-center">Perempuan</th>
              <th class="px-4 py-3 text-center font-bold">Total</th>
              <th class="px-4 py-3 text-left hidden md:table-cell">Wali Kelas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(cls, i) in classStats" :key="cls.classroomId" class="hover:bg-slate-50">
              <td class="px-4 py-3 text-slate-400 text-xs">{{ i + 1 }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">{{ cls.classroomName }}</td>
              <td class="px-4 py-3 text-center text-blue-600 font-medium">{{ cls.maleStudents }}</td>
              <td class="px-4 py-3 text-center text-pink-600 font-medium">{{ cls.femaleStudents }}</td>
              <td class="px-4 py-3 text-center font-bold text-slate-800">{{ cls.totalStudents }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">{{ cls.gradeName ?? '–' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
              <td class="px-4 py-3" colspan="2">TOTAL</td>
              <td class="px-4 py-3 text-center text-blue-600">{{ classStats.reduce((a, c) => a + c.maleStudents, 0) }}</td>
              <td class="px-4 py-3 text-center text-pink-600">{{ classStats.reduce((a, c) => a + c.femaleStudents, 0) }}</td>
              <td class="px-4 py-3 text-center">{{ classStats.reduce((a, c) => a + c.totalStudents, 0) }}</td>
              <td class="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>

    <!-- Distribusi Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <BaseCard title="Distribusi Status Siswa">
        <div v-if="isLoadingStatus" class="space-y-2 mt-2">
          <BaseSkeleton v-for="i in 4" :key="i" height="h-8" />
        </div>
        <div v-else class="space-y-3 mt-3">
          <div v-for="item in statusDist" :key="item.status" class="flex items-center gap-3">
            <div class="w-24 shrink-0">
              <p class="text-xs font-medium text-slate-600 truncate">{{ item.label }}</p>
            </div>
            <div class="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="statusBarColor(item.status)"
                :style="{ width: totalStudentsForBar ? (item.count / totalStudentsForBar * 100) + '%' : '0%' }"
              />
            </div>
            <span class="text-sm font-bold text-slate-700 w-8 text-right shrink-0">{{ item.count }}</span>
          </div>
        </div>
      </BaseCard>

      <BaseCard title="Distribusi Jenis Kelamin per Kelas">
        <div v-if="isLoading" class="space-y-2 mt-2">
          <BaseSkeleton v-for="i in 5" :key="i" height="h-8" />
        </div>
        <div v-else class="space-y-2.5 mt-3">
          <div v-for="cls in classStats.slice(0, 8)" :key="cls.classroomId" class="flex items-center gap-2 text-xs">
            <span class="w-12 shrink-0 font-medium text-slate-600 truncate">{{ cls.classroomName }}</span>
            <div class="flex-1 h-4 rounded-full overflow-hidden bg-slate-100 flex">
              <div
                class="bg-blue-400 flex items-center justify-center text-white text-xs font-bold"
                :style="{ width: cls.totalStudents ? (cls.maleStudents / cls.totalStudents * 100) + '%' : '0%' }"
              >
                <span v-if="cls.maleStudents > 2">{{ cls.maleStudents }}</span>
              </div>
              <div
                class="bg-pink-400 flex items-center justify-center text-white text-xs font-bold"
                :style="{ width: cls.totalStudents ? (cls.femaleStudents / cls.totalStudents * 100) + '%' : '0%' }"
              >
                <span v-if="cls.femaleStudents > 2">{{ cls.femaleStudents }}</span>
              </div>
            </div>
            <span class="w-8 text-right text-slate-500 shrink-0">{{ cls.totalStudents }}</span>
          </div>
          <div class="flex items-center gap-4 pt-1 text-xs text-slate-500">
            <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" /> Laki-laki</span>
            <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-pink-400 inline-block" /> Perempuan</span>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Tabel Data Lengkap -->
    <BaseCard title="Daftar Siswa Lengkap">
      <div class="flex gap-3 mb-3 mt-1">
        <SearchFilter v-model:search="tableSearch" search-placeholder="Cari nama, NIS, NISN..." class="flex-1" />
      </div>

      <div v-if="isLoadingTable" class="space-y-2">
        <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
      </div>
      <div v-else class="overflow-x-auto -mx-5 sm:mx-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <th class="px-4 py-2.5 text-left">No</th>
              <th class="px-4 py-2.5 text-left">Nama</th>
              <th class="px-4 py-2.5">NIS</th>
              <th class="px-4 py-2.5">NISN</th>
              <th class="px-4 py-2.5 text-center">JK</th>
              <th class="px-4 py-2.5 hidden md:table-cell">Kelas</th>
              <th class="px-4 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(s, i) in tableFiltered" :key="String(s.id)" class="hover:bg-slate-50">
              <td class="px-4 py-2.5 text-xs text-slate-400">{{ i + 1 }}</td>
              <td class="px-4 py-2.5 font-medium text-slate-800">{{ s.fullName }}</td>
              <td class="px-4 py-2.5 text-center text-slate-600">{{ s.nis }}</td>
              <td class="px-4 py-2.5 text-center text-slate-600">{{ s.nisn }}</td>
              <td class="px-4 py-2.5 text-center" :class="s.gender === 'L' ? 'text-blue-600' : 'text-pink-600'">
                {{ s.gender }}
              </td>
              <td class="px-4 py-2.5 text-slate-600 hidden md:table-cell">{{ (s as any).classroomName ?? '–' }}</td>
              <td class="px-4 py-2.5 text-center">
                <StudentStatusBadge :status="String(s.status)" />
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!tableFiltered.length" class="py-8 text-center text-sm text-slate-400">
          Tidak ada data.
        </p>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Users, User, CheckCircle, GraduationCap,
  ArrowRightLeft, FileSpreadsheet, FileText, Printer, X,
} from 'lucide-vue-next'
import { PageHeader, SearchFilter, StatCard, StudentStatusBadge } from '@/components/shared'
import { BaseCard, BaseButton, BaseSelect, BaseSkeleton, BaseEmpty } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { reportsService, studentsService } from '@/services'
import { useExport } from '@/composables'
import { GENDER_OPTIONS, STUDENT_STATUS_OPTIONS } from '@/constants'
import { formatDate } from '@/utils'
import type { DashboardStats, ClassroomStats } from '@/types'
import type { Student } from '@/types'

const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()
const { exportToExcel, exportToPDF, printPage, isExporting } = useExport()

const stats = ref<DashboardStats | null>(null)
const classStats = ref<ClassroomStats[]>([])
const statusDist = ref<{ status: string; label: string; count: number }[]>([])
const tableRows = ref<Student[]>([])
const tableSearch = ref('')
const isLoading = ref(true)
const isLoadingStatus = ref(true)
const isLoadingTable = ref(true)

const filters = reactive({ schoolYearId: '', classroomId: '', gender: '', status: '' })
const hasFilters = computed(() => Object.values(filters).some(v => v !== ''))

const totalStudentsForBar = computed(() => statusDist.value.reduce((a, s) => a + s.count, 0))

const tableFiltered = computed(() => {
  if (!tableSearch.value.trim()) return tableRows.value
  const q = tableSearch.value.toLowerCase()
  return tableRows.value.filter(s =>
    s.fullName.toLowerCase().includes(q) ||
    s.nis.toLowerCase().includes(q) ||
    s.nisn.toLowerCase().includes(q)
  )
})

function statusBarColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-500', graduated: 'bg-blue-500',
    transferred: 'bg-amber-500', dropped_out: 'bg-red-500', inactive: 'bg-slate-400',
  }
  return map[status] ?? 'bg-slate-400'
}

function resetFilters() {
  filters.schoolYearId = ''
  filters.classroomId = ''
  filters.gender = ''
  filters.status = ''
  loadAll()
}

async function loadAll() {
  const f = { ...filters }
  isLoading.value = true
  isLoadingStatus.value = true
  isLoadingTable.value = true

  try {
    const [s, cs, sd, tableData] = await Promise.all([
      reportsService.getDashboardStats(f.schoolYearId || undefined),
      reportsService.getClassroomStats(f.schoolYearId || undefined),
      reportsService.getStatusDistribution(f),
      studentsService.exportData(f),
    ])
    stats.value = s
    classStats.value = cs
    statusDist.value = sd
    tableRows.value = tableData
  } catch { /* silent */ } finally {
    isLoading.value = false
    isLoadingStatus.value = false
    isLoadingTable.value = false
  }
}

const EXPORT_HEADERS = {
  nis: 'NIS', nisn: 'NISN', fullName: 'Nama Lengkap', gender: 'JK',
  birthPlace: 'Tempat Lahir', birthDate: 'Tgl Lahir', religion: 'Agama',
  address: 'Alamat', city: 'Kota', phone: 'No. HP', status: 'Status',
  classroomName: 'Kelas', entryDate: 'Tgl Masuk',
}

async function handleExportExcel() {
  const data = await reportsService.getStudentReport(filters)
  exportToExcel(data, EXPORT_HEADERS, 'laporan-siswa')
}

async function handleExportPDF() {
  const data = await reportsService.getStudentReport(filters)
  exportToPDF(data, EXPORT_HEADERS, 'laporan-siswa',
    `Laporan Data Siswa${schoolYearStore.activeSchoolYearName ? ' — TP ' + schoolYearStore.activeSchoolYearName : ''}`)
}

onMounted(async () => {
  await Promise.all([schoolYearStore.fetch(), classroomsStore.fetch()])
  filters.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
  await loadAll()
})
</script>
