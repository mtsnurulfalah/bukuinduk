<template>
  <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-5 border-b border-slate-100">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <ShieldCheck class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-800">Kualitas & Kelengkapan Data</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Ringkasan kelengkapan data siswa aktif
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
          <RouterLink
            to="/reports/intelligence"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Intelligence
            <Lightbulb class="h-3.5 w-3.5" />
          </RouterLink>
          <RouterLink
            to="/students"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Data siswa
            <ChevronRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="p-5 space-y-4">
      <div class="flex items-center gap-4">
        <BaseSkeleton height="h-20" width="w-20" rounded />
        <div class="flex-1 space-y-2">
          <BaseSkeleton height="h-4" width="w-36" />
          <BaseSkeleton height="h-3" width="w-56" />
          <BaseSkeleton height="h-2.5" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseSkeleton v-for="i in 6" :key="i" height="h-12" />
      </div>
    </div>

    <BaseRetry
      v-else-if="error"
      class="m-4 sm:m-5"
      :loading="isLoading"
      title="Kualitas data belum dapat dimuat"
      :message="error"
      button-text="Muat ulang"
      @retry="load"
    />

    <div v-else-if="data" class="p-5 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 42 42" class="h-20 w-20 -rotate-90" aria-hidden="true">
            <circle
              cx="21"
              cy="21"
              r="16"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              class="text-slate-100"
            />
            <circle
              cx="21"
              cy="21"
              r="16"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="`100, 100`"
              :stroke-dashoffset="`${100 - data.overallPercent}`"
              class="text-primary-600 transition-all duration-700"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-lg font-bold text-slate-800">{{ data.overallPercent }}%</span>
            <span class="text-[10px] text-slate-400">lengkap</span>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-700">
                {{ formatNumber(data.completeStudents) }} siswa lengkap
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                dari {{ formatNumber(data.totalStudents) }} siswa aktif
              </p>
            </div>
            <BaseBadge :color="qualityColor" dot>
              {{ qualityLabel }}
            </BaseBadge>
          </div>

          <div class="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full bg-primary-600 rounded-full transition-all duration-700"
              :style="{ width: `${data.overallPercent}%` }"
            />
          </div>

          <p class="text-xs text-slate-500 mt-2">
            <span class="font-semibold text-amber-600">{{ formatNumber(data.needsAttention) }}</span>
            siswa masih membutuhkan perhatian.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="section in data.sections"
          :key="section.key"
          class="rounded-lg border border-slate-100 bg-slate-50/70 p-3"
        >
          <div class="flex items-center justify-between gap-3 mb-2">
            <p class="text-xs font-semibold text-slate-700 truncate">{{ section.label }}</p>
            <span class="text-xs font-bold tabular-nums text-slate-600">{{ section.percent }}%</span>
          </div>

          <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="section.percent >= 90 ? 'bg-green-500' : section.percent >= 70 ? 'bg-amber-500' : 'bg-red-500'"
              :style="{ width: `${section.percent}%` }"
            />
          </div>

          <p class="text-[11px] text-slate-400 mt-1.5">
            {{ formatNumber(section.completed) }} lengkap ·
            {{ formatNumber(section.missing) }} perlu dilengkapi
          </p>
        </div>
      </div>

      <div
        v-if="data.insights.length"
        class="rounded-xl border border-primary-100 bg-primary-50/60 p-4"
      >
        <div class="flex items-start gap-3">
          <Lightbulb class="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Insight
            </p>
            <div class="mt-2 space-y-1.5">
              <p
                v-for="insight in data.insights"
                :key="insight"
                class="text-xs leading-relaxed text-primary-900"
              >
                {{ insight }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p class="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
        Diperbarui {{ formatDate(data.generatedAt) }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChevronRight, Lightbulb, ShieldCheck } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { reportsService } from '@/services'
import { formatNumber } from '@/utils'
import type { DataCompleteness } from '@/types'
import { BaseBadge, BaseRetry, BaseSkeleton } from '@/components/ui'

const data = ref<DataCompleteness | null>(null)
const isLoading = ref(true)
const error = ref('')
let latestRequestId = 0

const qualityLabel = computed(() => {
  const value = data.value?.overallPercent ?? 0
  if (value >= 90) return 'Sangat Baik'
  if (value >= 75) return 'Baik'
  if (value >= 60) return 'Perlu Perhatian'
  return 'Perlu Perbaikan'
})

const qualityColor = computed<'green' | 'blue' | 'amber' | 'red'>(() => {
  const value = data.value?.overallPercent ?? 0
  if (value >= 90) return 'green'
  if (value >= 75) return 'blue'
  if (value >= 60) return 'amber'
  return 'red'
})

function formatDate(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'baru saja'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function load() {
  const requestId = ++latestRequestId
  isLoading.value = true
  error.value = ''
  try {
    const value = await reportsService.getDataCompleteness()
    if (requestId === latestRequestId) data.value = value
  } catch (e: unknown) {
    if (requestId === latestRequestId) {
      error.value = e instanceof Error
        ? e.message
        : 'Gagal memuat ringkasan kualitas data.'
    }
  } finally {
    if (requestId === latestRequestId) isLoading.value = false
  }
}

onMounted(load)
onUnmounted(() => {
  latestRequestId += 1
})
</script>
