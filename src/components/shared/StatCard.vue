<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
    <!-- Icon -->
    <div :class="['p-3 rounded-xl shrink-0', iconBg]">
      <component :is="icon" :class="['h-5 w-5', iconColor]" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm text-slate-500 font-medium truncate">{{ label }}</p>
      <div class="flex items-end gap-2 mt-1">
        <p v-if="!loading" class="text-2xl font-bold text-slate-800 leading-none">
          {{ formattedValue }}
        </p>
        <BaseSkeleton v-else height="h-7" width="w-16" />
        <span
          v-if="trend !== undefined && !loading"
          :class="[
            'text-xs font-medium pb-0.5',
            trend >= 0 ? 'text-green-600' : 'text-red-600',
          ]"
        >
          {{ trend >= 0 ? '+' : '' }}{{ trend }}%
        </span>
      </div>
      <p v-if="subtitle" class="text-xs text-slate-400 mt-1 truncate">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { formatNumber } from '@/utils'

interface Props {
  label: string
  value?: number | string | null
  subtitle?: string
  trend?: number
  icon: unknown
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'teal'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  loading: false,
})

const formattedValue = computed(() => {
  if (props.value == null) return '0'
  if (typeof props.value === 'number') return formatNumber(props.value)
  return props.value
})

const iconBg = computed(() => ({
  blue:   'bg-blue-100',
  green:  'bg-green-100',
  purple: 'bg-purple-100',
  amber:  'bg-amber-100',
  red:    'bg-red-100',
  teal:   'bg-teal-100',
}[props.color]))

const iconColor = computed(() => ({
  blue:   'text-blue-600',
  green:  'text-green-600',
  purple: 'text-purple-600',
  amber:  'text-amber-600',
  red:    'text-red-600',
  teal:   'text-teal-600',
}[props.color]))
</script>
