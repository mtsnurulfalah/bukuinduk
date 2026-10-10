<template>
  <div class="min-w-0 space-y-6">
    <PageHeader
      title="Intelligence Center"
      subtitle="Deteksi otomatis area data siswa yang perlu ditinjau dan ditindaklanjuti."
      :breadcrumbs="[{ label: 'Laporan', to: '/reports' }, { label: 'Intelligence' }]"
    >
      <template #actions>
        <BaseButton variant="outline" size="sm" :loading="isLoading" @click="load">
          <RefreshCw class="h-4 w-4" />
          Perbarui
        </BaseButton>
      </template>
    </PageHeader>

    <BaseRetry
      v-if="error && !data"
      title="Insight belum dapat dimuat"
      :message="error"
      button-text="Coba lagi"
      @retry="load"
    />

    <template v-else>
      <div
        v-if="error && data"
        class="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
        role="alert"
      >
        <div class="min-w-0">
          <p class="font-semibold">Pembaruan data gagal</p>
          <p class="mt-0.5 break-words text-amber-700">{{ error }} Data terakhir tetap ditampilkan.</p>
        </div>
        <BaseButton variant="outline" size="sm" :loading="isLoading" @click="load">
          Coba lagi
        </BaseButton>
      </div>
      <div
        v-else-if="isLoading && data"
        class="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700"
        role="status"
        aria-live="polite"
      >
        <RefreshCw class="h-4 w-4 shrink-0 animate-spin" />
        Memperbarui analisis. Data terakhir tetap ditampilkan.
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Siswa Aktif"
          :value="data?.summary.activeStudents"
          :icon="Users"
          color="blue"
          :loading="isLoading && !data"
          subtitle="Populasi yang dianalisis"
        />
        <StatCard
          label="Perlu Ditinjau"
          :value="data?.summary.studentsNeedingAttention"
          :icon="TriangleAlert"
          color="amber"
          :loading="isLoading && !data"
          subtitle="Memiliki minimal 1 temuan"
        />
        <StatCard
          label="Tanpa Rombel"
          :value="data?.summary.studentsWithoutClass"
          :icon="School"
          color="red"
          :loading="isLoading && !data"
          subtitle="Siswa aktif tanpa kelas"
        />
        <StatCard
          label="Duplikasi"
          :value="data?.summary.duplicateStudents"
          :icon="Copy"
          color="purple"
          :loading="isLoading && !data"
          subtitle="NIS/NISN terindikasi ganda"
        />
      </div>

      <div v-if="isLoading && !data" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BaseSkeleton height="h-56" />
        <BaseSkeleton height="h-56" />
      </div>

      <template v-else-if="data">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Lightbulb class="h-4 w-4" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-slate-800">Insight Otomatis</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Temuan berbasis aturan dari data saat ini.</p>
                </div>
              </div>
            </div>

            <div v-if="data.insights.length" class="p-5 space-y-3">
              <article
                v-for="insight in data.insights"
                :key="insight.id"
                class="rounded-lg border border-slate-100 bg-slate-50/70 p-4"
              >
                <div class="flex items-start gap-3">
                  <div
                    :class="[
                      'mt-0.5 h-2.5 w-2.5 rounded-full shrink-0',
                      insight.severity === 'high'
                        ? 'bg-red-500'
                        : insight.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-sky-500',
                    ]"
                  />
                  <div class="min-w-0">
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="min-w-0 break-words text-sm font-semibold text-slate-800">{{ insight.title }}</h3>
                      <span class="text-xs font-semibold tabular-nums text-slate-500 shrink-0">
                        {{ formatNumber(insight.count) }}
                      </span>
                    </div>
                    <p class="text-xs leading-relaxed text-slate-500 mt-1">
                      {{ insight.description }}
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="p-8 text-center" role="status">
              <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Lightbulb class="h-5 w-5" />
              </div>
              <p class="mt-3 text-sm font-semibold text-slate-700">Belum ada temuan utama</p>
              <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                Berdasarkan aturan pemeriksaan saat ini, tidak ada insight yang perlu ditindaklanjuti.
              </p>
            </div>
          </section>

          <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-lg bg-primary-50 text-primary-600">
                  <Activity class="h-4 w-4" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-slate-800">Ringkasan Temuan</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Distribusi kategori yang perlu diperiksa.</p>
                </div>
              </div>
            </div>

            <div class="p-5 space-y-4">
              <div v-for="item in data.breakdown" :key="item.key" class="space-y-1.5">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm text-slate-600">{{ item.label }}</span>
                  <span class="text-sm font-semibold tabular-nums text-slate-800">{{ formatNumber(item.count) }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary-500 transition-all duration-500"
                    :style="{ width: item.percent + '%' }"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Siswa tanpa temuan</p>
                  <p class="text-lg font-bold text-slate-800 mt-1">{{ formatNumber(data.summary.studentsWithoutIssues) }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Isu per siswa</p>
                  <p class="text-lg font-bold text-slate-800 mt-1">{{ data.summary.averageIssuesPerStudent }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <DataQualityCard />

        <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-800">Antrian Perlu Ditinjau</h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Maksimal 12 siswa dengan jumlah temuan terbanyak ditampilkan terlebih dahulu.
              </p>
            </div>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {{ formatNumber(data.attentionStudents.length) }} ditampilkan
            </span>
          </div>

          <div v-if="data.attentionStudents.length" class="overflow-x-auto overscroll-x-contain">
            <table class="min-w-[42rem] w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-5 py-3 text-left">Siswa</th>
                  <th class="px-4 py-3 text-left">Kelas</th>
                  <th class="px-4 py-3 text-left">Temuan</th>
                  <th class="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr
                  v-for="student in data.attentionStudents"
                  :key="student.studentId"
                  class="hover:bg-slate-50 transition-colors"
                >
                  <td class="px-5 py-3">
                    <p class="break-words font-medium text-slate-800">{{ student.fullName }}</p>
                    <p class="text-xs font-mono text-slate-400 mt-0.5">{{ student.nis || 'NIS belum diisi' }}</p>
                  </td>
                  <td class="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {{ student.classroomName || 'Belum ada rombel' }}
                  </td>
                  <td class="px-4 py-3 min-w-[18rem]">
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="issue in student.issues"
                        :key="issue.key"
                        :class="[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          issue.severity === 'high'
                            ? 'bg-red-50 text-red-700'
                            : issue.severity === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-sky-50 text-sky-700',
                        ]"
                      >
                        {{ issue.label }}
                      </span>
                    </div>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <RouterLink
                      :to="'/students/' + student.studentId"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Detail
                      <ArrowUpRight class="h-3.5 w-3.5" />
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="p-10 text-center text-sm text-slate-400">
            Tidak ada siswa yang perlu ditinjau.
          </div>
        </section>

        <p class="text-[11px] text-slate-400 text-right">
          Analisis dibuat {{ formatDate(data.generatedAt) }} · seluruh temuan bersifat indikator dan tetap perlu diverifikasi sebelum tindakan.
        </p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Activity,
  ArrowUpRight,
  Copy,
  Lightbulb,
  RefreshCw,
  School,
  TriangleAlert,
  Users,
} from 'lucide-vue-next'
import { DataQualityCard, PageHeader, StatCard } from '@/components/shared'
import { BaseButton, BaseRetry, BaseSkeleton } from '@/components/ui'
import { reportsService } from '@/services'
import { formatNumber } from '@/utils'
import type { IntelligenceReport, IntelligenceSeverity } from '@/types'

const data = ref<IntelligenceReport | null>(null)
const isLoading = ref(true)
const error = ref('')
let latestRequestId = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function safeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function safeSeverity(value: unknown): IntelligenceSeverity {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low'
}

/** Validasi dan normalkan respons GAS sebelum dipakai oleh template. */
function normalizeIntelligenceReport(value: unknown): IntelligenceReport {
  if (
    !isRecord(value) ||
    !isRecord(value.summary) ||
    !Array.isArray(value.insights) ||
    !Array.isArray(value.breakdown) ||
    !Array.isArray(value.attentionStudents)
  ) {
    throw new Error('Format respons Intelligence Center tidak valid. Muat ulang data atau periksa deployment backend GAS.')
  }

  const summary = value.summary
  const insights = value.insights.filter(isRecord).map((item, index) => ({
    id: safeText(item.id, 'insight-' + index),
    title: safeText(item.title, 'Temuan'),
    description: safeText(item.description),
    severity: safeSeverity(item.severity),
    count: safeNumber(item.count),
  }))

  const breakdown = value.breakdown.filter(isRecord).map((item, index) => ({
    key: safeText(item.key, 'category-' + index),
    label: safeText(item.label, 'Kategori'),
    count: safeNumber(item.count),
    percent: Math.min(100, safeNumber(item.percent)),
  }))

  const attentionStudents = value.attentionStudents.filter(isRecord).map((student, index) => ({
    studentId: safeText(student.studentId, 'student-' + index),
    fullName: safeText(student.fullName, 'Tanpa nama'),
    nis: safeText(student.nis),
    classroomName: safeText(student.classroomName),
    issues: Array.isArray(student.issues)
      ? student.issues.filter(isRecord).map((issue, issueIndex) => ({
          key: safeText(issue.key, 'issue-' + issueIndex),
          label: safeText(issue.label, 'Perlu ditinjau'),
          severity: safeSeverity(issue.severity),
        }))
      : [],
  }))

  return {
    summary: {
      activeStudents: safeNumber(summary.activeStudents),
      studentsNeedingAttention: safeNumber(summary.studentsNeedingAttention),
      studentsWithoutIssues: safeNumber(summary.studentsWithoutIssues),
      studentsWithoutClass: safeNumber(summary.studentsWithoutClass),
      duplicateStudents: safeNumber(summary.duplicateStudents),
      duplicateNis: safeNumber(summary.duplicateNis),
      duplicateNisn: safeNumber(summary.duplicateNisn),
      ageReviewStudents: safeNumber(summary.ageReviewStudents),
      averageIssuesPerStudent: safeNumber(summary.averageIssuesPerStudent),
    },
    insights,
    breakdown,
    attentionStudents,
    generatedAt: safeText(value.generatedAt),
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'baru saja'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'baru saja'
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
    const response = await reportsService.getIntelligence()
    if (requestId === latestRequestId) {
      data.value = normalizeIntelligenceReport(response)
    }
  } catch (e: unknown) {
    if (requestId === latestRequestId) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat Intelligence Center.'
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
