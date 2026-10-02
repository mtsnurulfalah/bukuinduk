<template>
  <div class="space-y-5">
    <PageHeader title="Siswa Saya" :subtitle="classrooms[0]?.name ? `Kelas ${classrooms[0].name}` : ''" />

    <!-- Filter kelas (jika guru mengampu lebih dari 1) -->
    <BaseCard v-if="classrooms.length > 1" :padding="true">
      <div class="flex flex-wrap gap-2">
        <button
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            !activeClassroomId ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
          @click="selectClassroom('')"
        >
          Semua Kelas
        </button>
        <button
          v-for="cls in classrooms"
          :key="cls.id"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeClassroomId === cls.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
          @click="selectClassroom(cls.id)"
        >
          {{ cls.name }}
        </button>
      </div>
    </BaseCard>

    <!-- Search -->
    <SearchFilter v-model:search="search" search-placeholder="Cari nama atau NIS siswa..." />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <BaseSkeleton v-for="i in 5" :key="i" height="h-16" />
    </div>

    <!-- Empty -->
    <BaseEmpty
      v-else-if="!filtered.length"
      :title="search ? 'Tidak ada siswa yang cocok' : 'Belum ada siswa di kelas ini'"
      type="students"
    />

    <!-- List card (mobile-friendly) -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <RouterLink
        v-for="student in filtered"
        :key="student.id"
        :to="`/students/${student.id}`"
        class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-primary-200 hover:shadow-sm transition-all group"
      >
        <BaseAvatar :name="student.fullName" :src="student.photoUrl" size="md" color="blue" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
            {{ student.fullName }}
          </p>
          <p class="text-xs text-slate-400 truncate">{{ student.nis }}</p>
          <div class="flex items-center gap-1.5 mt-1">
            <span :class="student.gender === 'L' ? 'text-blue-600' : 'text-pink-600'" class="text-xs font-medium">
              {{ student.gender === 'L' ? 'Laki-laki' : 'Perempuan' }}
            </span>
            <span class="text-slate-300">·</span>
            <StudentStatusBadge :status="student.status" />
          </div>
        </div>
        <ChevronRight class="h-4 w-4 text-slate-300 shrink-0" />
      </RouterLink>
    </div>

    <!-- Count info -->
    <p v-if="filtered.length" class="text-xs text-slate-400 text-center">
      Menampilkan {{ filtered.length }} siswa
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import { PageHeader, SearchFilter, StudentStatusBadge } from '@/components/shared'
import { BaseCard, BaseAvatar, BaseSkeleton, BaseEmpty } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { classroomsService, studentsService } from '@/services'
import type { Classroom, Student } from '@/types'

const authStore = useAuthStore()
const classrooms = ref<Classroom[]>([])
const students = ref<Student[]>([])
const activeClassroomId = ref('')
const search = ref('')
const isLoading = ref(true)

const filtered = computed(() => {
  let result = students.value
  if (activeClassroomId.value) {
    result = result.filter(s => s.currentEnrollment?.classroomId === activeClassroomId.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    result = result.filter(s =>
      s.fullName.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    )
  }
  return result
})

async function selectClassroom(id: string) {
  activeClassroomId.value = id
}

onMounted(async () => {
  const teacherId = authStore.user?.teacherId
  if (!teacherId) { isLoading.value = false; return }

  try {
    classrooms.value = await classroomsService.getByTeacher(teacherId)
    if (classrooms.value.length) {
      // Ambil siswa dari semua kelas yang diampu
      const { items } = await studentsService.list({
        classroomId: classrooms.value.length === 1 ? classrooms.value[0].id : undefined,
        status: 'active',
        limit: 500,
      })
      students.value = items
    }
  } catch { /* silent */ } finally {
    isLoading.value = false
  }
})
</script>
