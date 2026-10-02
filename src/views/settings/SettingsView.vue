<template>
  <div class="space-y-6">
    <PageHeader title="Pengaturan" subtitle="Konfigurasi profil sekolah dan sistem" />

    <!-- Tab navigation -->
    <div class="flex border-b border-slate-200 overflow-x-auto gap-0">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="[
          'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2',
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
      <BaseAlert v-if="successMsg" type="success" dismissible>{{ successMsg }}</BaseAlert>
      <BaseAlert v-if="errorMsg" type="error" dismissible>{{ errorMsg }}</BaseAlert>

      <form class="grid grid-cols-1 lg:grid-cols-2 gap-5" @submit.prevent="saveSchoolSettings">
        <BaseCard title="Identitas Sekolah/Madrasah">
          <div class="space-y-4 mt-3">
            <BaseInput v-model="schoolForm.schoolName" label="Nama Sekolah/Madrasah" placeholder="MTs..." required />
            <BaseInput v-model="schoolForm.schoolNpsn" label="NPSN" placeholder="8 digit angka" />
            <BaseInput v-model="schoolForm.schoolAddress" label="Alamat" placeholder="Jalan, desa, kecamatan..." />
            <BaseInput v-model="schoolForm.schoolPhone" label="Nomor Telepon" placeholder="(0xx) xxxx-xxxx" />
            <BaseInput v-model="schoolForm.schoolEmail" label="Email Sekolah" type="email" placeholder="info@sekolah.sch.id" />
            <BaseInput v-model="schoolForm.schoolWebsite" label="Website" placeholder="https://sekolah.sch.id" />
          </div>
        </BaseCard>

        <BaseCard title="Kepala Sekolah/Madrasah">
          <div class="space-y-4 mt-3">
            <BaseInput v-model="schoolForm.principalName" label="Nama Kepala Sekolah" placeholder="Nama lengkap beserta gelar" />
            <BaseInput v-model="schoolForm.principalNip" label="NIP Kepala Sekolah" placeholder="NIP (opsional)" />
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

        <div class="lg:col-span-2 flex justify-end">
          <BaseButton type="submit" :loading="isSaving" loading-text="Menyimpan...">
            <Save class="h-4 w-4" /> Simpan Pengaturan
          </BaseButton>
        </div>
      </form>
    </template>

    <!-- Tab: Tahun Pelajaran -->
    <template v-if="activeTab === 'schoolyear'">
      <BaseCard>
        <div class="flex justify-between items-center mb-4">
          <p class="text-sm font-medium text-slate-700">Daftar Tahun Pelajaran</p>
          <BaseButton size="sm" @click="openAddSY">
            <Plus class="h-4 w-4" /> Tambah
          </BaseButton>
        </div>

        <div v-if="schoolYearStore.isLoading" class="space-y-2">
          <BaseSkeleton v-for="i in 3" :key="i" height="h-14" />
        </div>
        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="sy in schoolYearStore.schoolYears"
            :key="sy.id"
            class="flex items-center justify-between py-3"
          >
            <div>
              <p class="font-medium text-slate-800 text-sm">{{ sy.name }}</p>
              <p class="text-xs text-slate-400">
                {{ formatDate(sy.startDate) }} – {{ formatDate(sy.endDate) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <BaseBadge v-if="sy.isActive" color="green" dot>Aktif</BaseBadge>
              <button
                v-if="!sy.isActive"
                class="text-xs text-primary-600 hover:underline font-medium"
                @click="setActiveSY(sy.id)"
              >
                Jadikan Aktif
              </button>
              <button
                class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                @click="handleDeleteSY(sy.id, sy.name)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Modal tambah tahun pelajaran -->
      <BaseModal v-model="showAddSY" title="Tambah Tahun Pelajaran" size="sm">
        <form class="space-y-3" @submit.prevent="saveSY">
          <BaseInput v-model="syForm.name" label="Nama" placeholder="2024/2025" required :error-message="syErrors.name" />
          <BaseInput v-model="syForm.startDate" label="Tanggal Mulai" type="date" required />
          <BaseInput v-model="syForm.endDate" label="Tanggal Selesai" type="date" required />
          <div class="flex items-center gap-2">
            <input id="syActive" v-model="syForm.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600" />
            <label for="syActive" class="text-sm font-medium text-slate-700">Jadikan tahun aktif</label>
          </div>
        </form>
        <template #footer>
          <div class="flex gap-3 justify-end">
            <BaseButton variant="outline" size="sm" @click="showAddSY = false">Batal</BaseButton>
            <BaseButton size="sm" :loading="isSavingSY" @click="saveSY">Simpan</BaseButton>
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
            Backup akan mengekspor seluruh data dari semua sheet Spreadsheet ke file JSON.
            Proses ini dapat memakan waktu beberapa menit tergantung jumlah data.
          </BaseAlert>
          <div class="flex gap-3">
            <BaseButton :loading="isBackingUp" loading-text="Mengekspor..." @click="handleBackup">
              <Download class="h-4 w-4" /> Download Backup JSON
            </BaseButton>
          </div>
          <p class="text-xs text-slate-400">
            Disarankan melakukan backup rutin minimal setiap bulan.
          </p>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Save, Plus, Trash2, Download, Building2, Calendar, Database } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseInput, BaseButton, BaseAlert, BaseBadge,
  BaseSkeleton, BaseModal, BaseConfirmDialog,
} from '@/components/ui'
import { useSettingsStore } from '@/stores/settings'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useConfirm } from '@/composables'
import { classroomsService, settingsService } from '@/services'
import { formatDate } from '@/utils'
import { schoolYearSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const settingsStore = useSettingsStore()
const schoolYearStore = useSchoolYearStore()

const activeTab = ref('school')
const isSaving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const isBackingUp = ref(false)

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

async function saveSchoolSettings() {
  isSaving.value = true
  successMsg.value = ''
  errorMsg.value = ''
  try {
    await settingsStore.update({ ...schoolForm })
    successMsg.value = 'Pengaturan berhasil disimpan.'
    toast.success('Pengaturan berhasil disimpan.')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.'
  } finally { isSaving.value = false }
}

// ── School year ───────────────────────────────────────────────
const showAddSY = ref(false)
const isSavingSY = ref(false)
const syForm = reactive({ name: '', startDate: '', endDate: '', isActive: false })
const syErrors = reactive<Record<string, string>>({})

// BUG-57 FIX: Gunakan useConfirm() + BaseConfirmDialog alih-alih window.confirm()
const confirmDeleteSY = useConfirm()
let _deleteSYId = ''

function openAddSY() {
  Object.assign(syForm, { name: '', startDate: '', endDate: '', isActive: false })
  Object.keys(syErrors).forEach(k => delete syErrors[k])
  showAddSY.value = true
}

async function saveSY() {
  Object.keys(syErrors).forEach(k => delete syErrors[k])
  try {
    await schoolYearSchema.validate(syForm, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner: { path: string; message: string }[] }).inner
      inner.forEach(e => { syErrors[e.path] = e.message })
    }
    return
  }
  isSavingSY.value = true
  try {
    const created = await classroomsService.createSchoolYear(syForm)
    schoolYearStore.addSchoolYear(created)
    toast.success('Tahun pelajaran berhasil ditambahkan.')
    showAddSY.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan.')
  } finally { isSavingSY.value = false }
}

async function setActiveSY(id: string) {
  try {
    const updated = await classroomsService.setActiveSchoolYear(id)
    schoolYearStore.updateSchoolYear(updated)
    toast.success('Tahun pelajaran aktif diperbarui.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah tahun aktif.')
  }
}

function handleDeleteSY(id: string, name: string) {
  // BUG-57 FIX: Gunakan dialog konfirmasi custom, bukan window.confirm()
  _deleteSYId = id
  confirmDeleteSY.options.value = { message: name, type: 'danger' }
  confirmDeleteSY.isOpen.value = true
}

async function confirmDoDeleteSY() {
  confirmDeleteSY.isLoading.value = true
  try {
    await classroomsService.deleteSchoolYear(_deleteSYId)
    schoolYearStore.removeSchoolYear(_deleteSYId)
    toast.success('Tahun pelajaran dihapus.')
    confirmDeleteSY.isOpen.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus.')
  } finally { confirmDeleteSY.isLoading.value = false }
}

// ── Backup ────────────────────────────────────────────────────
async function handleBackup() {
  isBackingUp.value = true
  try {
    const data = await settingsService.exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-buku-induk-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    // BUG-56 FIX: Tunda revoke agar browser sempat memulai download
    setTimeout(() => {
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 150)
    toast.success('Backup berhasil didownload.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat backup.')
  } finally { isBackingUp.value = false }
}

onMounted(async () => {
  await Promise.all([settingsStore.fetch(), schoolYearStore.fetch()])
  // Isi form dari store — tanpa academicYear (BUG-58 fix)
  if (settingsStore.data) {
    const { schoolName, schoolNpsn, schoolAddress, schoolPhone, schoolEmail,
            schoolWebsite, principalName, principalNip } = settingsStore.data
    Object.assign(schoolForm, {
      schoolName:    schoolName    ?? '',
      schoolNpsn:    schoolNpsn    ?? '',
      schoolAddress: schoolAddress ?? '',
      schoolPhone:   schoolPhone   ?? '',
      schoolEmail:   schoolEmail   ?? '',
      schoolWebsite: schoolWebsite ?? '',
      principalName: principalName ?? '',
      principalNip:  principalNip  ?? '',
    })
  }
})
</script>
