<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">

    <!-- ── Sidebar Desktop ──────────────────────────────────── -->
    <aside
      :class="[
        'hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0',
        uiStore.sidebarCollapsed ? 'w-16' : 'w-60',
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center h-16 px-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center gap-3 overflow-hidden">
          <img src="/favicon.svg" alt="Logo" class="h-8 w-8 shrink-0" />
          <Transition name="fade-slide">
            <span
              v-if="!uiStore.sidebarCollapsed"
              class="font-bold text-sm text-slate-800 truncate leading-tight"
            >
              Buku Induk<br />Digital
            </span>
          </Transition>
        </div>
        <button
          class="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          @click="uiStore.toggleSidebar()"
        >
          <PanelLeft class="h-4 w-4" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin space-y-0.5">
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
              'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors group',
              isActive(item.to)
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              uiStore.sidebarCollapsed ? 'justify-center' : '',
            ]"
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
      <div class="border-t border-slate-100 p-3 shrink-0">
        <div
          :class="[
            'flex items-center gap-3 rounded-lg p-2',
            uiStore.sidebarCollapsed ? 'justify-center' : '',
          ]"
        >
          <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" class="shrink-0" />
          <Transition name="fade-slide">
            <div v-if="!uiStore.sidebarCollapsed" class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-700 truncate">{{ authStore.user?.fullName }}</p>
              <p class="text-xs text-slate-400 truncate">{{ roleLabel }}</p>
            </div>
          </Transition>
          <button
            v-if="!uiStore.sidebarCollapsed"
            class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            title="Keluar"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Mobile Sidebar Overlay ───────────────────────────── -->
    <Transition name="overlay">
      <div
        v-if="uiStore.mobileSidebarOpen"
        class="fixed inset-0 z-40 lg:hidden"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40" @click="uiStore.closeMobileSidebar()" />

        <!-- Drawer -->
        <aside class="absolute left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
          <!-- Logo -->
          <div class="flex items-center justify-between h-16 px-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <img src="/favicon.svg" alt="Logo" class="h-8 w-8" />
              <span class="font-bold text-sm text-slate-800 leading-tight">
                Buku Induk<br />Digital
              </span>
            </div>
            <button
              class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              @click="uiStore.closeMobileSidebar()"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
            <template v-for="item in filteredNavItems" :key="item.name">
              <p
                v-if="item.section"
                class="px-2 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider first:pt-1"
              >
                {{ item.section }}
              </p>
              <RouterLink
                v-if="item.to"
                :to="item.to"
                :class="[
                  'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors group',
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
                ]"
                @click="uiStore.closeMobileSidebar()"
              >
                <component
                  :is="item.icon"
                  :class="[
                    'h-4 w-4 shrink-0',
                    isActive(item.to) ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600',
                  ]"
                />
                <span class="truncate">{{ item.label }}</span>
              </RouterLink>
            </template>
          </nav>

          <!-- User bottom -->
          <div class="border-t border-slate-100 p-3">
            <div class="flex items-center gap-3 p-2">
              <BaseAvatar :name="authStore.user?.fullName" size="sm" color="blue" />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">{{ authStore.user?.fullName }}</p>
                <p class="text-xs text-slate-400 truncate">{{ roleLabel }}</p>
              </div>
              <button
                class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                @click="handleLogout"
              >
                <LogOut class="h-4 w-4" />
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
          class="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          @click="uiStore.openMobileSidebar()"
        >
          <Menu class="h-5 w-5" />
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
      <main class="flex-1 overflow-y-auto scrollbar-thin">
        <div class="p-4 sm:p-6 max-w-7xl mx-auto">
          <RouterView v-slot="{ Component, route }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <!-- ── Mobile Bottom Navigation ─────────────────────────── -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex items-center justify-around px-2 pb-safe">
      <RouterLink
        v-for="item in mobileNavItems"
        :key="item.name"
        :to="item.to"
        :class="[
          'flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-0',
          isActive(item.to)
            ? 'text-primary-600'
            : 'text-slate-400',
        ]"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="text-xs truncate">{{ item.mobileLabel || item.label }}</span>
      </RouterLink>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Users, GraduationCap, School,
  BookOpen, BarChart3, Settings, UserCog,
  LogOut, Menu, X, PanelLeft, CalendarDays, Layers,
} from 'lucide-vue-next'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
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

// BUG-31 FIX: Pastikan overflow:hidden dibersihkan saat layout di-unmount
// (misalnya navigasi ke halaman tanpa AppLayout saat sidebar mobile terbuka).
onUnmounted(() => {
  if (uiStore.mobileSidebarOpen) {
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
    permission: PERMISSIONS.CLASSROOM_VIEW_ALL,
  },
  {
    name: 'classrooms.grades',
    label: 'Tingkat Kelas',
    to: '/classrooms/grades',
    icon: Layers,
    permission: PERMISSIONS.CLASSROOM_MANAGE,
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
  if (item.permission) {
    return authStore.hasPermission(item.permission as never)
  }
  return true
}

const filteredNavItems = computed(() => navItems.filter(hasPermission))

// Bottom nav: ambil 4–5 item terpenting per role
const mobileNavItems = computed(() => {
  const items = filteredNavItems.value.filter(i => !i.section || true)
  return items.slice(0, 5)
})

// BUG-30 FIX: Gunakan route.matched untuk pengecekan isActive yang lebih presisi.
// Sebelumnya startsWith('/students') juga cocok dengan '/students/create', dll. — memang
// diinginkan untuk highlight parent menu. Namun route yang tidak terkait tapi secara
// kebetulan prefix-match bisa terhighlight secara salah.
// Solusi: exact match untuk '/' dan startsWith untuk sub-paths, tapi pastikan
// path yang dibandingkan adalah path yang spesifik (bukan prefix umum seperti '/').
function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  // Exact match selalu aktif
  if (route.path === path) return true
  // Untuk sub-path: aktif jika berada di bawah path ini,
  // KECUALI path tersebut adalah prefix dari nav item lain yang lebih spesifik.
  // Contoh: /classrooms aktif untuk /classrooms/123 tapi TIDAK untuk /classrooms/grades
  // karena /classrooms/grades punya nav item sendiri.
  const moreSpecificNavExists = navItems.some(
    item => item.to !== path && item.to.startsWith(path + '/') && route.path.startsWith(item.to)
  )
  if (moreSpecificNavExists) return false
  return route.path.startsWith(path + '/')
}

async function handleLogout() {
  // BUG-31 FIX: Tutup mobile sidebar sebelum navigasi agar tidak ada visual artifact
  if (uiStore.mobileSidebarOpen) {
    uiStore.closeMobileSidebar()
  }
  await authStore.logout()
  toast.success('Berhasil keluar')
  router.push('/login')
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

/* Safe area padding for bottom nav on iOS */
.pb-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
