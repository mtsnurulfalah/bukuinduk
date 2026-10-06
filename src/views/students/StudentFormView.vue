<template>
  <div class="min-w-0 space-y-5 pb-8">
    <!-- ── Page Header ────────────────────────────────────────── -->
    <PageHeader
      :title="isEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru'"
      show-back
      :breadcrumbs="[
        { label: 'Data Siswa', to: '/students' },
        { label: isEdit ? 'Edit' : 'Tambah Baru' },
      ]"
    />

    <!--
      BUG-18 FIX: Tampilkan error jika gagal load dropdown data (classrooms/schoolYears).
      BUG-6  FIX: errorMsg di-reset tiap kali ganti step via clearMsg().
    -->
    <BaseAlert v-if="initError" type="warning" class="mb-1">
      {{ initError }}
      <button class="ml-2 underline text-xs hover:no-underline" @click="retryInit">
        Muat ulang
      </button>
    </BaseAlert>

    <BaseAlert
      v-if="errorMsg"
      type="error"
      dismissible
      @dismiss="errorMsg = ''"
    >
      {{ errorMsg }}
    </BaseAlert>

    <!--
      BUG-10 FIX: Loading skeleton saat edit mode fetch data siswa.
    -->
    <template v-if="isLoadingForm">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <BaseSkeleton height="h-5 w-40" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseSkeleton v-for="i in 8" :key="i" height="h-10" />
        </div>
      </div>
    </template>

    <template v-else>
      <!--
        ── Step Indicator ─────────────────────────────────────────
        UI 1/2/7 FIX: Redesign step indicator.
        - Progress bar di atas (visual progress jelas)
        - Label tersembunyi di mobile, hanya nomor yang tampil (hemat ruang)
        - "Step X dari Y" sebagai progress text
        BUG-11 FIX: Klik step hanya diizinkan untuk step yang sudah dikunjungi
        (maxVisitedStep) agar tidak bisa lompat ke step yang belum diisi.
      -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 sm:px-5 sm:py-4">
        <!-- Progress text -->
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 font-medium">
            Langkah {{ currentStep + 1 }} dari {{ steps.length }}
          </p>
          <p class="text-xs font-semibold text-primary-600">{{ steps[currentStep].label }}</p>
        </div>

        <!-- Progress bar -->
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            class="h-full bg-primary-500 rounded-full transition-all duration-300"
            :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
          />
        </div>

        <!-- Step dots -->
        <div class="flex items-center justify-between">
          <button
            v-for="(step, i) in steps"
            :key="step.key"
            type="button"
            :disabled="i > maxVisitedStep"
            :aria-current="currentStep === i ? 'step' : undefined"
            :aria-label="`Langkah ${i + 1}: ${step.label}`"
            :title="step.label"
            :class="[
              'flex flex-col items-center gap-1 transition-all focus:outline-none',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ]"
            @click="goToStep(i)"
          >
            <div
              :class="[
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ring-2',
                currentStep === i
                  ? 'bg-primary-600 text-white ring-primary-200'
                  : i < currentStep
                    ? 'bg-green-500 text-white ring-green-100'
                    : 'bg-slate-100 text-slate-400 ring-transparent',
              ]"
            >
              <CheckCircle v-if="i < currentStep" class="h-4 w-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <!-- Label hanya muncul di sm ke atas -->
            <span
              :class="[
                'hidden sm:block text-xs',
                currentStep === i ? 'text-primary-600 font-semibold' : 'text-slate-400',
              ]"
            >
              {{ step.label }}
            </span>
          </button>
        </div>
      </div>

      <!-- ── Form ───────────────────────────────────────────────── -->
      <form novalidate @submit.prevent="handleSubmit">

        <!-- ── Step 0: Identitas ──────────────────────────────── -->
        <BaseCard v-if="currentStep === 0" title="Identitas Siswa">
          <template #header>
            <span class="text-xs text-slate-400 font-normal">* wajib diisi</span>
          </template>
          <div class="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
              <div class="h-28 w-24 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="photoPreview" :src="photoPreview" alt="Pratinjau foto siswa" class="h-full w-full object-cover" />
                <ImagePlus v-else class="h-8 w-8 text-slate-300" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-700">Foto Profil Siswa</p>
                <p class="text-xs text-slate-500 mt-0.5">JPG/PNG, maksimal 2 MB. Foto akan digunakan pada detail siswa dan Buku Induk PDF.</p>
                <div class="flex flex-wrap items-center gap-2 mt-3">
                  <label class="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <ImagePlus class="h-4 w-4" />
                    Pilih Foto
                    <input type="file" class="sr-only" accept="image/jpeg,image/png" @change="handlePhotoChange" />
                  </label>
                  <BaseButton
                    v-if="photoPreview"
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="clearPhoto"
                  >
                    <Trash2 class="h-4 w-4 text-red-500" />
                    Hapus
                  </BaseButton>
                  <span v-if="photoError" class="text-xs text-red-600">{{ photoError }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <BaseInput
              v-model="form.fullName"
              label="Nama Lengkap"
              placeholder="Nama sesuai akta lahir"
              required
              :error-message="errors.fullName"
            />
            <BaseInput
              v-model="form.nickname"
              label="Nama Panggilan"
              placeholder="Opsional"
            />
            <BaseInput
              v-model="form.nis"
              label="NIS"
              placeholder="Nomor Induk Siswa"
              required
              :error-message="errors.nis"
              hint="3–20 karakter alfanumerik"
            />
            <BaseInput
              v-model="form.nisn"
              label="NISN"
              placeholder="10 digit angka"
              required
              :error-message="errors.nisn"
              hint="Nomor Induk Siswa Nasional"
            />
            <BaseInput
              v-model="form.nik"
              label="NIK"
              placeholder="16 digit angka (opsional)"
              :error-message="errors.nik"
            />
            <BaseSelect
              v-model="form.gender"
              label="Jenis Kelamin"
              :options="GENDER_OPTIONS"
              required
              :error-message="errors.gender"
              placeholder="Pilih jenis kelamin"
            />
            <BaseInput
              v-model="form.birthPlace"
              label="Tempat Lahir"
              placeholder="Kota/kabupaten"
              required
              :error-message="errors.birthPlace"
            />
            <BaseInput
              v-model="form.birthDate"
              label="Tanggal Lahir"
              type="date"
              required
              :error-message="errors.birthDate"
            />
            <BaseSelect
              v-model="form.religion"
              label="Agama"
              :options="RELIGION_OPTIONS"
              required
              :error-message="errors.religion"
              placeholder="Pilih agama"
            />
            <BaseSelect
              v-model="form.familyStatus"
              label="Status Keluarga"
              :options="FAMILY_STATUS_OPTIONS"
              placeholder="Pilih status (opsional)"
              clearable
            />
            <BaseInput
              v-model.number="form.childOrder"
              label="Anak Ke-"
              type="number"
              min="1"
              max="20"
              placeholder="1"
            />
            <BaseInput
              v-model.number="form.siblingsCount"
              label="Jumlah Saudara"
              type="number"
              min="0"
              max="20"
              placeholder="0"
            />
          </div>
        </BaseCard>

        <!-- ── Step 1: Alamat & Kontak ────────────────────────── -->
        <BaseCard v-else-if="currentStep === 1" title="Alamat & Kontak">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div class="sm:col-span-2">
              <BaseTextarea
                v-model="form.address"
                label="Alamat Lengkap"
                placeholder="Jalan, nomor rumah..."
                :rows="2"
              />
            </div>
            <BaseInput v-model="form.rtRw"     label="RT/RW"          placeholder="001/002" />
            <BaseInput v-model="form.village"   label="Desa/Kelurahan" placeholder="Nama desa/kelurahan" />
            <BaseInput v-model="form.district"  label="Kecamatan"      placeholder="Nama kecamatan" />
            <BaseInput v-model="form.city"      label="Kabupaten/Kota" placeholder="Nama kabupaten/kota" />
            <BaseSelect
              v-model="form.province"
              label="Provinsi"
              :options="PROVINCES_ID"
              placeholder="Pilih provinsi"
              clearable
            />
            <BaseInput
              v-model="form.postalCode"
              label="Kode Pos"
              placeholder="12345"
              :error-message="errors.postalCode"
            />
            <BaseInput
              v-model="form.phone"
              label="No. HP Siswa"
              type="tel"
              placeholder="08xx-xxxx-xxxx"
              :error-message="errors.phone"
            />
            <BaseInput
              v-model="form.email"
              label="Email Siswa"
              type="email"
              placeholder="email@contoh.com (opsional)"
              :error-message="errors.email"
            />
          </div>
        </BaseCard>

        <!-- ── Step 2: Pendidikan & Kelas ─────────────────────── -->
        <BaseCard v-else-if="currentStep === 2" title="Data Pendidikan & Kelas">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <BaseInput
              v-model="form.entryDate"
              label="Tanggal Masuk"
              type="date"
              required
              :error-message="errors.entryDate"
              hint="Tanggal pertama siswa terdaftar"
            />
            <BaseSelect
              v-model="form.schoolYearId"
              label="Tahun Pelajaran"
              :options="schoolYearStore.schoolYearOptions"
              placeholder="Pilih tahun pelajaran"
              clearable
              :hint="schoolYearStore.schoolYearOptions.length === 0 ? 'Belum ada data tahun pelajaran' : ''"
            />
            <BaseSelect
              v-model="form.classroomId"
              label="Kelas"
              :options="filteredClassroomOptions"
              placeholder="Pilih kelas (opsional)"
              clearable
              :disabled="!form.schoolYearId"
              :hint="!form.schoolYearId ? 'Pilih tahun pelajaran terlebih dahulu' : ''"
            />

            <!-- Separator riwayat pendidikan sebelumnya -->
            <div class="sm:col-span-2 border-t border-slate-100 pt-2 mt-1">
              <p class="text-sm font-medium text-slate-600 mb-0.5">Riwayat Pendidikan Sebelumnya</p>
              <p class="text-xs text-slate-400">Data sekolah asal siswa (opsional)</p>
            </div>

            <BaseInput
              v-model="form.educationHistory.schoolName"
              label="Asal Sekolah"
              placeholder="Nama sekolah sebelumnya"
            />
            <BaseSelect
              v-model="form.educationHistory.level"
              label="Jenjang Sekolah Asal"
              :options="PREVIOUS_SCHOOL_LEVEL_OPTIONS"
              placeholder="Pilih jenjang"
              clearable
            />
            <BaseInput
              v-model="form.educationHistory.certificateNumber"
              label="Nomor Ijazah"
              placeholder="Opsional"
            />
            <!--
              BUG-16 FIX: Tambahkan min/max pada tahun lulus.
            -->
            <BaseInput
              v-model.number="form.educationHistory.graduationYear"
              label="Tahun Lulus"
              type="number"
              min="1990"
              :max="currentYear"
              placeholder="2024"
            />
            <div class="sm:col-span-2">
              <BaseTextarea
                v-model="form.notes"
                label="Catatan Tambahan"
                placeholder="Catatan tambahan tentang siswa (opsional)"
                :rows="2"
              />
            </div>
          </div>
        </BaseCard>

        <!-- ── Step 3: Orang Tua ──────────────────────────────── -->
        <!--
          BUG-1 FIX: Iterasi parentRelations (array) bukan parentFields (object).
          Sebelumnya: v-for="(parentKey, parentLabel) in parentFields" — Vue object
          iteration memberikan (value, key), sehingga parentKey berisi label string
          ('Data Ayah') dan parentLabel berisi key ('father') — terbalik.
          Akibatnya form[parentKey] mengakses form['Data Ayah'] yang undefined.
          Fix: Gunakan array of objects dengan key/label yang eksplisit.
        -->
        <div v-else-if="currentStep === 3" class="space-y-4">
          <BaseCard
            v-for="rel in parentRelations"
            :key="rel.key"
            :title="rel.label"
          >
            <template #header>
              <span class="text-xs text-slate-400">Semua field opsional</span>
            </template>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <BaseInput
                v-model="form[rel.key].fullName"
                label="Nama Lengkap"
                :placeholder="`Nama ${rel.label}`"
              />
              <BaseInput
                v-model="form[rel.key].nik"
                label="NIK"
                placeholder="16 digit (opsional)"
              />
              <BaseInput
                v-model="form[rel.key].birthDate"
                label="Tanggal Lahir"
                type="date"
              />
              <BaseSelect
                v-model="form[rel.key].education"
                label="Pendidikan Terakhir"
                :options="EDUCATION_LEVEL_OPTIONS"
                placeholder="Pilih pendidikan"
                clearable
              />
              <BaseInput
                v-model="form[rel.key].occupation"
                label="Pekerjaan"
                placeholder="Pekerjaan"
              />
              <BaseSelect
                v-model="form[rel.key].incomeRange"
                label="Penghasilan / Bulan"
                :options="INCOME_RANGE_OPTIONS"
                placeholder="Pilih kisaran penghasilan"
                clearable
              />
              <BaseInput
                v-model="form[rel.key].phone"
                label="No. HP"
                type="tel"
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
          </BaseCard>
        </div>

        <!-- ── Step 4: Kesehatan ──────────────────────────────── -->
        <BaseCard v-else-if="currentStep === 4" title="Data Kesehatan">
          <template #header>
            <span class="text-xs text-slate-400">Semua field opsional</span>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <BaseSelect
              v-model="form.health.bloodType"
              label="Golongan Darah"
              :options="BLOOD_TYPE_OPTIONS"
              placeholder="Pilih golongan darah"
              clearable
            />
            <!--
              BUG-17 FIX: Tambahkan max pada tinggi dan berat badan.
            -->
            <BaseInput
              v-model.number="form.health.heightCm"
              label="Tinggi Badan (cm)"
              type="number"
              min="50"
              max="250"
              placeholder="150"
            />
            <BaseInput
              v-model.number="form.health.weightKg"
              label="Berat Badan (kg)"
              type="number"
              min="5"
              max="200"
              placeholder="45"
            />
            <div class="sm:col-span-3">
              <BaseTextarea
                v-model="form.health.specialNeeds"
                label="Kebutuhan Khusus"
                placeholder="Isi jika ada kebutuhan khusus, kosongkan jika tidak ada"
                :rows="2"
              />
            </div>
            <div class="sm:col-span-3">
              <BaseTextarea
                v-model="form.health.healthNotes"
                label="Catatan Kesehatan"
                placeholder="Riwayat penyakit, kondisi kesehatan, dll"
                :rows="2"
              />
            </div>
            <div class="sm:col-span-3">
              <BaseTextarea
                v-model="form.health.allergies"
                label="Alergi"
                placeholder="Alergi makanan, obat, dll (opsional)"
                :rows="2"
              />
            </div>
          </div>
        </BaseCard>

        <!--
          ── Navigation Buttons ──────────────────────────────────
          R 3 FIX: Di mobile, tombol diatur agar tidak bertabrakan.
          Kiri: Sebelumnya | Kanan: Batal + Berikutnya/Simpan
          BUG-19 FIX: clearMsg() dipanggil di setiap navigasi step.
        -->
        <div class="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <!-- Kiri: Sebelumnya -->
          <BaseButton
            v-if="currentStep > 0"
            class="w-full sm:w-auto"
            variant="outline"
            type="button"
            @click="prevStep"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Sebelumnya</span>
          </BaseButton>
          <div v-else class="hidden sm:block" />

          <!-- Kanan: Batal + Berikutnya/Simpan -->
          <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <BaseButton
              class="w-full sm:w-auto"
              variant="ghost"
              type="button"
              size="sm"
              @click="router.back()"
            >
              Batal
            </BaseButton>

            <BaseButton
              v-if="currentStep < steps.length - 1"
              class="w-full sm:w-auto"
              type="button"
              @click="nextStep"
            >
              Berikutnya
              <ChevronRight class="h-4 w-4" />
            </BaseButton>

            <BaseButton
              v-else
              class="col-span-1 w-full sm:w-auto"
              type="submit"
              :loading="isSaving"
              loading-text="Menyimpan..."
            >
              <Save class="h-4 w-4" />
              {{ isEdit ? 'Simpan Perubahan' : 'Simpan Siswa' }}
            </BaseButton>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle, ChevronRight, ChevronLeft, Save, ImagePlus, Trash2 } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseInput, BaseSelect, BaseTextarea,
  BaseButton, BaseAlert, BaseSkeleton,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { useClassroomsStore } from '@/stores/classrooms'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { studentsService } from '@/services'
import {
  GENDER_OPTIONS, RELIGION_OPTIONS, FAMILY_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS, INCOME_RANGE_OPTIONS, BLOOD_TYPE_OPTIONS,
  PREVIOUS_SCHOOL_LEVEL_OPTIONS, PROVINCES_ID,
} from '@/constants'
import { studentSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'
import type { StudentFormData } from '@/types'

// ─────────────────────────────────────────────────────────────────
// Router / stores
// ─────────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const studentsStore     = useStudentsStore()
const classroomsStore   = useClassroomsStore()
const schoolYearStore   = useSchoolYearStore()

// ─────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────
// Mode form harus mengikuti route secara eksplisit.
// Kehadiran parameter :id saja tidak cukup untuk menentukan create/edit.
const isEdit       = computed(() => route.name === 'students.edit')
const isSaving     = ref(false)
const isLoadingForm = ref(false)   // BUG-10 FIX: loading saat edit mode fetch
const errorMsg     = ref('')
const initError    = ref('')       // BUG-18 FIX: error load dropdown data
const currentStep  = ref(0)
const maxVisitedStep = ref(0)      // BUG-11 FIX: batasi navigasi step indicator

const photoPreview = ref('')
const photoUploadData = ref('')
const photoMimeType = ref<'image/jpeg' | 'image/png'>('image/jpeg')
const photoError = ref('')
const photoDeleteRequested = ref(false)
const photoProcessVersion = ref(0)
let formLoadVersion = 0

// Snapshot identifier saat data edit pertama kali dimuat.
// Digunakan agar NIS/NISN yang tidak berubah tidak dikirim ulang sebagai
// identifier "baru", sehingga tetap kompatibel dengan backend GAS versi lama.
const originalEditIdentifiers = reactive({
  nis: '',
  nisn: '',
})

// BUG-3 FIX: errors menggunakan Record<string,string> — path Yup yang nested
// seperti 'educationHistory.schoolName' disimpan dengan key yang sama.
const errors = reactive<Record<string, string>>({})

// Tahun sekarang untuk batas max input tahun lulus (BUG-16 FIX)
const currentYear = new Date().getFullYear()

function compressImage(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' }> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      reject(new Error('Foto harus berformat JPG atau PNG.'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Ukuran foto maksimal 2 MB.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('File foto tidak valid.'))
      img.onload = () => {
        const maxW = 600
        const maxH = 800
        const scale = Math.min(1, maxW / img.width, maxH / img.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Browser tidak mendukung pemrosesan foto.'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve({ base64: dataUrl.split(',')[1] ?? '', mimeType: 'image/jpeg' })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

async function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const currentVersion = photoProcessVersion.value + 1
  photoProcessVersion.value = currentVersion
  photoError.value = ''

  try {
    const result = await compressImage(file)
    if (currentVersion !== photoProcessVersion.value) return

    photoUploadData.value = result.base64
    photoMimeType.value = result.mimeType
    photoPreview.value = 'data:' + result.mimeType + ';base64,' + result.base64
  } catch (e: unknown) {
    if (currentVersion !== photoProcessVersion.value) return
    photoUploadData.value = ''
    photoError.value = e instanceof Error ? e.message : 'Gagal memproses foto.'
  } finally {
    input.value = ''
  }
}

function clearPhoto() {
  photoProcessVersion.value++
  photoUploadData.value = ''
  photoError.value = ''
  photoDeleteRequested.value = Boolean(isEdit.value && form.photoUrl)
  photoPreview.value = ''
}

// ─────────────────────────────────────────────────────────────────
// Steps definition
// ─────────────────────────────────────────────────────────────────
const steps = [
  { key: 'identity',   label: 'Identitas'   },
  { key: 'address',    label: 'Alamat'      },
  { key: 'education',  label: 'Pendidikan'  },
  { key: 'parents',    label: 'Orang Tua'   },
  { key: 'health',     label: 'Kesehatan'   },
]

/**
 * BUG-1 FIX: Gunakan array eksplisit (bukan object yang di-iterate)
 * sehingga key dan label selalu pasti dan tidak bergantung pada
 * urutan iterasi Vue object destructuring (value, key).
 *
 * Sebelumnya: `parentFields: Record<string,string> = { father: 'Data Ayah', ... }`
 * dan template: `v-for="(parentKey, parentLabel) in parentFields"` — Vue object
 * iteration adalah (value, key), bukan (key, value), sehingga parentKey = 'Data Ayah'
 * (value/label) dan parentLabel = 'father' (key). Akibatnya form['Data Ayah'] adalah
 * undefined → runtime error saat v-model binding.
 */
const parentRelations = [
  { key: 'father',   label: 'Data Ayah' },
  { key: 'mother',   label: 'Data Ibu'  },
  { key: 'guardian', label: 'Data Wali' },
] as const

// ─────────────────────────────────────────────────────────────────
// Form data
// ─────────────────────────────────────────────────────────────────
const form = reactive({
  // Identitas
  fullName: '', nickname: '', nis: '', nisn: '', nik: '',
  gender: '', birthPlace: '', birthDate: '', religion: '',
  nationality: 'Indonesia',
  familyStatus: '', childOrder: undefined as number | undefined,
  siblingsCount: undefined as number | undefined,
  photoUrl: '',

  // Alamat & kontak
  address: '', rtRw: '', village: '', district: '', city: '',
  province: '', postalCode: '', phone: '', email: '',

  // Pendidikan
  entryDate: '', schoolYearId: '', classroomId: '', notes: '',
  educationHistory: {
    id: '', schoolName: '', level: '', certificateNumber: '',
    graduationYear: undefined as number | undefined,
  },

  // Orang tua (BUG-12 FIX: typed explicitly, tidak Record<string,any>)
  father:   { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },
  mother:   { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },
  guardian: { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },

  // Kesehatan
  health: {
    bloodType: '', heightCm: undefined as number | undefined,
    weightKg: undefined as number | undefined,
    specialNeeds: '', healthNotes: '', allergies: '',
  },
})

// ─────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────

/**
 * Dropdown kelas difilter berdasarkan schoolYearId yang dipilih.
 * Jika belum pilih tahun pelajaran, options kosong (disabled state di select).
 */
const filteredClassroomOptions = computed(() =>
  classroomsStore.getOptionsForYear(form.schoolYearId)
)

// ─────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────

/**
 * BUG-9 FIX: Sederhanakan guard watch. Cukup `if (newYearId === oldYearId) return`.
 * Tidak perlu `!oldYearId` karena:
 * - Saat initial set (oldYearId undefined → newYearId terisi), kita INGIN reset
 *   classroomId jika classroomId yang ada tidak cocok dengan tahun baru.
 * - Guard `!oldYearId` sebelumnya justru membuat reset ter-skip di saat itu.
 */
watch(() => form.schoolYearId, (newYearId, oldYearId) => {
  if (newYearId === oldYearId) return
  const newOptions = classroomsStore.getOptionsForYear(newYearId)
  const stillValid = newOptions.some(o => o.value === form.classroomId)
  if (!stillValid) form.classroomId = ''
})

// ─────────────────────────────────────────────────────────────────
// Helper: mapping error path Yup ke step index
// BUG-5 FIX: Tentukan step mana yang pertama kali mengandung error
// ─────────────────────────────────────────────────────────────────
const fieldToStep: Record<string, number> = {
  fullName: 0, nickname: 0, nis: 0, nisn: 0, nik: 0,
  gender: 0, birthPlace: 0, birthDate: 0, religion: 0,
  familyStatus: 0, childOrder: 0, siblingsCount: 0,
  // step 1
  address: 1, rtRw: 1, village: 1, district: 1, city: 1,
  province: 1, postalCode: 1, phone: 1, email: 1,
  // step 2
  entryDate: 2, schoolYearId: 2, classroomId: 2, notes: 2,
  'educationHistory.schoolName': 2, 'educationHistory.level': 2,
  'educationHistory.certificateNumber': 2, 'educationHistory.graduationYear': 2,
  // step 3
  'father.fullName': 3, 'father.nik': 3, 'father.birthDate': 3, 'father.phone': 3,
  'mother.fullName': 3, 'mother.nik': 3, 'mother.birthDate': 3, 'mother.phone': 3,
  'guardian.fullName': 3, 'guardian.nik': 3, 'guardian.birthDate': 3, 'guardian.phone': 3,
  // step 4
  'health.bloodType': 4, 'health.heightCm': 4, 'health.weightKg': 4,
  'health.specialNeeds': 4, 'health.healthNotes': 4, 'health.allergies': 4,
}

function firstStepWithError(errorPaths: string[]): number {
  let minStep = currentStep.value
  for (const path of errorPaths) {
    const s = fieldToStep[path] ?? 0
    if (s < minStep) minStep = s
  }
  return minStep
}

// ─────────────────────────────────────────────────────────────────
// Navigation helpers
// ─────────────────────────────────────────────────────────────────

/**
 * BUG-6/19 FIX: Reset errorMsg dan errors saat user navigasi antar step.
 */
function clearMsg() {
  errorMsg.value = ''
  Object.keys(errors).forEach(key => delete errors[key])
}

/**
 * BUG-11 FIX: Navigasi via step indicator hanya diizinkan ke step
 * yang sudah dikunjungi (≤ maxVisitedStep).
 */
function goToStep(i: number) {
  if (i > maxVisitedStep.value) return
  clearMsg()
  currentStep.value = i
}

function prevStep() {
  if (currentStep.value > 0) {
    clearMsg()
    currentStep.value--
  }
}

/**
 * BUG-4 FIX: Validasi field wajib step saat ini sebelum lanjut.
 * Hanya field required di step 0 (Identitas) yang dicek karena
 * langkah 1-4 tidak memiliki field required dari schema Yup.
 * BUG-6 FIX: errorMsg di-clear saat berhasil lanjut.
 */
async function nextStep() {
  const fieldsByStep: Record<number, string[]> = {
    0: ['fullName', 'nis', 'nisn', 'gender', 'birthPlace', 'birthDate', 'religion'],
    2: ['entryDate'],
  }
  const fields = fieldsByStep[currentStep.value] ?? []

  if (fields.length) {
    let hasError = false

    for (const path of fields) {
      try {
        await studentSchema.validateAt(path, form)
        delete errors[path]
      } catch (err: unknown) {
        hasError = true
        const message = err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Field ini perlu diperbaiki.'
        errors[path] = message
      }
    }

    if (hasError) {
      errorMsg.value = 'Lengkapi field wajib pada langkah ini terlebih dahulu.'
      return
    }
  }

  clearMsg()
  currentStep.value++
  maxVisitedStep.value = Math.max(maxVisitedStep.value, currentStep.value)
}

// ─────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (isSaving.value) return

  isSaving.value = true
  // BUG-6 FIX: Reset error state di awal setiap submit.
  Object.keys(errors).forEach(k => delete errors[k])
  errorMsg.value = ''

  try {
    try {
      await studentSchema.validate(form, { abortEarly: false })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'inner' in err) {
        const inner = (err as { inner: { path: string; message: string }[] }).inner

        // BUG-3 FIX: Map semua path Yup (termasuk nested) langsung ke errors object.
        inner.forEach(e => { errors[e.path] = e.message })

        const errorPaths = inner.map(e => e.path)
        currentStep.value = firstStepWithError(errorPaths)
        errorMsg.value = `Terdapat ${inner.length} field yang perlu diperbaiki.`
      }
      return
    }

    try {
      let savedStudent

      if (isEdit.value) {
        const editPayload = { ...form } as unknown as Partial<StudentFormData>

        // NIS/NISN yang tetap sama adalah milik record yang sedang diedit.
        // Jangan kirim ulang ke backend sebagai kandidat identifier baru.
        if (String(editPayload.nis ?? '').trim() === originalEditIdentifiers.nis) {
          delete editPayload.nis
        }
        if (String(editPayload.nisn ?? '').trim() === originalEditIdentifiers.nisn) {
          delete editPayload.nisn
        }

        const editId = String(route.params.id ?? '').trim()
        if (!editId) throw new Error('ID siswa tidak valid untuk proses edit.')

        savedStudent = await studentsService.update(editId, editPayload)
      } else {
      savedStudent = await studentsService.create(form as unknown as StudentFormData)
    }

    if (photoUploadData.value && savedStudent?.id) {
      try {
        savedStudent = await studentsService.uploadPhoto(
          savedStudent.id,
          photoUploadData.value,
          photoMimeType.value,
        )
      } catch (photoErr: unknown) {
        toast.warning(
          photoErr instanceof Error
            ? `Data siswa tersimpan, tetapi foto gagal diunggah: ${photoErr.message}`
            : 'Data siswa tersimpan, tetapi foto gagal diunggah.',
        )
      }
    } else if (photoDeleteRequested.value && savedStudent?.id) {
      try {
        savedStudent = await studentsService.deletePhoto(savedStudent.id)
      } catch (photoErr: unknown) {
        toast.warning(
          photoErr instanceof Error
            ? `Data siswa tersimpan, tetapi foto lama gagal dihapus: ${photoErr.message}`
            : 'Data siswa tersimpan, tetapi foto lama gagal dihapus.',
        )
      }
    }

      photoDeleteRequested.value = false
      studentsStore.updateInList(savedStudent)
      toast.success(isEdit.value ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.')
      void router.push('/students')
    } catch (e: unknown) {
      errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan data.'
    }
  } finally {
    isSaving.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Init: load dropdown data
// BUG-18 FIX: Tangkap dan tampilkan error jika fetch dropdown gagal.
// ─────────────────────────────────────────────────────────────────
async function loadDropdownData(): Promise<void> {
  initError.value = ''
  try {
    await Promise.all([
      classroomsStore.fetch(),
      schoolYearStore.fetch(),
    ])

    if (!classroomsStore.initialized || !schoolYearStore.initialized) {
      throw new Error('Dropdown belum berhasil dimuat.')
    }
  } catch {
    initError.value = 'Gagal memuat data dropdown. Pilihan tahun pelajaran/kelas mungkin kosong.'
  }
}

async function retryInit() {
  await loadDropdownData()
  // Setelah retry, set default schoolYear jika create mode
  if (!isEdit.value && !form.schoolYearId) {
    form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
  }
}

function resetFormState(): void {
  Object.assign(form, {
    fullName: '',
    nickname: '',
    nis: '',
    nisn: '',
    nik: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    religion: '',
    nationality: 'Indonesia',
    familyStatus: '',
    childOrder: undefined,
    siblingsCount: undefined,
    photoUrl: '',
    address: '',
    rtRw: '',
    village: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    entryDate: '',
    schoolYearId: '',
    classroomId: '',
    notes: '',
  })
  Object.assign(form.educationHistory, {
    id: '',
    schoolName: '',
    level: '',
    certificateNumber: '',
    graduationYear: undefined,
  })
  Object.assign(form.father, {
    fullName: '', nik: '', birthDate: '', education: '',
    occupation: '', incomeRange: '', phone: '',
  })
  Object.assign(form.mother, {
    fullName: '', nik: '', birthDate: '', education: '',
    occupation: '', incomeRange: '', phone: '',
  })
  Object.assign(form.guardian, {
    fullName: '', nik: '', birthDate: '', education: '',
    occupation: '', incomeRange: '', phone: '',
  })
  Object.assign(form.health, {
    bloodType: '',
    heightCm: undefined,
    weightKg: undefined,
    specialNeeds: '',
    healthNotes: '',
    allergies: '',
  })

  Object.keys(errors).forEach(key => delete errors[key])
  originalEditIdentifiers.nis = ''
  originalEditIdentifiers.nisn = ''
  photoPreview.value = ''
  photoUploadData.value = ''
  photoMimeType.value = 'image/jpeg'
  photoError.value = ''
  photoDeleteRequested.value = false
  currentStep.value = 0
  maxVisitedStep.value = 0
}

async function loadEditStudent(rawId: unknown): Promise<void> {
  const id = String(rawId ?? '').trim()
  const requestVersion = ++formLoadVersion

  if (!id || id === 'undefined' || id === 'null') {
    errorMsg.value = 'ID siswa tidak valid.'
    isLoadingForm.value = false
    return
  }

  isLoadingForm.value = true
  errorMsg.value = ''
  resetFormState()
  studentsStore.clearCurrent()

  try {
    const student = await studentsStore.fetchDetail(id)

    if (
      requestVersion !== formLoadVersion ||
      String(route.params.id ?? '') !== id
    ) {
      return
    }

    if (!student) {
      throw new Error('Siswa tidak ditemukan.')
    }

    Object.assign(form, {
      fullName:      student.fullName,
      nickname:      student.nickname      ?? '',
      nis:           student.nis,
      nisn:          student.nisn,
      nik:           student.nik           ?? '',
      gender:        student.gender,
      birthPlace:    student.birthPlace    ?? '',
      birthDate:     student.birthDate     ?? '',
      religion:      student.religion      ?? '',
      nationality:   student.nationality   ?? 'Indonesia',
      familyStatus:  student.familyStatus  ?? '',
      childOrder:    student.childOrder,
      siblingsCount: student.siblingsCount,
      address:       student.address       ?? '',
      rtRw:          student.rtRw           ?? '',
      village:       student.village       ?? '',
      district:      student.district      ?? '',
      city:          student.city          ?? '',
      province:      student.province      ?? '',
      postalCode:    student.postalCode    ?? '',
      phone:         student.phone         ?? '',
      email:         student.email         ?? '',
      entryDate:     student.entryDate     ?? '',
      notes:         student.notes         ?? '',
      photoUrl:      student.photoUrl      ?? '',
      classroomId:   student.currentEnrollment?.classroomId   ?? '',
      schoolYearId:  student.currentEnrollment?.schoolYearId  ?? '',
    })

    originalEditIdentifiers.nis = String(student.nis ?? '').trim()
    originalEditIdentifiers.nisn = String(student.nisn ?? '').trim()

    photoPreview.value = student.photoUrl ?? ''
    photoDeleteRequested.value = false

    if (student.parents) {
      for (const p of student.parents) {
        if (p.relationship === 'father') Object.assign(form.father, p)
        if (p.relationship === 'mother') Object.assign(form.mother, p)
        if (p.relationship === 'guardian') Object.assign(form.guardian, p)
      }
    }
    if (student.health) {
      Object.assign(form.health, student.health)
    }
    if (student.educationHistory?.[0]) {
      Object.assign(form.educationHistory, student.educationHistory[0])
    }

    maxVisitedStep.value = steps.length - 1
  } catch (e: unknown) {
    if (
      requestVersion !== formLoadVersion ||
      String(route.params.id ?? '') !== id
    ) {
      return
    }
    errorMsg.value = e instanceof Error
      ? e.message
      : 'Gagal memuat data siswa. Silakan coba lagi.'
  } finally {
    if (requestVersion === formLoadVersion) {
      isLoadingForm.value = false
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle
// BUG-7  FIX: Tambahkan try/catch di seluruh blok onMounted isEdit.
// BUG-10 FIX: isLoadingForm untuk loading state saat fetch edit data.
// ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadDropdownData()

  if (!isEdit.value) {
    // Create mode: default schoolYearId ke tahun aktif
    if (!form.schoolYearId) {
      form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
    }
    // Setelah set schoolYearId, update maxVisitedStep sehingga step 0 sudah di-track
    maxVisitedStep.value = 0
    return
  }

  await loadEditStudent(route.params.id)
})

watch(() => route.params.id, (newId, oldId) => {
  if (newId === oldId || !isEdit.value) return
  void loadEditStudent(newId)
})

onUnmounted(() => {
  formLoadVersion++
  photoProcessVersion.value++
})
</script>