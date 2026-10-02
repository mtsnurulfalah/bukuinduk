<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <component
      :is="icon"
      class="h-12 w-12 text-slate-300 mb-4"
      :stroke-width="1.5"
    />
    <p class="text-base font-medium text-slate-600 mb-1">{{ title }}</p>
    <p v-if="description" class="text-sm text-slate-400 max-w-xs">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileSearch, Users, BookOpen, Inbox } from 'lucide-vue-next'

interface Props {
  title?: string
  description?: string
  type?: 'search' | 'data' | 'students' | 'default'
  customIcon?: unknown
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Tidak ada data',
  type: 'default',
})

const icon = computed(() => {
  if (props.customIcon) return props.customIcon
  return ({
    search:   FileSearch,
    data:     BookOpen,
    students: Users,
    default:  Inbox,
  })[props.type]
})
</script>
