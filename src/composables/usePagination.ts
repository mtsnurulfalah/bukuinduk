import { ref, computed, watch } from 'vue'
import { DEFAULT_PAGE_SIZE } from '@/constants'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
}

/**
 * Composable untuk state pagination.
 * Sinkron dengan komponen BasePagination.
 */
export function usePagination(options: UsePaginationOptions = {}) {
  const page = ref(options.initialPage ?? 1)
  const limit = ref(options.initialLimit ?? DEFAULT_PAGE_SIZE)
  const total = ref(0)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

  const offset = computed(() => (page.value - 1) * limit.value)

  const paginationParams = computed(() => ({
    page: page.value,
    limit: limit.value,
  }))

  function setTotal(count: number) {
    total.value = count
  }

  function setPage(p: number) {
    page.value = Math.min(Math.max(1, p), totalPages.value)
  }

  function setLimit(l: number) {
    limit.value = l
    page.value = 1 // reset ke halaman pertama saat limit berubah
  }

  function reset() {
    page.value = 1
    total.value = 0
  }

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    paginationParams,
    setTotal,
    setPage,
    setLimit,
    reset,
  }
}
