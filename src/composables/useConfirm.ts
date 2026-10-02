import { ref } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
}

/**
 * Composable untuk dialog konfirmasi yang reusable.
 *
 * BUG-55 FIX: Jika confirm() dipanggil lagi sebelum user merespons dialog
 * sebelumnya, Promise lama akan di-resolve(false) sebelum digantikan oleh Promise baru.
 * Ini mencegah memory leak dan silent hang pada Promise yang tidak pernah settle.
 *
 * Contoh penggunaan:
 *
 * const dialog = useConfirm()
 *
 * async function handleDelete() {
 *   const ok = await dialog.confirm({ message: 'Hapus siswa ini?', type: 'danger' })
 *   if (ok) await deleteStudent(id)
 * }
 *
 * Di template:
 * <BaseConfirmDialog
 *   v-model="dialog.isOpen.value"
 *   :message="dialog.options.value.message"
 *   @confirm="dialog.onConfirm()"
 *   @cancel="dialog.onCancel()"
 * />
 */
export function useConfirm() {
  const isOpen = ref(false)
  const isLoading = ref(false)
  const options = ref<ConfirmOptions>({ message: '' })

  let _resolve: ((v: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    // BUG-55 FIX: Jika ada Promise sebelumnya yang belum settle (dialog dibuka ulang
    // sebelum user merespons), resolve-kan dengan false agar tidak leak.
    if (_resolve) {
      _resolve(false)
      _resolve = null
    }

    options.value = opts
    isOpen.value = true

    return new Promise(resolve => {
      _resolve = resolve
    })
  }

  function onConfirm() {
    const r = _resolve
    _resolve = null
    isOpen.value = false
    r?.(true)
  }

  function onCancel() {
    const r = _resolve
    _resolve = null
    isOpen.value = false
    r?.(false)
  }

  return { isOpen, isLoading, options, confirm, onConfirm, onCancel }
}
