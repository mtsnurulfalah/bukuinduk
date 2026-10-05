import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { setupGuards } from './guards'

const useHashHistory = import.meta.env.VITE_ROUTER_MODE === 'hash'

const router = createRouter({
  // Render Static Site does not reliably apply repository _redirects files.
  // Hash history keeps the current route addressable after a browser refresh.
  history: useHashHistory
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, behavior: 'smooth' }
  },
})

setupGuards(router)

export default router
