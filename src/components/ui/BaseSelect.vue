<template>
  <div class="w-full">
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <div class="relative">
      <select
        :id="selectId"
        v-bind="$attrs"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'block w-full rounded-lg border text-sm text-slate-800 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 appearance-none',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          'pl-3 pr-8 py-2',
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
          !modelValue ? 'text-slate-400' : 'text-slate-800',
        ]"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" :disabled="!clearable" :selected="!modelValue">
          {{ placeholder }}
        </option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <!-- Chevron icon -->
      <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <p v-if="hasError" class="mt-1 text-xs text-red-500">{{ errorMessage }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { uid } from '@/utils'

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null
  options: SelectOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  // BUG-7 FIX: Prop clearable — jika true, opsi placeholder bisa dipilih
  // kembali untuk me-reset nilai (tidak disabled). Default false untuk
  // kompatibilitas mundur dengan form yang butuh placeholder non-selectable.
  clearable?: boolean
  errorMessage?: string
  hint?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  clearable: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const selectId = computed(() => props.id ?? `select-${uid()}`)
const hasError = computed(() => Boolean(props.errorMessage))
</script>

<script lang="ts">
export default { inheritAttrs: false }
</script>
