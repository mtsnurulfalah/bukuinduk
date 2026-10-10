<template>
  <div class="min-w-0 space-y-5">
    <PageHeader
      title="Manajemen Pengguna"
      :subtitle="`${formatNumber(total)} pengguna terdaftar`"
    >
      <template #actions>
        <BaseButton size="sm" @click="$router.push('/users/create')">
          <UserPlus class="h-4 w-4" />
          Tambah Pengguna
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padding="true" class="min-w-0">
      <SearchFilter v-model:search="search" search-placeholder="Cari nama, username, atau email...">
        <template #filters>
          <BaseSelect
            v-model="filterRole"
            :options="roleOptions"
            placeholder="Semua Role"
            class="w-full sm:w-44"
            aria-label="Filter berdasarkan role"
            @update:model-value="onRoleChange"
          />
        </template>
      </SearchFilter>
    </BaseCard>

    <BaseRetry
      v-if="error && users.length === 0"
      title="Data pengguna gagal dimuat"
      :message="error"
      :loading="isLoading"
      button-text="Coba lagi"
      @retry="loadUsers"
    />

    <template v-else>
      <BaseAlert
        v-if="error"
        :key="error"
        type="error"
        title="Pembaruan daftar pengguna gagal"
        dismissible
        @dismiss="error = ''"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="min-w-0 break-words">{{ error }} Data terakhir tetap ditampilkan.</p>
          <BaseButton
            class="shrink-0"
            variant="outline"
            size="sm"
            :loading="isLoading"
            @click="loadUsers"
          >
            Coba lagi
          </BaseButton>
        </div>
      </BaseAlert>

      <BaseCard :padding="false" class="min-w-0 overflow-hidden">
        <DataTable
          :columns="columns"
          :rows="users as unknown as Record<string, unknown>[]"
          :loading="isLoading"
          row-key="id"
          empty-title="Tidak ada pengguna"
          empty-description="Ubah kata kunci atau filter role, atau tambahkan pengguna baru."
          empty-type="default"
        >
          <template #cell-fullName="{ row }">
            <div class="flex min-w-0 items-center gap-2 sm:gap-3">
              <BaseAvatar
                :name="displayText(row.fullName, 'Pengguna')"
                size="sm"
                :color="avatarColor(String(row.role ?? ''))"
              />
              <div class="min-w-0">
                <p class="break-words font-medium text-slate-800">
                  {{ displayText(row.fullName) }}
                </p>
                <p class="mt-0.5 break-words text-xs text-slate-400">
                  @{{ displayText(row.username, 'tanpa username') }}
                </p>
              </div>
            </div>
          </template>

          <template #cell-email="{ row }">
            <span class="break-words text-sm text-slate-600">
              {{ displayText(row.email) }}
            </span>
          </template>

          <template #cell-role="{ row }">
            <BaseBadge :color="roleBadge(String(row.role ?? ''))">
              {{ ROLE_LABELS[String(row.role) as Role] ?? 'Tidak diketahui' }}
            </BaseBadge>
          </template>

          <template #cell-isActive="{ row }">
            <BaseBadge :color="row.isActive === true ? 'green' : 'slate'" dot>
              {{ row.isActive === true ? 'Aktif' : 'Nonaktif' }}
            </BaseBadge>
          </template>

          <template #cell-lastLogin="{ row }">
            <span class="whitespace-nowrap text-xs text-slate-500">
              {{ row.lastLogin ? formatDateTime(String(row.lastLogin)) : 'Belum pernah' }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-1" @click.stop>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                :aria-label="`Edit pengguna ${displayText(row.fullName, 'ini')}`"
                title="Edit pengguna"
                @click="$router.push(`/users/${encodeURIComponent(String(row.id ?? ''))}/edit`)"
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                :class="[
                  'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2',
                  row.isActive === true
                    ? 'hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500'
                    : 'hover:bg-green-50 hover:text-green-700 focus-visible:ring-green-500',
                ]"
                :aria-label="`${row.isActive === true ? 'Nonaktifkan' : 'Aktifkan'} pengguna ${displayText(row.fullName, 'ini')}`"
                :title="row.isActive === true ? 'Nonaktifkan' : 'Aktifkan'"
                @click="handleToggle(String(row.id ?? ''), row.isActive === true, displayText(row.fullName, 'pengguna'))"
              >
                <UserX v-if="row.isActive === true" class="h-4 w-4" aria-hidden="true" />
                <UserCheck v-else class="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :aria-label="`Reset password pengguna ${displayText(row.fullName, 'ini')}`"
                title="Reset password"
                @click="openResetPassword(String(row.id ?? ''), displayText(row.fullName, 'pengguna'))"
              >
                <KeyRound class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </template>
        </DataTable>

        <div class="border-t border-slate-100 px-2 sm:px-4">
          <BasePagination
            :current-page="page"
            :total-pages="totalPages"
            :total="total"
            :limit="limit"
            @update:current-page="onPageChange"
          />
        </div>
      </BaseCard>
    </template>

    <BaseConfirmDialog
      v-model="confirmToggle.isOpen.value"
      title="Ubah Status Pengguna"
      :message="confirmToggle.options.value.message"
      :type="confirmToggle.options.value.type ?? 'warning'"
      :loading="confirmToggle.isLoading.value"
      @confirm="confirmToggleUser"
    />

    <BaseModal
      v-model="showResetPw"
      title="Reset Password"
      subtitle="Gunakan password baru minimal 8 karakter."
      size="sm"
      :show-close="!isResetting"
      :close-on-backdrop="!isResetting"
    >
      <form id="reset-user-password-form" class="space-y-3" @submit.prevent="doResetPassword">
        <p class="break-words text-sm leading-relaxed text-slate-600">
          Password untuk <strong class="text-slate-800">{{ resetPwTarget.name }}</strong> akan diganti.
        </p>
        <BaseInput
          v-model="newPassword"
          label="Password Baru"
          type="password"
          autocomplete="new-password"
          placeholder="Minimal 8 karakter"
          required
          :error-message="resetPwError"
        />
      </form>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <BaseButton
            class="w-full sm:w-auto"
            variant="outline"
            size="sm"
            :disabled="isResetting"
            @click="closeResetPassword"
          >
            Batal
          </BaseButton>
          <BaseButton
            class="w-full sm:w-auto"
            type="submit"
            form="reset-user-password-form"
            size="sm"
            :loading="isResetting"
            loading-text="Menyimpan..."
          >
            Reset Password
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { UserPlus, Pencil, UserX, UserCheck, KeyRound } from 'lucide-vue-next'
import { PageHeader, SearchFilter, DataTable } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import {
  BaseCard,
  BaseButton,
  BaseSelect,
  BaseAvatar,
  BaseBadge,
  BasePagination,
  BaseConfirmDialog,
  BaseModal,
  BaseInput,
  BaseRetry,
  BaseAlert,
} from '@/components/ui'
import { usersService } from '@/services'
import { useConfirm, useSearch } from '@/composables'
import { ROLE_LABELS } from '@/constants'
import type { Role } from '@/constants'
import { formatDateTime, formatNumber } from '@/utils'
import { toast } from 'vue-sonner'
import type { User } from '@/types'

const users = ref<User[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref('')
const page = ref(1)
const limit = ref(20)
const filterRole = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const confirmToggle = useConfirm()
let toggleTargetId = ''
let latestRequestId = 0

// Reset password
const showResetPw = ref(false)
const resetPwTarget = ref({ id: '', name: '' })
const newPassword = ref('')
const resetPwError = ref('')
const isResetting = ref(false)

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

const columns: TableColumn[] = [
  { key: 'fullName', label: 'Pengguna', class: 'min-w-[13rem]' },
  { key: 'email', label: 'Email', class: 'hidden md:table-cell', cellClass: 'max-w-[18rem]' },
  { key: 'role', label: 'Role' },
  { key: 'isActive', label: 'Status', align: 'center' },
  { key: 'lastLogin', label: 'Login Terakhir', class: 'hidden lg:table-cell' },
  { key: 'actions', label: 'Aksi', align: 'right', sticky: 'right', class: 'w-36', cellClass: 'w-36' },
]

const { query: search } = useSearch((query) => {
  page.value = 1
  void loadUsers(query)
})

function displayText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function avatarColor(role: string): 'purple' | 'blue' | 'green' {
  return role === 'admin' ? 'purple' : role === 'principal' ? 'blue' : 'green'
}

function roleBadge(role: string): 'purple' | 'blue' | 'green' {
  return role === 'admin' ? 'purple' : role === 'principal' ? 'blue' : 'green'
}

async function loadUsers(query = search.value) {
  const requestId = ++latestRequestId
  isLoading.value = true
  error.value = ''

  try {
    const response = await usersService.list({
      search: query.trim(),
      role: filterRole.value,
      page: page.value,
      limit: limit.value,
    })

    if (requestId !== latestRequestId) return

    if (
      !response ||
      !Array.isArray(response.items) ||
      !Number.isFinite(Number(response.total)) ||
      Number(response.total) < 0
    ) {
      throw new Error('Format respons daftar pengguna tidak valid.')
    }

    const nextTotal = Math.floor(Number(response.total))
    const lastAvailablePage = Math.max(1, Math.ceil(nextTotal / limit.value))
    if (page.value > lastAvailablePage) {
      page.value = lastAvailablePage
      await loadUsers(query)
      return
    }

    users.value = response.items
    total.value = nextTotal
  } catch (e: unknown) {
    if (requestId === latestRequestId) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat data pengguna.'
    }
  } finally {
    if (requestId === latestRequestId) isLoading.value = false
  }
}

function onRoleChange(role: string) {
  filterRole.value = role
  page.value = 1
  void loadUsers()
}

function onPageChange(nextPage: number) {
  if (!Number.isFinite(nextPage)) return
  page.value = Math.max(1, Math.min(totalPages.value, Math.floor(nextPage)))
  void loadUsers()
}

function handleToggle(id: string, isActive: boolean, name: string) {
  if (!id || confirmToggle.isLoading.value) return
  toggleTargetId = id
  confirmToggle.options.value.message = isActive
    ? `Nonaktifkan pengguna '${name}'?`
    : `Aktifkan kembali pengguna '${name}'?`
  confirmToggle.options.value.type = isActive ? 'danger' : 'info'
  confirmToggle.isOpen.value = true
}

async function confirmToggleUser() {
  if (!toggleTargetId || confirmToggle.isLoading.value) return
  confirmToggle.isLoading.value = true
  try {
    const updated = await usersService.toggleActive(toggleTargetId)
    const index = users.value.findIndex(user => String(user.id) === toggleTargetId)
    if (index !== -1) users.value[index] = updated
    toast.success('Status pengguna diperbarui.')
    confirmToggle.isOpen.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah status.')
  } finally {
    confirmToggle.isLoading.value = false
    toggleTargetId = ''
  }
}

function openResetPassword(id: string, name: string) {
  if (!id || isResetting.value) return
  resetPwTarget.value = { id, name }
  newPassword.value = ''
  resetPwError.value = ''
  showResetPw.value = true
}

function closeResetPassword() {
  if (isResetting.value) return
  showResetPw.value = false
}

watch(showResetPw, (isOpen) => {
  if (!isOpen && !isResetting.value) {
    newPassword.value = ''
    resetPwError.value = ''
  }
})

watch(newPassword, () => {
  if (resetPwError.value) resetPwError.value = ''
})

async function doResetPassword() {
  if (isResetting.value) return
  resetPwError.value = ''
  if (!resetPwTarget.value.id) {
    resetPwError.value = 'Pilih pengguna yang akan direset password-nya.'
    return
  }
  if (newPassword.value.length < 8) {
    resetPwError.value = 'Password minimal 8 karakter.'
    return
  }

  isResetting.value = true
  try {
    await usersService.resetPassword(resetPwTarget.value.id, newPassword.value)
    toast.success('Password berhasil direset.')
    showResetPw.value = false
    newPassword.value = ''
    resetPwError.value = ''
  } catch (e: unknown) {
    resetPwError.value = e instanceof Error ? e.message : 'Gagal mereset password.'
  } finally {
    isResetting.value = false
  }
}

onMounted(() => {
  void loadUsers()
})

onUnmounted(() => {
  latestRequestId += 1
})
</script>
