<template>
  <div class="space-y-5">
    <PageHeader title="Manajemen Pengguna" :subtitle="`${total} pengguna terdaftar`">
      <template #actions>
        <BaseButton size="sm" @click="$router.push('/users/create')">
          <UserPlus class="h-4 w-4" /> Tambah Pengguna
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padding="true">
      <SearchFilter v-model:search="search" search-placeholder="Cari nama atau username...">
        <template #filters>
          <BaseSelect v-model="filterRole" :options="roleOptions" placeholder="Semua Role" class="w-40"
            @update:model-value="loadUsers" />
        </template>
      </SearchFilter>
    </BaseCard>

    <BaseCard :padding="false">
      <DataTable
        :columns="columns" :rows="users as Record<string, unknown>[]"
        :loading="isLoading" row-key="id"
        empty-title="Tidak ada pengguna" empty-type="default"
      >
        <template #cell-fullName="{ row }">
          <div class="flex items-center gap-3">
            <BaseAvatar :name="String(row.fullName)" size="sm" :color="avatarColor(String(row.role))" />
            <div>
              <p class="font-medium text-slate-800">{{ row.fullName }}</p>
              <p class="text-xs text-slate-400">@{{ row.username }}</p>
            </div>
          </div>
        </template>
        <template #cell-role="{ row }">
          <BaseBadge :color="roleBadge(String(row.role))">{{ ROLE_LABELS[row.role as Role] }}</BaseBadge>
        </template>
        <template #cell-isActive="{ row }">
          <BaseBadge :color="row.isActive ? 'green' : 'slate'" dot>
            {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
          </BaseBadge>
        </template>
        <template #cell-lastLogin="{ row }">
          <span class="text-xs text-slate-500">{{ row.lastLogin ? formatDateTime(String(row.lastLogin)) : 'Belum pernah' }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" @click.stop>
            <button class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              @click="$router.push(`/users/${row.id}/edit`)">
              <Pencil class="h-4 w-4" />
            </button>
            <button
              :class="['p-1.5 rounded-lg transition-colors', row.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50']"
              :title="row.isActive ? 'Nonaktifkan' : 'Aktifkan'"
              @click="handleToggle(String(row.id), Boolean(row.isActive), String(row.fullName))">
              <UserX v-if="row.isActive" class="h-4 w-4" />
              <UserCheck v-else class="h-4 w-4" />
            </button>
            <button class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Reset Password" @click="openResetPassword(String(row.id), String(row.fullName))">
              <KeyRound class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <div class="px-4 border-t border-slate-100">
        <BasePagination :current-page="page" :total-pages="totalPages" :total="total" :limit="limit"
          @update:current-page="onPageChange" />
      </div>
    </BaseCard>

    <!-- Confirm toggle -->
    <BaseConfirmDialog v-model="confirmToggle.isOpen.value" title="Ubah Status Pengguna"
      :message="confirmToggle.options.value.message" :type="confirmToggle.options.value.type as any"
      :loading="confirmToggle.isLoading.value" @confirm="confirmToggleUser" />

    <!-- Reset Password Modal -->
    <BaseModal v-model="showResetPw" title="Reset Password" size="sm">
      <div class="space-y-3">
        <p class="text-sm text-slate-600">Reset password untuk <strong>{{ resetPwTarget.name }}</strong>.</p>
        <BaseInput v-model="newPassword" label="Password Baru" type="password" placeholder="Min. 8 karakter"
          :error-message="resetPwError" />
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="outline" size="sm" @click="showResetPw = false">Batal</BaseButton>
          <BaseButton size="sm" :loading="isResetting" @click="doResetPassword">Simpan</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { UserPlus, Pencil, UserX, UserCheck, KeyRound } from 'lucide-vue-next'
import { PageHeader, SearchFilter, DataTable } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import { BaseCard, BaseButton, BaseSelect, BaseAvatar, BaseBadge, BasePagination, BaseConfirmDialog, BaseModal, BaseInput } from '@/components/ui'
import { usersService } from '@/services'
import { useConfirm, useSearch } from '@/composables'
import { ROLE_LABELS, ROLES } from '@/constants'
import type { Role } from '@/constants'
import { formatDateTime } from '@/utils'
import { toast } from 'vue-sonner'
import type { User } from '@/types'

const users = ref<User[]>([])
const total = ref(0)
const isLoading = ref(true)
const page = ref(1)
const limit = ref(20)
const filterRole = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const confirmToggle = useConfirm()
let toggleTargetId = ''

// Reset password
const showResetPw = ref(false)
const resetPwTarget = ref({ id: '', name: '' })
const newPassword = ref('')
const resetPwError = ref('')
const isResetting = ref(false)

const roleOptions = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))

const columns: TableColumn[] = [
  { key: 'fullName', label: 'Pengguna' },
  { key: 'email', label: 'Email', class: 'hidden md:table-cell' },
  { key: 'role', label: 'Role' },
  { key: 'isActive', label: 'Status', align: 'center' },
  { key: 'lastLogin', label: 'Login Terakhir', class: 'hidden lg:table-cell' },
  { key: 'actions', label: '', align: 'right', sticky: 'right' },
]

const { query: search } = useSearch((q) => { page.value = 1; loadUsers(q) })

async function loadUsers(q = search.value) {
  isLoading.value = true
  try {
    const res = await usersService.list({ search: q, role: filterRole.value, page: page.value, limit: limit.value })
    users.value = res.items
    total.value = res.total
  } catch { toast.error('Gagal memuat data pengguna.') }
  finally { isLoading.value = false }
}

function onPageChange(p: number) { page.value = p; loadUsers() }

function avatarColor(role: string): 'purple' | 'blue' | 'green' {
  return role === 'admin' ? 'purple' : role === 'principal' ? 'blue' : 'green'
}
function roleBadge(role: string): 'purple' | 'blue' | 'green' {
  return role === 'admin' ? 'purple' : role === 'principal' ? 'blue' : 'green'
}

function handleToggle(id: string, isActive: boolean, name: string) {
  toggleTargetId = id
  confirmToggle.options.value.message = isActive
    ? `Nonaktifkan pengguna '${name}'?`
    : `Aktifkan kembali pengguna '${name}'?`
  confirmToggle.options.value.type = isActive ? 'danger' : 'info'
  confirmToggle.isOpen.value = true
}

async function confirmToggleUser() {
  confirmToggle.isLoading.value = true
  try {
    const updated = await usersService.toggleActive(toggleTargetId)
    const idx = users.value.findIndex(u => u.id === toggleTargetId)
    if (idx !== -1) users.value[idx] = updated
    toast.success('Status pengguna diperbarui.')
    confirmToggle.isOpen.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah status.')
  } finally { confirmToggle.isLoading.value = false }
}

function openResetPassword(id: string, name: string) {
  resetPwTarget.value = { id, name }
  newPassword.value = ''
  resetPwError.value = ''
  showResetPw.value = true
}

async function doResetPassword() {
  if (newPassword.value.length < 8) { resetPwError.value = 'Password minimal 8 karakter.'; return }
  isResetting.value = true
  try {
    await usersService.resetPassword(resetPwTarget.value.id, newPassword.value)
    toast.success('Password berhasil direset.')
    showResetPw.value = false
  } catch (e: unknown) {
    resetPwError.value = e instanceof Error ? e.message : 'Gagal mereset password.'
  } finally { isResetting.value = false }
}

onMounted(loadUsers)
</script>
