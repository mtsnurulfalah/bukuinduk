// Extend Vue Router meta types untuk type-safety
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    guest?: boolean
    permission?: string
    roles?: string[]
    layout?: 'auth' | 'app'
  }
}
