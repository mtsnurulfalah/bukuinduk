<template>
  <div class="space-y-6">
    <PageHeader title="Pengaturan" subtitle="Konfigurasi profil sekolah dan sistem" />

    <!-- Tab navigation -->
    <div class="flex max-w-full gap-0 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Bagian pengaturan">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :class="[
          'min-h-11 shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          activeTab === tab.key
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        ]"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Profil Sekolah -->
    <template v-if="activeTab === 'school'">
      <BaseAlert v-if="settingsLoadError" type="error">{{ settingsLoadError }}</BaseAlert>
      <div v-if="settingsLoadError" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <BaseButton type="button" variant="outline" size="sm" :loading="isLoadingSettings" @click="loadSettingsData">
          Coba Muat Ulang
        </BaseButton>
      </div>
      <BaseAlert v-if="successMsg" type="success" dismissible @dismiss="successMsg = ''">{{ successMsg }}</BaseAlert>
      <BaseAlert v-if="errorMsg" type="error" dismissible @dismiss="errorMsg = ''">{{ errorMsg }}</BaseAlert>
      <BaseAlert v-if="isLoadingSettings" type="info">Memuat konfigurasi sekolah...</BaseAlert>

      <form class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2" @submit.prevent="saveSchoolSettings">
        <BaseCard title="Identitas Sekolah/Madrasah">
          <div class="space-y-4 mt-3">
            <BaseInput v-model="schoolForm.schoolName" :disabled="!canManageSettings || isLoadingSettings || isSaving" label="Nama Sekolah/Madrasah" placeholder="MTs..." required />
            <BaseInput v-model="schoolForm.schoolNpsn" :disabled="!canManageSettings" label="NPSN" placeholder="8 digit angka" />
            <BaseInput v-model="schoolForm.schoolAddress" :disabled="!canManageSettings" label="Alamat" placeholder="Jalan, desa, kecamatan..." />
            <BaseInput v-model="schoolForm.schoolPhone" :disabled="!canManageSettings" label="Nomor Telepon" placeholder="(0xx) xxxx-xxxx" />
            <BaseInput v-model="schoolForm.schoolEmail" :disabled="!canManageSettings" label="Email Sekolah" type="email" placeholder="info@sekolah.sch.id" />
            <BaseInput v-model="schoolForm.schoolWebsite" :disabled="!canManageSettings" label="Website" placeholder="https://sekolah.sch.id" />
          </div>
        </BaseCard>

        <BaseCard title="Kepala Sekolah/Madrasah">
          <div class="space-y-4 mt-3">
            <BaseInput v-model="schoolForm.principalName" :disabled="!canManageSettings" label="Nama Kepala Sekolah" placeholder="Nama lengkap beserta gelar" />
            <BaseInput v-model="schoolForm.principalNip" :disabled="!canManageSettings" label="NIP Kepala Sekolah" placeholder="NIP (opsional)" />
          </div>

          <!-- BUG-58 FIX: Tahun pelajaran aktif ditangani terpisah via setActiveSY(),
               bukan disimpan sebagai settings key-value biasa.
               Section ini sekarang hanya tampil informasi + tombol aksi di tab Tahun Pelajaran. -->
          <div class="mt-6 pt-4 border-t border-slate-100">
            <p class="text-sm font-medium text-slate-700 mb-1">Tahun Pelajaran Aktif</p>
            <p class="text-sm text-slate-500">
              {{ schoolYearStore.activeSchoolYearName || 'Belum ada tahun pelajaran aktif' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">
              Untuk mengubah tahun pelajaran aktif, buka tab <strong>Tahun Pelajaran</strong>.
            </p>
          </div>
        </BaseCard>

        <div v-if="canManageSettings" class="lg:col-span-2 flex justify-end">
          <BaseButton type="submit" class="w-full sm:w-auto" :loading="isSaving || isLoadingSettings" :loading-text="isLoadingSettings ? 'Memuat...' : 'Menyimpan...'">
            <Save class="h-4 w-4" /> Simpan Pengaturan
          </BaseButton>
        </div>
      </form>
    </template>

    <!-- Tab: Tahun Pelajaran -->
    <template v-if="activeTab === 'schoolyear'">
      <BaseCard>
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm font-medium text-slate-700">Daftar Tahun Pelajaran</p>
          <BaseButton v-if="canManageSettings" size="sm" @click="openAddSY">
            <Plus class="h-4 w-4" /> Tambah
          </BaseButton>
        </div>

        <div v-if="schoolYearLoadError" class="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p class="min-w-0 break-words text-sm text-red-700">{{ schoolYearLoadError }}</p>
          <BaseButton type="button" variant="outline" size="sm" class="shrink-0" :loading="schoolYearStore.isLoading" @click="loadSchoolYears(true)">
            Coba Lagi
          </BaseButton>
        </div>

        <div v-if="schoolYearStore.isLoading" class="space-y-2" aria-busy="true" aria-live="polite">
          <BaseSkeleton v-for="i in 3" :key="i" height="h-14" />
        </div>
        <div v-else-if="!schoolYearStore.schoolYears.length && !schoolYearLoadError" class="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <Calendar class="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-medium text-slate-700">Belum ada tahun pelajaran</p>
          <p class="mt-1 text-xs text-slate-500">Tambahkan tahun pelajaran untuk mulai mengelola periode akademik.</p>
        </div>
        <div v-else-if="schoolYearStore.schoolYears.length" class="divide-y divide-slate-100">
          <div
            v-for="sy in schoolYearStore.schoolYears"
            :key="sy.id"
            class="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-slate-800">{{ sy.name }}</p>
              <p class="mt-1 break-words text-xs text-slate-500">
                {{ formatDate(sy.startDate) }} – {{ formatDate(sy.endDate) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <BaseBadge v-if="sy.isActive" color="green" dot>Aktif</BaseBadge>
              <button
                v-if="canManageSettings && !sy.isActive"
                type="button"
                class="min-h-10 rounded-lg px-3 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSettingActiveSY !== null"
                :aria-label="`Jadikan tahun pelajaran ${sy.name} aktif`"
                @click="setActiveSY(sy.id)"
              >
                {{ isSettingActiveSY === sy.id ? 'Memproses...' : 'Jadikan Aktif' }}
              </button>
              <button
                v-if="canManageSettings && !sy.isActive"
                type="button"
                class="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="confirmDeleteSY.isLoading.value"
                :aria-label="`Hapus tahun pelajaran ${sy.name}`"
                title="Hapus tahun pelajaran"
                @click="handleDeleteSY(sy.id, sy.name)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Modal tambah tahun pelajaran -->
      <BaseModal v-model="showAddSY" title="Tambah Tahun Pelajaran" size="sm">
        <form id="school-year-form" class="space-y-4" @submit.prevent="saveSY">
          <BaseInput v-model="syForm.name" label="Nama" placeholder="2026/2027" required :disabled="isSavingSY" :error-message="syErrors.name" />
          <BaseInput v-model="syForm.startDate" label="Tanggal Mulai" type="date" required :disabled="isSavingSY" :error-message="syErrors.startDate" />
          <BaseInput v-model="syForm.endDate" label="Tanggal Selesai" type="date" required :disabled="isSavingSY" :error-message="syErrors.endDate" />
          <div class="flex items-center gap-2">
            <input id="syActive" v-model="syForm.isActive" type="checkbox" :disabled="isSavingSY" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="syActive" class="cursor-pointer text-sm font-medium text-slate-700">Jadikan tahun aktif</label>
          </div>
        </form>
        <template #footer>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <BaseButton type="button" variant="outline" size="sm" class="w-full sm:w-auto" :disabled="isSavingSY" @click="showAddSY = false">Batal</BaseButton>
            <BaseButton type="submit" form="school-year-form" size="sm" class="w-full sm:w-auto" :loading="isSavingSY" loading-text="Menyimpan...">Simpan</BaseButton>
          </div>
        </template>
      </BaseModal>

      <!-- BUG-57 FIX: Ganti window.confirm() dengan BaseConfirmDialog yang konsisten -->
      <BaseConfirmDialog
        v-model="confirmDeleteSY.isOpen.value"
        title="Hapus Tahun Pelajaran"
        :message="`Hapus tahun pelajaran '${confirmDeleteSY.options.value.message}'? Tindakan ini tidak dapat dibatalkan.`"
        type="danger"
        confirm-text="Ya, Hapus"
        :loading="confirmDeleteSY.isLoading.value"
        @confirm="confirmDoDeleteSY"
      />
    </template>

    <!-- Tab: Backup -->
    <template v-if="activeTab === 'backup'">
      <BaseCard title="Backup Data" subtitle="Export semua data dari Google Spreadsheet ke file JSON">
        <div class="mt-4 space-y-4">
          <BaseAlert type="info">
            Backup mengekspor seluruh data dari Spreadsheet ke file JSON beserta manifest
            versi dan jumlah record per sheet. Simpan file di lokasi yang aman dan terbatas.
          </BaseAlert>

          <div v-if="canManageSettings" class="flex gap-3">
            <BaseButton :loading="isBackingUp" loading-text="Mengekspor..." @click="handleBackup">
              <Download class="h-4 w-4" /> Download Backup JSON
            </BaseButton>
          </div>
          <BaseAlert v-else type="warning">
            Akun Anda memiliki akses lihat saja. Fitur backup hanya dapat dijalankan oleh administrator.
          </BaseAlert>

          <div
            v-if="backupMeta"
            class="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div class="flex items-center justify-between gap-3 mb-3">
              <div>
                <p class="text-sm font-semibold text-slate-700">Manifest Backup yang Baru Dibuat</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ formatDateTime(backupMeta.generatedAt) }}</p>
              </div>
              <BaseBadge color="green" dot>Siap</BaseBadge>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p class="text-xs text-slate-400">Versi</p>
                <p class="text-sm font-semibold text-slate-700">{{ backupMeta.version }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">Jumlah Sheet</p>
                <p class="text-sm font-semibold text-slate-700">{{ backupMeta.sheetCount }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">Total Record</p>
                <p class="text-sm font-semibold text-slate-700">{{ backupTotalRecords }}</p>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ValidationError } from 'yup'
import { Save, Plus, Trash2, Download, Building2, Calendar, Database } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseInput, BaseButton, BaseAlert, BaseBadge,
  BaseSkeleton, BaseModal, BaseConfirmDialog,
} from '@/components/ui'
import { useSettingsStore } from '@/stores/settings'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useConfirm, usePermission } from '@/composables'
import { classroomsService, settingsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate, formatDateTime } from '@/utils'
import { schoolYearSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const settingsStore = useSettingsStore()
const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const canManageSettings = computed(() => can(PERMISSIONS.SETTINGS_MANAGE))

const activeTab = ref('school')
const isSaving = ref(false)
const isLoadingSettings = ref(false)
const settingsLoadError = ref('')
const schoolYearLoadError = ref('')
const isSchoolFormDirty = ref(false)
let isHydratingSchoolForm = false
const successMsg = ref('')
const errorMsg = ref('')
const isBackingUp = ref(false)
const isSettingActiveSY = ref<string | null>(null)
const backupMeta = ref<{ version: string; generatedAt: string; sheetCount: number; counts: Record<string, number> } | null>(null)
const backupTotalRecords = computed(() => backupMeta.value ? Object.values(backupMeta.value.counts).reduce((sum, value) => sum + Number(value || 0), 0) : 0)

const tabs = [
  { key: 'school', label: 'Profil Sekolah', icon: Building2 },
  { key: 'schoolyear', label: 'Tahun Pelajaran', icon: Calendar },
  { key: 'backup', label: 'Backup Data', icon: Database },
]

// ── School settings form ─────────────────────────────────────
// BUG-58 FIX: Hilangkan field academicYear dari form settings.
// Tahun pelajaran aktif dikelola via setActiveSY() di tab Tahun Pelajaran,
// bukan disimpan sebagai key-value di sheet settings.
const schoolForm = reactive({
  schoolName: '', schoolNpsn: '', schoolAddress: '',
  schoolPhone: '', schoolEmail: '', schoolWebsite: '',
  principalName: '', principalNip: '',
})

watch(schoolForm, () => {
  if (!isHydratingSchoolForm) isSchoolFormDirty.value = true
}, { flush: 'sync' })

function hydrateSchoolForm() {
  if (isSchoolFormDirty.value || !settingsStore.data) return

  isHydratingSchoolForm = true
  try {
    const {
      schoolName, schoolNpsn, schoolAddress, schoolPhone, schoolEmail,
      schoolWebsite, principalName, principalNip,
    } = settingsStore.data
    Object.assign(schoolForm, {
      schoolName: schoolName ?? '',
      schoolNpsn: schoolNpsn ?? '',
      schoolAddress: schoolAddress ?? '',
      schoolPhone: schoolPhone ?? '',
      schoolEmail: schoolEmail ?? '',
      schoolWebsite: schoolWebsite ?? '',
      principalName: principalName ?? '',
      principalNip: principalNip ?? '',
    })
  } finally {
    isHydratingSchoolForm = false
  }
}

async function loadSettingsData() {
  if (isLoadingSettings.value) return
  isLoadingSettings.value = true
  settingsLoadError.value = ''
  try {
    await settingsStore.fetch()
    if (!settingsStore.initialized) {
      settingsLoadError.value = 'Pengaturan sekolah belum berhasil dimuat. Periksa koneksi lalu coba lagi.'
      return
    }
    hydrateSchoolForm()
  } catch (e: unknown) {
    settingsLoadError.value = e instanceof Error ? e.message : 'Gagal memuat pengaturan sekolah.'
  } finally {
    isLoadingSettings.value = false
  }
}

async function saveSchoolSettings() {
  if (!canManageSettings.value || isSaving.value || isLoadingSettings.value) return
  isSaving.value = true
  successMsg.value = ''
  errorMsg.value = ''
  const payload = { ...schoolForm }
  try {
    await settingsStore.update(payload)
    isSchoolFormDirty.value = false
    settingsLoadError.value = ''
    successMsg.value = 'Pengaturan berhasil disimpan.'
    toast.success('Pengaturan berhasil disimpan.')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.'
    toast.error(errorMsg.value)
  } finally {
    isSaving.value = false
  }
}

// ── School year ───────────────────────────────────────────────
const showAddSY = ref(false)
const isSavingSY = ref(false)
const syForm = reactive({ name: '', startDate: '', endDate: '', isActive: false })
const syErrors = reactive<Record<string, string>>({})

// BUG-57 FIX: Gunakan useConfirm() + BaseConfirmDialog alih-alih window.confirm()
const confirmDeleteSY = useConfirm()
let _deleteSYId = ''

async function loadSchoolYears(force = false) {
  if (schoolYearStore.isLoading) return
  schoolYearLoadError.value = ''
  try {
    if (force) await schoolYearStore.refresh()
    else await schoolYearStore.fetch()

    if (!schoolYearStore.initialized) {
      schoolYearLoadError.value = 'Daftar tahun pelajaran gagal dimuat. Silakan coba lagi.'
    }
  } catch (e: unknown) {
    schoolYearLoadError.value = e instanceof Error ? e.message : 'Gagal memuat tahun pelajaran.'
  }
}

function openAddSY() {
  if (!canManageSettings.value || isSavingSY.value) return
  Object.assign(syForm, { name: '', startDate: '', endDate: '', isActive: false })
  Object.keys(syErrors).forEach(k => delete syErrors[k])
  showAddSY.value = true
}

async function saveSY() {
  if (!canManageSettings.value || isSavingSY.value) return
  isSavingSY.value = true
  Object.keys(syErrors).forEach(k => delete syErrors[k])

  try {
    const payload = { ...syForm }
    try {
      await schoolYearSchema.validate(payload, { abortEarly: false })
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        const issues = err.inner.length ? err.inner : [err]
        issues.forEach(issue => {
          if (issue.path && !syErrors[issue.path]) syErrors[issue.path] = issue.message
        })
      } else {
        toast.error('Data tahun pelajaran tidak dapat divalidasi.')
      }
      return
    }

    const created = await classroomsService.createSchoolYear(payload)
    // Sinkronkan status aktif antar-tahun; updateSchoolYear juga dapat menambahkan
    // item baru dan menonaktifkan tahun lama secara reaktif.
    schoolYearStore.updateSchoolYear(created)
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran berhasil ditambahkan.')
    showAddSY.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan tahun pelajaran.')
  } finally {
    isSavingSY.value = false
  }
}

async function setActiveSY(id: string) {
  if (!canManageSettings.value || !id || isSettingActiveSY.value !== null) return
  const target = schoolYearStore.schoolYears.find(sy => sy.id === id)
  if (!target || target.isActive) return

  isSettingActiveSY.value = id
  try {
    const updated = await classroomsService.setActiveSchoolYear(id)
    schoolYearStore.updateSchoolYear(updated)
    toast.success('Tahun pelajaran aktif diperbarui.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah tahun aktif.')
  } finally {
    isSettingActiveSY.value = null
  }
}

function handleDeleteSY(id: string, name: string) {
  if (!canManageSettings.value || !id || confirmDeleteSY.isLoading.value) return
  // BUG-57 FIX: Gunakan dialog konfirmasi custom, bukan window.confirm()
  _deleteSYId = id
  confirmDeleteSY.options.value = { message: name, type: 'danger' }
  confirmDeleteSY.isOpen.value = true
}

async function confirmDoDeleteSY() {
  if (!canManageSettings.value || !_deleteSYId || confirmDeleteSY.isLoading.value) return
  confirmDeleteSY.isLoading.value = true
  try {
    await classroomsService.deleteSchoolYear(_deleteSYId)
    schoolYearStore.removeSchoolYear(_deleteSYId)
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran dihapus.')
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus tahun pelajaran.')
  } finally {
    confirmDeleteSY.isLoading.value = false
  }
}

// ── Backup ────────────────────────────────────────────────────
async function handleBackup() {
  if (!canManageSettings.value || isBackingUp.value) return
  isBackingUp.value = true
  try {
    const data = await settingsService.exportBackup()
    const meta = data._meta
    if (meta && typeof meta === 'object') {
      const candidate = meta as Record<string, unknown>
      if (
        typeof candidate.version === 'string' &&
        typeof candidate.generatedAt === 'string' &&
        typeof candidate.sheetCount === 'number' &&
        candidate.counts &&
        typeof candidate.counts === 'object'
      ) {
        backupMeta.value = {
          version: candidate.version,
          generatedAt: candidate.generatedAt,
          sheetCount: candidate.sheetCount,
          counts: candidate.counts as Record<string, number>,
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    a.download = `backup-buku-induk-${localDate}.json`
    document.body.appendChild(a)
    a.click()
    // Beri browser waktu memulai unduhan sebelum URL blob dilepas.
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 1000)
    toast.success('Backup berhasil didownload.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat backup.')
  } finally { isBackingUp.value = false }
}

onMounted(() => {
  // Setiap area menangani status/error-nya sendiri agar kegagalan satu request
  // tidak menyembunyikan data atau kontrol pada area lainnya.
  void Promise.all([loadSettingsData(), loadSchoolYears()])
})
</script>
