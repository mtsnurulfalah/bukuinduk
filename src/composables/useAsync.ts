import { ref } from 'vue'
import { toast } from 'vue-sonner'

/**
 * Composable untuk wrapping async operations dengan state loading/error.
 * Mengurangi boilerplate try/catch di setiap view.
 */
export function useAsync() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Jalankan async function dengan auto loading state dan error handling.
   * @param fn         Async function yang dijalankan
   * @param opts.silent  Jika true, tidak tampilkan toast error
   * @param opts.successMsg  Jika diisi, tampilkan toast success setelah berhasil
   */
  async function run<T>(
    fn: () => Promise<T>,
    opts: { silent?: boolean; successMsg?: string } = {}
  ): Promise<T | null> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fn()
      if (opts.successMsg) toast.success(opts.successMsg)
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      error.value = msg
      if (!opts.silent) toast.error(msg)
      return null
    } finally {
      isLoading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return { isLoading, error, run, clearError }
}
