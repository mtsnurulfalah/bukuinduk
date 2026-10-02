<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <div class="relative">
      <!-- Prefix icon -->
      <div v-if="$slots.prefix || prefixIcon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <slot name="prefix">
          <component :is="prefixIcon" class="h-4 w-4" />
        </slot>
      </div>

      <input
        :id="inputId"
        v-bind="$attrs"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="[
          'block w-full rounded-lg border text-sm text-slate-800 placeholder-slate-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          'read-only:bg-slate-50 read-only:cursor-default',
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
          $slots.prefix || prefixIcon ? 'pl-9' : 'pl-3',
          $slots.suffix || suffixIcon ? 'pr-9' : 'pr-3',
          'py-2',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
      />

      <!-- Suffix icon -->
      <!-- pointer-events-none hanya pada wrapper default (suffixIcon prop), -->
      <!-- bukan saat slot diisi — agar button interaktif di slot bisa diklik. -->
      <div
        v-if="$slots.suffix || suffixIcon"
        :class="[
          'absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400',
          !$slots.suffix && suffixIcon ? 'pointer-events-none' : '',
        ]"
      >
        <slot name="suffix">
          <component :is="suffixIcon" class="h-4 w-4" />
        </slot>
      </div>
    </div>

    <p v-if="hasError" class="mt-1 text-xs text-red-500">{{ errorMessage }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { uid } from '@/utils'

interface Props {
  modelValue?: string | number | null
  label?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  errorMessage?: string
  hint?: string
  prefixIcon?: unknown
  suffixIcon?: unknown
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
})

defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
}>()

const inputId = computed(() => props.id ?? `input-${uid()}`)
const hasError = computed(() => Boolean(props.errorMessage))
</script>

<script lang="ts">
export default { inheritAttrs: false }
</script>
