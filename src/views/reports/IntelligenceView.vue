<template>
  <div class="space-y-6">
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
      v-if="error"
      title="Insight belum dapat dimuat"
      :message="error"
      button-text="Coba lagi"
      @retry="load"
    />

    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Siswa Aktif"
          :value="data?.summary.activeStudents"
          :icon="Users"
          color="blue"
          :loading="isLoading"
          subtitle="Populasi yang dianalisis"
        />
        <StatCard
          label="Perlu Ditinjau"
          :value="data?.summary.studentsNeedingAttention"
          :icon="TriangleAlert"
          color="amber"
          :loading="isLoading"
          subtitle="Memiliki minimal 1 temuan"
        />
        <StatCard
          label="Tanpa Rombel"
          :value="data?.summary.studentsWithoutClass"
          :icon="School"
          color="red"
          :loading="isLoading"
          subtitle="Siswa aktif tanpa kelas"
        />
        <StatCard
          label="Duplikasi"
          :value="data?.summary.duplicateStudents"
          :icon="Copy"
          color="purple"
          :loading="isLoading"
          subtitle="NIS/NISN terindikasi ganda"
        />
      </div>

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      <h3 class="text-sm font-semibold text-slate-800">{{ insight.title }}</h3>
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

            <div v-else class="p-8 text-center text-sm text-slate-400">
              Tidak ada temuan yang perlu ditampilkan.
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

          <div v-if="data.attentionStudents.length" class="overflow-x-auto">
            <table class="min-w-full text-sm">
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
                    <p class="font-medium text-slate-800">{{ student.fullName }}</p>
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
import { onMounted, ref } from 'vue'
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
import type { IntelligenceReport } from '@/types'

const data = ref<IntelligenceReport | null>(null)
const isLoading = ref(true)
const error = ref('')

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value || 'baru saja'
  }
}

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    data.value = await reportsService.getIntelligence()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat Intelligence Center.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>
