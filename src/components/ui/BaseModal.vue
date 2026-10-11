<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        ref="dialogRoot"
        class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="subtitle ? subtitleId : undefined"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
          @click="closeOnBackdrop && emit('update:modelValue', false)"
        />

        <!-- Panel -->
        <div
          ref="dialogPanel"
          class="base-modal-panel"
          :class="[
            'relative flex w-full flex-col overflow-hidden bg-white shadow-xl',
            'sm:rounded-xl',
            maxWidthClass,
          ]"
          tabindex="-1"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div :id="titleId" class="min-w-0 flex-1">
              <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
              <p v-if="subtitle" :id="subtitleId" class="mt-0.5 text-xs text-slate-500">{{ subtitle }}</p>
            </div>
            <slot name="header" />
            <button
              v-if="showClose"
              type="button"
              aria-label="Tutup dialog"
              class="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              @click="emit('update:modelValue', false)"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { uid } from '@/utils'
import { isTopModal, registerModal, unregisterModal } from '@/utils/modalStack'

interface Props {
  modelValue: boolean
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showClose: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const titleId = `modal-title-${uid()}`
const subtitleId = `modal-subtitle-${uid()}`
const dialogRoot = ref<HTMLElement | null>(null)
const dialogPanel = ref<HTMLElement | null>(null)
const modalId = Symbol('base-modal')
let previousFocusedElement: HTMLElement | null = null
let previousBodyOverflow = ''
let isActive = false

// Stack support prevents a nested confirmation dialog from closing its parent
// when Escape is pressed, and preserves the parent's scroll lock.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const maxWidthClass = computed(() => ({
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-full sm:m-4',
}[props.size]))

function getFocusableElements(): HTMLElement[] {
  const panel = dialogPanel.value
  if (!panel) return []

  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element =>
      element.getClientRects().length > 0 &&
      element.getAttribute('aria-hidden') !== 'true' &&
      getComputedStyle(element).visibility !== 'hidden'
    )
}

async function activateDialog(): Promise<void> {
  if (typeof document === 'undefined') return

  if (!isActive) {
    previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    registerModal(modalId)
    document.addEventListener('keydown', handleDialogKeydown)
    isActive = true
  }

  await nextTick()
  if (!props.modelValue) return

  const panel = dialogPanel.value
  if (!panel) return
  const autofocusTarget = panel.querySelector<HTMLElement>('[autofocus]')
  const firstFocusable = getFocusableElements()[0]
  ;(autofocusTarget ?? firstFocusable ?? panel).focus()
}

function deactivateDialog(restoreFocus = true): void {
  if (!isActive || typeof document === 'undefined') return

  document.removeEventListener('keydown', handleDialogKeydown)
  unregisterModal(modalId)

  document.body.style.overflow = previousBodyOverflow
  isActive = false

  const returnTarget = previousFocusedElement
  previousFocusedElement = null
  if (restoreFocus && returnTarget?.isConnected) {
    nextTick(() => returnTarget.focus())
  }
}

function handleDialogKeydown(event: KeyboardEvent): void {
  if (!props.modelValue || !isTopModal(modalId)) return

  if (event.key === 'Escape' && props.closeOnEscape) {
    event.preventDefault()
    event.stopPropagation()
    emit('update:modelValue', false)
    return
  }

  if (event.key !== 'Tab') return

  const panel = dialogPanel.value
  const focusable = getFocusableElements()
  if (!panel || !focusable.length) {
    event.preventDefault()
    panel?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) void activateDialog()
  else deactivateDialog()
}, { flush: 'post' })

onMounted(() => {
  if (props.modelValue) void activateDialog()
})

onBeforeUnmount(() => {
  deactivateDialog(false)
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative {
  transform: translateY(16px) scale(0.98);
}

.base-modal-panel {
  max-height: 95vh;
}

@supports (height: 100dvh) {
  .base-modal-panel {
    max-height: 95dvh;
  }

  @media (min-width: 640px) {
    .base-modal-panel {
      max-height: calc(100dvh - 2rem);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .relative,
  .modal-leave-active .relative {
    transition-duration: 0.01ms;
  }
}
</style>
