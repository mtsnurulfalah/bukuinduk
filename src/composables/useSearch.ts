import { ref, watch, onUnmounted } from 'vue'
import { DEBOUNCE_DELAY } from '@/constants'

/**
 * Composable untuk debounced search.
 * `query` adalah nilai yang diketik user (langsung).
 * `onSearch` dipanggil dengan debounce setelah user berhenti mengetik.
 *
 * BUG-53 FIX: onUnmounted membatalkan timer yang masih pending agar
 * onSearch tidak dipanggil setelah komponen di-unmount.
 *
 * BUG-54 FIX: clear() hanya memanggil onSearch() sekali langsung.
 * Sebelumnya clear() memanggil onSearch('') langsung DAN juga mengeset
 * query.value = '' yang men-trigger watch → debounce → onSearch('') lagi
 * (double call). Sekarang: set flag untuk skip satu watch cycle.
 */
export function useSearch(onSearch: (q: string) => void, delay = DEBOUNCE_DELAY) {
  const query = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null
  // Flag untuk mencegah double-call saat clear() dipanggil
  let _skipNextWatch = false

  watch(query, (newVal) => {
    // BUG-54 FIX: Lewati satu cycle watch jika clear() yang men-trigger perubahan
    if (_skipNextWatch) {
      _skipNextWatch = false
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      onSearch(newVal.trim())
    }, delay)
  })

  // BUG-53 FIX: Cleanup timer saat komponen unmount
  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    // Set flag agar watch tidak men-trigger onSearch lagi setelah assignment
    _skipNextWatch = true
    query.value = ''
    // Panggil onSearch sekali saja langsung (tanpa debounce)
    onSearch('')
  }

  return { query, clear }
}
