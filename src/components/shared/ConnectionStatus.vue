<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed top-3 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)]"
      role="status"
      aria-live="polite"
    >
      <div
        :class="[
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm',
          isOnline
            ? 'border-green-200 bg-green-50/95 text-green-700'
            : 'border-amber-200 bg-amber-50/95 text-amber-800',
        ]"
      >
        <Wifi v-if="isOnline" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <WifiOff v-else class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{{ isOnline ? 'Koneksi kembali' : 'Anda sedang offline' }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Wifi, WifiOff } from 'lucide-vue-next'

const isOnline = ref(true)
const visible = ref(false)
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function showOffline() {
  isOnline.value = false
  visible.value = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
}

function showOnline() {
  isOnline.value = true
  visible.value = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    visible.value = false
    reconnectTimer = null
  }, 2500)
}

onMounted(() => {
  isOnline.value = navigator.onLine
  if (!isOnline.value) visible.value = true
  window.addEventListener('offline', showOffline)
  window.addEventListener('online', showOnline)
})

onUnmounted(() => {
  window.removeEventListener('offline', showOffline)
  window.removeEventListener('online', showOnline)
  if (reconnectTimer) clearTimeout(reconnectTimer)
})
</script>
