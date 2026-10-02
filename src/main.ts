import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Toaster } from 'vue-sonner'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

/**
 * Vite emits this event when a code-split route/chunk cannot be loaded.
 * A stale HTML document can reference a chunk that no longer exists after
 * deployment. Recover once automatically instead of leaving a blank route.
 */
window.addEventListener('vite:preloadError', event => {
  event.preventDefault()

  const recoveryKey = '__vite_preload_recovery__'
  try {
    if (sessionStorage.getItem(recoveryKey) === window.location.href) {
      sessionStorage.removeItem(recoveryKey)
      return
    }
    sessionStorage.setItem(recoveryKey, window.location.href)
  } catch {
    // Ignore storage failures; the reload below is still a valid recovery.
  }

  window.location.reload()
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('Toaster', Toaster)

app.mount('#app')
