<template>
  <div class="space-y-5">

    <!-- ── Page Header ──────────────────────────────────────────── -->
    <PageHeader
      title="Detail Siswa"
      show-back
      :breadcrumbs="[
        { label: 'Data Siswa', to: '/students' },
        { label: isLoading ? 'Memuat…' : (student?.fullName ?? 'Tidak ditemukan') },
      ]"
    >
      <template v-if="student" #actions>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_UPDATE)"
          variant="outline"
          size="sm"
          class="hidden sm:inline-flex"
          @click="router.push(`/students/${student.id}/edit`)"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </BaseButton>

        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status === 'active'"
          variant="danger"
          size="sm"
          :disabled="isArchiving"
          @click="handleArchive"
        >
          <Archive class="h-4 w-4" />
          <span class="hidden sm:inline">Arsipkan</span>
        </BaseButton>

        <!-- Hanya untuk status inactive — graduated/transferred/dropped_out tidak di-restore -->
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status === 'inactive'"
          variant="success"
          size="sm"
          :loading="isRestoring"
          @click="handleRestore"
        >
          <RotateCcw class="h-4 w-4" />
          <span class="hidden sm:inline">Aktifkan</span>
        </BaseButton>
      </template>
    </PageHeader>

    <!-- ── Skeleton Loading ──────────────────────────────────────── -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="h-16 bg-slate-100" />
        <div class="flex flex-col items-center px-5 pb-5 -mt-8 gap-3">
          <BaseSkeleton height="h-16" width="w-16" :rounded="true" />
          <BaseSkeleton height="h-5" width="w-36" />
          <BaseSkeleton height="h-4" width="w-20" />
        </div>
        <div class="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-5/6" />
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-4/6" />
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-3/4" />
        </div>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="flex gap-2 border-b border-slate-200 pb-px">
          <BaseSkeleton v-for="i in 5" :key="i" height="h-9" :width="tabSkeletonWidths[i - 1]" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <BaseSkeleton height="h-4" width="w-32" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <BaseSkeleton v-for="i in 8" :key="i" height="h-4" :width="i % 2 === 0 ? 'w-4/5' : 'w-full'" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Error State ───────────────────────────────────────────── -->
    <BaseAlert v-else-if="error" type="error" class="mt-2">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <span>{{ error }}</span>
        <BaseButton size="sm" variant="outline" @click="retryLoad">Coba Lagi</BaseButton>
      </div>
    </BaseAlert>

    <!-- ── Content ──────────────────────────────────────────────── -->
    <template v-else-if="student">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- ── Kartu Profil Kiri ──────────────────────────────── -->
        <BaseCard :padding="false" class="overflow-hidden">
          <div class="h-16 bg-gradient-to-r from-primary-500 to-primary-700 shrink-0" />

          <div class="flex flex-col items-center text-center px-5 pb-5 -mt-8 gap-2">
            <BaseAvatar
              :name="student.fullName"
              :src="student.photoUrl ?? undefined"
              size="xl"
              color="blue"
              class="ring-4 ring-white shadow-sm"
            />
            <div class="mt-1">
              <h2 class="text-base font-bold text-slate-800 leading-tight">{{ student.fullName }}</h2>
              <p v-if="student.nickname" class="text-sm text-slate-400 mt-0.5">"{{ student.nickname }}"</p>
            </div>
            <StudentStatusBadge :status="student.status" dot />
            <p v-if="studentAge !== null" class="text-xs text-slate-400">{{ studentAge }} tahun</p>
          </div>

          <div class="px-5 pb-4 border-t border-slate-100 pt-4 space-y-2.5 text-sm">
            <InfoRow label="NIS"           :value="str(student.nis)" />
            <InfoRow label="NISN"          :value="str(student.nisn)" />
            <InfoRow label="Jenis Kelamin" :value="formatGender(student.gender)" />
            <InfoRow label="Kelas"         :value="str(student.currentEnrollment?.classroomName)" />
            <InfoRow label="Tahun Masuk"   :value="str(student.currentEnrollment?.schoolYearName)" />
            <InfoRow label="Tgl Masuk"     :value="formatDate(student.entryDate)" />
          </div>

          <div v-if="can(PERMISSIONS.STUDENT_UPDATE)" class="px-5 pb-5">
            <BaseButton
              variant="outline"
              size="sm"
              class="w-full"
              @click="router.push(`/students/${student.id}/edit`)"
            >
              <Pencil class="h-4 w-4" /> Edit Data Siswa
            </BaseButton>
          </div>
        </BaseCard>

        <!-- ── Panel Tab Kanan ───────────────────────────────── -->
        <div class="lg:col-span-2">
          <div class="flex border-b border-slate-200 overflow-x-auto scrollbar-thin pb-px mb-4">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ]"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="h-3.5 w-3.5 shrink-0" />
              {{ tab.label }}
            </button>
          </div>

          <Transition name="tab-fade" mode="out-in">
            <div :key="activeTab">

              <!-- ── Tab: Identitas ─────────────────────────── -->
              <div v-if="activeTab === 'identity'" class="space-y-4">
                <BaseCard title="Data Pribadi">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <InfoRow label="NIK"             :value="nikDisplay" />
                    <InfoRow label="Tempat Lahir"    :value="str(student.birthPlace)" />
                    <InfoRow label="Tanggal Lahir"   :value="formatDate(student.birthDate)" />
                    <InfoRow label="Agama"           :value="str(student.religion)" />
                    <InfoRow label="Kewarganegaraan" :value="str(student.nationality)" />
                    <InfoRow label="Status Keluarga" :value="familyStatusLabel" />
                    <InfoRow label="Anak Ke-"        :value="numStr(student.childOrder)" />
                    <InfoRow label="Jml Saudara"     :value="numStr(student.siblingsCount)" />
                  </div>
                </BaseCard>

                <BaseCard title="Alamat & Kontak">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <div class="sm:col-span-2">
                      <InfoRow label="Alamat" :value="str(student.address)" />
                    </div>
                    <InfoRow label="RT/RW"          :value="str(student.rtRw)" />
                    <InfoRow label="Desa/Kelurahan" :value="str(student.village)" />
                    <InfoRow label="Kecamatan"      :value="str(student.district)" />
                    <InfoRow label="Kab/Kota"       :value="str(student.city)" />
                    <InfoRow label="Provinsi"       :value="str(student.province)" />
                    <InfoRow label="Kode Pos"       :value="str(student.postalCode)" />
                    <InfoRow label="No. HP"         :value="str(student.phone)" />
                    <InfoRow label="Email"          :value="str(student.email)" />
                  </div>
                </BaseCard>

                <BaseCard v-if="student.notes" title="Catatan">
                  <p class="text-sm text-slate-600 mt-2 leading-relaxed">{{ student.notes }}</p>
                </BaseCard>
              </div>

              <!-- ── Tab: Orang Tua ──────────────────────────── -->
              <div v-else-if="activeTab === 'parents'" class="space-y-4">
                <!--
                  FIX: Tampilkan ParentCard untuk setiap relasi. getParent() mengembalikan
                  undefined jika relasi tidak ada, card akan menampilkan "Data tidak tersedia."
                  Ini perilaku yang benar — bukan bug.
                -->
                <ParentCard
                  v-for="rel in parentRelKeys"
                  :key="rel.key"
                  :parent="getParent(rel.key)"
                  :relationship="rel.key"
                  :label="rel.label"
                  :show-sensitive="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)"
                />
              </div>

              <!-- ── Tab: Kesehatan ──────────────────────────── -->
              <div v-else-if="activeTab === 'health'">
                <BaseCard title="Data Kesehatan">
                  <template v-if="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)">
                    <div
                      v-if="student.health"
                      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 mt-2 text-sm"
                    >
                      <InfoRow label="Gol. Darah"  :value="str(student.health.bloodType)" />
                      <InfoRow
                        label="Tinggi Badan"
                        :value="student.health.heightCm != null ? `${student.health.heightCm} cm` : null"
                      />
                      <InfoRow
                        label="Berat Badan"
                        :value="student.health.weightKg != null ? `${student.health.weightKg} kg` : null"
                      />
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Kebutuhan Khusus"  :value="str(student.health.specialNeeds)" />
                      </div>
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Catatan Kesehatan" :value="str(student.health.healthNotes)" />
                      </div>
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Alergi" :value="str(student.health.allergies)" />
                      </div>
                    </div>
                    <BaseEmpty
                      v-else
                      title="Data kesehatan belum diisi"
                      description="Data kesehatan siswa ini belum tersedia di sistem."
                      class="py-8"
                    />
                  </template>
                  <BaseAlert v-else type="info" class="mt-2">
                    Data kesehatan bersifat sensitif dan tidak dapat dilihat dengan role Anda.
                  </BaseAlert>
                </BaseCard>
              </div>

              <!-- ── Tab: Pendidikan Sebelumnya ──────────────── -->
              <div v-else-if="activeTab === 'education'">
                <BaseCard title="Riwayat Pendidikan Sebelumnya">
                  <div v-if="student.educationHistory && student.educationHistory.length > 0" class="mt-2 space-y-3">
                    <div
                      v-for="(ed, idx) in student.educationHistory"
                      :key="ed.id || idx"
                      class="flex gap-3 p-3 bg-slate-50 rounded-lg text-sm"
                    >
                      <div class="p-2 bg-blue-100 rounded-lg shrink-0 self-start">
                        <GraduationCap class="h-4 w-4 text-blue-600" />
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 flex-1 min-w-0">
                        <InfoRow label="Asal Sekolah" :value="str(ed.schoolName)" />
                        <InfoRow label="Jenjang"      :value="str(ed.level)" />
                        <InfoRow label="Tahun Lulus"  :value="numStr(ed.graduationYear)" />
                        <InfoRow label="No. Ijazah"   :value="str(ed.certificateNumber)" />
                      </div>
                    </div>
                  </div>
                  <BaseEmpty v-else title="Belum ada data riwayat pendidikan" class="py-8" />
                </BaseCard>
              </div>

              <!-- ── Tab: Riwayat Kelas ──────────────────────── -->
              <div v-else-if="activeTab === 'enrollment'">
                <BaseCard title="Riwayat Kelas">
                  <!-- Error + retry -->
                  <BaseAlert v-if="enrollmentError" type="error" class="mt-2 mb-3">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                      <span>{{ enrollmentError }}</span>
                      <BaseButton size="sm" variant="outline" @click="retryEnrollments">
                        Muat ulang
                      </BaseButton>
                    </div>
                  </BaseAlert>

                  <!-- Loading skeleton -->
                  <div v-if="isLoadingEnrollments" class="mt-2 space-y-2">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="flex gap-3 p-3 rounded-lg border border-slate-100"
                    >
                      <BaseSkeleton height="h-8" width="w-8" :rounded="false" />
                      <div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <BaseSkeleton v-for="j in 4" :key="j" height="h-4" />
                      </div>
                    </div>
                  </div>

                  <!-- Data -->
                  <div v-else-if="enrollments.length > 0" class="mt-2 space-y-2">
                    <div
                      v-for="enr in enrollments"
                      :key="enr.id"
                      class="flex items-start gap-3 p-3 rounded-lg border border-slate-100
                             hover:border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <div class="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                        <School class="h-4 w-4 text-slate-500" />
                      </div>
                      <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
                        <InfoRow label="Kelas"           :value="str(enr.classroomName)" />
                        <InfoRow label="Tahun Pelajaran" :value="str(enr.schoolYearName)" />
                        <InfoRow label="Tgl Masuk"       :value="formatDate(enr.entryDate)" />
                        <div>
                          <p class="text-xs text-slate-400 mb-0.5">Status</p>
                          <EnrollmentStatusBadge :status="enr.status" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Empty (hanya jika tidak loading dan tidak ada error) -->
                  <BaseEmpty
                    v-else-if="!isLoadingEnrollments && !enrollmentError"
                    title="Belum ada riwayat kelas"
                    description="Siswa ini belum pernah terdaftar di kelas manapun."
                    class="py-8"
                  />
                </BaseCard>
              </div>

            </div>
          </Transition>
        </div>
      </div>
    </template>

    <!-- ── Confirm Archive ───────────────────────────────────────── -->
    <BaseConfirmDialog
      v-model="showArchiveDialog"
      title="Arsipkan Siswa"
      :message="`Arsipkan '${student?.fullName}'? Siswa akan dinonaktifkan dan tidak muncul di daftar aktif.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="isArchiving"
      @confirm="confirmArchive"
    />

    <!-- ── Confirm Restore ───────────────────────────────────────── -->
    <BaseConfirmDialog
      v-model="showRestoreDialog"
      title="Aktifkan Kembali Siswa"
      :message="`Aktifkan kembali '${student?.fullName}' menjadi siswa aktif?`"
      type="info"
      confirm-text="Ya, Aktifkan"
      :loading="isRestoring"
      @confirm="confirmRestore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Pencil, Archive, GraduationCap, School,
  RotateCcw, User, Users, Heart, BookOpen, History,
} from 'lucide-vue-next'
import { PageHeader, StudentStatusBadge } from '@/components/shared'
import {
  BaseCard, BaseButton, BaseAlert, BaseAvatar,
  BaseSkeleton, BaseEmpty, BaseConfirmDialog,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { usePermission } from '@/composables'
import { studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate, formatGender, calculateAge } from '@/utils'
import { toast } from 'vue-sonner'
import type { Student, StudentParent, StudentEnrollment } from '@/types'

// ─────────────────────────────────────────────────────────────────
// Utility: konversi nilai dari GAS (bisa null/undefined/primitive)
// ke string aman untuk prop InfoRow.
// GAS sheetToObjects mengubah sel kosong menjadi null, bukan undefined
// atau string kosong. InfoRow menerima String|null, template `value||'—'`
// menampilkan '—' untuk null/undefined/''. Fungsi ini memastikan tipe
// konsisten sehingga tidak ada nilai non-string lolos ke prop String.
// ─────────────────────────────────────────────────────────────────
function str(val: string | null | undefined): string | null {
  if (val == null || val === '') return null
  return String(val)
}

/** Konversi number|null|undefined ke string agar InfoRow menerimanya dengan benar. */
function numStr(val: number | null | undefined): string | null {
  if (val == null) return null
  return String(val)
}

// ─────────────────────────────────────────────────────────────────
// InfoRow — helper label/nilai dengan fallback '—'
// Prop value bertipe String (konstruktor Vue) agar menerima null/undefined
// dan template `value || '—'` menampilkan fallback secara konsisten.
// ─────────────────────────────────────────────────────────────────
const InfoRow = {
  props: {
    label: { type: String, required: true },
    value: { type: String, default: null },
  },
  template: `
    <div class="min-w-0">
      <p class="text-xs text-slate-400 mb-0.5 truncate">{{ label }}</p>
      <p class="text-slate-700 font-medium break-words">{{ value || '—' }}</p>
    </div>
  `,
}

// ─────────────────────────────────────────────────────────────────
// EnrollmentStatusBadge
// ─────────────────────────────────────────────────────────────────
const enrollmentStatusMap: Record<string, { label: string; color: string }> = {
  active:      { label: 'Aktif',       color: 'bg-green-100 text-green-700'  },
  inactive:    { label: 'Tidak Aktif', color: 'bg-slate-100 text-slate-600'  },
  transferred: { label: 'Pindah',      color: 'bg-amber-100 text-amber-700'  },
  graduated:   { label: 'Lulus',       color: 'bg-blue-100 text-blue-700'    },
  dropped_out: { label: 'Keluar',      color: 'bg-red-100 text-red-700'      },
}

const EnrollmentStatusBadge = {
  props: { status: { type: String, default: null } },
  setup(props: { status: string | null }) {
    const entry      = computed(() => enrollmentStatusMap[props.status ?? ''])
    const label      = computed(() => entry.value?.label ?? props.status ?? '—')
    const colorClass = computed(() => entry.value?.color ?? 'bg-slate-100 text-slate-600')
    return { label, colorClass }
  },
  template: `
    <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass]">
      {{ label }}
    </span>
  `,
}

// ─────────────────────────────────────────────────────────────────
// ParentCard — kartu satu entri orang tua / wali.
//
// FIX: Terima prop `label` eksplisit (string judul kartu) daripada
// mengandalkan method `relationLabel` dalam template string Options API.
// Sebelumnya `formatDate` dipanggil sebagai method — ini bekerja di Options API
// tapi bisa fail jika GAS mengembalikan Date object (bukan string ISO).
// Sekarang semua konversi dilakukan lewat prop yang sudah diproses di parent.
// ─────────────────────────────────────────────────────────────────
const ParentCard = {
  props: {
    parent:        { type: Object,  default: null  },
    relationship:  { type: String,  required: true },
    // FIX: label kartu diterima sebagai prop eksplisit, tidak dihitung ulang di sini
    label:         { type: String,  required: true },
    showSensitive: { type: Boolean, default: false },
  },
  components: { BaseCard, InfoRow },
  methods: {
    /**
     * FIX: Format tanggal orang tua. GAS sheetToObjects bisa mengembalikan
     * Date object (saat data tidak di-cache) atau string ISO (saat dari cache).
     * Konversi eksplisit ke string sebelum format agar `parseISO` bekerja benar.
     */
    fmtDate(val: unknown): string {
      if (val == null) return '—'
      // Date object dari GAS (getValues() mengembalikan Date untuk cell tanggal)
      if (val instanceof Date) {
        const y = val.getFullYear()
        const m = String(val.getMonth() + 1).padStart(2, '0')
        const d = String(val.getDate()).padStart(2, '0')
        return `${d}/${m}/${y}`
      }
      // String ISO atau format lain — delegasikan ke formatDate utility
      const s = String(val)
      if (!s || s === 'null') return '—'
      try {
        // Import formatDate tidak tersedia di Options API object, gunakan inline
        const date = new Date(s)
        if (isNaN(date.getTime())) return s
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d2 = String(date.getDate()).padStart(2, '0')
        return `${d2}/${m}/${y}`
      } catch {
        return s
      }
    },
    toStr(val: unknown): string | null {
      if (val == null || val === '') return null
      return String(val)
    },
    /**
     * isAlive dari GAS bisa: boolean true/false, string "TRUE"/"FALSE",
     * angka 1/0, atau null (sel kosong). Default: masih hidup jika tidak ada data.
     */
    normalizeIsAlive(val: unknown): boolean {
      if (val === false || val === 'FALSE' || val === 'false' || val === 0) return false
      return true
    },
  },
  template: `
    <BaseCard :title="label">
      <div v-if="parent" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
        <InfoRow label="Nama"        :value="toStr(parent.fullName)" />
        <InfoRow v-if="showSensitive" label="NIK" :value="toStr(parent.nik)" />
        <InfoRow label="Tgl Lahir"   :value="fmtDate(parent.birthDate)" />
        <InfoRow label="Pendidikan"  :value="toStr(parent.education)" />
        <InfoRow label="Pekerjaan"   :value="toStr(parent.occupation)" />
        <InfoRow label="Penghasilan" :value="toStr(parent.incomeRange)" />
        <InfoRow label="No. HP"      :value="toStr(parent.phone)" />
        <InfoRow
          label="Status"
          :value="normalizeIsAlive(parent.isAlive) ? 'Masih Hidup' : 'Almarhum/ah'"
        />
      </div>
      <p v-else class="text-sm text-slate-400 mt-2 italic">Data tidak tersedia.</p>
    </BaseCard>
  `,
}

// ─────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const { can } = usePermission()

/**
 * student = data siswa yang sedang ditampilkan.
 *
 * Menggunakan studentsStore.current (reactive computed) sebagai sumber utama,
 * karena fetchDetail() di store selalu menge-set current.value setelah response
 * diterima. Computed ini akan otomatis reaktif ketika store.current berubah.
 *
 * _studentData ref lokal tetap dipertahankan sebagai copy point untuk operasi
 * yang membutuhkan snapshot (confirmRestore) tapi student SELALU membaca dari store.
 */
const _studentData = ref<Student | null>(null)
const student = computed(() => studentsStore.current)

const isLoading            = ref(true)
const error                = ref('')
const enrollments          = ref<StudentEnrollment[]>([])
const enrollmentError      = ref('')
const isLoadingEnrollments = ref(false)

// Archive / restore
const showArchiveDialog = ref(false)
const isArchiving       = ref(false)
const showRestoreDialog = ref(false)
const isRestoring       = ref(false)

// Flag untuk mencegah request lama meng-overwrite data saat komponen sudah unmount
let _isMounted = false
let _loadedStudentId = ''

// ─────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'identity',   label: 'Identitas',     icon: User     },
  { key: 'parents',    label: 'Orang Tua',     icon: Users    },
  { key: 'health',     label: 'Kesehatan',     icon: Heart    },
  { key: 'education',  label: 'Pendidikan',    icon: BookOpen },
  { key: 'enrollment', label: 'Riwayat Kelas', icon: History  },
]
const activeTab = ref('identity')
const tabSkeletonWidths = ['w-20', 'w-24', 'w-24', 'w-24', 'w-28']

// Definisi parent relation sebagai data (bukan object yang di-iterate)
// agar label tidak perlu dihitung ulang di dalam template string komponen.
const parentRelKeys = [
  { key: 'father'   as const, label: 'Data Ayah' },
  { key: 'mother'   as const, label: 'Data Ibu'  },
  { key: 'guardian' as const, label: 'Data Wali' },
]

// ─────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────
const studentAge = computed((): number | null =>
  calculateAge(student.value?.birthDate)
)

const nikDisplay = computed((): string | null => {
  if (can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)) {
    return str(student.value?.nik)
  }
  // Backend sudah hapus field nik untuk teacher → null → InfoRow tampil '—'
  if (!student.value?.nik) return null
  return '••••••••••••••••'
})

const familyStatusLabel = computed((): string | null => {
  const map: Record<string, string> = {
    kandung:     'Anak Kandung',
    tiri:        'Anak Tiri',
    angkat:      'Anak Angkat',
    yatim:       'Yatim',
    piatu:       'Piatu',
    yatim_piatu: 'Yatim Piatu',
  }
  const val = student.value?.familyStatus
  if (!val) return null
  return map[val] ?? val
})

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function getParent(rel: 'father' | 'mother' | 'guardian'): StudentParent | undefined {
  // parents dari GAS adalah array dengan field `relationship`.
  // Gunakan optional chaining — jika parents undefined/null/[], return undefined.
  const parents = student.value?.parents
  if (!Array.isArray(parents)) return undefined
  return parents.find(p => p.relationship === rel)
}

// ─────────────────────────────────────────────────────────────────
// Data loading — FIX RACE CONDITION
// _loadedStudentId di-set sekali di onMounted dan tidak berubah.
// Semua async call menggunakan nilai ini, bukan computed route.params.id.
// Setelah response diterima, cek apakah _loadedStudentId masih sama
// dengan id di response — jika berbeda (navigasi sudah pindah), abaikan.
// ─────────────────────────────────────────────────────────────────

async function loadEnrollments(): Promise<void> {
  if (!_isMounted) return
  enrollmentError.value      = ''
  isLoadingEnrollments.value = true
  try {
    const data = await studentsService.getEnrollments(_loadedStudentId)
    // Guard: cek komponen masih mounted dan id masih sama
    if (!_isMounted) return
    enrollments.value = Array.isArray(data) ? data : []
  } catch (e: unknown) {
    if (!_isMounted) return
    enrollmentError.value = e instanceof Error ? e.message : 'Gagal memuat riwayat kelas.'
  } finally {
    if (_isMounted) isLoadingEnrollments.value = false
  }
}

async function retryEnrollments(): Promise<void> {
  await loadEnrollments()
}

async function retryLoad(): Promise<void> {
  if (!_isMounted) return
  isLoading.value   = true
  error.value       = ''
  enrollments.value = []
  studentsStore.clearCurrent()

  try {
    await studentsStore.fetchDetail(_loadedStudentId)
    if (!_isMounted) return
    _studentData.value = studentsStore.current
    await loadEnrollments()
  } catch (e: unknown) {
    if (!_isMounted) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    if (_isMounted) isLoading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Archive
// ─────────────────────────────────────────────────────────────────
function handleArchive(): void {
  if (isArchiving.value) return
  showArchiveDialog.value = true
}

async function confirmArchive(): Promise<void> {
  if (!student.value) return
  isArchiving.value = true
  try {
    await studentsService.archive(student.value.id)
    studentsStore.removeFromList(student.value.id)
    toast.success('Siswa berhasil diarsipkan.')
    isArchiving.value       = false
    showArchiveDialog.value = false
    router.push('/students')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
    isArchiving.value       = false
    showArchiveDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Restore
// ─────────────────────────────────────────────────────────────────
function handleRestore(): void {
  if (isRestoring.value) return
  showRestoreDialog.value = true
}

async function confirmRestore(): Promise<void> {
  if (!student.value) return
  const id = student.value.id
  isRestoring.value = true
  try {
    await studentsService.restore(id)
    try {
      // Refetch via store agar store.current juga diperbarui
      await studentsStore.fetchDetail(id)
      if (_isMounted) _studentData.value = studentsStore.current
    } catch {
      // Fallback optimistic jika refetch gagal
      if (_isMounted && _studentData.value) {
        const optimistic: Student = { ..._studentData.value, status: 'active' }
        _studentData.value = optimistic
        studentsStore.updateInList(optimistic)
      }
      toast.warning('Siswa diaktifkan, tapi gagal memuat data terbaru.')
    }
    toast.success('Siswa berhasil diaktifkan kembali.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan siswa.')
  } finally {
    isRestoring.value       = false
    showRestoreDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  _isMounted       = true
  _loadedStudentId = route.params.id as string

  // Reset semua state
  enrollments.value     = []
  error.value           = ''
  enrollmentError.value = ''
  isLoading.value       = true

  // clearCurrent agar skeleton tampil (bukan data siswa lain yang tersisa)
  studentsStore.clearCurrent()

  try {
    // fetchDetail set store.current → student computed otomatis reaktif
    await studentsStore.fetchDetail(_loadedStudentId)
    if (!_isMounted) return

    // Simpan snapshot untuk operasi restore
    _studentData.value = studentsStore.current

    await loadEnrollments()

  } catch (e: unknown) {
    if (!_isMounted) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    if (_isMounted) isLoading.value = false
  }
})

onUnmounted(() => {
  // Set flag agar tidak ada response yang masuk setelah komponen unmount
  // yang bisa menyebabkan "Set value on unmounted component" warning di Vue.
  _isMounted = false
})
</script>

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
