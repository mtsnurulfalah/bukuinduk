<template>
  <div class="flex w-full min-w-0 flex-col gap-3 sm:flex-row">
    <!-- Search input -->
    <div class="relative min-w-0 flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        :value="search"
        type="text"
        :placeholder="searchPlaceholder"
        :aria-label="searchLabel"
        class="min-h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-10 text-sm transition-colors focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        v-if="search"
        aria-label="Hapus pencarian"
        title="Hapus pencarian"
        class="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        @click="$emit('update:search', '')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Filter slots -->
    <div v-if="$slots.filters" class="flex min-w-0 flex-wrap gap-2">
      <slot name="filters" />
    </div>

    <!-- Action slot (tombol tambah, export, dll) -->
    <div v-if="$slots.actions" class="flex min-w-0 flex-wrap gap-2 sm:shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  search: string
  searchPlaceholder?: string
  searchLabel?: string
}>(), {
  searchPlaceholder: 'Cari...',
  searchLabel: 'Cari data',
})

defineEmits<{ 'update:search': [v: string] }>()
</script>
