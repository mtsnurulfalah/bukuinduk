<template>
  <div class="flex h-screen h-[100dvh] overflow-hidden bg-slate-50">

    <ConnectionStatus />
    <PwaInstallPrompt />

    <!-- ── Sidebar Desktop ──────────────────────────────────── -->
    <aside
      aria-label="Navigasi desktop"
      :class="[
        'hidden lg:flex min-h-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 shrink-0',
        uiStore.sidebarCollapsed ? 'w-16' : 'w-60',
      ]"
    >
      <!-- Logo -->
      <div
        :class="[
          'flex h-16 shrink-0 items-center border-b border-slate-100',
          uiStore.sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        ]"
      >
        <div v-if="!uiStore.sidebarCollapsed" class="flex min-w-0 items-center gap-3 overflow-hidden">
          <img src="/favicon.svg" alt="Logo Buku Induk Digital" class="h-8 w-8 shrink-0" />
          <Transition name="fade-slide">
            <span class="truncate text-sm font-bold leading-tight text-slate-800">
              Buku Induk<br />Digital
            </span>
          </Transition>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :aria-label="uiStore.sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
          :aria-expanded="!uiStore.sidebarCollapsed"
          title="Ubah lebar sidebar"
          @click="uiStore.toggleSidebar()"
        >
          <PanelLeft class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <!-- Navigation -->
      <nav aria-label="Menu utama desktop" class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 px-2 scrollbar-thin space-y-0.5">
        <template v-for="item in filteredNavItems" :key="item.name">
          <!-- Section label -->
          <p
            v-if="item.section && !uiStore.sidebarCollapsed"
            class="px-2 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider first:pt-1"
          >
            {{ item.section }}
          </p>
          <div v-if="item.section && uiStore.sidebarCollapsed" class="border-t border-slate-100 my-2" />

          <!-- Nav link -->
          <RouterLink
            v-if="item.to"
            :to="item.to"
            :title="uiStore.sidebarCollapsed ? item.label : undefined"
            :class="[
              'flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              isActive(item.to)
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              uiStore.sidebarCollapsed ? 'justify-center' : '',
            ]"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <component
              :is="item.icon"
              :class="[
                'h-4 w-4 shrink-0',
                isActive(item.to) ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600',
              ]"
            />
            <span v-if="!uiStore.sidebarCollapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User info bottom -->
      <div class="shrink-0 border-t border-slate-100 p-3">
        <div v-if="uiStore.sidebarCollapsed" class="flex flex-col items-center gap-2">
          <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" />
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
            aria-label="Keluar"
            title="Keluar"
            :disabled="isLoggingOut"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div v-else class="flex items-center gap-2 rounded-lg p-1">
          <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-slate-700">{{ authStore.user?.fullName || 'Pengguna' }}</p>
            <p class="truncate text-xs text-slate-400">{{ roleLabel }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
            aria-label="Keluar"
            title="Keluar"
            :disabled="isLoggingOut"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Mobile Sidebar Overlay ───────────────────────────── -->
    <Transition name="overlay">
      <div
        v-if="uiStore.mobileSidebarOpen"
        class="fixed inset-0 z-40 overscroll-none lg:hidden"
      >
        <button
          type="button"
          class="absolute inset-0 h-full w-full cursor-default bg-black/40"
          aria-label="Tutup menu navigasi"
          @click="closeMobileSidebar"
        />

        <aside
          id="mobile-sidebar-dialog"
          ref="mobileSidebarRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-sidebar-title"
          tabindex="-1"
          class="mobile-sidebar-drawer absolute inset-y-0 left-0 flex h-screen h-[100dvh] w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-slate-200 bg-white shadow-xl"
        >
          <!-- Logo and close control -->
          <div class="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div class="flex min-w-0 items-center gap-3">
              <img src="/favicon.svg" alt="Logo Buku Induk Digital" class="h-8 w-8 shrink-0" />
              <h2 id="mobile-sidebar-title" class="text-sm font-bold leading-tight text-slate-800">
                Buku Induk<br />Digital
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Tutup menu"
              @click="closeMobileSidebar"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <!-- Navigation -->
          <nav aria-label="Menu utama mobile" class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 px-2 scrollbar-thin space-y-0.5">
            <template v-for="item in filteredNavItems" :key="item.name">
              <p
                v-if="item.section"
                class="px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                {{ item.section }}
              </p>
              <RouterLink
                v-if="item.to"
                :to="item.to"
                :class="[
                  'flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
                ]"
                :aria-current="isActive(item.to) ? 'page' : undefined"
                @click="closeMobileSidebar"
              >
                <component
                  :is="item.icon"
                  :class="[
                    'h-4 w-4 shrink-0',
                    isActive(item.to) ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600',
                  ]"
                  aria-hidden="true"
                />
                <span class="min-w-0 truncate">{{ item.label }}</span>
              </RouterLink>
            </template>
          </nav>

          <!-- User and logout -->
          <div class="shrink-0 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div class="flex min-w-0 items-center gap-3 rounded-lg p-1">
              <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" class="shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-semibold text-slate-700">{{ authStore.user?.fullName || 'Pengguna' }}</p>
                <p class="truncate text-xs text-slate-400">{{ roleLabel }}</p>
              </div>
              <button
                type="button"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                aria-label="Keluar"
                title="Keluar"
                :disabled="isLoggingOut"
                @click="handleLogout"
              >
                <LogOut class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>

    <!-- ── Main Content ──────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Top Header -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
        <!-- Mobile menu button -->
        <button
          type="button"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
          aria-label="Buka menu navigasi"
          aria-controls="mobile-sidebar-dialog"
          :aria-expanded="uiStore.mobileSidebarOpen"
          @click="openMobileSidebarFromTrigger"
        >
          <Menu class="h-5 w-5" aria-hidden="true" />
        </button>

        <!-- Page title (mobile) -->
        <h1 class="text-sm font-semibold text-slate-700 lg:hidden truncate flex-1">
          {{ pageTitle }}
        </h1>

        <!-- School name (desktop) -->
        <p class="hidden lg:block text-sm font-medium text-slate-500 flex-1 truncate">
          {{ settingsStore.schoolName || 'Buku Induk Digital' }}
        </p>

        <!-- Right side -->
        <div class="flex items-center gap-2 ml-auto">
          <!-- Active school year badge -->
          <span
            v-if="activeSchoolYear"
            class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
          >
            <CalendarDays class="h-3 w-3" />
            {{ activeSchoolYear }}
          </span>

          <!-- User menu desktop -->
          <div class="hidden lg:flex items-center gap-2.5">
            <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" />
            <div class="text-left">
              <p class="text-xs font-semibold text-slate-700 leading-none">{{ authStore.user?.fullName }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ roleLabel }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div class="w-full min-w-0 p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
          <RouterView v-slot="{ Component, route }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <!-- ── Mobile Bottom Navigation ─────────────────────────── -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:hidden"
      aria-label="Navigasi ringkas"
    >
      <div class="grid grid-cols-5 items-stretch px-1">
        <RouterLink
          v-for="item in mobilePrimaryNavItems"
          :key="item.name"
          :to="item.to"
          :class="[
            'flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            isActive(item.to, mobilePrimaryNavItems) ? 'text-primary-600' : 'text-slate-400',
          ]"
          :aria-current="isActive(item.to, mobilePrimaryNavItems) ? 'page' : undefined"
          :aria-label="item.label"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span class="max-w-full truncate text-center text-[11px] font-medium leading-tight">{{ item.mobileLabel || item.label }}</span>
        </RouterLink>

        <button
          type="button"
          class="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Buka semua menu"
          aria-controls="mobile-sidebar-dialog"
          :aria-expanded="uiStore.mobileSidebarOpen"
          @click="openMobileSidebarFromTrigger"
        >
          <MoreHorizontal class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span class="text-[11px] font-medium leading-tight">Menu</span>
        </button>
      </div>
    </nav>  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Users, GraduationCap, School,
  BookOpen, BarChart3, Settings, UserCog, Lightbulb,
  LogOut, Menu, X, PanelLeft, CalendarDays, Layers, MoreHorizontal, Home, Search, BookOpenCheck,
} from 'lucide-vue-next'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import ConnectionStatus from '@/components/shared/ConnectionStatus.vue'
import PwaInstallPrompt from '@/components/shared/PwaInstallPrompt.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { ROLE_LABELS, PERMISSIONS } from '@/constants'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()

// BUG-29 FIX: Sambungkan ke store settings & schoolYear yang sebenarnya
// bukan dummy computed yang selalu kosong.
const settingsStore = useSettingsStore()
const schoolYearStore = useSchoolYearStore()

const mobileSidebarRef = ref<HTMLElement | null>(null)
const mobileSidebarReturnFocus = ref<HTMLElement | null>(null)
const isLoggingOut = ref(false)
let desktopMediaQuery: MediaQueryList | null = null

function openMobileSidebarFromTrigger(event: MouseEvent): void {
  mobileSidebarReturnFocus.value = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : null
  uiStore.openMobileSidebar()
}

function closeMobileSidebar(): void {
  uiStore.closeMobileSidebar()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (!uiStore.mobileSidebarOpen) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeMobileSidebar()
    return
  }
  if (event.key !== 'Tab') return

  const drawer = mobileSidebarRef.value
  if (!drawer) return
  const focusable = Array.from(
    drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true')

  if (!focusable.length) {
    event.preventDefault()
    drawer.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
    event.preventDefault()
    first.focus()
  }
}

function handleDesktopBreakpointChange(event: MediaQueryListEvent): void {
  if (event.matches && uiStore.mobileSidebarOpen) closeMobileSidebar()
}

watch(
  () => uiStore.mobileSidebarOpen,
  async (isOpen) => {
    const returnTarget = mobileSidebarReturnFocus.value
    await nextTick()
    if (uiStore.mobileSidebarOpen !== isOpen) return

    if (isOpen) {
      const firstNavigationLink = mobileSidebarRef.value?.querySelector<HTMLElement>('nav a[href]')
      ;(firstNavigationLink ?? mobileSidebarRef.value)?.focus()
      return
    }

    mobileSidebarReturnFocus.value = null
    if (returnTarget?.isConnected && returnTarget.getClientRects().length > 0) {
      returnTarget.focus()
    }
  },
  { flush: 'post' }
)

watch(
  () => route.fullPath,
  () => {
    if (uiStore.mobileSidebarOpen) closeMobileSidebar()
  }
)

onMounted(() => {
  document.addEventListener('keydown', handleDocumentKeydown)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    desktopMediaQuery = window.matchMedia('(min-width: 1024px)')
    desktopMediaQuery.addEventListener('change', handleDesktopBreakpointChange)
    if (desktopMediaQuery.matches && uiStore.mobileSidebarOpen) closeMobileSidebar()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleDocumentKeydown)
  desktopMediaQuery?.removeEventListener('change', handleDesktopBreakpointChange)
  if (uiStore.mobileSidebarOpen) {
    mobileSidebarReturnFocus.value = null
    uiStore.closeMobileSidebar()
  }
})

const activeSchoolYear = computed(() => schoolYearStore.activeSchoolYearName)

const roleLabel = computed(() =>
  authStore.user ? ROLE_LABELS[authStore.user.role] : ''
)

const pageTitle = computed(() => {
  const matched = route.matched.slice().reverse().find(r => r.meta?.title)
  return (matched?.meta?.title as string) ?? 'Buku Induk Digital'
})

// ── Navigation items ─────────────────────────────────────────
interface NavItem {
  name: string
  label: string
  mobileLabel?: string
  to: string
  icon: unknown
  section?: string
  roles?: string[]
  permission?: string
  permissionsAny?: string[]
}

const navItems: NavItem[] = [
  // Dashboard
  {
    name: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    section: 'Utama',
  },
  // Siswa
  {
    name: 'students',
    label: 'Data Siswa',
    mobileLabel: 'Siswa',
    to: '/students',
    icon: Users,
    section: 'Akademik',
    permission: PERMISSIONS.STUDENT_VIEW_ALL,
  },
  {
    name: 'my-students',
    label: 'Siswa Saya',
    mobileLabel: 'Siswa',
    to: '/my-students',
    icon: Users,
    permission: PERMISSIONS.STUDENT_VIEW_OWN_CLASS,
    roles: ['teacher'],
  },
  // Kelas
  {
    name: 'classrooms',
    label: 'Kelas & Rombel',
    mobileLabel: 'Kelas',
    to: '/classrooms',
    icon: School,
    permissionsAny: [PERMISSIONS.CLASSROOM_VIEW_ALL, PERMISSIONS.CLASSROOM_VIEW_OWN],
  },
  {
    name: 'classrooms.grades',
    label: 'Tingkat Kelas',
    to: '/classrooms/grades',
    icon: Layers,
    permission: PERMISSIONS.CLASSROOM_MANAGE,
  },
  // Akademik
  {
    name: 'subjects',
    label: 'Mata Pelajaran',
    mobileLabel: 'Mapel',
    to: '/subjects',
    icon: BookOpen,
    section: 'Akademik',
    permission: PERMISSIONS.SUBJECT_VIEW,
  },
  {
    name: 'student-grades',
    label: 'Nilai Siswa',
    mobileLabel: 'Nilai',
    to: '/grades',
    icon: BookOpenCheck,
    permissionsAny: [PERMISSIONS.SCORE_VIEW_ALL, PERMISSIONS.SCORE_VIEW_OWN_CLASS],
  },
  // Guru
  {
    name: 'teachers',
    label: 'Data Guru',
    mobileLabel: 'Guru',
    to: '/teachers',
    icon: GraduationCap,
    permission: PERMISSIONS.TEACHER_VIEW,
  },
  // Laporan
  {
    name: 'reports',
    label: 'Laporan',
    to: '/reports',
    icon: BarChart3,
    section: 'Laporan',
    permission: PERMISSIONS.REPORT_VIEW_ALL,
  },
  {
    name: 'intelligence',
    label: 'Intelligence Center',
    to: '/reports/intelligence',
    icon: Lightbulb,
    permission: PERMISSIONS.REPORT_INTELLIGENCE,
  },
  // Admin only
  {
    name: 'users',
    label: 'Pengguna',
    to: '/users',
    icon: UserCog,
    section: 'Administrasi',
    permission: PERMISSIONS.USER_VIEW,
  },
  {
    name: 'settings',
    label: 'Pengaturan',
    to: '/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
]

function hasPermission(item: NavItem): boolean {
  if (!authStore.user) return false
  if (item.roles && !item.roles.includes(authStore.user.role)) return false
  if (item.permission && !authStore.hasPermission(item.permission as never)) return false
  if (item.permissionsAny?.length && !item.permissionsAny.some(permission => authStore.hasPermission(permission as never))) return false
  return true
}

const filteredNavItems = computed(() => navItems.filter(hasPermission))

// Empat shortcut mobile diprioritaskan; jika role tidak memiliki izin pada
// shortcut tertentu, isi slot dari menu yang memang terlihat oleh role tersebut.
const mobilePrimaryNavItems = computed<NavItem[]>(() => {
  const isTeacher = authStore.user?.role === 'teacher'
  const preferred: Array<Pick<NavItem, 'to' | 'icon' | 'label' | 'mobileLabel'>> = [
    { to: '/dashboard', icon: Home, label: 'Dashboard', mobileLabel: 'Beranda' },
    {
      to: isTeacher ? '/my-students' : '/students',
      icon: Search,
      label: isTeacher ? 'Siswa Saya' : 'Data Siswa',
      mobileLabel: 'Siswa',
    },
    { to: '/classrooms', icon: School, label: 'Kelas & Rombel', mobileLabel: 'Kelas' },
    { to: '/reports', icon: BarChart3, label: 'Laporan', mobileLabel: 'Laporan' },
  ]

  const visibleByPath = new Map<string, NavItem>(filteredNavItems.value.map(item => [item.to, item] as const))
  const selected: NavItem[] = []

  preferred.forEach(item => {
    const visibleItem = visibleByPath.get(item.to)
    if (visibleItem && !selected.some(selectedItem => selectedItem.to === item.to)) {
      selected.push({ ...visibleItem, ...item })
    }
  })

  for (const item of filteredNavItems.value) {
    if (selected.length >= 4) break
    if (!selected.some(selectedItem => selectedItem.to === item.to)) {
      selected.push(item)
    }
  }

  return selected.slice(0, 4).map((item, index) => ({
    ...item,
    name: `mobile-${index}-${item.to}`,
    section: undefined,
  }))
})

// Sub-route menyorot menu induk, kecuali ada menu anak yang lebih spesifik
// dalam lingkup navigasi yang sedang dirender (sidebar penuh atau shortcut bawah).
function isActive(path: string, navScope: readonly NavItem[] = filteredNavItems.value): boolean {
  if (route.path === path) return true
  if (!route.path.startsWith(path + '/')) return false

  const moreSpecificVisibleItem = navScope.some(
    item => item.to !== path &&
      item.to.startsWith(path + '/') &&
      (route.path === item.to || route.path.startsWith(item.to + '/'))
  )
  return !moreSpecificVisibleItem
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  closeMobileSidebar()
  try {
    await authStore.logout()
    toast.success('Berhasil keluar')
    await router.replace('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay-enter-active .mobile-sidebar-drawer,
.overlay-leave-active .mobile-sidebar-drawer {
  transition: transform 0.2s ease;
}

.overlay-enter-from .mobile-sidebar-drawer,
.overlay-leave-to .mobile-sidebar-drawer {
  transform: translateX(-100%);
}

/* Safe area padding for bottom nav on iOS */
.pb-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}

@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active,
  .overlay-enter-active,
  .overlay-leave-active,
  .overlay-enter-active .mobile-sidebar-drawer,
  .overlay-leave-active .mobile-sidebar-drawer {
    transition-duration: 0.01ms;
  }
}
</style>
