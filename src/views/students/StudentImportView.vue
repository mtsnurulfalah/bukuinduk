<template>
  <div class="space-y-5">
    <PageHeader
      title="Import Data Siswa"
      subtitle="Upload file Excel untuk menambahkan banyak siswa sekaligus"
      show-back
      :breadcrumbs="[{ label: 'Data Siswa', to: '/students' }, { label: 'Import' }]"
    />

    <!-- Panduan -->
    <BaseCard title="Panduan Import">
      <ol class="list-decimal list-inside text-sm text-slate-600 space-y-1.5 mt-2">
        <li>Download template Excel di bawah ini.</li>
        <li>Isi data siswa sesuai kolom yang tersedia. Jangan ubah nama kolom header.</li>
        <li>Kolom yang wajib diisi: <strong>Nama Lengkap, NIS, NISN, Jenis Kelamin, Tanggal Masuk</strong>.</li>
        <li>Format tanggal: <strong>YYYY-MM-DD</strong> (contoh: 2010-05-20).</li>
        <li>Jenis Kelamin diisi <strong>L</strong> atau <strong>P</strong>.</li>
        <li>Upload file Excel (.xlsx) hasil pengisian.</li>
      </ol>
      <div class="mt-4">
        <BaseButton variant="outline" size="sm" @click="downloadTemplate">
          <Download class="h-4 w-4" /> Download Template
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Upload area -->
    <BaseCard title="Upload File">
      <div
        :class="[
          'mt-3 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-slate-300 hover:border-slate-400',
        ]"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="handleFileChange"
        />
        <Upload class="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <p class="text-sm font-medium text-slate-600">
          Seret & lepas file di sini, atau <span class="text-primary-600 underline">pilih file</span>
        </p>
        <p class="text-xs text-slate-400 mt-1">Format: .xlsx, .xls — Maksimal 5MB</p>
        <p v-if="selectedFile" class="mt-3 text-sm font-semibold text-primary-700">
          ✓ {{ selectedFile.name }} ({{ fileSize }})
        </p>
      </div>
    </BaseCard>

    <!-- Preview hasil parse -->
    <BaseCard v-if="previewRows.length" :title="`Preview Data (${previewRows.length} baris)`">
      <div class="overflow-x-auto mt-3 -mx-5 sm:mx-0">
        <table class="min-w-full text-xs">
          <thead>
            <tr class="bg-slate-50 text-slate-500 uppercase">
              <th v-for="col in previewColumns" :key="col" class="px-3 py-2 text-left font-semibold">{{ col }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(row, i) in previewRows.slice(0, 10)" :key="i" class="hover:bg-slate-50">
              <td v-for="col in previewColumns" :key="col" class="px-3 py-2 text-slate-700">
                {{ row[col] ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="previewRows.length > 10" class="px-4 py-2 text-xs text-slate-400 italic">
          + {{ previewRows.length - 10 }} baris lainnya tidak ditampilkan
        </p>
      </div>
    </BaseCard>

    <!-- Hasil import -->
    <BaseAlert v-if="importResult" :type="importResult.failed ? 'warning' : 'success'">
      <strong>Hasil Import:</strong>
      {{ importResult.success }} siswa berhasil diimpor.
      <span v-if="importResult.failed > 0">
        {{ importResult.failed }} gagal.
        <ul v-if="importResult.errors.length" class="mt-1 list-disc list-inside text-xs space-y-0.5">
          <li v-for="(e, i) in importResult.errors.slice(0, 5)" :key="i">{{ e }}</li>
          <li v-if="importResult.errors.length > 5">... dan {{ importResult.errors.length - 5 }} lainnya</li>
        </ul>
      </span>
    </BaseAlert>

    <!-- Actions -->
    <div class="flex gap-3 justify-end">
      <BaseButton variant="outline" @click="$router.push('/students')">Batal</BaseButton>
      <BaseButton
        :disabled="!previewRows.length"
        :loading="isImporting"
        loading-text="Mengimpor..."
        @click="handleImport"
      >
        <Upload class="h-4 w-4" />
        Import {{ previewRows.length ? `(${previewRows.length} siswa)` : '' }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download, Upload } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseButton, BaseAlert } from '@/components/ui'
import { studentsService } from '@/services'
import { toast } from 'vue-sonner'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const previewRows = ref<Record<string, string>[]>([])
const previewColumns = ref<string[]>([])
const isImporting = ref(false)
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

const fileSize = computed(() => {
  if (!selectedFile.value) return ''
  const kb = selectedFile.value.size / 1024
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`
})

function handleDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

async function processFile(file: File) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    toast.error('Hanya file Excel (.xlsx atau .xls) yang diterima.')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Ukuran file maksimal 5MB.')
    return
  }

  selectedFile.value = file
  importResult.value = null

  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

    if (!json.length) {
      toast.warning('File kosong atau format tidak valid.')
      return
    }

    previewColumns.value = Object.keys(json[0])
    previewRows.value = json
    toast.success(`${json.length} baris data terdeteksi.`)
  } catch {
    toast.error('Gagal membaca file Excel.')
  }
}

async function handleImport() {
  if (!previewRows.value.length) return
  isImporting.value = true
  importResult.value = null
  try {
    // Map dari kolom Excel ke field form (sesuaikan dengan template)
    const mapped = previewRows.value.map(row => ({
      fullName: row['Nama Lengkap'] ?? row['fullName'] ?? '',
      nis: row['NIS'] ?? row['nis'] ?? '',
      nisn: row['NISN'] ?? row['nisn'] ?? '',
      gender: row['Jenis Kelamin'] ?? row['gender'] ?? '',
      birthDate: row['Tanggal Lahir'] ?? row['birthDate'] ?? '',
      birthPlace: row['Tempat Lahir'] ?? row['birthPlace'] ?? '',
      religion: row['Agama'] ?? row['religion'] ?? '',
      entryDate: row['Tanggal Masuk'] ?? row['entryDate'] ?? '',
      address: row['Alamat'] ?? row['address'] ?? '',
      phone: row['No. HP'] ?? row['phone'] ?? '',
    }))

    const result = await studentsService.importBatch(mapped)
    importResult.value = result

    if (result.success > 0) {
      toast.success(`${result.success} siswa berhasil diimpor.`)
    }
    if (result.failed > 0) {
      toast.warning(`${result.failed} siswa gagal diimpor.`)
    }
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengimpor data.')
  } finally {
    isImporting.value = false
  }
}

async function downloadTemplate() {
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
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'template_import_siswa.xlsx')
}
</script>
