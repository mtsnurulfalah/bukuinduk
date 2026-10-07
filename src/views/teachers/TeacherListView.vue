<template>
  <div class="space-y-5 min-w-0">
    <PageHeader title="Data Guru" :subtitle="`${total} guru terdaftar`">
      <template #actions>
        <BaseButton
          v-if="can(PERMISSIONS.TEACHER_MANAGE)"
          size="sm"
          @click="goToCreate"
        >
          <Plus class="h-4 w-4" /> Tambah Guru
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padding="true">
      <SearchFilter
        v-model:search="search"
        search-placeholder="Cari nama, NIP, NUPTK, atau email..."
      >
        <template #filters>
          <div class="w-full sm:w-36 shrink-0">
            <BaseSelect
              v-model="filterStatus"
              :options="statusOpts"
              placeholder="Semua Status"
              aria-label="Filter status guru"
              @update:model-value="handleStatusChange"
            />
          </div>
        </template>
      </SearchFilter>
    </BaseCard>

    <BaseRetry
      v-if="error"
      title="Data guru gagal dimuat"
      :message="error"
      @retry="handleRetry"
    />

    <BaseCard v-else :padding="false" class="min-w-0 overflow-hidden">
      <DataTable
        :columns="columns"
        :rows="teachers as Record<string, unknown>[]"
        :loading="isLoading"
        row-key="id"
        :clickable="true"
        :empty-title="search || filterStatus ? 'Tidak ada guru yang cocok' : 'Belum ada data guru'"
        :empty-description="search || filterStatus ? 'Coba ubah kata kunci atau filter status.' : 'Data guru akan tampil di sini setelah ditambahkan.'"
        :empty-type="search || filterStatus ? 'search' : 'default'"
        @row-click="goToDetail"
      >
        <template #cell-fullName="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <BaseAvatar :name="String(row.fullName ?? '')" size="sm" color="teal" />
            <div class="min-w-0">
              <p class="font-medium text-slate-800 break-words">
                {{ row.fullName || 'Nama belum diisi' }}
              </p>
              <p class="text-xs text-slate-400 break-words">
                {{ row.nip || 'NIP belum diisi' }}
              </p>
            </div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <BaseBadge :color="row.status === 'active' ? 'green' : 'slate'" dot>
            {{ row.status === 'active' ? 'Aktif' : 'Nonaktif' }}
          </BaseBadge>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1" @click.stop>
            <button
              v-if="can(PERMISSIONS.TEACHER_MANAGE)"
              type="button"
              class="min-h-9 min-w-9 rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
              :aria-label="`Edit data guru ${String(row.fullName ?? '')}`"
              title="Edit guru"
              @click="goToEdit(row)"
            >
              <Pencil class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-slate-100 px-4">
        <BasePagination
          :current-page="page"
          :total-pages="Math.max(1, Math.ceil(total / limit))"
          :total="total"
          :limit="limit"
          @update:current-page="handlePageChange"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil } from 'lucide-vue-next'
import { PageHeader, SearchFilter, DataTable } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import {
  BaseCard,
  BaseButton,
  BaseSelect,
  BaseAvatar,
  BaseBadge,
  BasePagination,
  BaseRetry,
} from '@/components/ui'
import { teachersService } from '@/services'
import { usePermission, useSearch } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { Teacher } from '@/types'

const router = useRouter()
const { can } = usePermission()

const teachers = ref<Teacher[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const isLoading = ref(true)
const error = ref('')
const filterStatus = ref('')

const statusOpts = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const columns: TableColumn[] = [
  { key: 'fullName', label: 'Nama Guru' },
  { key: 'educationLevel', label: 'Pendidikan', class: 'hidden md:table-cell' },
  { key: 'phone', label: 'No. HP', class: 'hidden lg:table-cell' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right', sticky: 'right' },
]

let requestSeq = 0

const { query: search } = useSearch((q) => {
  page.value = 1
  void load(q)
})

async function load(q = search.value) {
  const seq = ++requestSeq

  isLoading.value = true
  error.value = ''

  try {
    const res = await teachersService.list({
      search: q.trim(),
      status: filterStatus.value,
      page: page.value,
      limit,
    })

    // Abaikan response lama yang tiba setelah request terbaru.
    if (seq !== requestSeq) return

    teachers.value = Array.isArray(res.items) ? res.items : []
    total.value = Number.isFinite(Number(res.total)) ? Math.max(0, Number(res.total)) : 0
  } catch (e: unknown) {
    if (seq !== requestSeq) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat data guru.'
  } finally {
    if (seq === requestSeq) {
      isLoading.value = false
    }
  }
}

function handleStatusChange() {
  page.value = 1
  void load()
}

function handlePageChange(nextPage: number) {
  if (nextPage === page.value) return
  page.value = Math.max(1, nextPage)
  void load()
}

function handleRetry() {
  void load()
}

function goToCreate() {
  router.push('/teachers/create')
}

function goToDetail(row: Record<string, unknown>) {
  const id = String(row.id ?? '').trim()
  if (!id) return
  router.push(`/teachers/${id}`)
}

function goToEdit(row: Record<string, unknown>) {
  const id = String(row.id ?? '').trim()
  if (!id) return
  router.push(`/teachers/${id}/edit`)
}

onMounted(() => {
  void load()
})
</script>
