<template>
  <div
    v-if="visible"
    :class="[
      'flex gap-3 rounded-lg border p-4 text-sm',
      variantClasses,
    ]"
    role="alert"
  >
    <component :is="icon" class="h-5 w-5 shrink-0 mt-0.5" />
    <div class="flex-1 min-w-0">
      <p v-if="title" class="font-medium mb-0.5">{{ title }}</p>
      <div class="leading-relaxed">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      aria-label="Tutup notifikasi"
      class="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 focus:outline-none focus:opacity-100 transition-opacity"
      @click="dismiss"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CheckCircle, AlertCircle, Info, AlertTriangle,
} from 'lucide-vue-next'

interface Props {
  type?: 'success' | 'error' | 'info' | 'warning'
  title?: string
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  dismissible: false,
})

/**
 * BUG-3 FIX: Tambahkan emit 'dismiss' agar parent dapat bereaksi saat user
 * menutup alert — misal mereset errorMsg sehingga :key berubah dan komponen
 * di-remount dengan `visible = true` ketika error baru muncul.
 *
 * Pola di LoginView: <BaseAlert :key="errorMsg" @dismiss="errorMsg = ''" />
 * Setiap kali errorMsg berubah ke nilai baru, komponen di-remount → visible
 * kembali true. Saat dismiss ditekan, errorMsg di-reset ke '' → v-if="errorMsg"
 * menjadi false → komponen unmount sepenuhnya.
 */
const emit = defineEmits<{ dismiss: [] }>()

const visible = ref(true)

function dismiss() {
  visible.value = false
  emit('dismiss')
}

const variantClasses = computed(() => ({
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}[props.type]))

const icon = computed(() => ({
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
}[props.type]))
</script>
