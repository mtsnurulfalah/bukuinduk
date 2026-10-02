<template>
  <div
    :class="[
      'relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden',
      sizeClass,
      showImage ? 'bg-slate-200' : colorClass,
    ]"
  >
    <!-- BUG-14 FIX: Tampilkan gambar hanya jika src ada DAN belum error load.
         Saat gambar 404/gagal, imgError=true → fallback ke initials ditampilkan. -->
    <img
      v-if="showImage"
      :src="src!"
      :alt="name ?? 'Avatar'"
      class="h-full w-full object-cover"
      @error="imgError = true"
    />
    <span
      v-else
      :class="['font-semibold text-white select-none', textSizeClass]"
    >
      {{ initials(name) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { initials } from '@/utils'

interface Props {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'green' | 'purple' | 'teal' | 'orange'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'blue',
})

const imgError = ref(false)

// BUG-14 FIX: showImage hanya true jika src ada DAN belum error.
// Sebelumnya: v-if="src" tidak berubah saat imgError=true — tetap render <img> broken.
const showImage = computed(() => Boolean(props.src) && !imgError.value)

// Reset imgError saat src prop berubah ke URL baru
watch(() => props.src, () => { imgError.value = false })

const sizeClass = computed(() => ({
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}[props.size]))

const textSizeClass = computed(() => ({
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}[props.size]))

const colorClass = computed(() => ({
  blue:   'bg-primary-600',
  green:  'bg-green-600',
  purple: 'bg-purple-600',
  teal:   'bg-teal-600',
  orange: 'bg-orange-500',
}[props.color]))
</script>
