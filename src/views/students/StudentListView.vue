<template>
  <div class="flex flex-col gap-5 min-w-0">

    <!-- ══════════════════════════════════════════════════════════
         Page Header
    ══════════════════════════════════════════════════════════ -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-slate-800 leading-tight">Data Siswa</h1>
        <p class="text-sm mt-0.5 flex items-center gap-1.5 min-h-[1.25rem]">
          <!-- Loading pulse -->
          <span
            v-if="studentsStore.isLoading"
            class="inline-flex items-center gap-1.5 text-slate-400"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
            Memuat data…
          </span>
          <!-- Error -->
          <span v-else-if="studentsStore.error" class="text-red-500 text-xs">
            Gagal memuat data
          </span>
          <!-- Count -->
          <span v-else class="text-slate-500">
            <template v-if="studentsStore.total === 0">Tidak ada siswa ditemukan</template>
            <template v-else>
              <span class="font-semibold text-slate-700">{{ studentsStore.total.toLocaleString('id-ID') }}</span>
              siswa ditemukan
            </template>
          </span>
        </p>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2 shrink-0">
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_IMPORT)"
          variant="outline"
          size="sm"
          :disabled="studentsStore.isLoading || isExporting"
          @click="$router.push('/students/import')"
        >
          <Upload class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">Import</span>
        </BaseButton>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_CREATE)"
          size="sm"
          :disabled="isExporting"
          @click="$router.push('/students/create')"
        >
          <UserPlus class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">Tambah Siswa</span>
        </BaseButton>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         Error banner (store-level error, bukan filter kosong)
    ══════════════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="studentsStore.error && !studentsStore.isLoading"
        class="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
        role="alert"
      >
        <AlertCircle class="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
        <span class="flex-1 min-w-0">{{ studentsStore.error }}</span>
        <button
          type="button"
          class="shrink-0 text-red-400 hover:text-red-600 transition-colors"
          @click="retryFetch"
        >
          <RefreshCw class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         Search & Filter card
    ══════════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-3 sm:p-4 space-y-3">

        <!-- Row 1: Search + Export -->
        <div class="flex items-center gap-2">
          <!-- Search -->
          <div class="relative flex-1 min-w-0">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Cari nama, NIS, NISN…"
              autocomplete="off"
              class="block w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white
                     placeholder-slate-400 text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500
                     hover:border-slate-400
                     transition-colors"
              @keydown.escape="clearSearch"
            />
            <!-- Clear button saat ada teks -->
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5
                     text-slate-400 hover:text-slate-600 transition-colors"
              title="Hapus pencarian"
              @click="clearSearch"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Export -->
          <BaseButton
            v-if="can(PERMISSIONS.STUDENT_EXPORT)"
            variant="outline"
            size="sm"
            :loading="isExporting"
            :disabled="studentsStore.isLoading"
            class="shrink-0"
            @click="handleExport"
          >
            <Download class="h-4 w-4 shrink-0" />
            <span class="hidden sm:inline">Export</span>
          </BaseButton>
        </div>

        <!-- Divider -->
        <div class="border-t border-slate-100" />

        <!-- Row 2: Filters + active badge + reset -->
        <div class="flex flex-wrap items-center gap-2">

          <!-- Label filter (hanya desktop) -->
          <span class="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 shrink-0">
            <SlidersHorizontal class="h-3.5 w-3.5" />
            Filter:
          </span>

          <BaseSelect
            v-model="filters.status"
            :options="statusOptions"
            placeholder="Semua Status"
            clearable
            class="w-[9rem] shrink-0"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.gender"
            :options="genderOptions"
            placeholder="Semua Gender"
            clearable
            class="w-[9rem] shrink-0"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.classroomId"
            :options="classroomOptions"
            placeholder="Semua Kelas"
            clearable
            class="w-[10rem] shrink-0"
            @update:model-value="onFilterChange"
          />

          <!-- Spacer desktop -->
          <div class="hidden sm:flex flex-1" />

          <!-- Badge filter aktif -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-90"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
            <span
              v-if="hasActiveFilters"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 shrink-0"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
              Filter aktif
            </span>
          </Transition>

          <!-- Tombol Reset -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-x-1"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-1"
          >
            <button
              v-if="hasActiveFilters"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     text-xs font-medium text-slate-500 border border-slate-200
                     hover:text-red-600 hover:bg-red-50 hover:border-red-200
                     transition-colors shrink-0"
              @click="resetFilters"
            >
              <X class="h-3 w-3" />
              Reset
            </button>
          </Transition>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         Tabel
    ══════════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      <DataTable
        :columns="columns"
        :rows="studentsStore.list as Record<string, unknown>[]"
        :loading="studentsStore.isLoading"
        :skeleton-rows="10"
        row-key="id"
        :clickable="true"
        :sort-key="activeSortKey"
        :sort-dir="activeSortDir"
        empty-title="Tidak ada data siswa"
        :empty-description="emptyDescription"
        empty-type="students"
        @row-click="(row) => $router.push(`/students/${row.id}`)"
        @sort="onSort"
      >
        <!-- Empty action kontekstual -->
        <template v-if="hasActiveFilters" #empty>
          <BaseButton variant="outline" size="sm" @click="resetFilters">
            <X class="h-4 w-4" />
            Reset Filter
          </BaseButton>
        </template>

        <!-- ── No urut ───────────────────────────────────────── -->
        <template #cell-no="{ index }">
          <span class="tabular-nums text-xs text-slate-400 select-none">
            {{ (pagination.page.value - 1) * pagination.limit.value + index + 1 }}
          </span>
        </template>

        <!-- ── Nama + Avatar ─────────────────────────────────── -->
        <template #cell-fullName="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <BaseAvatar
              :name="String(row.fullName)"
              :src="row.photoUrl ? String(row.photoUrl) : undefined"
              size="sm"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-800 truncate leading-snug text-sm">
                {{ row.fullName }}
              </p>
              <p class="text-xs text-slate-400 truncate font-mono">{{ row.nis }}</p>
            </div>
          </div>
        </template>

        <!-- ── NISN ──────────────────────────────────────────── -->
        <template #cell-nisn="{ row }">
          <span class="font-mono text-xs text-slate-600 tabular-nums">{{ row.nisn ?? '–' }}</span>
        </template>

        <!-- ── Gender ────────────────────────────────────────── -->
        <template #cell-gender="{ row }">
          <span
            :class="[
              'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold select-none',
              row.gender === 'L'
                ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                : 'bg-pink-50 text-pink-700 ring-1 ring-pink-200',
            ]"
          >
            {{ row.gender === 'L' ? 'L' : 'P' }}
          </span>
        </template>

        <!-- ── Kelas ─────────────────────────────────────────── -->
        <template #cell-classroomName="{ row }">
          <span v-if="row.classroomName" class="text-sm text-slate-700 font-medium">
            {{ row.classroomName }}
          </span>
          <span v-else class="text-xs text-slate-300 italic">Belum ada kelas</span>
        </template>

        <!-- ── Status ────────────────────────────────────────── -->
        <template #cell-status="{ row }">
          <StudentStatusBadge :status="String(row.status)" dot />
        </template>

        <!-- ── Aksi ──────────────────────────────────────────── -->
        <!--
          @click.stop mencegah event bubble ke row-click handler baris.
          type="button" mencegah accidental form submit.
        -->
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <!-- Lihat detail -->
            <button
              type="button"
              class="action-btn hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-200"
              title="Lihat detail"
              @click="$router.push(`/students/${row.id}`)"
            >
              <Eye class="h-4 w-4" />
            </button>

            <!-- Edit -->
            <button
              v-if="can(PERMISSIONS.STUDENT_UPDATE)"
              type="button"
              class="action-btn hover:text-amber-600 hover:bg-amber-50 focus:ring-amber-200"
              title="Edit data"
              @click="$router.push(`/students/${row.id}/edit`)"
            >
              <Pencil class="h-4 w-4" />
            </button>

            <!-- Arsipkan — hanya untuk siswa aktif -->
            <button
              v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && row.status === 'active'"
              type="button"
              class="action-btn hover:text-red-600 hover:bg-red-50 focus:ring-red-200"
              title="Arsipkan siswa"
              @click="handleArchive(String(row.id), String(row.fullName))"
            >
              <Archive class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <!-- Pagination -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <div
          v-if="!studentsStore.isLoading && studentsStore.list.length > 0 && pagination.totalPages.value > 1"
          class="px-4 border-t border-slate-100"
        >
          <BasePagination
            :current-page="pagination.page.value"
            :total-pages="pagination.totalPages.value"
            :total="studentsStore.total"
            :limit="pagination.limit.value"
            @update:current-page="onPageChange"
          />
        </div>
      </Transition>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         Confirm Dialog: Arsipkan Siswa
         ──────────────────────────────────────────────────────────
         ALUR (setelah BUG-2 + BUG-CONFIRM fix):
         1. Klik arsip → handleArchive() dipanggil
         2. confirmDialog.confirm() membuka dialog & mengembalikan Promise
         3. @confirm → confirmDialog.onConfirm() → resolve Promise(true)
            @cancel  → confirmDialog.onCancel()  → resolve Promise(false)
            (BUG-CONFIRM FIX: BaseConfirmDialog sekarang emit 'cancel')
         4. Setelah await selesai, handleArchive() memanggil doArchive() jika ok
         5. doArchive() dipanggil TEPAT SEKALI — tidak ada double call
    ══════════════════════════════════════════════════════════ -->
    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Arsipkan Siswa"
      :message="`Arsipkan siswa '${archiveName}'?\nSiswa tidak akan dihapus, hanya dinonaktifkan.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.onCancel()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  UserPlus, Upload, Download, Eye, Pencil, Archive,
  X, Search, SlidersHorizontal, AlertCircle, RefreshCw,
} from 'lucide-vue-next'
import { DataTable, StudentStatusBadge } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import {
  BaseButton, BaseSelect, BaseAvatar, BasePagination, BaseConfirmDialog,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { useClassroomsStore } from '@/stores/classrooms'
import { usePermission, usePagination, useSearch, useExport, useConfirm } from '@/composables'
import { studentsService } from '@/services'
import { PERMISSIONS, STUDENT_STATUS_OPTIONS, GENDER_OPTIONS } from '@/constants'
import { toast } from 'vue-sonner'

// ── Stores & composables ──────────────────────────────────────
const studentsStore  = useStudentsStore()
const classroomsStore = useClassroomsStore()
const { can }        = usePermission()
const pagination     = usePagination()
const { exportToExcel, isExporting } = useExport()
const confirmDialog  = useConfirm()

// ── Filter state ──────────────────────────────────────────────
const filters = ref({ status: '', gender: '', classroomId: '' })

const hasActiveFilters = computed(() =>
  Object.values(filters.value).some(v => v !== '') || searchQuery.value !== ''
)

// ── Sort state (controlled — diteruskan ke DataTable sebagai prop) ────────
// BUG-4 FIX: state sort disimpan di view agar indikator di DataTable header
// selalu sinkron dengan filter yang aktif, termasuk setelah navigasi back.
const activeSortKey = ref<string>(studentsStore.filters.sortBy ?? 'fullName')
const activeSortDir = ref<'asc' | 'desc'>(studentsStore.filters.sortDir ?? 'asc')

// ── Dropdown options ──────────────────────────────────────────
const statusOptions   = STUDENT_STATUS_OPTIONS
const genderOptions   = GENDER_OPTIONS
const classroomOptions = computed(() => classroomsStore.classroomOptions)

// ── Kolom tabel ───────────────────────────────────────────────
// Mobile    (<sm) : No │ Nama │ Status │ Aksi
// Tablet   (sm+)  : + Gender │ Kelas
// Desktop  (md+)  : + NISN
const columns: TableColumn[] = [
  { key: 'no',            label: 'No',          width: 'w-10' },
  { key: 'fullName',      label: 'Nama Siswa',  sortable: true },
  { key: 'nisn',          label: 'NISN',        class: 'hidden md:table-cell', cellClass: 'hidden md:table-cell font-mono' },
  { key: 'gender',        label: 'JK',          align: 'center', width: 'w-14',
                           class: 'hidden sm:table-cell', cellClass: 'hidden sm:table-cell' },
  { key: 'classroomName', label: 'Kelas',       class: 'hidden sm:table-cell', cellClass: 'hidden sm:table-cell' },
  { key: 'status',        label: 'Status',      align: 'center', width: 'w-28' },
  { key: 'actions',       label: '',            align: 'right',  width: 'w-24', sticky: 'right' },
]

// ── Empty state description ───────────────────────────────────
const emptyDescription = computed(() =>
  hasActiveFilters.value
    ? 'Tidak ada siswa yang cocok dengan filter atau pencarian yang aktif.'
    : 'Belum ada siswa yang terdaftar di sistem.'
)

// ── Search ────────────────────────────────────────────────────
// BUG-53/54 FIX (di useSearch): cleanup timer onUnmounted, clear() tidak double-call
const { query: searchQuery, clear: clearSearch } = useSearch((q) => {
  pagination.reset()
  studentsStore.setFilters({ search: q, page: 1 })
  studentsStore.fetchList()
})

// ── Filter handlers ───────────────────────────────────────────
function onFilterChange() {
  pagination.reset()
  studentsStore.setFilters({ ...filters.value, page: 1 })
  studentsStore.fetchList()
}

function resetFilters() {
  filters.value = { status: '', gender: '', classroomId: '' }
  clearSearch()
  activeSortKey.value = 'fullName'
  activeSortDir.value = 'asc'
  pagination.reset()
  studentsStore.resetFilters()
  studentsStore.fetchList()
}

function onPageChange(page: number) {
  pagination.setPage(page)
  studentsStore.setFilters({ page })
  studentsStore.fetchList()
}

// ── Sort ──────────────────────────────────────────────────────
// BUG-4 + BUG-10 FIX: simpan di view, teruskan ke DataTable via :sort-key/:sort-dir
function onSort(key: string, dir: 'asc' | 'desc') {
  activeSortKey.value = key
  activeSortDir.value = dir
  studentsStore.setFilters({ sortBy: key, sortDir: dir, page: 1 })
  pagination.reset()
  studentsStore.fetchList()
}

// ── Archive ───────────────────────────────────────────────────
const archiveTargetId = ref('')
const archiveName     = ref('')

async function handleArchive(id: string, name: string) {
  archiveTargetId.value = id
  archiveName.value     = name

  // Promise-based confirm — resolve true/false saat user klik confirm/cancel.
  // BUG-2 FIX: doArchive() hanya dipanggil di sini, TIDAK dari @confirm event.
  // BUG-CONFIRM FIX: BaseConfirmDialog sekarang emit 'cancel' → onCancel() dipanggil
  // → Promise resolve(false) → tidak hang selamanya.
  const ok = await confirmDialog.confirm({ message: name, type: 'warning' })
  if (ok) await doArchive()
  else {
    // Reset tanpa aksi saat user membatalkan
    archiveTargetId.value = ''
    archiveName.value     = ''
  }
}

async function doArchive() {
  if (!archiveTargetId.value) return
  confirmDialog.isLoading.value = true
  try {
    await studentsService.archive(archiveTargetId.value)
    studentsStore.removeFromList(archiveTargetId.value)
    toast.success(`Siswa '${archiveName.value}' berhasil diarsipkan.`)
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
  } finally {
    confirmDialog.isLoading.value = false
    archiveTargetId.value = ''
    archiveName.value     = ''
  }
}

// ── Export ────────────────────────────────────────────────────
async function handleExport() {
  try {
    const data = await studentsService.exportData(studentsStore.filters)
    await exportToExcel(
      data as unknown as Record<string, unknown>[],
      {
        nis:           'NIS',
        nisn:          'NISN',
        fullName:      'Nama Lengkap',
        gender:        'L/P',
        birthPlace:    'Tempat Lahir',
        birthDate:     'Tgl Lahir',
        address:       'Alamat',
        phone:         'No. HP',
        status:        'Status',
        classroomName: 'Kelas',
      },
      'data-siswa',
    )
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengekspor data.')
  }
}

// ── Retry ─────────────────────────────────────────────────────
function retryFetch() {
  studentsStore.fetchList()
}

// ── Sync pagination total dari store ─────────────────────────
watch(() => studentsStore.total, (v) => pagination.setTotal(v))

// ── Init ──────────────────────────────────────────────────────
// BUG-1 FIX: sequential await — classrooms dulu agar classroomOptions tersedia
// sebelum render pertama. Kedua fetch tidak saling bergantung secara data,
// tapi classrooms lebih ringan sehingga tidak ada overhead berarti.
onMounted(async () => {
  const fetchClassrooms = classroomsStore.currentSchoolYearId !== ''
    ? classroomsStore.refresh('')  // reset ke "semua kelas" jika sebelumnya di-filter
    : classroomsStore.fetch()      // pakai cache jika sudah "semua"

  await fetchClassrooms
  await studentsStore.fetchList()
  pagination.setTotal(studentsStore.total)
})
</script>

<!--
  Scoped utility class untuk tombol aksi di kolom tabel.
  Tidak bisa diinline karena dipakai berulang di 3 tombol.
-->
<style scoped>
.action-btn {
  @apply p-1.5 rounded-lg text-slate-400
         transition-colors duration-100
         focus:outline-none focus:ring-2
         min-w-[2rem] min-h-[2rem]
         flex items-center justify-center;
}
</style>
