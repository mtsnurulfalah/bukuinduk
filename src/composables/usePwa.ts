import { onMounted, onUnmounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'bid_pwa_install_dismissed_at'
const DISMISS_DAYS = 7

export function usePwaInstall() {
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isStandalone = ref(false)
  const isInstalled = ref(false)
  const isInstallable = ref(false)

  function updateDisplayMode() {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    isStandalone.value = standalone
    isInstalled.value = standalone
  }

  function dismissedRecently() {
    try {
      const value = localStorage.getItem(DISMISS_KEY)
      if (!value) return false
      const elapsed = Date.now() - Number(value)
      return Number.isFinite(elapsed) && elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000
    } catch {
      return false
    }
  }

  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
    isInstallable.value = !dismissedRecently() && !isStandalone.value
  }

  function handleInstalled() {
    installPrompt.value = null
    isInstallable.value = false
    isInstalled.value = true
    isStandalone.value = true
  }

  async function install(): Promise<boolean> {
    if (!installPrompt.value) return false

    const prompt = installPrompt.value
    await prompt.prompt()
    const choice = await prompt.userChoice
    installPrompt.value = null
    isInstallable.value = false
    return choice.outcome === 'accepted'
  }

  function dismiss() {
    installPrompt.value = null
    isInstallable.value = false
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Best effort only.
    }
  }

  onMounted(() => {
    updateDisplayMode()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleInstalled)
  })

  return {
    isStandalone,
    isInstalled,
    isInstallable,
    install,
    dismiss,
  }
}
