<template>
  <div class="space-y-5">
    <PageHeader title="Audit Log" subtitle="Riwayat seluruh aktivitas sistem" show-back
      :breadcrumbs="[{ label: 'Pengaturan', to: '/settings' }, { label: 'Audit Log' }]" />

    <BaseCard :padding="true">
      <div class="flex flex-wrap gap-3">
        <BaseInput v-model="filters.startDate" label="Dari Tanggal" type="date" class="w-36" />
        <BaseInput v-model="filters.endDate" label="Sampai Tanggal" type="date" class="w-36" />
        <BaseSelect v-model="filters.action" label="Aksi" :options="actionOptions" placeholder="Semua Aksi" class="w-36" />
        <BaseSelect v-model="filters.resourceType" label="Modul" :options="resourceOptions" placeholder="Semua" class="w-36" />
        <BaseButton size="sm" class="self-end" @click="load">
          <Search class="h-4 w-4" /> Filter
        </BaseButton>
        <BaseButton variant="ghost" size="sm" class="self-end" @click="resetFilters">
          <X class="h-4 w-4" /> Reset
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard :padding="false">
      <div v-if="isLoading" class="p-4 space-y-2">
        <BaseSkeleton v-for="i in 8" :key="i" height="h-12" />
      </div>
      <BaseRetry
        v-else-if="error"
        title="Audit Log gagal dimuat"
        :message="error"
        @retry="load"
      />
      <BaseEmpty v-else-if="!logs.length" title="Tidak ada log aktivitas" type="default" />
      <div v-else class="divide-y divide-slate-100">
        <div v-for="log in logs" :key="log.id" class="transition-colors">
          <button
            type="button"
            class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            :aria-expanded="expandedLogId === log.id"
            @click="toggleDetails(log.id)"
          >
            <div :class="['p-2 rounded-lg shrink-0 mt-0.5', actionIconBg(log.action)]">
              <component :is="actionIcon(log.action)" :class="['h-3.5 w-3.5', actionIconColor(log.action)]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium text-slate-800">{{ log.description }}</p>
                <ChevronDown
                  :class="['h-4 w-4 text-slate-400 shrink-0 transition-transform', expandedLogId === log.id ? 'rotate-180' : '']"
                />
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-xs text-slate-500">{{ log.userName || 'Sistem' }}</span>
                <BaseBadge :color="actionBadge(log.action)" size="sm">{{ log.action }}</BaseBadge>
                <span v-if="log.resourceType" class="text-xs text-slate-400">{{ log.resourceType }}</span>
                <span class="text-xs text-slate-400">{{ formatDateTime(log.createdAt) }}</span>
              </div>
            </div>
          </button>
          <div v-if="expandedLogId === log.id" class="px-4 pb-4">
            <div class="ml-10 rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div><p class="text-slate-400">ID Log</p><p class="font-mono text-slate-600 break-all">{{ log.id }}</p></div>
                <div><p class="text-slate-400">Resource ID</p><p class="font-mono text-slate-600 break-all">{{ log.resourceId || '—' }}</p></div>
                <div><p class="text-slate-400">Waktu</p><p class="text-slate-600">{{ formatDateTime(log.createdAt) }}</p></div>
              </div>
              <div v-if="log.oldValues || log.newValues" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-if="log.oldValues" class="rounded-lg bg-white border border-slate-200 p-3">
                  <p class="text-xs font-semibold text-slate-500 mb-1">Sebelum</p>
                  <pre class="text-[11px] text-slate-600 whitespace-pre-wrap break-words max-h-48 overflow-auto">{{ prettyJson(log.oldValues) }}</pre>
                </div>
                <div v-if="log.newValues" class="rounded-lg bg-white border border-slate-200 p-3">
                  <p class="text-xs font-semibold text-slate-500 mb-1">Sesudah</p>
                  <pre class="text-[11px] text-slate-600 whitespace-pre-wrap break-words max-h-48 overflow-auto">{{ prettyJson(log.newValues) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, X, Plus, Pencil, Trash2, LogIn, LogOut, Download, ShieldCheck, FileDown, AlertTriangle } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import { BaseCard, BaseInput, BaseSelect, BaseButton, BaseSkeleton, BaseEmpty, BaseBadge, BasePagination, BaseRetry } from '@/components/ui'
import { reportsService } from '@/services'
import { formatDateTime } from '@/utils'
import type { AuditLog } from '@/types'

const logs = ref<AuditLog[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const isLoading = ref(true)
const error = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const filters = reactive({ startDate: '', endDate: '', action: '', resourceType: '' })
const expandedLogId = ref('')

function toggleDetails(id: string) {
  expandedLogId.value = expandedLogId.value === id ? '' : id
}

function prettyJson(value?: string) {
  if (!value) return ''
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

const actionOptions = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ARCHIVE', 'IMPORT', 'VERIFY', 'EXPORT', 'ERROR',
].map(v => ({ value: v, label: v }))

const resourceOptions = [
  'student', 'student_parent', 'student_health', 'student_document', 'student_verification', 'teacher', 'classroom', 'user', 'settings', 'school_year',
].map(v => ({ value: v, label: v }))

function actionIcon(action: string) {
  const map: Record<string, unknown> = {
    CREATE: Plus, UPDATE: Pencil, DELETE: Trash2,
    LOGIN: LogIn, LOGOUT: LogOut, ARCHIVE: Download,
    VERIFY: ShieldCheck, EXPORT: FileDown, ERROR: AlertTriangle,
  }
  return map[action] ?? Pencil
}
function actionIconBg(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100', UPDATE: 'bg-amber-100', DELETE: 'bg-red-100',
    LOGIN: 'bg-blue-100', LOGOUT: 'bg-slate-100', ARCHIVE: 'bg-purple-100',
    VERIFY: 'bg-green-100', EXPORT: 'bg-teal-100', ERROR: 'bg-red-100',
  }
  return map[action] ?? 'bg-slate-100'
}
function actionIconColor(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'text-green-600', UPDATE: 'text-amber-600', DELETE: 'text-red-600',
    LOGIN: 'text-blue-600', LOGOUT: 'text-slate-500', ARCHIVE: 'text-purple-600',
    VERIFY: 'text-green-600', EXPORT: 'text-teal-600', ERROR: 'text-red-600',
  }
  return map[action] ?? 'text-slate-500'
}
function actionBadge(action: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple' | 'teal' {
  const map: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple' | 'teal'> = {
    CREATE: 'green', UPDATE: 'amber', DELETE: 'red',
    LOGIN: 'blue', LOGOUT: 'slate', ARCHIVE: 'purple',
    VERIFY: 'green', EXPORT: 'teal', ERROR: 'red',
  }
  return map[action] ?? 'slate'
}

function resetFilters() {
  Object.assign(filters, { startDate: '', endDate: '', action: '', resourceType: '' })
  page.value = 1
  load()
}

function onPageChange(p: number) { page.value = p; load() }

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    const res = await reportsService.getAuditLogs({ ...filters, page: page.value, limit: limit.value })
    logs.value = res.items
    total.value = res.total
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat audit log.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>
