<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    @update:model-value="onBackdropClose"
  >
    <div class="flex gap-4 items-start">
      <div :class="['p-2 rounded-full shrink-0', iconBg]">
        <component :is="icon" :class="['h-5 w-5', iconColor]" />
      </div>
      <div>
        <p class="text-sm text-slate-600 leading-relaxed">{{ message }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <!--
          BUG-CONFIRM FIX: Tombol Batal sekarang emit 'cancel' SELAIN
          update:modelValue, agar @cancel="confirmDialog.onCancel()" di
          StudentListView dapat merespons dan me-resolve Promise dengan false.
          Sebelumnya hanya emit update:modelValue → Promise di handleArchive()
          tidak pernah resolve → hang selamanya.
        -->
        <BaseButton variant="outline" size="sm" :disabled="loading" @click="handleCancel">
          {{ cancelText }}
        </BaseButton>
        <BaseButton :variant="confirmVariant" size="sm" :loading="loading" @click="$emit('confirm')">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Konfirmasi',
  message: 'Apakah Anda yakin ingin melanjutkan?',
  type: 'warning',
  confirmText: 'Ya, Lanjutkan',
  cancelText: 'Batal',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'confirm': []
  /** BUG-CONFIRM FIX: Tambahkan event cancel agar parent bisa resolve Promise */
  'cancel': []
}>()

function handleCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

// BUG-CONFIRM FIX: Saat backdrop menutup dialog (jika closeOnBackdrop=true di masa depan),
// tetap emit cancel agar Promise selalu resolve dan tidak leak.
function onBackdropClose(val: boolean) {
  if (!val) {
    emit('update:modelValue', false)
    emit('cancel')
  }
}

const icon = computed(() => ({
  danger: Trash2,
  warning: AlertTriangle,
  info: CheckCircle,
}[props.type]))

const iconBg = computed(() => ({
  danger: 'bg-red-100',
  warning: 'bg-amber-100',
  info: 'bg-blue-100',
}[props.type]))

const iconColor = computed(() => ({
  danger: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}[props.type]))

const confirmVariant = computed(() => ({
  danger: 'danger' as const,
  warning: 'primary' as const,
  info: 'primary' as const,
}[props.type]))
</script>
