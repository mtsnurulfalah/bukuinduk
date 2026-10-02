<template>
  <div class="flex flex-col sm:flex-row gap-3">
    <!-- Search input -->
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        :value="search"
        type="text"
        :placeholder="searchPlaceholder"
        class="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="search"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
        @click="$emit('update:search', '')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Filter slots -->
    <div v-if="$slots.filters" class="flex flex-wrap gap-2">
      <slot name="filters" />
    </div>

    <!-- Action slot (tombol tambah, export, dll) -->
    <div v-if="$slots.actions" class="flex gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  search: string
  searchPlaceholder?: string
}>(), {
  searchPlaceholder: 'Cari...',
})

defineEmits<{ 'update:search': [v: string] }>()
</script>
