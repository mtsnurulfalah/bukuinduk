<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses,
      variantClasses,
    ]"
    v-bind="$attrs"
  >
    <BaseSpinner v-if="loading" :size="spinnerSize" class="shrink-0" />
    <slot v-if="!loading || !hideContentWhenLoading" />
    <span v-if="loading && loadingText">{{ loadingText }}</span>
  </button>
</template>

<script setup lang="ts">
import BaseSpinner from './BaseSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  loadingText?: string
  hideContentWhenLoading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
})

const sizeClasses = computed(() => ({
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}[props.size]))

const variantClasses = computed(() => ({
  primary:   'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success:   'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  ghost:     'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  outline:   'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
}[props.variant]))

const spinnerSize = computed(() => props.size === 'lg' ? 'md' : 'sm')
</script>

<script lang="ts">
import { computed } from 'vue'
export default { inheritAttrs: false }
</script>
