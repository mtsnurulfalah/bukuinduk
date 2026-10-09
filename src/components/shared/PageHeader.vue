<template>
  <div class="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <!-- Back button -->
      <button
        v-if="showBack"
        type="button"
        aria-label="Kembali"
        class="min-h-10 min-w-10 shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        @click="handleBack"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="min-w-0 flex-1">
        <!-- Breadcrumb opsional -->
        <nav v-if="breadcrumbs?.length" class="mb-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1" aria-label="Breadcrumb">
          <template v-for="(crumb, i) in breadcrumbs" :key="i">
            <RouterLink
              v-if="crumb.to && i < breadcrumbs.length - 1"
              :to="crumb.to"
              class="break-words text-xs text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:underline"
            >
              {{ crumb.label }}
            </RouterLink>
            <span v-else class="break-words text-xs text-slate-400">{{ crumb.label }}</span>
            <span v-if="i < breadcrumbs.length - 1" class="text-xs text-slate-300">/</span>
          </template>
        </nav>

        <h1 class="break-words text-xl font-bold leading-tight text-slate-800">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 break-words text-sm text-slate-500">{{ subtitle }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

interface Breadcrumb {
  label: string
  to?: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
  backTo?: string
  breadcrumbs?: Breadcrumb[]
}>()

const router = useRouter()

function handleBack() {
  if (props.backTo) {
    void router.push(props.backTo)
    return
  }

  router.back()
}
</script>
