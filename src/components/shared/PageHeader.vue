<template>
  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
    <div class="flex items-center gap-3">
      <!-- Back button -->
      <button
        v-if="showBack"
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
        @click="$router.back()"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div>
        <!-- Breadcrumb opsional -->
        <nav v-if="breadcrumbs?.length" class="flex items-center gap-1.5 mb-1" aria-label="Breadcrumb">
          <template v-for="(crumb, i) in breadcrumbs" :key="i">
            <RouterLink
              v-if="crumb.to && i < breadcrumbs.length - 1"
              :to="crumb.to"
              class="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {{ crumb.label }}
            </RouterLink>
            <span v-else class="text-xs text-slate-400">{{ crumb.label }}</span>
            <span v-if="i < breadcrumbs.length - 1" class="text-slate-300 text-xs">/</span>
          </template>
        </nav>

        <h1 class="text-xl font-bold text-slate-800 leading-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-slate-500 mt-0.5">{{ subtitle }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Breadcrumb {
  label: string
  to?: string
}

defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
  breadcrumbs?: Breadcrumb[]
}>()
</script>
