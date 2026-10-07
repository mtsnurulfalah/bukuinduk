<template>
  <div class="w-full min-w-0 max-w-2xl space-y-5">
    <PageHeader
      :title="isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru'"
      :subtitle="isEdit ? 'Perbarui data rombel tanpa mengubah riwayat enrollment.' : 'Buat rombel baru untuk satu tahun pelajaran.'"
      show-back
      :breadcrumbs="[
        { label: 'Kelas & Rombel', to: '/classrooms' },
        { label: isEdit ? 'Edit' : 'Tambah' },
      ]"
    />

    <BaseAlert v-if="errorMsg" type="error" dismissible @dismiss="errorMsg = ''">
      {{ errorMsg }}
    </BaseAlert>

    <BaseAlert v-if="warningMsg" type="warning" dismissible @dismiss="warningMsg = ''">
      {{ warningMsg }}
    </BaseAlert>

    <BaseCard v-if="isLoadingForm">
      <div class="space-y-4">
        <BaseSkeleton height="h-10 w-full" />
        <BaseSkeleton height="h-10 w-full" />
        <BaseSkeleton height="h-10 w-full" />
        <BaseSkeleton height="h-10 w-full" />
        <BaseSkeleton height="h-10 w-full" />
      </div>
    </BaseCard>

    <BaseCard v-else>
      <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 gap-4">
          <BaseInput
            v-model="form.name"
            label="Nama Kelas"
            placeholder="Contoh: 7A, 8B, 9 IPA 1"
            required
            :error-message="errors.name"
          />

          <BaseSelect
            v-model="form.gradeId"
            label="Tingkat Kelas"
            :options="schoolYearStore.gradeOptions"
            placeholder="Pilih tingkat"
            required
            :error-message="errors.gradeId"
          />

          <BaseSelect
            v-model="form.schoolYearId"
            label="Tahun Pelajaran"
            :options="schoolYearStore.schoolYearOptions"
            placeholder="Pilih tahun pelajaran"
            required
            :error-message="errors.schoolYearId"
          />

          <BaseSelect
            v-model="form.homeroomTeacherId"
            label="Wali Kelas"
            :options="teacherOptions"
            placeholder="Pilih wali kelas (opsional)"
          />

          <BaseInput
            v-model.number="form.capacity"
            label="Kapasitas Siswa"
            type="number"
            min="1"
            max="50"
            placeholder="30"
            :error-message="errors.capacity"
          />
        </div>

        <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input
            v-model="form.isActive"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-slate-700">Kelas Aktif</span>
            <span class="block text-xs text-slate-400">Kelas dapat digunakan untuk enrollment siswa.</span>
          </span>
        </label>

        <div class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <BaseButton variant="outline" type="button" class="w-full sm:w-auto" :disabled="isSaving" @click="goBack">
            Batal
          </BaseButton>
          <BaseButton type="submit" class="w-full sm:w-auto" :loading="isSaving" loading-text="Menyimpan...">
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Simpan Perubahan' : 'Tambah Kelas' }}
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
import { BaseCard, BaseInput, BaseSelect, BaseButton, BaseAlert, BaseSkeleton } from '@/components/ui'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useClassroomsStore } from '@/stores/classrooms'
import { classroomsService, teachersService } from '@/services'
import { classroomSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const schoolYearStore = useSchoolYearStore()
const classroomsStore = useClassroomsStore()

const isEdit = computed(() => Boolean(String(route.params.id ?? '').trim()))
const isLoadingForm = ref(true)
const isSaving = ref(false)
const errorMsg = ref('')
const warningMsg = ref('')
const errors = reactive<Record<string, string>>({})
const teacherOptions = ref<{ value: string; label: string }[]>([])

const form = reactive({
  name: '',
  gradeId: '',
  schoolYearId: '',
  homeroomTeacherId: '',
  capacity: 30,
  isActive: true,
})

function clearErrors() {
  Object.keys(errors).forEach(key => delete errors[key])
}

function resetForm() {
  form.name = ''
  form.gradeId = ''
  form.schoolYearId = ''
  form.homeroomTeacherId = ''
  form.capacity = 30
  form.isActive = true
  clearErrors()
}

function mapValidationErrors(err: unknown) {
  if (!err || typeof err !== 'object' || !('inner' in err)) return
  const inner = (err as { inner?: Array<{ path?: string; message?: string }> }).inner ?? []
  inner.forEach(item => {
    if (item.path && item.message) errors[item.path] = item.message
  })
}

async function handleSubmit() {
  if (isSaving.value) return

  clearErrors()
  errorMsg.value = ''
  warningMsg.value = ''

  try {
    await classroomSchema.validate(form, { abortEarly: false })
  } catch (err: unknown) {
    mapValidationErrors(err)
    return
  }

  const id = String(route.params.id ?? '').trim()
  if (isEdit.value && !id) {
    errorMsg.value = 'ID kelas tidak valid.'
    return
  }

  isSaving.value = true

  try {
    if (isEdit.value) {
      const updated = await classroomsService.update(id, {
        name: form.name.trim(),
        gradeId: form.gradeId,
        schoolYearId: form.schoolYearId,
        homeroomTeacherId: form.homeroomTeacherId || undefined,
        capacity: Number(form.capacity),
        isActive: form.isActive,
      })
      classroomsStore.updateClassroom(updated)
      toast.success('Kelas berhasil diperbarui.')
    } else {
      const created = await classroomsService.create({
        name: form.name.trim(),
        gradeId: form.gradeId,
        schoolYearId: form.schoolYearId,
        homeroomTeacherId: form.homeroomTeacherId || undefined,
        capacity: Number(form.capacity),
        isActive: form.isActive,
      })
      classroomsStore.addClassroom(created)
      toast.success('Kelas berhasil ditambahkan.')
    }

    await router.push('/classrooms')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan kelas.'
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  if (isSaving.value) return
  void router.push('/classrooms')
}

async function loadForm() {
  isLoadingForm.value = true
  errorMsg.value = ''
  warningMsg.value = ''
  resetForm()

  try {
    await schoolYearStore.fetch()

    if (schoolYearStore.grades.length === 0) {
      await schoolYearStore.fetchGrades()
    }

    if (!schoolYearStore.schoolYears.length) {
      throw new Error('Belum ada tahun pelajaran. Buat tahun pelajaran terlebih dahulu.')
    }

    if (!isEdit.value) {
      form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? schoolYearStore.schoolYears[0]?.id ?? ''
    }

    const teacherPromise = teachersService.listActive()
    const classPromise = isEdit.value
      ? classroomsService.get(String(route.params.id ?? '').trim())
      : Promise.resolve(null)

    const [teacherResult, classResult] = await Promise.allSettled([
      teacherPromise,
      classPromise,
    ])

    if (teacherResult.status === 'fulfilled') {
      teacherOptions.value = teacherResult.value.map(t => ({
        value: t.id,
        label: t.fullName,
      }))
    } else {
      warningMsg.value = 'Daftar wali kelas tidak dapat dimuat. Kelas tetap dapat disimpan tanpa mengganti wali kelas.'
    }

    if (classResult.status === 'rejected') {
      throw classResult.reason
    }

    const cls = classResult.value
    if (cls) {
      Object.assign(form, {
        name: cls.name,
        gradeId: cls.gradeId,
        schoolYearId: cls.schoolYearId,
        homeroomTeacherId: cls.homeroomTeacherId ?? '',
        capacity: cls.capacity ?? 30,
        isActive: cls.isActive !== false,
      })
    }
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal memuat data formulir kelas.'
  } finally {
    isLoadingForm.value = false
  }
}

onMounted(() => {
  void loadForm()
})
</script>
