<template>
  <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
    <!-- Info -->
    <p class="text-sm text-slate-500 order-2 sm:order-1">
      Menampilkan
      <span class="font-medium text-slate-700">{{ from }}–{{ to }}</span>
      dari
      <span class="font-medium text-slate-700">{{ total }}</span>
      data
    </p>

    <!-- Tombol navigasi -->
    <div class="flex items-center gap-1 order-1 sm:order-2">
      <!-- First -->
      <button
        :disabled="currentPage === 1"
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Halaman pertama"
        @click="$emit('update:currentPage', 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Prev -->
      <button
        :disabled="currentPage === 1"
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Sebelumnya"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page numbers -->
      <template v-for="page in visiblePages" :key="page">
        <span v-if="page === '...'" class="px-2 text-slate-400 text-sm">…</span>
        <button
          v-else
          :class="[
            'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
            page === currentPage
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 hover:bg-slate-100',
          ]"
          @click="$emit('update:currentPage', page as number)"
        >
          {{ page }}
        </button>
      </template>

      <!-- Next -->
      <button
        :disabled="currentPage === totalPages"
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Berikutnya"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Last -->
      <button
        :disabled="currentPage === totalPages"
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Halaman terakhir"
        @click="$emit('update:currentPage', totalPages)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
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
