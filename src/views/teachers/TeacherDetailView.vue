<template>
  <div class="space-y-5 min-w-0">
    <PageHeader
      :title="teacher?.fullName ?? 'Detail Guru'"
      show-back
      :breadcrumbs="[
        { label: 'Data Guru', to: '/teachers' },
        { label: teacher?.fullName ?? '...' },
      ]"
    >
      <template v-if="teacher && can(PERMISSIONS.TEACHER_MANAGE)" #actions>
        <BaseButton
          variant="outline"
          size="sm"
          @click="goToEdit"
        >
          <Pencil class="h-4 w-4" /> Edit
        </BaseButton>
      </template>
    </PageHeader>

    <BaseSkeleton v-if="isLoading" height="h-48" />

    <BaseRetry
      v-else-if="error"
      title="Data guru gagal dimuat"
      :message="error"
      @retry="load"
    />

    <template v-else-if="teacher">
      <div class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <BaseCard class="min-w-0 py-6 text-center">
          <div class="flex flex-col items-center gap-3">
            <BaseAvatar :name="teacher.fullName" size="xl" color="teal" />

            <div class="min-w-0 max-w-full">
              <h2 class="break-words text-lg font-bold text-slate-800">
                {{ teacher.fullName }}
              </h2>
              <p class="break-words text-sm text-slate-500">
                {{ teacher.educationLevel ?? '' }}
                {{ teacher.major ? '- ' + teacher.major : '' }}
              </p>
            </div>

            <BaseBadge :color="teacher.status === 'active' ? 'green' : 'slate'" dot>
              {{ teacher.status === 'active' ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </div>
        </BaseCard>

        <BaseCard title="Informasi Guru" class="min-w-0 lg:col-span-2">
          <div class="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div
              v-for="item in infoItems"
              :key="item.label"
              class="min-w-0"
            >
              <p class="mb-0.5 text-xs text-slate-400">{{ item.label }}</p>
              <p class="break-words font-medium text-slate-700">
                {{ item.value || '—' }}
              </p>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil } from 'lucide-vue-next'
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

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const teacher = ref<Teacher | null>(null)
const isLoading = ref(true)
const error = ref('')

const infoItems = computed(() => {
  const current = teacher.value
  if (!current) return []

  return [
    { label: 'NIP', value: current.nip },
    { label: 'NUPTK', value: current.nuptk },
    {
      label: 'Jenis Kelamin',
      value:
        current.gender === 'L'
          ? 'Laki-laki'
          : current.gender === 'P'
            ? 'Perempuan'
            : '—',
    },
    {
      label: 'Tempat, Tgl Lahir',
      value: [
        current.birthPlace,
        current.birthDate ? formatDate(current.birthDate) : '',
      ]
        .filter(Boolean)
        .join(', '),
    },
    { label: 'Agama', value: current.religion },
    { label: 'Pendidikan', value: current.educationLevel },
    { label: 'Jurusan', value: current.major },
    { label: 'Tgl Bergabung', value: formatDate(current.joinDate) },
    { label: 'No. HP', value: current.phone },
    { label: 'Email', value: current.email },
    { label: 'Alamat', value: current.address },
  ]
})

async function load() {
  const id = String(route.params.id ?? '').trim()

  if (!id) {
    teacher.value = null
    error.value = 'ID guru tidak valid.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    teacher.value = await teachersService.get(id)
  } catch (e: unknown) {
    teacher.value = null
    error.value = e instanceof Error ? e.message : 'Gagal memuat data guru.'
  } finally {
    isLoading.value = false
  }
}

function goToEdit() {
  if (!teacher.value?.id) return
  router.push(`/teachers/${teacher.value.id}/edit`)
}

onMounted(() => {
  void load()
})
</script>
