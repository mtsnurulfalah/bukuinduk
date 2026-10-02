<template>
  <div class="space-y-5">
    <PageHeader
      :title="classroom?.name ?? 'Detail Kelas'"
      :subtitle="classroom?.schoolYearName"
      show-back
      :breadcrumbs="[{ label: 'Kelas & Rombel', to: '/classrooms' }, { label: classroom?.name ?? '...' }]"
    >
      <template v-if="classroom && can(PERMISSIONS.CLASSROOM_MANAGE)" #actions>
        <BaseButton variant="outline" size="sm" @click="$router.push(`/classrooms/${classroom.id}/edit`)">
          <Pencil class="h-4 w-4" /> Edit
        </BaseButton>
      </template>
    </PageHeader>

    <BaseSkeleton v-if="isLoading" height="h-32" />
    <BaseAlert v-else-if="error" type="error">{{ error }}</BaseAlert>

    <template v-else-if="classroom">
      <!-- Info kelas -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Siswa" :value="students.length" :icon="Users" color="blue" />
        <StatCard label="Laki-laki" :value="students.filter(s => s.gender === 'L').length" :icon="User" color="blue" />
        <StatCard label="Perempuan" :value="students.filter(s => s.gender === 'P').length" :icon="User" color="purple" />
        <StatCard label="Kapasitas" :value="classroom.capacity ?? '–'" :icon="School" color="teal" />
      </div>

      <!-- Info detail kelas -->
      <BaseCard title="Informasi Kelas">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-3 text-sm">
          <div><p class="text-xs text-slate-400 mb-0.5">Nama Kelas</p><p class="font-semibold text-slate-800">{{ classroom.name }}</p></div>
          <div><p class="text-xs text-slate-400 mb-0.5">Tingkat</p><p class="font-medium text-slate-700">{{ classroom.gradeName ?? '–' }}</p></div>
          <div><p class="text-xs text-slate-400 mb-0.5">Tahun Pelajaran</p><p class="font-medium text-slate-700">{{ classroom.schoolYearName ?? '–' }}</p></div>
          <div><p class="text-xs text-slate-400 mb-0.5">Wali Kelas</p><p class="font-medium text-slate-700">{{ classroom.homeroomTeacherName ?? 'Belum ditetapkan' }}</p></div>
          <div><p class="text-xs text-slate-400 mb-0.5">Status</p>
            <BaseBadge :color="classroom.isActive ? 'green' : 'slate'" dot>
              {{ classroom.isActive ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </div>
        </div>
      </BaseCard>

      <!-- Daftar siswa -->
      <BaseCard :title="`Daftar Siswa (${students.length})`">
        <div class="mb-3 mt-1">
          <SearchFilter v-model:search="search" search-placeholder="Cari nama atau NIS..." />
        </div>

        <div v-if="isLoadingStudents" class="space-y-2">
          <BaseSkeleton v-for="i in 5" :key="i" height="h-12" />
        </div>
        <BaseEmpty v-else-if="!filtered.length" title="Tidak ada siswa" type="students" />
        <div v-else class="divide-y divide-slate-100">
          <RouterLink
            v-for="(s, i) in filtered"
            :key="s.id"
            :to="`/students/${s.id}`"
            class="flex items-center gap-3 py-2.5 hover:bg-slate-50 transition-colors -mx-5 px-5 group"
          >
            <span class="text-xs text-slate-400 w-6 text-right shrink-0">{{ i + 1 }}</span>
            <BaseAvatar :name="s.fullName" size="sm" color="blue" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">{{ s.fullName }}</p>
              <p class="text-xs text-slate-400">{{ s.nis }}</p>
            </div>
            <span :class="s.gender === 'L' ? 'text-blue-600' : 'text-pink-600'" class="text-xs font-medium shrink-0">
              {{ s.gender === 'L' ? 'L' : 'P' }}
            </span>
          </RouterLink>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Users, User, School, Pencil } from 'lucide-vue-next'
import { PageHeader, SearchFilter, StatCard } from '@/components/shared'
import { BaseCard, BaseButton, BaseAlert, BaseAvatar, BaseSkeleton, BaseEmpty, BaseBadge } from '@/components/ui'
import { usePermission } from '@/composables'
import { classroomsService, studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import type { Classroom, Student } from '@/types'

const route = useRoute()
const { can } = usePermission()
const classroom = ref<Classroom | null>(null)
const students = ref<Student[]>([])
const isLoading = ref(true)
const isLoadingStudents = ref(true)
const error = ref('')
const search = ref('')

const filtered = computed(() => {
  if (!search.value.trim()) return students.value
  const q = search.value.toLowerCase()
  return students.value.filter(s =>
    s.fullName.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
  )
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    classroom.value = await classroomsService.get(id)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data kelas.'
  } finally { isLoading.value = false }

  try {
    const { items } = await studentsService.list({ classroomId: id, limit: 500 })
    students.value = items
  } catch { /* silent */ } finally { isLoadingStudents.value = false }
})
</script>
