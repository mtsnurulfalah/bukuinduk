<template>
  <BaseBadge :color="color" :dot="dot">
    {{ label }}
  </BaseBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { formatStudentStatus, studentStatusColor } from '@/utils'

const props = defineProps<{ status?: string | null; dot?: boolean }>()

const label = computed(() => formatStudentStatus(props.status))

const color = computed((): 'green' | 'red' | 'blue' | 'amber' | 'slate' => {
  const map: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'slate'> = {
    active:       'green',
    inactive:     'slate',
    graduated:    'blue',
    transferred:  'amber',
    dropped_out:  'red',
  }
  return map[props.status ?? ''] ?? 'slate'
})
</script>
