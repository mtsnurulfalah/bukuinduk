<template>
  <div class="space-y-5">
    <PageHeader title="Data Guru" :subtitle="`${total} guru terdaftar`">
      <template #actions>
        <BaseButton v-if="can(PERMISSIONS.TEACHER_MANAGE)" size="sm" @click="$router.push('/teachers/create')">
          <Plus class="h-4 w-4" /> Tambah Guru
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padding="true">
      <SearchFilter v-model:search="search" search-placeholder="Cari nama atau NIP...">
        <template #filters>
          <BaseSelect v-model="filterStatus" :options="statusOpts" placeholder="Semua Status" class="w-36"
            @update:model-value="load" />
        </template>
      </SearchFilter>
    </BaseCard>

    <BaseCard :padding="false">
      <DataTable :columns="columns" :rows="teachers as Record<string, unknown>[]" :loading="isLoading" row-key="id"
        :clickable="true" empty-title="Tidak ada data guru" empty-type="default"
        @row-click="row => $router.push(`/teachers/${row.id}`)">
        <template #cell-fullName="{ row }">
          <div class="flex items-center gap-3">
            <BaseAvatar :name="String(row.fullName)" size="sm" color="teal" />
            <div>
              <p class="font-medium text-slate-800">{{ row.fullName }}</p>
              <p class="text-xs text-slate-400">{{ row.nip || 'NIP belum diisi' }}</p>
            </div>
          </div>
        </template>
        <template #cell-status="{ row }">
          <BaseBadge :color="row.status === 'active' ? 'green' : 'slate'" dot>
            {{ row.status === 'active' ? 'Aktif' : 'Nonaktif' }}
          </BaseBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" @click.stop>
            <button class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              v-if="can(PERMISSIONS.TEACHER_MANAGE)" @click="$router.push(`/teachers/${row.id}/edit`)">
              <Pencil class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>
      <div class="px-4 border-t border-slate-100">
        <BasePagination :current-page="page" :total-pages="Math.max(1, Math.ceil(total / limit))"
          :total="total" :limit="limit" @update:current-page="p => { page = p; load() }" />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil } from 'lucide-vue-next'
import { PageHeader, SearchFilter, DataTable } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import { BaseCard, BaseButton, BaseSelect, BaseAvatar, BaseBadge, BasePagination } from '@/components/ui'
import { teachersService } from '@/services'
import { usePermission, useSearch } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { Teacher } from '@/types'

const { can } = usePermission()
const teachers = ref<Teacher[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const isLoading = ref(true)
const filterStatus = ref('')
const statusOpts = [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]

const columns: TableColumn[] = [
  { key: 'fullName', label: 'Nama Guru' },
  { key: 'educationLevel', label: 'Pendidikan', class: 'hidden md:table-cell' },
  { key: 'phone', label: 'No. HP', class: 'hidden lg:table-cell' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right', sticky: 'right' },
]

const { query: search } = useSearch((q) => { page.value = 1; load(q) })

async function load(q = search.value) {
  isLoading.value = true
  try {
    const res = await teachersService.list({ search: q, status: filterStatus.value, page: page.value, limit })
    teachers.value = res.items
    total.value = res.total
  } catch { /* silent */ } finally { isLoading.value = false }
}

onMounted(load)
</script>
