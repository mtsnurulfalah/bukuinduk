<template>
  <div class="w-full min-w-0 max-w-full space-y-5 pb-6">
    <PageHeader title="Laporan" subtitle="Rekap dan statistik data siswa">
      <template #actions>
        <div class="flex w-full flex-wrap gap-2 sm:w-auto print:hidden">
          <BaseButton variant="outline" size="sm" class="min-w-[110px] flex-1 sm:flex-none" :loading="isReportExportBusy" @click="handleExportExcel">
            <FileSpreadsheet class="h-4 w-4" /> Export Excel
          </BaseButton>
          <BaseButton variant="outline" size="sm" class="min-w-[110px] flex-1 sm:flex-none" :loading="isReportExportBusy" @click="handleExportPDF">
            <FileText class="h-4 w-4" /> Export PDF
          </BaseButton>
          <BaseButton variant="ghost" size="sm" class="min-w-[110px] flex-1 sm:flex-none" @click="handlePrint">
            <Printer class="h-4 w-4" /> Cetak
          </BaseButton>
        </div>
      </template>
    </PageHeader>

    <!-- Filter -->
    <BaseCard :padding="true" class="print:hidden">
      <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="min-w-0">
          <BaseSelect
            v-model="filters.schoolYearId"
            label="Tahun Pelajaran"
            :options="schoolYearStore.schoolYearOptions"
            placeholder="Semua Tahun"
            @update:model-value="handleSchoolYearChange"
          />
        </div>
        <div class="min-w-0">
          <BaseSelect
            v-model="filters.classroomId"
            label="Kelas"
            :options="[{ value: '', label: 'Semua Kelas' }, ...classroomsStore.getOptionsForYear(filters.schoolYearId)]"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="min-w-0">
          <BaseSelect
            v-model="filters.gender"
            label="Jenis Kelamin"
            :options="[{ value: '', label: 'Semua' }, ...GENDER_OPTIONS]"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="min-w-0">
          <BaseSelect
            v-model="filters.status"
            label="Status"
            :options="[{ value: '', label: 'Semua' }, ...STUDENT_STATUS_OPTIONS]"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="flex min-w-0 items-end">
          <BaseButton
            v-if="hasFilters"
            variant="ghost"
            size="sm"
            class="w-full sm:w-auto"
            :disabled="isLoading"
            @click="resetFilters"
          >
            <X class="h-4 w-4" /> Reset Filter
          </BaseButton>
        </div>
      </div>
      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        Filter berlaku untuk ringkasan, distribusi, daftar siswa, dan file ekspor. Pencarian hanya memfilter daftar siswa.
      </p>
    </BaseCard>

    <BaseRetry
      v-if="loadError"
      title="Data laporan gagal dimuat"
      :message="loadError"
      :loading="isLoading"
      @retry="loadAll"
    />

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Total Siswa" :value="reportStats.totalStudents" :icon="Users" color="blue" :loading="isLoading" />
      <StatCard label="Aktif" :value="reportStats.activeStudents" :icon="CheckCircle" color="green" :loading="isLoading" />
      <StatCard label="Laki-laki" :value="reportStats.maleStudents" :icon="User" color="blue" :loading="isLoading" />
      <StatCard label="Perempuan" :value="reportStats.femaleStudents" :icon="User" color="purple" :loading="isLoading" />
      <StatCard label="Lulus" :value="reportStats.graduatedStudents" :icon="GraduationCap" color="teal" :loading="isLoading" />
      <StatCard label="Pindah/Keluar" :value="reportStats.transferredStudents" :icon="ArrowRightLeft" color="amber" :loading="isLoading" />
    </div>

    <!-- Tabel Rekapitulasi per Kelas -->
    <div id="report-content">
    <BaseCard title="Rekapitulasi per Kelas">
      <div class="mb-3 mt-1 flex justify-between items-center">
        <p class="text-xs text-slate-400">
          {{ reportScopeLabel }}
        </p>
        <p class="text-xs text-slate-400 hidden print:block">
          Dicetak: {{ formatDate(new Date().toISOString()) }}
        </p>
      </div>

      <div v-if="isLoading" class="space-y-2">
        <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
      </div>
      <BaseEmpty v-else-if="!classStatsForDisplay.length" title="Tidak ada data" description="Tidak ada kelas yang sesuai dengan filter yang dipilih." type="data" />
      <div v-else class="max-w-full -mx-5 overflow-x-auto px-5 overscroll-x-contain sm:mx-0 sm:px-0">
        <table class="w-full min-w-[620px] text-sm" id="print-table">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <th class="px-4 py-3 text-left">No</th>
              <th class="px-4 py-3 text-left">Kelas</th>
              <th class="px-4 py-3 text-center">Laki-laki</th>
              <th class="px-4 py-3 text-center">Perempuan</th>
              <th class="px-4 py-3 text-center font-bold">Total</th>
              <th class="px-4 py-3 text-left hidden md:table-cell">Tingkat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(cls, i) in classStatsForDisplay" :key="cls.classroomId" class="hover:bg-slate-50">
              <td class="px-4 py-3 text-slate-400 text-xs">{{ i + 1 }}</td>
              <td class="max-w-[220px] break-words px-4 py-3 font-medium text-slate-800">{{ cls.classroomName }}</td>
              <td class="px-4 py-3 text-center text-blue-600 font-medium">{{ cls.maleStudents }}</td>
              <td class="px-4 py-3 text-center text-pink-600 font-medium">{{ cls.femaleStudents }}</td>
              <td class="px-4 py-3 text-center font-bold text-slate-800">{{ cls.totalStudents }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">{{ cls.gradeName ?? '–' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
              <td class="px-4 py-3" colspan="2">TOTAL</td>
              <td class="px-4 py-3 text-center text-blue-600">{{ classStatsForDisplay.reduce((a, c) => a + c.maleStudents, 0) }}</td>
              <td class="px-4 py-3 text-center text-pink-600">{{ classStatsForDisplay.reduce((a, c) => a + c.femaleStudents, 0) }}</td>
              <td class="px-4 py-3 text-center">{{ classStatsForDisplay.reduce((a, c) => a + c.totalStudents, 0) }}</td>
              <td class="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>
    </div>

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
        <BaseEmpty v-else-if="!classStatsForDisplay.length" title="Tidak ada distribusi" description="Belum ada kelas dengan data sesuai filter." type="data" />
        <div v-else class="space-y-2.5 mt-3">
          <div v-for="cls in classStatsForDisplay.slice(0, 8)" :key="cls.classroomId" class="flex min-w-0 items-center gap-2 text-xs">
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
      <div class="mb-3 mt-1 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <SearchFilter v-model:search="tableSearch" search-placeholder="Cari nama, NIS, NISN..." class="min-w-0 flex-1" />
        <div class="flex min-w-0 flex-wrap items-end justify-between gap-3 sm:justify-end">
          <p class="text-xs text-slate-500" aria-live="polite">
            {{ tableFiltered.length.toLocaleString('id-ID') }} siswa
          </p>
          <div class="w-36 shrink-0">
            <BaseSelect
              id="report-page-size"
              label="Baris per halaman"
              :model-value="pageSize"
              :options="pageSizeOptions"
              @update:model-value="setPageSize"
            />
          </div>
        </div>
      </div>

      <div v-if="isLoadingTable" class="space-y-2">
        <BaseSkeleton v-for="i in 5" :key="i" height="h-10" />
      </div>
      <div v-else class="max-w-full -mx-5 overflow-x-auto px-5 overscroll-x-contain sm:mx-0 sm:px-0">
        <table class="w-full min-w-[700px] text-sm">
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
            <tr v-for="(s, i) in tableDisplayed" :key="String(s.id)" class="hover:bg-slate-50">
              <td class="px-4 py-2.5 text-xs text-slate-400">{{ (isPrinting ? 0 : (currentPage - 1) * pageSize) + i + 1 }}</td>
              <td class="max-w-[260px] break-words px-4 py-2.5 font-medium text-slate-800">{{ s.fullName || '—' }}</td>
              <td class="px-4 py-2.5 text-center text-slate-600">{{ s.nis }}</td>
              <td class="px-4 py-2.5 text-center text-slate-600">{{ s.nisn }}</td>
              <td class="px-4 py-2.5 text-center" :class="s.gender === 'L' ? 'text-blue-600' : s.gender === 'P' ? 'text-pink-600' : 'text-slate-500'">
                {{ s.gender || '—' }}
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
      <BasePagination
        v-if="!isLoadingTable && tableFiltered.length > 0"
        class="print:hidden"
        v-model:current-page="currentPage"
        :total-pages="totalPages"
        :total="tableFiltered.length"
        :limit="pageSize"
      />
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  Users, User, CheckCircle, GraduationCap,
  ArrowRightLeft, FileSpreadsheet, FileText, Printer, X,
} from 'lucide-vue-next'
import { PageHeader, SearchFilter, StatCard, StudentStatusBadge } from '@/components/shared'
import { BaseCard, BaseButton, BaseSelect, BaseSkeleton, BaseEmpty, BaseRetry, BasePagination } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { reportsService, studentsService } from '@/services'
import { useExport } from '@/composables'
import { GENDER_OPTIONS, STUDENT_STATUS_OPTIONS, PAGE_SIZE_OPTIONS } from '@/constants'
import { formatDate } from '@/utils'
import { toast } from 'vue-sonner'
import type { ClassroomStats } from '@/types'
import type { Student } from '@/types'

const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()
const { exportToExcel, exportToPDF, printPage, isExporting } = useExport()

const classStats = ref<ClassroomStats[]>([])
const statusDist = ref<{ status: string; label: string; count: number }[]>([])
const tableRows = ref<Student[]>([])
const tableSearch = ref('')
const currentPage = ref(1)
const pageSize = ref<number>(20)
const isLoading = ref(true)
const isLoadingStatus = ref(true)
const isLoadingTable = ref(true)
const isPreparingExport = ref(false)
const isPrinting = ref(false)
const loadError = ref('')

const filters = reactive({ schoolYearId: '', classroomId: '', gender: '', status: '' })
const hasFilters = computed(() => Object.values(filters).some(v => v !== ''))
const isReportExportBusy = computed(() => isPreparingExport.value || isExporting.value)
const pageSizeOptions = PAGE_SIZE_OPTIONS.map(size => ({ value: size, label: `${size} baris` }))

let loadRequestVersion = 0
let isMounted = false

const selectedSchoolYearName = computed(() => {
  if (!filters.schoolYearId) return ''
  return schoolYearStore.schoolYears.find(year => String(year.id) === String(filters.schoolYearId))?.name ?? ''
})
const reportScopeLabel = computed(() => (
  selectedSchoolYearName.value
    ? `Tahun Pelajaran ${selectedSchoolYearName.value}`
    : 'Semua Tahun Pelajaran'
))

const reportStats = computed(() => {
  const rows = tableRows.value
  return {
    totalStudents: rows.length,
    activeStudents: rows.filter(student => student.status === 'active').length,
    maleStudents: rows.filter(student => student.gender === 'L').length,
    femaleStudents: rows.filter(student => student.gender === 'P').length,
    graduatedStudents: rows.filter(student => student.status === 'graduated').length,
    transferredStudents: rows.filter(student =>
      student.status === 'transferred' || student.status === 'dropped_out'
    ).length,
  }
})

const totalStudentsForBar = computed(() => statusDist.value.reduce((a, s) => a + s.count, 0))

const tableFiltered = computed(() => {
  const q = tableSearch.value.trim().toLocaleLowerCase('id-ID')
  if (!q) return tableRows.value
  return tableRows.value.filter(student =>
    [student.fullName, student.nis, student.nisn]
      .some(value => String(value ?? '').toLocaleLowerCase('id-ID').includes(q))
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(tableFiltered.value.length / pageSize.value)))
const tablePageRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return tableFiltered.value.slice(start, start + pageSize.value)
})
const tableDisplayed = computed(() => isPrinting.value ? tableFiltered.value : tablePageRows.value)

const classStatsForDisplay = computed<ClassroomStats[]>(() => {
  if (!filters.gender && !filters.status) return classStats.value

  const metadata = new Map<string, ClassroomStats>()
  classStats.value.forEach(item => {
    const key = String(item.classroomName ?? '').trim().toLocaleLowerCase('id-ID')
    if (key && !metadata.has(key)) metadata.set(key, item)
  })

  const grouped = new Map<string, ClassroomStats>()
  tableRows.value.forEach(student => {
    const name = String(student.classroomName ?? '').trim()
    if (!name) return

    const key = name.toLocaleLowerCase('id-ID')
    let item = grouped.get(key)
    if (!item) {
      const base = metadata.get(key)
      item = {
        classroomId: base?.classroomId ?? `filtered-${key}`,
        classroomName: name,
        gradeName: base?.gradeName ?? '',
        totalStudents: 0,
        maleStudents: 0,
        femaleStudents: 0,
      }
      grouped.set(key, item)
    }

    item.totalStudents += 1
    if (student.gender === 'L') item.maleStudents += 1
    if (student.gender === 'P') item.femaleStudents += 1
  })

  return [...grouped.values()].sort((a, b) => a.classroomName.localeCompare(b.classroomName, 'id'))
})

watch(tableSearch, () => { currentPage.value = 1 })
watch(pageSize, () => { currentPage.value = 1 })
watch(tableFiltered, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

function setPageSize(value: string | number) {
  const nextSize = Number(value)
  if (PAGE_SIZE_OPTIONS.includes(nextSize)) pageSize.value = nextSize
}

function handleFilterChange() {
  currentPage.value = 1
  void loadAll()
}

function handleSchoolYearChange(value: string) {
  filters.schoolYearId = String(value ?? '')
  if (filters.classroomId) {
    const available = classroomsStore.getOptionsForYear(filters.schoolYearId)
    if (!available.some(option => String(option.value) === String(filters.classroomId))) {
      filters.classroomId = ''
    }
  }
  handleFilterChange()
}

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
  tableSearch.value = ''
  currentPage.value = 1
  void loadAll()
}

async function loadAll() {
  const requestVersion = ++loadRequestVersion
  const f = { ...filters }
  const studentFilters = {
    ...f,
    // Sentinel ini membedakan pilihan "Semua Tahun" dari default backend
    // yang memakai tahun aktif saat schoolYearId tidak diisi.
    schoolYearId: f.schoolYearId || '__all__',
  }

  isLoading.value = true
  isLoadingStatus.value = true
  isLoadingTable.value = true
  loadError.value = ''
  currentPage.value = 1

  try {
    const [cs, sd, tableData] = await Promise.all([
      reportsService.getClassroomStats({
        schoolYearId: f.schoolYearId || undefined,
        classroomId: f.classroomId || undefined,
      }),
      reportsService.getStatusDistribution(f),
      studentsService.exportData(studentFilters),
    ])

    if (!isMounted || requestVersion !== loadRequestVersion) return

    classStats.value = Array.isArray(cs) ? cs : []
    statusDist.value = Array.isArray(sd) ? sd : []
    tableRows.value = Array.isArray(tableData) ? tableData : []
  } catch (e: unknown) {
    if (!isMounted || requestVersion !== loadRequestVersion) return

    loadError.value = e instanceof Error ? e.message : 'Gagal memuat data laporan.'
    classStats.value = []
    statusDist.value = []
    tableRows.value = []
  } finally {
    if (isMounted && requestVersion === loadRequestVersion) {
      isLoading.value = false
      isLoadingStatus.value = false
      isLoadingTable.value = false
    }
  }
}

const EXPORT_HEADERS = {
  nis: 'NIS', nisn: 'NISN', fullName: 'Nama Lengkap', gender: 'JK',
  birthPlace: 'Tempat Lahir', birthDate: 'Tgl Lahir', religion: 'Agama',
  address: 'Alamat', city: 'Kota', phone: 'No. HP', status: 'Status',
  classroomName: 'Kelas', entryDate: 'Tgl Masuk',
}

async function exportReport(format: 'excel' | 'pdf') {
  if (isReportExportBusy.value) return

  isPreparingExport.value = true
  try {
    const data = await reportsService.getStudentReport({ ...filters })
    if (!Array.isArray(data) || data.length === 0) {
      toast.warning('Tidak ada data yang sesuai dengan filter untuk diekspor.')
      return
    }

    if (format === 'excel') {
      await exportToExcel(data, EXPORT_HEADERS, 'laporan-siswa')
    } else {
      await exportToPDF(
        data,
        EXPORT_HEADERS,
        'laporan-siswa',
        `Laporan Data Siswa — ${reportScopeLabel.value}`,
      )
    }
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengekspor laporan.')
  } finally {
    isPreparingExport.value = false
  }
}

function handleExportExcel() {
  return exportReport('excel')
}

function handleExportPDF() {
  return exportReport('pdf')
}

function resetPrintMode() {
  isPrinting.value = false
  window.removeEventListener('afterprint', resetPrintMode)
}

async function handlePrint() {
  if (isPrinting.value) return
  isPrinting.value = true
  await nextTick()
  window.addEventListener('afterprint', resetPrintMode, { once: true })
  printPage()
}

onMounted(async () => {
  isMounted = true
  await Promise.all([schoolYearStore.fetch(), classroomsStore.fetch()])
  if (!isMounted) return

  filters.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
  await loadAll()
})

onUnmounted(() => {
  isMounted = false
  loadRequestVersion += 1
  window.removeEventListener('afterprint', resetPrintMode)
})
</script>
