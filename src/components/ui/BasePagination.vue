<template>
  <nav v-if="totalPages > 1" aria-label="Navigasi halaman" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
    <!-- Info -->
    <p class="order-2 text-sm text-slate-500 sm:order-1" aria-live="polite">
      Menampilkan
      <span class="font-medium text-slate-700">{{ from }}–{{ to }}</span>
      dari
      <span class="font-medium text-slate-700">{{ total }}</span>
      data
    </p>

    <!-- Tombol navigasi -->
    <div class="order-1 flex items-center gap-1 sm:order-2">
      <!-- First -->
      <button
        type="button"
        :disabled="currentPage === 1"
        aria-label="Halaman pertama"
        title="Halaman pertama"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        @click="$emit('update:currentPage', 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Prev -->
      <button
        type="button"
        :disabled="currentPage === 1"
        aria-label="Halaman sebelumnya"
        title="Sebelumnya"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page numbers -->
      <template
        v-for="(page, pageIndex) in visiblePages"
        :key="typeof page === 'number' ? `page-${page}` : `ellipsis-${pageIndex}`"
      >
        <span v-if="page === '...'" class="px-2 text-slate-400 text-sm">…</span>
        <button
          v-else
          type="button"
          :class="[
            'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            page === currentPage
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 hover:bg-slate-100',
          ]"
          :aria-label="page === currentPage ? `Halaman ${page}, aktif` : `Buka halaman ${page}`"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="$emit('update:currentPage', page as number)"
        >
          {{ page }}
        </button>
      </template>

      <!-- Next -->
      <button
        type="button"
        :disabled="currentPage === totalPages"
        aria-label="Halaman berikutnya"
        title="Berikutnya"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Last -->
      <button
        type="button"
        :disabled="currentPage === totalPages"
        aria-label="Halaman terakhir"
        title="Halaman terakhir"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        @click="$emit('update:currentPage', totalPages)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  total: number
  limit: number
}

const props = defineProps<Props>()
defineEmits<{ 'update:currentPage': [page: number] }>()

const from = computed(() => Math.min((props.currentPage - 1) * props.limit + 1, props.total))
const to = computed(() => Math.min(props.currentPage * props.limit, props.total))

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const { currentPage: cp, totalPages: tp } = props

  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)

  return pages
})
</script>
