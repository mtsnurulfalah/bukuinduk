<template>
  <div class="space-y-5">
    <PageHeader :title="teacher?.fullName ?? 'Detail Guru'" show-back
      :breadcrumbs="[{ label: 'Data Guru', to: '/teachers' }, { label: teacher?.fullName ?? '...' }]">
      <template v-if="teacher && can(PERMISSIONS.TEACHER_MANAGE)" #actions>
        <BaseButton variant="outline" size="sm" @click="$router.push(`/teachers/${teacher.id}/edit`)">
          <Pencil class="h-4 w-4" /> Edit
        </BaseButton>
      </template>
    </PageHeader>
    <BaseSkeleton v-if="isLoading" height="h-48" />
    <BaseAlert v-else-if="error" type="error">{{ error }}</BaseAlert>
    <template v-else-if="teacher">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BaseCard class="text-center flex flex-col items-center gap-3 py-6">
          <BaseAvatar :name="teacher.fullName" size="xl" color="teal" />
          <div>
            <h2 class="text-lg font-bold text-slate-800">{{ teacher.fullName }}</h2>
            <p class="text-sm text-slate-500">{{ teacher.educationLevel ?? '' }} {{ teacher.major ? '- ' + teacher.major : '' }}</p>
          </div>
          <BaseBadge :color="teacher.status === 'active' ? 'green' : 'slate'" dot>
            {{ teacher.status === 'active' ? 'Aktif' : 'Nonaktif' }}
          </BaseBadge>
        </BaseCard>
        <BaseCard title="Informasi Guru" class="lg:col-span-2">
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 mt-3 text-sm">
            <div v-for="item in infoItems" :key="item.label">
              <p class="text-xs text-slate-400 mb-0.5">{{ item.label }}</p>
              <p class="font-medium text-slate-700">{{ item.value || '—' }}</p>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Pencil } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseButton, BaseAlert, BaseAvatar, BaseBadge, BaseSkeleton } from '@/components/ui'
import { usePermission } from '@/composables'
import { teachersService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate } from '@/utils'
import type { Teacher } from '@/types'

const route = useRoute()
const { can } = usePermission()
const teacher = ref<Teacher | null>(null)
const isLoading = ref(true)
const error = ref('')

const infoItems = computed(() => !teacher.value ? [] : [
  { label: 'NIP', value: teacher.value.nip },
  { label: 'NUPTK', value: teacher.value.nuptk },
  { label: 'Jenis Kelamin', value: teacher.value.gender === 'L' ? 'Laki-laki' : teacher.value.gender === 'P' ? 'Perempuan' : '—' },
  { label: 'Tempat, Tgl Lahir', value: [teacher.value.birthPlace, formatDate(teacher.value.birthDate)].filter(Boolean).join(', ') },
  { label: 'Agama', value: teacher.value.religion },
  { label: 'Pendidikan', value: teacher.value.educationLevel },
  { label: 'Jurusan', value: teacher.value.major },
  { label: 'Tgl Bergabung', value: formatDate(teacher.value.joinDate) },
  { label: 'No. HP', value: teacher.value.phone },
  { label: 'Email', value: teacher.value.email },
  { label: 'Alamat', value: teacher.value.address },
])

onMounted(async () => {
  try { teacher.value = await teachersService.get(route.params.id as string) }
  catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Gagal memuat data.' }
  finally { isLoading.value = false }
})
</script>
