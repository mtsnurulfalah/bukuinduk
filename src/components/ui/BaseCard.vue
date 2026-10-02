<template>
  <div :class="['bg-white rounded-xl border border-slate-200', shadow ? 'shadow-sm' : '', padding ? 'p-5' : '', $attrs.class]">
    <!-- Header opsional -->
    <div v-if="title || $slots.header" class="flex items-center justify-between mb-4">
      <div>
        <h3 v-if="title" class="text-base font-semibold text-slate-800">{{ title }}</h3>
        <p v-if="subtitle" class="text-sm text-slate-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="header" />
    </div>

    <slot />

    <!-- Footer opsional -->
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-slate-100">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  shadow?: boolean
  padding?: boolean
}>(), {
  shadow: true,
  padding: true,
})
</script>

<script lang="ts">
export default { inheritAttrs: false }
</script>
