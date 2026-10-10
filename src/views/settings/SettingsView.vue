<template>
  <div class="space-y-6">
    <PageHeader title="Pengaturan" subtitle="Konfigurasi profil sekolah dan sistem" />

    <!-- Tab navigation -->
    <div class="flex max-w-full gap-0 overflow-x-auto border-b border-slate-200" role="group" aria-label="Bagian pengaturan">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :aria-pressed="activeTab === tab.key"
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
      <BaseAlert
        v-if="settingsLoadError"
        type="error"
        title="Pengaturan belum dapat dimuat"
      >
        {{ settingsLoadError }}
      </BaseAlert>
      <div v-if="settingsLoadError" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <BaseButton
          type="button"
          variant="outline"
          size="sm"
          class="w-full sm:w-auto"
          :loading="isLoadingSettings"
          @click="loadSettingsData"
        >
          Coba Muat Ulang
        </BaseButton>
      </div>

      <BaseAlert
        v-if="isLoadingSettings"
        type="info"
        title="Memuat pengaturan"
        aria-live="polite"
      >
        Data profil sekolah sedang diambil dari server.
      </BaseAlert>
      <BaseAlert
        v-if="settingsStore.initialized && !schoolForm.schoolName.trim()"
        type="info"
        title="Profil sekolah belum lengkap"
      >
        Lengkapi nama sekolah/madrasah sebelum menyimpan profil.
      </BaseAlert>
      <BaseAlert
        v-if="!canManageSettings"
        type="warning"
        title="Akses lihat saja"
      >
        Anda dapat melihat profil sekolah, tetapi hanya pengguna dengan izin pengelolaan pengaturan yang dapat mengubahnya.
      </BaseAlert>
      <BaseAlert
        v-if="successMsg"
        type="success"
        title="Perubahan tersimpan"
        dismissible
        @dismiss="successMsg = ''"
      >
        {{ successMsg }}
      </BaseAlert>
      <BaseAlert
        v-if="errorMsg"
        type="error"
        title="Pengaturan belum tersimpan"
        dismissible
        @dismiss="errorMsg = ''"
      >
        {{ errorMsg }}
      </BaseAlert>

      <form
        novalidate
        class="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2"
        :aria-busy="isLoadingSettings || isSaving"
        @submit.prevent="saveSchoolSettings"
      >
        <BaseCard
          title="Identitas Sekolah/Madrasah"
          subtitle="Informasi resmi dan kontak sekolah"
          class="min-w-0"
        >
          <div class="mt-4 min-w-0 space-y-5">
            <BaseInput
              id="school-name"
              v-model="schoolForm.schoolName"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolName"
              label="Nama Sekolah/Madrasah"
              placeholder="Contoh: MTs Nurul Falah"
              autocomplete="organization"
              maxlength="255"
              required
            />
            <BaseInput
              id="school-npsn"
              v-model="schoolForm.schoolNpsn"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolNpsn"
              label="NPSN"
              placeholder="8 digit angka"
              hint="Masukkan 8 digit NPSN jika tersedia."
              inputmode="numeric"
              maxlength="8"
              autocomplete="off"
            />
            <BaseInput
              id="school-address"
              v-model="schoolForm.schoolAddress"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolAddress"
              label="Alamat"
              placeholder="Jalan, desa/kelurahan, kecamatan..."
              autocomplete="street-address"
            />
            <BaseInput
              id="school-phone"
              v-model="schoolForm.schoolPhone"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolPhone"
              label="Nomor Telepon"
              placeholder="Contoh: (0xx) xxxx-xxxx"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
            />
            <BaseInput
              id="school-email"
              v-model="schoolForm.schoolEmail"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolEmail"
              label="Email Sekolah"
              placeholder="info@sekolah.sch.id"
              type="email"
              inputmode="email"
              autocomplete="email"
            />
            <BaseInput
              id="school-website"
              v-model="schoolForm.schoolWebsite"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolWebsite"
              label="Website"
              placeholder="https://sekolah.sch.id"
              inputmode="url"
              autocomplete="url"
            />
          </div>
        </BaseCard>

        <BaseCard
          title="Kepala Sekolah/Madrasah"
          subtitle="Informasi pimpinan sekolah"
          class="min-w-0"
        >
          <div class="mt-4 min-w-0 space-y-5">
            <BaseInput
              id="principal-name"
              v-model="schoolForm.principalName"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.principalName"
              label="Nama Kepala Sekolah"
              placeholder="Nama lengkap beserta gelar"
              autocomplete="name"
            />
            <BaseInput
              id="principal-nip"
              v-model="schoolForm.principalNip"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.principalNip"
              label="NIP Kepala Sekolah"
              placeholder="NIP (opsional)"
              autocomplete="off"
            />
          </div>

          <!-- Tahun pelajaran aktif dikelola pada tab Tahun Pelajaran. -->
          <div class="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <p class="mb-1 text-sm font-medium text-slate-700">Tahun Pelajaran Aktif</p>
            <p class="break-words text-sm text-slate-600">
              {{ schoolYearStore.activeSchoolYearName || 'Belum ada tahun pelajaran aktif' }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-slate-500">
              Untuk mengubah tahun pelajaran aktif, buka tab <strong>Tahun Pelajaran</strong>.
            </p>
          </div>
        </BaseCard>

        <div
          v-if="canManageSettings"
          class="flex min-w-0 flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2"
        >
          <p
            v-if="isSchoolFormDirty"
            class="text-sm text-amber-700"
            role="status"
            aria-live="polite"
          >
            Perubahan belum disimpan.
          </p>
          <span v-else class="text-sm text-slate-500">
            Data tersimpan. Ubah isian untuk mengaktifkan tombol simpan.
          </span>
          <BaseButton
            type="submit"
            class="w-full sm:w-auto"
            :disabled="isSchoolFormDisabled || !isSchoolFormDirty"
            :loading="isSaving"
            loading-text="Menyimpan..."
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            Simpan Pengaturan
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
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
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
import { formatDate, formatDateTime, isValidEmail } from '@/utils'
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

type SchoolFormField = keyof typeof schoolForm

const schoolFormErrors = reactive<Record<SchoolFormField, string>>({
  schoolName: '',
  schoolNpsn: '',
  schoolAddress: '',
  schoolPhone: '',
  schoolEmail: '',
  schoolWebsite: '',
  principalName: '',
  principalNip: '',
})

const schoolFormFieldIds: Record<SchoolFormField, string> = {
  schoolName: 'school-name',
  schoolNpsn: 'school-npsn',
  schoolAddress: 'school-address',
  schoolPhone: 'school-phone',
  schoolEmail: 'school-email',
  schoolWebsite: 'school-website',
  principalName: 'principal-name',
  principalNip: 'principal-nip',
}

const isSchoolFormDisabled = computed(() =>
  !canManageSettings.value ||
  !settingsStore.initialized ||
  isLoadingSettings.value ||
  isSaving.value
)

watch(
  () => ({ ...schoolForm }),
  (current, previous) => {
    if (isHydratingSchoolForm) return

    isSchoolFormDirty.value = true
    successMsg.value = ''
    errorMsg.value = ''

    ;(Object.keys(current) as SchoolFormField[]).forEach(field => {
      if (current[field] !== previous[field]) {
        schoolFormErrors[field] = ''
      }
    })
  },
  { flush: 'sync' },
)

function clearSchoolFormErrors() {
  ;(Object.keys(schoolFormErrors) as SchoolFormField[]).forEach(field => {
    schoolFormErrors[field] = ''
  })
}

function isValidSchoolWebsite(value: string): boolean {
  if (!value) return true
  if (/\s/.test(value)) return false

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      (url.hostname.includes('.') || url.hostname === 'localhost')
    )
  } catch {
    return false
  }
}

function validateSchoolForm(): boolean {
  clearSchoolFormErrors()

  if (!schoolForm.schoolName.trim()) {
    schoolFormErrors.schoolName = 'Nama sekolah/madrasah wajib diisi.'
  }

  const npsn = schoolForm.schoolNpsn.trim()
  if (npsn && !/^\d{8}$/.test(npsn)) {
    schoolFormErrors.schoolNpsn = 'NPSN harus terdiri dari 8 digit angka.'
  }

  const email = schoolForm.schoolEmail.trim()
  if (email && !isValidEmail(email)) {
    schoolFormErrors.schoolEmail = 'Format email sekolah tidak valid.'
  }

  const website = schoolForm.schoolWebsite.trim()
  if (website && !isValidSchoolWebsite(website)) {
    schoolFormErrors.schoolWebsite = 'Masukkan alamat website yang valid, misalnya sekolah.sch.id atau https://sekolah.sch.id.'
  }

  return !(Object.values(schoolFormErrors) as string[]).some(Boolean)
}

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
    clearSchoolFormErrors()
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
  if (
    !canManageSettings.value ||
    !settingsStore.initialized ||
    isSaving.value ||
    isLoadingSettings.value ||
    !isSchoolFormDirty.value
  ) return

  successMsg.value = ''
  errorMsg.value = ''

  if (!validateSchoolForm()) {
    errorMsg.value = 'Periksa kembali isian yang ditandai sebelum menyimpan.'
    const firstInvalid = (Object.keys(schoolFormErrors) as SchoolFormField[])
      .find(field => Boolean(schoolFormErrors[field]))
    if (firstInvalid) {
      await nextTick()
      document.getElementById(schoolFormFieldIds[firstInvalid])?.focus()
    }
    return
  }

  // Snapshot yang sudah dinormalisasi; field terkunci sampai request selesai.
  const payload = Object.fromEntries(
    (Object.keys(schoolForm) as SchoolFormField[]).map(field => [
      field,
      schoolForm[field].trim(),
    ]),
  ) as typeof schoolForm

  isSaving.value = true
  try {
    await settingsStore.update(payload)
    isSchoolFormDirty.value = false
    hydrateSchoolForm()
    clearSchoolFormErrors()
    settingsLoadError.value = ''
    successMsg.value = 'Pengaturan profil sekolah berhasil disimpan.'
    toast.success('Pengaturan berhasil disimpan.')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error
      ? e.message
      : 'Gagal menyimpan pengaturan profil sekolah. Silakan coba lagi.'
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
    schoolYearStore.schoolYears.sort((a, b) => b.name.localeCompare(a.name))
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
