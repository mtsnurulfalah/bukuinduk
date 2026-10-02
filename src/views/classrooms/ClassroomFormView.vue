<template>
  <div class="space-y-5 max-w-2xl">
    <PageHeader
      :title="isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru'"
      show-back
      :breadcrumbs="[{ label: 'Kelas & Rombel', to: '/classrooms' }, { label: isEdit ? 'Edit' : 'Tambah' }]"
    />

    <BaseAlert v-if="errorMsg" type="error" dismissible>{{ errorMsg }}</BaseAlert>

    <BaseCard>
      <form class="space-y-4 mt-2" @submit.prevent="handleSubmit">
        <BaseInput v-model="form.name" label="Nama Kelas" placeholder="Contoh: 7A, 8B, 9 IPA 1" required :error-message="errors.name" />
        <BaseSelect v-model="form.gradeId" label="Tingkat Kelas" :options="schoolYearStore.gradeOptions" placeholder="Pilih tingkat" required :error-message="errors.gradeId" />
        <BaseSelect v-model="form.schoolYearId" label="Tahun Pelajaran" :options="schoolYearStore.schoolYearOptions" placeholder="Pilih tahun pelajaran" required :error-message="errors.schoolYearId" />
        <BaseSelect v-model="form.homeroomTeacherId" label="Wali Kelas" :options="teacherOptions" placeholder="Pilih wali kelas (opsional)" />
        <BaseInput v-model.number="form.capacity" label="Kapasitas Siswa" type="number" min="1" max="50" placeholder="30" />
        <div class="flex items-center gap-3">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600" />
          <label for="isActive" class="text-sm font-medium text-slate-700">Kelas Aktif</label>
        </div>

        <div class="flex gap-3 justify-end pt-2">
          <BaseButton variant="outline" type="button" @click="$router.back()">Batal</BaseButton>
          <BaseButton type="submit" :loading="isSaving" loading-text="Menyimpan...">
            <Save class="h-4 w-4" /> {{ isEdit ? 'Simpan Perubahan' : 'Tambah Kelas' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseInput, BaseSelect, BaseButton, BaseAlert } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { classroomsService, teachersService } from '@/services'
import { classroomSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()
const isEdit = computed(() => Boolean(route.params.id))
const isSaving = ref(false)
const errorMsg = ref('')
const errors = reactive<Record<string, string>>({})
const teacherOptions = ref<{ value: string; label: string }[]>([])

const form = reactive({ name: '', gradeId: '', schoolYearId: '', homeroomTeacherId: '', capacity: 30, isActive: true })

async function handleSubmit() {
  Object.keys(errors).forEach(k => delete errors[k])
  errorMsg.value = ''
  try {
    await classroomSchema.validate(form, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner: { path: string; message: string }[] }).inner
      inner.forEach(e => { errors[e.path] = e.message })
    }
    return
  }
  isSaving.value = true
  try {
    if (isEdit.value) {
      const updated = await classroomsService.update(route.params.id as string, form)
      classroomsStore.updateClassroom(updated)
      toast.success('Kelas berhasil diperbarui.')
    } else {
      const created = await classroomsService.create(form)
      classroomsStore.addClassroom(created)
      toast.success('Kelas berhasil ditambahkan.')
    }
    router.push('/classrooms')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan kelas.'
  } finally { isSaving.value = false }
}

onMounted(async () => {
  // Fetch schoolYear + grades. schoolYearStore.fetch() skip jika sudah initialized,
  // tapi grades bisa kosong jika fetch pertama (via router guard) hanya berhasil
  // sebagian. Cek setelah fetch dan retry grades jika masih kosong.
  await schoolYearStore.fetch()

  // Jika grades kosong setelah fetch (silent fail pertama kali atau store sudah
  // initialized tapi grades belum terisi), fetch grades secara eksplisit.
  if (schoolYearStore.grades.length === 0) {
    await schoolYearStore.fetchGrades()
  }

  form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''

  const teachers = await teachersService.listActive()
  teacherOptions.value = teachers.map(t => ({ value: t.id, label: t.fullName }))

  if (isEdit.value) {
    const cls = await classroomsService.get(route.params.id as string)
    Object.assign(form, {
      name: cls.name, gradeId: cls.gradeId, schoolYearId: cls.schoolYearId,
      homeroomTeacherId: cls.homeroomTeacherId ?? '',
      capacity: cls.capacity ?? 30, isActive: cls.isActive,
    })
  }
})
</script>
