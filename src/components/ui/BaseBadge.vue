<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full font-medium',
      sizeClass,
      colorClass,
    ]"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  color?: 'green' | 'red' | 'blue' | 'amber' | 'slate' | 'purple' | 'teal' | 'orange'
  size?: 'sm' | 'md'
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'slate',
  size: 'sm',
  dot: false,
})

const sizeClass = computed(() => ({
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}[props.size]))

const colorClass = computed(() => ({
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  amber:  'bg-amber-100 text-amber-700',
  slate:  'bg-slate-100 text-slate-600',
  purple: 'bg-purple-100 text-purple-700',
  teal:   'bg-teal-100 text-teal-700',
  orange: 'bg-orange-100 text-orange-700',
}[props.color]))
</script>
