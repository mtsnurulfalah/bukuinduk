<template>
  <div
    :class="[
      'animate-pulse bg-slate-200 rounded',
      rounded ? 'rounded-full' : 'rounded-md',
      heightClass,
      widthClass,
    ]"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  height?: string  // Tailwind h-* class, e.g. 'h-4'
  width?: string   // Tailwind w-* class, e.g. 'w-full'
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 'h-4',
  width: 'w-full',
  rounded: false,
})

const heightClass = computed(() => props.height)
const widthClass = computed(() => props.width)
</script>
