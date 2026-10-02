import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// BUG-10 FIX: Wrapper aman untuk localStorage agar tidak throw di private mode
// atau saat storage quota penuh (SecurityError).
function safeGetLocalStorage(key: string, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Tidak fatal — preferensi sidebar cukup best-effort
  }
}

export const useUiStore = defineStore('ui', () => {
  // ── Sidebar ───────────────────────────────────────────────────
  // BUG-10 FIX: Gunakan wrapper aman alih-alih localStorage langsung
  const sidebarCollapsed = ref(
    safeGetLocalStorage('sidebar_collapsed') === 'true'
  )
  const mobileSidebarOpen = ref(false)

  // BUG-10 FIX: Gunakan wrapper aman untuk write juga
  watch(sidebarCollapsed, v =>
    safeSetLocalStorage('sidebar_collapsed', String(v))
  )

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openMobileSidebar() {
    mobileSidebarOpen.value = true
    // BUG-09 FIX: Tangani potensi error saat memodifikasi document.body
    // (meski jarang, bisa gagal di lingkungan SSR atau test)
    try { document.body.style.overflow = 'hidden' } catch { /* noop */ }
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
    // BUG-09 FIX: Selalu bersihkan overflow saat menutup, termasuk jika dipanggil
    // dari onUnmounted AppLayout untuk mencegah body "terkunci" selamanya.
    try { document.body.style.overflow = '' } catch { /* noop */ }
  }

  // ── Global loading ────────────────────────────────────────────
  const globalLoading = ref(false)
  const globalLoadingText = ref('Memuat...')

  function showGlobalLoading(text = 'Memuat...') {
    globalLoadingText.value = text
    globalLoading.value = true
  }

  function hideGlobalLoading() {
    globalLoading.value = false
  }

  // ── Page title ────────────────────────────────────────────────
  const pageTitle = ref('Buku Induk Digital')

  function setPageTitle(title: string) {
    pageTitle.value = title
    try { document.title = `${title} — Buku Induk Digital` } catch { /* noop */ }
  }

  return {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    globalLoading,
    globalLoadingText,
    showGlobalLoading,
    hideGlobalLoading,
    pageTitle,
    setPageTitle,
  }
})
