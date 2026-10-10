<template>
  <div class="w-full min-w-0 space-y-5 pb-6" :aria-busy="isLoading">
    <PageHeader
      :title="headerTitle"
      :subtitle="headerSubtitle"
      show-back
      back-to="/teachers"
      :breadcrumbs="[
        { label: 'Data Guru', to: '/teachers' },
        { label: breadcrumbLabel },
      ]"
    >
      <template v-if="teacher && can(PERMISSIONS.TEACHER_MANAGE)" #actions>
        <BaseButton
          variant="outline"
          size="sm"
          class="min-h-10 w-full sm:w-auto"
          aria-label="Edit data guru"
          @click="goToEdit"
        >
          <Pencil class="h-4 w-4" />
          Edit Data
        </BaseButton>
      </template>
    </PageHeader>

    <BaseRetry
      v-if="error"
      title="Data guru gagal dimuat"
      :message="error"
      :loading="isLoading"
      @retry="retryLoad"
    />

    <template v-else-if="isLoading">
      <div class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3" aria-hidden="true">
        <BaseCard class="min-w-0">
          <div class="flex flex-col items-center gap-3 py-3">
            <BaseSkeleton height="h-20" width="w-20" :rounded="true" />
            <BaseSkeleton height="h-5" width="w-40" />
            <BaseSkeleton height="h-4" width="w-32" />
            <BaseSkeleton height="h-6" width="w-24" />
          </div>
        </BaseCard>

        <BaseCard title="Informasi Guru" class="min-w-0 lg:col-span-2">
          <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="i in 8" :key="i" class="min-w-0 space-y-2">
              <BaseSkeleton height="h-3" width="w-24" />
              <BaseSkeleton height="h-5" width="w-full" />
            </div>
            <div class="min-w-0 space-y-2 sm:col-span-2">
              <BaseSkeleton height="h-3" width="w-16" />
              <BaseSkeleton height="h-12" width="w-full" />
            </div>
          </div>
        </BaseCard>
      </div>
    </template>

    <template v-else-if="teacher">
      <div class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <BaseCard class="min-w-0 p-5 text-center sm:p-6">
          <div class="flex min-w-0 flex-col items-center gap-3">
            <BaseAvatar
              :name="teacherName || 'Guru'"
              :src="teacher.photoUrl"
              size="xl"
              color="teal"
            />

            <div class="min-w-0 max-w-full">
              <h2 class="break-words text-lg font-bold text-slate-800">
                {{ teacherName || 'Nama belum diisi' }}
              </h2>
              <p class="mt-1 break-words text-sm text-slate-500">
                {{ profileCaption }}
              </p>
            </div>

            <BaseBadge
              :color="teacher.status === 'active' ? 'green' : 'slate'"
              dot
            >
              {{ teacher.status === 'active' ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>

            <p v-if="teacher.joinDate" class="text-xs text-slate-500">
              Bergabung sejak {{ formatDate(teacher.joinDate) }}
            </p>
          </div>
        </BaseCard>

        <BaseCard
          title="Informasi Guru"
          subtitle="Data identitas, pendidikan, dan kontak yang tersimpan."
          class="min-w-0 lg:col-span-2"
        >
          <div class="grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div
              v-for="item in infoItems"
              :key="item.label"
              :class="[
                'min-w-0 rounded-lg px-3 py-2.5',
                item.fullWidth ? 'sm:col-span-2' : '',
              ]"
            >
              <p class="mb-1 text-xs font-medium text-slate-500">
                {{ item.label }}
              </p>

              <a
                v-if="item.href"
                :href="item.href"
                class="inline-flex min-h-8 max-w-full items-center break-all font-medium text-primary-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {{ item.value }}
              </a>
              <p
                v-else
                class="whitespace-pre-line break-words font-medium text-slate-700"
              >
                {{ item.value }}
              </p>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>

    <BaseCard v-else class="min-w-0">
      <div class="flex flex-col items-center gap-3 py-6 text-center">
        <CircleAlert class="h-9 w-9 text-slate-400" aria-hidden="true" />
        <h2 class="text-base font-semibold text-slate-800">
          Data guru tidak tersedia
        </h2>
        <p class="max-w-md break-words text-sm leading-relaxed text-slate-500">
          Data guru belum dapat ditampilkan. Kembali ke daftar guru untuk memilih data yang tersedia.
        </p>
        <BaseButton class="min-h-10" @click="goToList">
          <ArrowLeft class="h-4 w-4" />
          Kembali ke Data Guru
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleAlert, Pencil } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseAvatar,
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseRetry,
  BaseSkeleton,
} from '@/components/ui'
import { usePermission } from '@/composables'
import { teachersService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate } from '@/utils'
import type { Teacher } from '@/types'

/**
 * Data dari Google Sheets/GAS dapat berisi angka untuk kolom yang secara
 * konseptual berupa teks (mis. NIP/NUPTK). Jangan memanggil .trim() secara
 * langsung pada nilai API yang runtime-nya belum tentu string.
 */
function safeDisplayText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}
interface TeacherDetailItem {
  label: string
  value: string
  href?: string
  fullWidth?: boolean
}

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const teacher = ref<Teacher | null>(null)
const isLoading = ref(true)
const error = ref('')
let requestVersion = 0

const detailId = computed(() => {
  const rawId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id
  const id = String(rawId ?? '').trim()

  return id === 'undefined' || id === 'null' ? '' : id
})

const teacherName = computed(() => safeDisplayText(teacher.value?.fullName))

const headerTitle = computed(() => {
  const name = teacherName.value
  if (name) return name
  return isLoading.value ? 'Memuat Detail Guru' : 'Detail Guru'
})

const breadcrumbLabel = computed(() => {
  const name = teacherName.value
  if (name) return name
  return isLoading.value ? 'Memuat...' : 'Detail'
})

const profileCaption = computed(() => {
  if (!teacher.value) return 'Profil guru'

  return [
    safeDisplayText(teacher.value.educationLevel),
    safeDisplayText(teacher.value.major),
  ]
    .filter(Boolean)
    .join(' • ') || 'Profil guru'
})

const headerSubtitle = computed(() => {
  if (isLoading.value) return 'Memuat informasi identitas dan kontak guru.'
  if (error.value) return 'Informasi guru belum berhasil dimuat.'
  return profileCaption.value
})

const infoItems = computed<TeacherDetailItem[]>(() => {
  const current = teacher.value
  if (!current) return []

  const phone = safeDisplayText(current.phone)
  const phoneTarget = phone.replace(/[^\d+]/g, '')
  const email = safeDisplayText(current.email)
  const birthDetails = [
    safeDisplayText(current.birthPlace),
    current.birthDate ? formatDate(current.birthDate) : '',
  ]
    .filter(Boolean)
    .join(', ')

  return [
    { label: 'NIP', value: safeDisplayText(current.nip) || '—' },
    { label: 'NUPTK', value: safeDisplayText(current.nuptk) || '—' },
    {
      label: 'Jenis Kelamin',
      value:
        current.gender === 'L'
          ? 'Laki-laki'
          : current.gender === 'P'
            ? 'Perempuan'
            : '—',
    },
    { label: 'Tempat, Tanggal Lahir', value: birthDetails || '—' },
    { label: 'Agama', value: safeDisplayText(current.religion) || '—' },
    { label: 'Pendidikan Terakhir', value: safeDisplayText(current.educationLevel) || '—' },
    { label: 'Jurusan/Bidang Studi', value: safeDisplayText(current.major) || '—' },
    {
      label: 'Tanggal Bergabung',
      value: current.joinDate ? formatDate(current.joinDate) : '—',
    },
    {
      label: 'No. HP',
      value: phone || '—',
      href: /\d/.test(phoneTarget) ? `tel:${phoneTarget}` : undefined,
    },
    {
      label: 'Email',
      value: email || '—',
      href: email ? `mailto:${email}` : undefined,
    },
    {
      label: 'Alamat',
      value: safeDisplayText(current.address) || '—',
      fullWidth: true,
    },
  ]
})

async function load(options: { preserveError?: boolean } = {}) {
  const version = ++requestVersion
  const id = detailId.value

  teacher.value = null
  if (!options.preserveError) error.value = ''

  if (!id) {
    error.value = 'ID guru tidak valid. Buka kembali detail melalui halaman Data Guru.'
    isLoading.value = false
    return
  }

  isLoading.value = true

  try {
    const result = await teachersService.get(id)

    // Abaikan response yang berasal dari route/request sebelumnya.
    if (version !== requestVersion || detailId.value !== id) return

    if (!result || !String(result.id ?? '').trim()) {
      throw new Error('Data guru tidak valid atau tidak ditemukan.')
    }

    teacher.value = result
    error.value = ''
  } catch (e: unknown) {
    if (version !== requestVersion || detailId.value !== id) return

    teacher.value = null
    error.value = e instanceof Error
      ? e.message
      : 'Gagal memuat data guru. Silakan coba lagi.'
  } finally {
    if (version === requestVersion) {
      isLoading.value = false
    }
  }
}

function retryLoad() {
  if (isLoading.value) return
  void load({ preserveError: true })
}

function goToEdit() {
  const id = teacher.value?.id
  if (!id || !can(PERMISSIONS.TEACHER_MANAGE)) return

  void router.push({ name: 'teachers.edit', params: { id } })
}

function goToList() {
  void router.push({ name: 'teachers' })
}

watch(detailId, () => {
  void load()
}, { immediate: true })

onUnmounted(() => {
  requestVersion += 1
})
</script>
