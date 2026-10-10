<template>
  <div class="w-full min-w-0 space-y-6 pb-6">
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
        <div class="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-800">Daftar Tahun Pelajaran</h2>
            <p class="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Kelola periode akademik dan tentukan satu tahun pelajaran yang sedang digunakan.
            </p>
          </div>
          <BaseButton
            v-if="canManageSettings"
            size="sm"
            class="w-full shrink-0 sm:w-auto"
            :disabled="isSchoolYearMutationBusy"
            @click="openAddSY"
          >
            <Plus class="h-4 w-4" aria-hidden="true" /> Tambah Tahun
          </BaseButton>
        </div>

        <BaseAlert v-if="!canManageSettings" class="mb-5" type="warning" title="Akses lihat saja">
          Anda dapat melihat daftar tahun pelajaran, tetapi hanya pengguna dengan izin pengelolaan pengaturan yang dapat menambah, mengaktifkan, atau menghapus periode.
        </BaseAlert>

        <div class="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm">
              <Calendar class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tahun Pelajaran Aktif</p>
              <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                {{ schoolYearStore.activeSchoolYearName || 'Belum ada tahun pelajaran aktif' }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                Tahun ini digunakan sebagai periode akademik aktif aplikasi.
              </p>
            </div>
          </div>

          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
              <Database class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tahun Pelajaran</p>
              <p class="mt-1 text-xl font-semibold tabular-nums text-slate-800">
                {{ schoolYearStore.schoolYears.length }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">Periode yang tersimpan di daftar.</p>
            </div>
          </div>
        </div>

        <div v-if="schoolYearLoadError" class="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div class="min-w-0">
            <p class="break-words text-sm font-medium text-red-700">{{ schoolYearLoadError }}</p>
            <p v-if="schoolYearStore.schoolYears.length" class="mt-1 text-xs leading-relaxed text-red-600">
              Daftar yang tersedia masih ditampilkan; data terbaru dari server belum berhasil dipastikan.
            </p>
          </div>
          <BaseButton
            type="button"
            variant="outline"
            size="sm"
            class="w-full shrink-0 sm:w-auto"
            :loading="schoolYearStore.isLoading"
            :disabled="schoolYearStore.isLoading"
            @click="loadSchoolYears(true)"
          >
            Coba Lagi
          </BaseButton>
        </div>

        <div v-if="schoolYearStore.isLoading" class="space-y-2" role="status" aria-label="Memuat daftar tahun pelajaran" aria-busy="true" aria-live="polite">
          <BaseSkeleton v-for="i in 3" :key="i" height="h-14" />
        </div>
        <div v-else-if="!schoolYearStore.schoolYears.length && !schoolYearLoadError" class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
          <Calendar class="mx-auto mb-3 h-9 w-9 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-semibold text-slate-700">Belum ada tahun pelajaran</p>
          <p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
            Tambahkan periode akademik agar dapat menentukan tahun pelajaran aktif.
          </p>
          <BaseButton
            v-if="canManageSettings"
            size="sm"
            class="mt-4 w-full sm:w-auto"
            :disabled="isSchoolYearMutationBusy"
            @click="openAddSY"
          >
            <Plus class="mr-1 h-4 w-4" aria-hidden="true" /> Tambah Tahun Pelajaran
          </BaseButton>
        </div>
        <div v-else-if="schoolYearStore.schoolYears.length" class="min-w-0 divide-y divide-slate-100">
          <div
            v-for="sy in sortedSchoolYears"
            :key="sy.id || sy.name"
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
                :disabled="isSchoolYearMutationBusy"
                :aria-label="`Jadikan tahun pelajaran ${sy.name} aktif`"
                @click="setActiveSY(sy.id)"
              >
                {{ isSettingActiveSY === sy.id ? 'Memproses...' : 'Jadikan Aktif' }}
              </button>
              <button
                v-if="canManageSettings && !sy.isActive"
                type="button"
                class="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSchoolYearMutationBusy"
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
      <BaseModal
        v-model="showAddSY"
        title="Tambah Tahun Pelajaran"
        subtitle="Lengkapi nama periode dan rentang tanggal akademik."
        size="sm"
        :show-close="!isSavingSY"
        :close-on-backdrop="!isSavingSY"
      >
        <form id="school-year-form" novalidate class="min-w-0 space-y-4" :aria-busy="isSavingSY" @submit.prevent="saveSY">
          <BaseAlert v-if="sySubmitError" type="error" title="Tahun pelajaran belum tersimpan">
            {{ sySubmitError }}
          </BaseAlert>
          <BaseInput id="school-year-name" v-model="syForm.name" label="Nama Tahun Pelajaran" placeholder="2026/2027" autocomplete="off" maxlength="9" required :disabled="isSavingSY" :error-message="syErrors.name" />
          <BaseInput id="school-year-start-date" v-model="syForm.startDate" label="Tanggal Mulai" type="date" required :disabled="isSavingSY" :error-message="syErrors.startDate" />
          <BaseInput id="school-year-end-date" v-model="syForm.endDate" label="Tanggal Selesai" type="date" :min="syForm.startDate || undefined" required :disabled="isSavingSY" :error-message="syErrors.endDate" />
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="flex items-start gap-3">
              <input id="syActive" v-model="syForm.isActive" type="checkbox" :disabled="isSavingSY" class="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <div class="min-w-0">
                <label for="syActive" class="cursor-pointer text-sm font-medium text-slate-700">Jadikan tahun pelajaran aktif</label>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Jika dipilih, tahun aktif sebelumnya akan dinonaktifkan setelah perubahan berhasil disimpan.
                </p>
              </div>
            </div>
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
        @cancel="cancelDeleteSY"
      />
    </template>

    <!-- Tab: Backup -->
    <template v-if="activeTab === 'backup'">
      <BaseCard
        title="Backup Data"
        subtitle="Ekspor data Google Spreadsheet ke berkas JSON untuk arsip dan pemulihan."
        class="min-w-0"
      >
        <div class="mt-4 min-w-0 space-y-5" :aria-busy="isBackingUp">
          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Database class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold text-slate-800">Cadangan data aplikasi</h2>
              <p class="mt-1 break-words text-sm leading-relaxed text-slate-600">
                Backup memuat data dari sheet yang dikelola aplikasi dan manifest berisi versi,
                jumlah sheet, serta jumlah record. Unduhan hanya dibuat setelah backend menyatakan
                seluruh sheet berhasil dibaca.
              </p>
            </div>
          </div>

          <BaseAlert type="warning" title="Simpan berkas dengan aman">
            Berkas backup dapat memuat data pribadi siswa, orang tua, guru, dan catatan administrasi.
            Simpan di lokasi terbatas, jangan kirim melalui kanal publik, dan pastikan salinannya dapat diakses saat pemulihan diperlukan.
          </BaseAlert>

          <BaseAlert
            v-if="backupError"
            :key="backupError"
            type="error"
            title="Backup belum berhasil"
            dismissible
            @dismiss="backupError = ''"
          >
            <p class="break-words">{{ backupError }}</p>
          </BaseAlert>

          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div v-if="canManageSettings" class="min-w-0">
              <BaseButton
                class="min-h-11 w-full sm:w-auto"
                :loading="isBackingUp"
                :disabled="isBackingUp"
                loading-text="Memvalidasi dan mengekspor..."
                @click="handleBackup"
              >
                <Download class="h-4 w-4" aria-hidden="true" />
                Download Backup JSON
              </BaseButton>
              <p class="mt-2 text-xs leading-relaxed text-slate-500">
                Proses dapat memerlukan waktu lebih lama jika data berukuran besar.
              </p>
            </div>
            <BaseAlert v-else type="warning" title="Akses lihat saja">
              Hanya administrator dengan izin pengelolaan pengaturan yang dapat membuat backup.
            </BaseAlert>
            <p
              v-if="isBackingUp"
              class="text-sm text-slate-500"
              role="status"
              aria-live="polite"
            >
              Memeriksa kelengkapan data sebelum menyiapkan unduhan…
            </p>
          </div>

          <div
            v-if="backupMeta"
            class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            aria-live="polite"
          >
            <div class="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800">Backup terakhir berhasil dibuat</p>
                <p class="mt-1 break-words text-xs text-slate-500">
                  {{ formatDateTime(backupMeta.generatedAt) }}
                </p>
                <p v-if="backupLastFileName" class="mt-1 break-all font-mono text-xs text-slate-500">
                  {{ backupLastFileName }}
                </p>
              </div>
              <BaseBadge color="green" dot>Lengkap</BaseBadge>
            </div>

            <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Versi aplikasi</p>
                <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                  {{ backupMeta.version }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Sheet berhasil dicadangkan</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupMeta.sheetCount }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Total record</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupTotalRecords.toLocaleString('id-ID') }}
                </p>
              </div>
            </div>
          </div>

          <div v-else class="flex min-w-0 items-start gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <Database class="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-700">Belum ada backup pada sesi ini</p>
              <p class="mt-1 break-words text-sm leading-relaxed text-slate-500">
                Jalankan backup untuk membuat berkas JSON dan melihat ringkasan jumlah sheet serta record yang berhasil dicadangkan.
              </p>
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

interface BackupManifest {
  version: string
  generatedAt: string
  sheetCount: number
  counts: Record<string, number>
  complete: boolean
  failedSheets: string[]
}

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
const backupMeta = ref<BackupManifest | null>(null)
const backupError = ref('')
const backupLastFileName = ref('')
const backupTotalRecords = computed(() => {
  const counts = backupMeta.value?.counts
  if (!counts) return 0

  return Object.values(counts).reduce(
    (total, count) => total + (Number.isSafeInteger(count) && count >= 0 ? count : 0),
    0,
  )
})

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
type SchoolYearFormField = keyof typeof syForm
const schoolYearFieldIds: Record<Exclude<SchoolYearFormField, 'isActive'>, string> = {
  name: 'school-year-name',
  startDate: 'school-year-start-date',
  endDate: 'school-year-end-date',
}
const syErrors = reactive<Record<Exclude<SchoolYearFormField, 'isActive'>, string>>({
  name: '',
  startDate: '',
  endDate: '',
})
const sySubmitError = ref('')

// BUG-57 FIX: Gunakan useConfirm() + BaseConfirmDialog alih-alih window.confirm()
const confirmDeleteSY = useConfirm()
let _deleteSYId = ''

const sortedSchoolYears = computed(() =>
  [...schoolYearStore.schoolYears].sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '')),
)
const isSchoolYearMutationBusy = computed(() =>
  isSavingSY.value ||
  isSettingActiveSY.value !== null ||
  confirmDeleteSY.isLoading.value,
)

watch(
  () => syForm.name,
  () => {
    syErrors.name = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.startDate,
  () => {
    syErrors.startDate = ''
    // Tanggal mulai mengubah validitas rentang tanggal selesai.
    syErrors.endDate = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.endDate,
  () => {
    syErrors.endDate = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.isActive,
  () => {
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

function clearSchoolYearErrors() {
  syErrors.name = ''
  syErrors.startDate = ''
  syErrors.endDate = ''
  sySubmitError.value = ''
}

async function focusFirstSchoolYearError() {
  const firstInvalid = (Object.keys(syErrors) as Array<keyof typeof syErrors>)
    .find(field => Boolean(syErrors[field]))
  if (!firstInvalid) return

  await nextTick()
  document.getElementById(schoolYearFieldIds[firstInvalid])?.focus()
}

async function loadSchoolYears(force = false) {
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
  if (!canManageSettings.value || isSchoolYearMutationBusy.value) return
  Object.assign(syForm, { name: '', startDate: '', endDate: '', isActive: false })
  clearSchoolYearErrors()
  showAddSY.value = true
}

async function saveSY() {
  if (!canManageSettings.value || isSchoolYearMutationBusy.value) return
  isSavingSY.value = true
  clearSchoolYearErrors()

  try {
    const payload = {
      name: syForm.name.trim(),
      startDate: syForm.startDate,
      endDate: syForm.endDate,
      isActive: syForm.isActive,
    }

    try {
      await schoolYearSchema.validate(payload, { abortEarly: false })
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        const issues = err.inner.length ? err.inner : [err]
        issues.forEach(issue => {
          if (
            issue.path &&
            ['name', 'startDate', 'endDate'].includes(issue.path) &&
            !syErrors[issue.path as keyof typeof syErrors]
          ) {
            syErrors[issue.path as keyof typeof syErrors] = issue.message
          }
        })
        if (Object.values(syErrors).some(Boolean)) {
          await focusFirstSchoolYearError()
        } else {
          toast.error('Data tahun pelajaran tidak dapat divalidasi.')
        }
      } else {
        toast.error('Data tahun pelajaran tidak dapat divalidasi.')
      }
      return
    }

    const normalizedName = payload.name.toLocaleLowerCase()
    const duplicate = schoolYearStore.schoolYears.some(
      sy => (sy.name ?? '').trim().toLocaleLowerCase() === normalizedName,
    )
    if (duplicate) {
      syErrors.name = 'Tahun pelajaran dengan nama tersebut sudah ada.'
      await focusFirstSchoolYearError()
      return
    }

    const created = await classroomsService.createSchoolYear(payload)
    if (!created || !created.id) {
      throw new Error('Server tidak mengembalikan data tahun pelajaran yang valid. Muat ulang daftar sebelum mencoba lagi.')
    }

    // Sinkronkan status aktif antar-tahun; updateSchoolYear juga dapat menambahkan
    // item baru dan menonaktifkan tahun lama secara reaktif.
    schoolYearStore.updateSchoolYear(created)
    schoolYearStore.schoolYears.sort((a, b) => b.name.localeCompare(a.name))
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran berhasil ditambahkan.')
    showAddSY.value = false
  } catch (e: unknown) {
    sySubmitError.value = e instanceof Error ? e.message : 'Gagal menyimpan tahun pelajaran.'
    toast.error(sySubmitError.value)
  } finally {
    isSavingSY.value = false
  }
}

async function setActiveSY(id: string) {
  if (!canManageSettings.value || !id || isSchoolYearMutationBusy.value) return
  const target = schoolYearStore.schoolYears.find(sy => sy.id === id)
  if (!target || target.isActive) return

  isSettingActiveSY.value = id
  try {
    const updated = await classroomsService.setActiveSchoolYear(id)
    if (!updated || updated.id !== id || !updated.isActive) {
      throw new Error('Status tahun aktif dari server tidak valid. Muat ulang daftar tahun pelajaran.')
    }
    schoolYearStore.updateSchoolYear(updated)
    schoolYearStore.schoolYears.sort((a, b) => b.name.localeCompare(a.name))
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran aktif diperbarui.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah tahun aktif.')
  } finally {
    isSettingActiveSY.value = null
  }
}

function cancelDeleteSY() {
  // Jangan pertahankan ID target yang batal dihapus; dialog bisa dibuka ulang
  // untuk item lain dan harus selalu menggunakan target terbaru.
  if (confirmDeleteSY.isLoading.value) return
  _deleteSYId = ''
}

function handleDeleteSY(id: string, name: string) {
  if (!canManageSettings.value || !id || isSchoolYearMutationBusy.value || confirmDeleteSY.isOpen.value) return
  const target = schoolYearStore.schoolYears.find(sy => sy.id === id)
  if (!target) {
    toast.error('Tahun pelajaran tidak ditemukan. Muat ulang daftar lalu coba lagi.')
    return
  }
  if (target.isActive) {
    toast.error('Tahun pelajaran aktif tidak dapat dihapus.')
    return
  }

  // BUG-57 FIX: Gunakan dialog konfirmasi custom, bukan window.confirm()
  _deleteSYId = id
  confirmDeleteSY.options.value = { message: name, type: 'danger' }
  confirmDeleteSY.isOpen.value = true
}

async function confirmDoDeleteSY() {
  if (confirmDeleteSY.isLoading.value) return

  if (!canManageSettings.value) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Akun Anda tidak memiliki izin untuk menghapus tahun pelajaran.')
    return
  }
  if (!_deleteSYId || isSavingSY.value || isSettingActiveSY.value !== null) return

  const target = schoolYearStore.schoolYears.find(sy => sy.id === _deleteSYId)
  if (!target) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Tahun pelajaran tidak lagi tersedia. Daftar akan dimuat ulang.')
    void loadSchoolYears(true)
    return
  }
  if (target.isActive) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Tahun pelajaran aktif tidak dapat dihapus.')
    return
  }

  confirmDeleteSY.isLoading.value = true
  try {
    const deletedId = _deleteSYId
    await classroomsService.deleteSchoolYear(deletedId)
    schoolYearStore.removeSchoolYear(deletedId)
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
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateBackupResponse(value: unknown): {
  data: Record<string, unknown>
  meta: BackupManifest
} {
  if (!isRecord(value)) {
    throw new Error('Respons backup tidak valid. Muat ulang halaman lalu coba kembali.')
  }

  const rawMeta = value._meta
  if (!isRecord(rawMeta)) {
    throw new Error('Manifest backup tidak ditemukan. Backend GAS perlu diperiksa.')
  }

  if (rawMeta.complete !== true) {
    const failedSheets = Array.isArray(rawMeta.failedSheets)
      ? rawMeta.failedSheets
          .map((item) => {
            if (typeof item === 'string') return item
            return isRecord(item) && typeof item.name === 'string' ? item.name : ''
          })
          .filter(Boolean)
      : []

    if (rawMeta.complete === false || failedSheets.length > 0) {
      const detail = failedSheets.length
        ? ` Sheet bermasalah: ${failedSheets.join(', ')}.`
        : ''
      throw new Error(`Backup dibatalkan karena backend tidak dapat memastikan semua sheet berhasil dibaca.${detail} Periksa sheet di Google Spreadsheet, lalu coba lagi.`)
    }

    throw new Error(
      'Backend GAS yang aktif belum melaporkan status kelengkapan backup. ' +
      'Sinkronkan gas-backend/ReportHandler.gs ke Google Apps Script lalu deploy versi baru sebelum mencoba lagi.',
    )
  }

  if (
    typeof rawMeta.version !== 'string' ||
    !rawMeta.version.trim() ||
    typeof rawMeta.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(rawMeta.generatedAt)) ||
    !Number.isSafeInteger(rawMeta.sheetCount) ||
    (rawMeta.sheetCount as number) < 0 ||
    !isRecord(rawMeta.counts)
  ) {
    throw new Error('Manifest backup tidak lengkap atau memiliki format yang tidak valid.')
  }

  const counts: Record<string, number> = {}
  const expectedSheets = Object.keys(rawMeta.counts)
  for (const [sheetName, count] of Object.entries(rawMeta.counts)) {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Jumlah record pada sheet "${sheetName}" tidak valid. Backup dibatalkan.`)
    }

    const sheetData = value[sheetName]
    if (!Array.isArray(sheetData) || sheetData.length !== count) {
      throw new Error(`Data sheet "${sheetName}" tidak sesuai dengan manifest. Backup dibatalkan agar berkas yang tidak konsisten tidak diunduh.`)
    }
    counts[sheetName] = count
  }

  const exportedSheets = Object.keys(value).filter((key) => key !== '_meta')
  if (
    expectedSheets.length !== rawMeta.sheetCount ||
    exportedSheets.length !== expectedSheets.length ||
    exportedSheets.some((name) => !Object.prototype.hasOwnProperty.call(counts, name))
  ) {
    throw new Error('Jumlah sheet pada data dan manifest tidak cocok. Backup dibatalkan.')
  }

  const failedSheets = Array.isArray(rawMeta.failedSheets)
    ? rawMeta.failedSheets
        .map((item) => {
          if (typeof item === 'string') return item
          return isRecord(item) && typeof item.name === 'string' ? item.name : ''
        })
        .filter(Boolean)
    : []

  if (failedSheets.length > 0) {
    throw new Error(`Backup tidak lengkap. Sheet bermasalah: ${failedSheets.join(', ')}.`)
  }

  return {
    data: value,
    meta: {
      version: rawMeta.version,
      generatedAt: rawMeta.generatedAt,
      sheetCount: rawMeta.sheetCount as number,
      counts,
      complete: true,
      failedSheets: [],
    },
  }
}

async function handleBackup() {
  if (!canManageSettings.value || isBackingUp.value) return

  isBackingUp.value = true
  backupError.value = ''

  try {
    const response: unknown = await settingsService.exportBackup()
    const validated = validateBackupResponse(response)
    const json = JSON.stringify(validated.data, null, 2)
    if (!json) throw new Error('Data backup tidak dapat dikonversi menjadi JSON.')

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const localTimestamp = [
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
    ].join('-')
    const fileName = `backup-buku-induk-${localTimestamp}.json`

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.style.display = 'none'

    try {
      document.body.appendChild(anchor)
      anchor.click()
    } finally {
      // Beri browser waktu memulai unduhan sebelum URL blob dilepas.
      window.setTimeout(() => {
        anchor.remove()
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    }

    backupMeta.value = validated.meta
    backupLastFileName.value = fileName
    toast.success('Backup berhasil divalidasi dan unduhan telah dimulai.')
  } catch (e: unknown) {
    backupError.value = e instanceof Error
      ? e.message
      : 'Gagal membuat backup. Silakan coba lagi.'
    toast.error(backupError.value)
  } finally {
    isBackingUp.value = false
  }
}

onMounted(() => {
  // Setiap area menangani status/error-nya sendiri agar kegagalan satu request
  // tidak menyembunyikan data atau kontrol pada area lainnya.
  void Promise.all([loadSettingsData(), loadSchoolYears()])
})
</script>
