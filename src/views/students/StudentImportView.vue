<template>
  <div class="min-w-0 space-y-5 pb-20 sm:pb-0">
    <PageHeader
      title="Import Data Siswa"
      subtitle="Upload file Excel untuk menambahkan banyak siswa sekaligus"
      show-back
      :breadcrumbs="[{ label: 'Data Siswa', to: '/students' }, { label: 'Import' }]"
    >
      <template #actions>
        <BaseButton
          variant="outline"
          size="sm"
          :loading="isDownloadingTemplate"
          loading-text="Menyiapkan..."
          :disabled="isBusy"
          @click="downloadTemplate"
        >
          <Download class="h-4 w-4" />
          Template Excel
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard title="Panduan Import" subtitle="Ikuti format template agar validasi berjalan lancar.">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <ol class="list-decimal list-inside space-y-1.5 text-sm leading-relaxed text-slate-600">
          <li>Download template Excel, lalu isi data siswa tanpa mengubah nama header.</li>
          <li>Kolom wajib: <strong>Nama Lengkap, NIS, NISN, Jenis Kelamin, Tanggal Masuk</strong>.</li>
          <li>Format tanggal: <strong>YYYY-MM-DD</strong>, misalnya 2010-05-20.</li>
          <li>Jenis kelamin: <strong>L</strong> untuk laki-laki atau <strong>P</strong> untuk perempuan.</li>
          <li>Gunakan format teks untuk NIS/NISN/NIK bila terdapat angka dengan nol di depan.</li>
          <li>Ukuran file maksimum 5MB; file Excel <strong>.xlsx</strong> atau <strong>.xls</strong>.</li>
        </ol>

        <div class="rounded-xl border border-primary-100 bg-primary-50/60 p-4">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 rounded-lg bg-white p-2 text-primary-600 shadow-sm">
              <Download class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-800">Template siap pakai</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                Template berisi kolom import yang didukung aplikasi beserta contoh pengisian.
              </p>
              <BaseButton
                class="mt-3 w-full sm:w-auto"
                variant="outline"
                size="sm"
                :loading="isDownloadingTemplate"
                loading-text="Menyiapkan..."
                :disabled="isBusy"
                @click="downloadTemplate"
              >
                Download Template
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="Upload File" subtitle="Pilih file dari perangkat atau seret file ke area berikut.">
      <div
        :class="[
          'relative mt-3 min-w-0 rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-8',
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : isBusy
              ? 'border-slate-200 bg-slate-50'
              : 'cursor-pointer border-slate-300 hover:border-primary-300 hover:bg-slate-50',
        ]"
        role="button"
        tabindex="0"
        :aria-disabled="isBusy"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        @click="openFilePicker"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          class="hidden"
          @change="handleFileChange"
        />

        <div v-if="isReadingFile" class="flex min-h-40 flex-col items-center justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
          <p class="mt-3 text-sm font-semibold text-slate-700">Membaca file Excel...</p>
          <p class="mt-1 text-xs text-slate-400">Validasi data sedang diproses.</p>
        </div>

        <template v-else>
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 sm:h-14 sm:w-14">
            <Upload class="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <p class="mt-4 text-sm font-semibold text-slate-700">
            Seret & lepas file di sini
          </p>
          <p class="mt-1 text-sm text-slate-500">
            atau <span class="font-semibold text-primary-600 underline underline-offset-2">pilih file</span> dari perangkat
          </p>
          <p class="mt-2 text-xs text-slate-400">.xlsx / .xls · maksimum 5MB</p>

          <div
            v-if="selectedFile"
            class="mx-auto mt-4 flex max-w-xl min-w-0 items-center gap-3 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-left"
          >
            <div class="shrink-0 rounded-md bg-white p-2 text-primary-600 shadow-sm">
              <Upload class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-primary-800">{{ selectedFile.name }}</p>
              <p class="mt-0.5 text-xs text-primary-700">{{ fileSize }}</p>
            </div>
            <span class="shrink-0 text-xs font-medium text-primary-700">{{ hasSubmittedCurrentFile ? 'Sudah dikirim' : 'Siap diproses' }}</span>
          </div>
        </template>
      </div>
    </BaseCard>

    <BaseAlert v-if="parseError" type="error" :title="parseError" />

    <BaseCard v-if="previewRows.length" title="Validasi Data" subtitle="Semua baris harus valid sebelum dikirim ke server.">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p class="text-xs font-medium text-slate-500">Total baris</p>
          <p class="mt-1 text-xl font-bold text-slate-800">{{ previewRows.length }}</p>
        </div>
        <div class="rounded-xl border border-green-100 bg-green-50 p-3.5">
          <p class="text-xs font-medium text-green-600">Valid</p>
          <p class="mt-1 text-xl font-bold text-green-700">{{ validRowCount }}</p>
        </div>
        <div class="rounded-xl border border-red-100 bg-red-50 p-3.5">
          <p class="text-xs font-medium text-red-600">Perlu diperbaiki</p>
          <p class="mt-1 text-xl font-bold text-red-700">{{ invalidRowCount }}</p>
        </div>
        <div class="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
          <p class="text-xs font-medium text-blue-600">Status import</p>
          <p class="mt-1 text-sm font-bold text-blue-700">{{ canImport ? 'Siap diimpor' : 'Belum siap' }}</p>
        </div>
      </div>

      <BaseAlert v-if="missingRequiredHeaders.length" type="error" class="mt-4">
        <p class="font-medium">Header wajib tidak lengkap.</p>
        <p class="mt-1 text-xs leading-relaxed">
          Wajib tersedia: {{ missingRequiredHeaders.join(', ') }}.
        </p>
      </BaseAlert>

      <BaseAlert v-else-if="invalidRowCount" type="warning" class="mt-4">
        <p class="font-medium">Perbaiki {{ invalidRowCount }} baris sebelum melanjutkan.</p>
        <p class="mt-1 text-xs leading-relaxed">Baris yang tidak valid tidak akan dikirim ke server.</p>
      </BaseAlert>
    </BaseCard>

    <BaseCard
      v-if="previewRows.length"
      :title="'Preview Data (' + previewRows.length + ' baris)'"
      subtitle="Menampilkan maksimal 10 baris pertama untuk pemeriksaan cepat."
    >
      <div class="mt-3 max-w-full overflow-auto rounded-lg border border-slate-200">
        <table class="min-w-[980px] w-full text-xs">
          <thead class="sticky top-0 z-10">
            <tr class="bg-slate-50 text-left uppercase text-slate-500">
              <th class="whitespace-nowrap px-3 py-2.5 font-semibold">No</th>
              <th
                v-for="col in previewColumns"
                :key="col"
                class="max-w-[220px] whitespace-nowrap px-3 py-2.5 font-semibold"
              >
                {{ col }}
              </th>
              <th class="whitespace-nowrap px-3 py-2.5 font-semibold">Status</th>
              <th class="min-w-[220px] px-3 py-2.5 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="(row, i) in previewRows.slice(0, 10)"
              :key="i"
              class="hover:bg-slate-50"
            >
              <td class="whitespace-nowrap px-3 py-2 text-slate-400">{{ i + 2 }}</td>
              <td
                v-for="col in previewColumns"
                :key="col"
                class="max-w-[220px] whitespace-nowrap px-3 py-2 text-slate-700"
                :title="row[col] || '-'"
              >
                {{ row[col] || '-' }}
              </td>
              <td class="whitespace-nowrap px-3 py-2">
                <BaseBadge :color="rowValidation[i]?.valid ? 'green' : 'red'" dot>
                  {{ rowValidation[i]?.valid ? 'Valid' : 'Perlu diperbaiki' }}
                </BaseBadge>
              </td>
              <td class="max-w-sm whitespace-normal px-3 py-2 text-red-600">
                {{ rowValidation[i]?.errors.join('; ') || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="previewRows.length > 10" class="mt-2 text-xs italic text-slate-400">
        + {{ previewRows.length - 10 }} baris lainnya tidak ditampilkan di preview.
      </p>
    </BaseCard>

    <BaseAlert v-if="importResult" :type="importResult.failed ? 'warning' : 'success'" title="Hasil Import">
      <div class="space-y-1">
        <p>
          <strong>{{ importResult.success }}</strong> siswa berhasil diimpor
          <span v-if="importResult.failed > 0">
            dan <strong>{{ importResult.failed }}</strong> siswa gagal.
          </span>
        </p>
        <p v-if="importResult.failed > 0" class="text-xs leading-relaxed">
          Periksa daftar error berikut, perbaiki sumber data, lalu unggah file yang sudah diperbaiki sebagai file baru.
        </p>
        <ul
          v-if="importResult.errors.length"
          class="mt-2 list-disc space-y-0.5 pl-4 text-xs leading-relaxed"
        >
          <li v-for="(message, i) in importResult.errors.slice(0, 8)" :key="i">{{ message }}</li>
          <li v-if="importResult.errors.length > 8">
            ... dan {{ importResult.errors.length - 8 }} error lainnya
          </li>
        </ul>
      </div>
    </BaseAlert>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <BaseButton
        variant="outline"
        class="w-full sm:w-auto"
        :disabled="isBusy"
        @click="goBack"
      >
        Batal
      </BaseButton>
      <BaseButton
        class="w-full sm:w-auto"
        :disabled="!canImport"
        :loading="isImporting"
        loading-text="Mengimpor..."
        @click="handleImport"
      >
        <Upload class="h-4 w-4" />
        {{ hasSubmittedCurrentFile ? 'Selesai' : 'Import' }}
        <span v-if="!hasSubmittedCurrentFile && previewRows.length">
          ({{ previewRows.length }} siswa)
        </span>
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Upload } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseButton, BaseAlert, BaseBadge } from '@/components/ui'
import { studentsService } from '@/services'
import { toast } from 'vue-sonner'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FILE_EXTENSIONS = /\.(xlsx|xls)$/i

const REQUIRED_COLUMNS = [
  { label: 'Nama Lengkap', aliases: ['Nama Lengkap', 'fullName'] },
  { label: 'NIS', aliases: ['NIS', 'nis'] },
  { label: 'NISN', aliases: ['NISN', 'nisn'] },
  { label: 'Jenis Kelamin', aliases: ['Jenis Kelamin', 'gender'] },
  { label: 'Tanggal Masuk', aliases: ['Tanggal Masuk', 'entryDate'] },
] as const

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const isReadingFile = ref(false)
const isImporting = ref(false)
const isDownloadingTemplate = ref(false)
const hasSubmittedCurrentFile = ref(false)

const previewRows = ref<Record<string, string>[]>([])
const previewColumns = ref<string[]>([])
const rowValidation = ref<Array<{ valid: boolean; errors: string[] }>>([])
const missingRequiredHeaders = ref<string[]>([])
const parseError = ref('')

const processVersion = ref(0)

const isBusy = computed(() => isReadingFile.value || isImporting.value || isDownloadingTemplate.value)

const fileSize = computed(() => {
  if (!selectedFile.value) return ''
  const kb = selectedFile.value.size / 1024
  return kb < 1024 ? kb.toFixed(1) + ' KB' : (kb / 1024).toFixed(1) + ' MB'
})

const importResult = ref<{
  success: number
  failed: number
  errors: string[]
} | null>(null)

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function normalizeCell(value: unknown): string {
  if (value == null || value === '') return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  }

  return String(value).trim()
}

function headerValue(row: Record<string, string>, aliases: readonly string[]): string {
  const aliasSet = new Set(aliases.map(normalizeHeader))

  for (const [key, rawValue] of Object.entries(row)) {
    if (!aliasSet.has(normalizeHeader(key))) continue
    const value = normalizeCell(rawValue)
    if (value) return value
  }

  return ''
}

function getMissingRequiredHeaders(columns: string[]): string[] {
  const normalizedColumns = new Set(columns.map(normalizeHeader))

  return REQUIRED_COLUMNS
    .filter(column => !column.aliases.some(alias => normalizedColumns.has(normalizeHeader(alias))))
    .map(column => column.label)
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function validateRows(rows: Record<string, string>[]) {
  const seenNis = new Set<string>()
  const seenNisn = new Set<string>()

  rowValidation.value = rows.map(row => {
    const errors: string[] = []
    const nis = headerValue(row, ['NIS', 'nis'])
    const nisn = headerValue(row, ['NISN', 'nisn'])
    const nik = headerValue(row, ['NIK', 'nik'])
    const fullName = headerValue(row, ['Nama Lengkap', 'fullName'])
    const gender = headerValue(row, ['Jenis Kelamin', 'gender']).toUpperCase()
    const birthDate = headerValue(row, ['Tanggal Lahir', 'birthDate'])
    const entryDate = headerValue(row, ['Tanggal Masuk', 'entryDate'])

    if (!fullName) errors.push('Nama lengkap kosong')
    if (!nis) errors.push('NIS kosong')

    if (!nisn) {
      errors.push('NISN kosong')
    } else if (!/^\d{10}$/.test(nisn)) {
      errors.push('NISN harus 10 digit angka')
    }

    if (nik && !/^\d{16}$/.test(nik)) {
      errors.push('NIK harus 16 digit angka bila diisi')
    }

    if (!['L', 'P'].includes(gender)) {
      errors.push('Jenis kelamin harus L/P')
    }

    if (birthDate && !isValidIsoDate(birthDate)) {
      errors.push('Tanggal lahir harus tanggal valid YYYY-MM-DD')
    }

    if (!entryDate) {
      errors.push('Tanggal masuk kosong')
    } else if (!isValidIsoDate(entryDate)) {
      errors.push('Tanggal masuk harus tanggal valid YYYY-MM-DD')
    }

    const nisKey = nis.toLowerCase()
    const nisnKey = nisn.toLowerCase()

    if (nisKey && seenNis.has(nisKey)) {
      errors.push('NIS duplikat di file')
    }
    if (nisnKey && seenNisn.has(nisnKey)) {
      errors.push('NISN duplikat di file')
    }

    if (nisKey) seenNis.add(nisKey)
    if (nisnKey) seenNisn.add(nisnKey)

    return { valid: errors.length === 0, errors }
  })
}

function resetPreview() {
  previewRows.value = []
  previewColumns.value = []
  rowValidation.value = []
  missingRequiredHeaders.value = []
  importResult.value = null
  hasSubmittedCurrentFile.value = false
}

function resetInputValue() {
  if (fileInput.value) fileInput.value.value = ''
}

function openFilePicker() {
  if (isBusy.value) return
  fileInput.value?.click()
}

function handleDragOver() {
  if (isBusy.value) return
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false
  if (isBusy.value) return

  const file = event.dataTransfer?.files?.[0]
  if (file) void processFile(file)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  resetInputValue()

  if (file) void processFile(file)
}

async function processFile(file: File) {
  if (isBusy.value) return

  const currentVersion = processVersion.value + 1
  processVersion.value = currentVersion

  if (!ALLOWED_FILE_EXTENSIONS.test(file.name)) {
    toast.error('Hanya file Excel (.xlsx atau .xls) yang diterima.')
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.error('Ukuran file maksimal 5MB.')
    return
  }

  selectedFile.value = file
  parseError.value = ''
  resetPreview()
  isReadingFile.value = true

  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()

    if (currentVersion !== processVersion.value) return

    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
    })

    const firstSheetName = workbook.SheetNames?.[0]
    if (!firstSheetName) {
      throw new Error('Workbook tidak memiliki sheet yang dapat dibaca.')
    }

    const worksheet = workbook.Sheets[firstSheetName]
    if (!worksheet) {
      throw new Error('Sheet pertama tidak dapat dibaca.')
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: true,
    })

    if (currentVersion !== processVersion.value) return

    const rows = rawRows
      .map(row => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.replace(/^\uFEFF/, '').trim(),
          normalizeCell(value),
        ]),
      ) as Record<string, string>)
      .filter(row => Object.values(row).some(Boolean))

    if (!rows.length) {
      throw new Error('File kosong atau tidak memiliki baris data yang dapat dibaca.')
    }

    const columns = Object.keys(rows[0])
    previewColumns.value = columns
    previewRows.value = rows
    missingRequiredHeaders.value = getMissingRequiredHeaders(columns)
    validateRows(rows)
    toast.success(rows.length + ' baris data terdeteksi.')
  } catch (error: unknown) {
    if (currentVersion !== processVersion.value) return

    selectedFile.value = null
    resetPreview()
    parseError.value = error instanceof Error
      ? error.message
      : 'Gagal membaca file Excel.'
    toast.error(parseError.value)
  } finally {
    if (currentVersion === processVersion.value) {
      isReadingFile.value = false
    }
  }
}

function mapImportRows(rows: Record<string, string>[]) {
  return rows.map(row => ({
    fullName: headerValue(row, ['Nama Lengkap', 'fullName']),
    nis: headerValue(row, ['NIS', 'nis']),
    nisn: headerValue(row, ['NISN', 'nisn']),
    nik: headerValue(row, ['NIK', 'nik']),
    gender: headerValue(row, ['Jenis Kelamin', 'gender']).toUpperCase(),
    birthDate: headerValue(row, ['Tanggal Lahir', 'birthDate']),
    birthPlace: headerValue(row, ['Tempat Lahir', 'birthPlace']),
    religion: headerValue(row, ['Agama', 'religion']),
    entryDate: headerValue(row, ['Tanggal Masuk', 'entryDate']),
    address: headerValue(row, ['Alamat', 'address']),
    phone: headerValue(row, ['No. HP', 'phone']),
    email: headerValue(row, ['Email', 'email']),
  }))
}

const validRowCount = computed(() => rowValidation.value.filter(row => row.valid).length)
const invalidRowCount = computed(() => rowValidation.value.filter(row => !row.valid).length)

const canImport = computed(() =>
  previewRows.value.length > 0 &&
  missingRequiredHeaders.value.length === 0 &&
  invalidRowCount.value === 0 &&
  !isReadingFile.value &&
  !isImporting.value &&
  !hasSubmittedCurrentFile.value
)

async function handleImport() {
  if (
    !previewRows.value.length ||
    missingRequiredHeaders.value.length ||
    invalidRowCount.value ||
    isReadingFile.value ||
    isImporting.value ||
    hasSubmittedCurrentFile.value
  ) {
    return
  }

  const rowsToImport = mapImportRows(previewRows.value)
  isImporting.value = true
  importResult.value = null
  parseError.value = ''

  try {
    const result = await studentsService.importBatch(rowsToImport)
    importResult.value = {
      success: Math.max(0, Number(result?.success) || 0),
      failed: Math.max(0, Number(result?.failed) || 0),
      errors: Array.isArray(result?.errors)
        ? result.errors.map(message => String(message))
        : [],
    }
    hasSubmittedCurrentFile.value = true

    if (importResult.value.success > 0) {
      toast.success(importResult.value.success + ' siswa berhasil diimpor.')
    }
    if (importResult.value.failed > 0) {
      toast.warning(importResult.value.failed + ' siswa gagal diimpor.')
    }
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Gagal mengimpor data.')
  } finally {
    isImporting.value = false
  }
}

function goBack() {
  if (isBusy.value) return
  window.location.assign('/students')
}

async function downloadTemplate() {
  if (isBusy.value) return

  isDownloadingTemplate.value = true

  try {
    const XLSX = await import('xlsx')
    const headers = [
      'Nama Lengkap', 'NIS', 'NISN', 'NIK', 'Jenis Kelamin', 'Tempat Lahir',
      'Tanggal Lahir', 'Agama', 'Tanggal Masuk', 'Alamat', 'No. HP', 'Email',
    ]
    const exampleRow = [
      'Ahmad Fauzi', '20240001', '1234567890', '3271010101100001',
      'L', 'Bandung', '2010-01-01', 'Islam', '2024-07-15',
      'Jl. Contoh No. 1', '081234567890', '',
    ]

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    worksheet['!cols'] = headers.map(() => ({ wch: 18 }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, 'template_import_siswa.xlsx')

    toast.success('Template Excel berhasil dibuat.')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Gagal membuat template Excel.')
  } finally {
    isDownloadingTemplate.value = false
  }
}
</script>
