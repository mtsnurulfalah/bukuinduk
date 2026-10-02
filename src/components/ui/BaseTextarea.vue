<template>
  <div class="w-full">
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <textarea
      :id="textareaId"
      v-bind="$attrs"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :class="[
        'block w-full rounded-lg border text-sm text-slate-800 placeholder-slate-400 transition-colors resize-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
        'px-3 py-2',
        hasError
          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
          : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <p v-if="hasError" class="mt-1 text-xs text-red-500">{{ errorMessage }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { uid } from '@/utils'

interface Props {
  modelValue?: string | null
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  rows?: number
  errorMessage?: string
  hint?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  rows: 3,
  disabled: false,
  readonly: false,
  required: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const textareaId = computed(() => props.id ?? `textarea-${uid()}`)
const hasError = computed(() => Boolean(props.errorMessage))
</script>

<script lang="ts">
export default { inheritAttrs: false }
</script>
