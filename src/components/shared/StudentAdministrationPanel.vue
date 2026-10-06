<template>
  <div class="space-y-4">
    <!-- Verifikasi -->
    <BaseCard title="Verifikasi Data" subtitle="Tandai bagian data yang sudah diperiksa oleh petugas berwenang.">
      <div v-if="isLoadingVerification" class="space-y-3">
        <BaseSkeleton v-for="i in 6" :key="i" height="h-16" />
      </div>

      <BaseRetry
        v-else-if="verificationError"
        title="Verifikasi gagal dimuat"
        :message="verificationError"
        @retry="loadVerification"
      />

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="item in verifications"
          :key="item.section"
          class="py-3 first:pt-0 last:pb-0"
        >
          <div class="flex flex-col lg:flex-row lg:items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-800">{{ item.label }}</p>
              <p v-if="item.verifiedAt" class="text-xs text-slate-400 mt-0.5">
                {{ item.status === 'verified' ? 'Diverifikasi' : 'Diperiksa' }}
                {{ formatDateTime(item.verifiedAt) }}
                <span v-if="item.verifiedBy"> oleh {{ item.verifiedBy }}</span>
              </p>
              <p v-if="item.notes" class="text-xs text-slate-500 mt-1">{{ item.notes }}</p>
            </div>

            <div class="flex flex-wrap items-center justify-start gap-1.5 shrink-0">
              <button
                v-for="option in verificationOptions"
                :key="option.value"
                type="button"
                :disabled="!canVerify || savingSection === item.section"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  item.status === option.value
                    ? option.activeClass
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  (!canVerify || savingSection === item.section) ? 'opacity-50 cursor-not-allowed' : '',
                ]"
                @click="saveVerification(item, option.value)"
              >
                <component :is="option.icon" class="h-3.5 w-3.5" />
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Dokumen -->
    <BaseCard title="Dokumen Siswa" subtitle="Simpan metadata dan tautan dokumen untuk arsip digital siswa.">
      <template #header>
        <BaseButton
          v-if="canManageDocuments"
          size="sm"
          @click="openCreateDocument"
        >
          <Plus class="h-4 w-4" />
          Tambah Dokumen
        </BaseButton>
      </template>

      <div v-if="isLoadingDocuments" class="space-y-3">
        <BaseSkeleton v-for="i in 3" :key="i" height="h-20" />
      </div>

      <BaseRetry
        v-else-if="documentError"
        title="Dokumen gagal dimuat"
        :message="documentError"
        @retry="loadDocuments"
      />

      <BaseEmpty
        v-else-if="!documents.length"
        title="Belum ada dokumen"
        description="Tambahkan dokumen seperti KK, akta kelahiran, ijazah, atau dokumen pendukung lainnya."
        type="data"
      >
        <template #action>
          <BaseButton v-if="canManageDocuments" size="sm" @click="openCreateDocument">
            <Plus class="h-4 w-4" />
            Tambah Dokumen
          </BaseButton>
        </template>
      </BaseEmpty>

      <div v-else class="space-y-2">
        <div
          v-for="document in documents"
          :key="document.id"
          class="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
        >
          <div class="flex flex-col lg:flex-row lg:items-center gap-3">
            <div class="p-2.5 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <FileText class="h-5 w-5" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-slate-800">{{ document.documentName }}</p>
                <BaseBadge :color="document.status === 'available' ? 'green' : 'amber'" dot>
                  {{ document.status === 'available' ? 'Tersedia' : 'Perlu diperbarui' }}
                </BaseBadge>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                <span>{{ document.documentType }}</span>
                <span v-if="document.documentNumber">No. {{ document.documentNumber }}</span>
                <span v-if="document.updatedAt">Diperbarui {{ formatDateTime(document.updatedAt) }}</span>
              </div>
              <p v-if="document.notes" class="text-xs text-slate-500 mt-1">{{ document.notes }}</p>
            </div>

            <div class="flex w-full flex-wrap items-center justify-end gap-1.5 lg:w-auto">
              <a
                v-if="document.fileUrl"
                :href="document.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <ExternalLink class="h-3.5 w-3.5" />
                Buka
              </a>
              <BaseButton
                v-if="canManageDocuments"
                variant="ghost"
                size="xs"
                @click="openEditDocument(document)"
              >
                <Pencil class="h-3.5 w-3.5" />
                Edit
              </BaseButton>
              <BaseButton
                v-if="canManageDocuments"
                variant="ghost"
                size="xs"
                @click="askDeleteDocument(document)"
              >
                <Trash2 class="h-3.5 w-3.5 text-red-500" />
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Modal dokumen -->
    <BaseModal
      v-model="showDocumentModal"
      :title="editingDocumentId ? 'Edit Dokumen Siswa' : 'Tambah Dokumen Siswa'"
      size="lg"
    >
      <form class="space-y-4" @submit.prevent="saveDocument">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseSelect
            v-model="documentForm.documentType"
            label="Jenis Dokumen"
            :options="documentTypeOptions"
            placeholder="Pilih jenis dokumen"
            required
          />
          <BaseSelect
            v-model="documentForm.status"
            label="Status Dokumen"
            :options="documentStatusOptions"
          />
          <BaseInput
            v-model="documentForm.documentName"
            label="Nama Dokumen"
            placeholder="Contoh: Kartu Keluarga"
            required
          />
          <BaseInput
            v-model="documentForm.documentNumber"
            label="Nomor Dokumen"
            placeholder="Opsional"
          />
          <div class="sm:col-span-2">
            <BaseInput
              v-model="documentForm.fileUrl"
              label="URL / Tautan Dokumen"
              placeholder="https://drive.google.com/..."
              hint="Gunakan tautan Google Drive atau penyimpanan madrasah yang sudah dibagikan dengan akses sesuai kebijakan."
            />
          </div>
          <div class="sm:col-span-2">
            <BaseTextarea
              v-model="documentForm.notes"
              label="Catatan"
              placeholder="Keterangan tambahan..."
              :rows="3"
            />
          </div>
        </div>
        <BaseAlert v-if="formError" type="error">{{ formError }}</BaseAlert>
      </form>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <BaseButton variant="outline" size="sm" class="w-full sm:w-auto" @click="showDocumentModal = false">Batal</BaseButton>
          <BaseButton size="sm" class="w-full sm:w-auto" :loading="isSavingDocument" loading-text="Menyimpan..." @click="saveDocument">
            <Save class="h-4 w-4" />
            Simpan
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseConfirmDialog
      v-model="deleteConfirm.isOpen.value"
      title="Hapus Dokumen"
      :message="`Hapus dokumen '${deleteTargetName}'? Data dokumen akan dihapus dari daftar arsip siswa.`"
      type="danger"
      confirm-text="Ya, Hapus"
      :loading="deleteConfirm.isLoading.value"
      @confirm="deleteDocument"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { CheckCircle2, CircleAlert, CircleX, ExternalLink, FileText, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next'
import { studentsService } from '@/services'
import { useConfirm } from '@/composables'
import { formatDateTime } from '@/utils'
import type { StudentDocument, StudentVerification } from '@/types'
import {
  BaseAlert,
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmpty,
  BaseInput,
  BaseModal,
  BaseRetry,
  BaseSelect,
  BaseSkeleton,
  BaseTextarea,
} from '@/components/ui'

const props = defineProps<{
  studentId: string
  canVerify: boolean
  canManageDocuments: boolean
}>()

const verifications = ref<StudentVerification[]>([])
const documents = ref<StudentDocument[]>([])
const isLoadingVerification = ref(true)
const isLoadingDocuments = ref(true)
const verificationError = ref('')
const documentError = ref('')
const savingSection = ref('')
const isSavingDocument = ref(false)
const formError = ref('')

const showDocumentModal = ref(false)
const editingDocumentId = ref('')
const deleteTargetName = ref('')
const deleteTargetId = ref('')
const deleteConfirm = useConfirm()

const documentForm = reactive<{
  documentType: string
  documentName: string
  documentNumber: string
  fileUrl: string
  status: StudentDocument['status']
  notes: string
}>({
  documentType: '',
  documentName: '',
  documentNumber: '',
  fileUrl: '',
  status: 'available',
  notes: '',
})

const verificationOptions = [
  { value: 'verified' as const, label: 'Terverifikasi', icon: CheckCircle2, activeClass: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'needs_revision' as const, label: 'Perlu diperbaiki', icon: CircleAlert, activeClass: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'unverified' as const, label: 'Belum diverifikasi', icon: CircleX, activeClass: 'border-slate-300 bg-slate-100 text-slate-700' },
]

const documentTypeOptions = [
  { value: 'Kartu Keluarga', label: 'Kartu Keluarga (KK)' },
  { value: 'Akta Kelahiran', label: 'Akta Kelahiran' },
  { value: 'KIA', label: 'Kartu Identitas Anak (KIA)' },
  { value: 'KIP/KKS', label: 'KIP / KKS' },
  { value: 'Ijazah', label: 'Ijazah' },
  { value: 'SKL', label: 'Surat Keterangan Lulus (SKL)' },
  { value: 'Dokumen Pendukung', label: 'Dokumen Pendukung Lainnya' },
]

const documentStatusOptions = [
  { value: 'available', label: 'Tersedia' },
  { value: 'needs_update', label: 'Perlu diperbarui' },
]

async function loadVerification() {
  isLoadingVerification.value = true
  verificationError.value = ''
  try {
    verifications.value = await studentsService.getVerifications(props.studentId)
  } catch (e: unknown) {
    verificationError.value = e instanceof Error ? e.message : 'Gagal memuat status verifikasi.'
  } finally {
    isLoadingVerification.value = false
  }
}

async function loadDocuments() {
  isLoadingDocuments.value = true
  documentError.value = ''
  try {
    documents.value = await studentsService.getDocuments(props.studentId)
  } catch (e: unknown) {
    documentError.value = e instanceof Error ? e.message : 'Gagal memuat dokumen siswa.'
  } finally {
    isLoadingDocuments.value = false
  }
}

async function saveVerification(item: StudentVerification, status: StudentVerification['status']) {
  if (!props.canVerify || savingSection.value === item.section || item.status === status && !item.notes) return
  savingSection.value = item.section
  try {
    const updated = await studentsService.updateVerification(props.studentId, item.section, status, item.notes)
    const index = verifications.value.findIndex(v => v.section === item.section)
    if (index !== -1) verifications.value[index] = updated
  } catch (e: unknown) {
    verificationError.value = e instanceof Error ? e.message : 'Gagal menyimpan verifikasi.'
  } finally {
    savingSection.value = ''
  }
}

function resetDocumentForm() {
  Object.assign(documentForm, {
    documentType: '',
    documentName: '',
    documentNumber: '',
    fileUrl: '',
    status: 'available',
    notes: '',
  })
  formError.value = ''
  editingDocumentId.value = ''
}

function openCreateDocument() {
  resetDocumentForm()
  showDocumentModal.value = true
}

function openEditDocument(document: StudentDocument) {
  editingDocumentId.value = document.id
  Object.assign(documentForm, {
    documentType: document.documentType ?? '',
    documentName: document.documentName ?? '',
    documentNumber: document.documentNumber ?? '',
    fileUrl: document.fileUrl ?? '',
    status: document.status ?? 'available',
    notes: document.notes ?? '',
  })
  formError.value = ''
  showDocumentModal.value = true
}

async function saveDocument() {
  if (!props.canManageDocuments || isSavingDocument.value) return
  formError.value = ''

  if (!documentForm.documentType || !documentForm.documentName) {
    formError.value = 'Jenis dan nama dokumen wajib diisi.'
    return
  }

  isSavingDocument.value = true
  try {
    let saved: StudentDocument
    if (editingDocumentId.value) {
      saved = await studentsService.updateDocument(editingDocumentId.value, { ...documentForm })
      const index = documents.value.findIndex(d => d.id === saved.id)
      if (index !== -1) documents.value[index] = saved
    } else {
      saved = await studentsService.createDocument(props.studentId, { ...documentForm })
      documents.value = [saved, ...documents.value]
    }

    showDocumentModal.value = false
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan dokumen.'
  } finally {
    isSavingDocument.value = false
  }
}

function askDeleteDocument(document: StudentDocument) {
  deleteTargetId.value = document.id
  deleteTargetName.value = document.documentName
  deleteConfirm.isOpen.value = true
}

async function deleteDocument() {
  if (!deleteTargetId.value) return
  deleteConfirm.isLoading.value = true
  try {
    await studentsService.deleteDocument(deleteTargetId.value)
    documents.value = documents.value.filter(d => d.id !== deleteTargetId.value)
    deleteConfirm.isOpen.value = false
  } catch (e: unknown) {
    documentError.value = e instanceof Error ? e.message : 'Gagal menghapus dokumen.'
  } finally {
    deleteConfirm.isLoading.value = false
    deleteTargetId.value = ''
    deleteTargetName.value = ''
  }
}

onMounted(() => {
  void loadVerification()
  void loadDocuments()
})
</script>
