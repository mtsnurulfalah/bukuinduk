<template>
  <div
    class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    role="alert"
  >
    <RefreshCw class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="font-medium">{{ title }}</p>
      <p v-if="message" class="mt-0.5 text-amber-700">{{ message }}</p>
    </div>
    <BaseButton
      variant="outline"
      size="sm"
      :loading="loading"
      loading-text="Memuat..."
      class="shrink-0"
      @click="$emit('retry')"
    >
      {{ buttonText }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

withDefaults(defineProps<{
  title?: string
  message?: string
  buttonText?: string
  loading?: boolean
}>(), {
  title: 'Data gagal dimuat',
  message: 'Bagian ini dapat dimuat ulang tanpa me-refresh seluruh halaman.',
  buttonText: 'Muat ulang',
  loading: false,
})

defineEmits<{ retry: [] }>()
</script>
