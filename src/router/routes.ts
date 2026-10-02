import type { RouteRecordRaw } from 'vue-router'
import { PERMISSIONS } from '@/constants'
import type { Permission } from '@/constants'

// Semua view di-lazy load untuk code splitting otomatis
const routes: RouteRecordRaw[] = [
  // ── Auth ────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { layout: 'auth', title: 'Login', guest: true },
  },

  // ── App (butuh autentikasi) ──────────────────────────────────
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // Redirect root → dashboard
      {
        path: '',
        redirect: '/dashboard',
      },

      // ── Dashboard ─────────────────────────────────────────
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },

      // ── Siswa ─────────────────────────────────────────────
      {
        path: 'students',
        meta: { title: 'Data Siswa', permission: PERMISSIONS.STUDENT_VIEW_ALL },
        children: [
          {
            path: '',
            name: 'students',
            component: () => import('@/views/students/StudentListView.vue'),
            meta: { title: 'Data Siswa' },
          },
          {
            path: 'create',
            name: 'students.create',
            component: () => import('@/views/students/StudentFormView.vue'),
            meta: { title: 'Tambah Siswa', permission: PERMISSIONS.STUDENT_CREATE },
          },
          // PENTING: 'import' harus sebelum ':id' agar tidak di-match sebagai id='import'
          {
            path: 'import',
            name: 'students.import',
            component: () => import('@/views/students/StudentImportView.vue'),
            meta: { title: 'Import Siswa', permission: PERMISSIONS.STUDENT_IMPORT },
          },
          {
            path: ':id',
            name: 'students.detail',
            component: () => import('@/views/students/StudentDetailView.vue'),
            meta: { title: 'Detail Siswa' },
          },
          {
            path: ':id/edit',
            name: 'students.edit',
            component: () => import('@/views/students/StudentFormView.vue'),
            meta: { title: 'Edit Siswa', permission: PERMISSIONS.STUDENT_UPDATE },
          },
        ],
      },

      // ── Siswa Saya (Guru) ──────────────────────────────────
      {
        path: 'my-students',
        name: 'my-students',
        component: () => import('@/views/students/MyStudentsView.vue'),
        meta: {
          title: 'Siswa Saya',
          permission: PERMISSIONS.STUDENT_VIEW_OWN_CLASS,
          roles: ['teacher'],
        },
      },

      // ── Kelas & Rombel ────────────────────────────────────
      {
        path: 'classrooms',
        meta: { title: 'Kelas & Rombel', permission: PERMISSIONS.CLASSROOM_VIEW_ALL },
        children: [
          {
            path: '',
            name: 'classrooms',
            component: () => import('@/views/classrooms/ClassroomListView.vue'),
            meta: { title: 'Kelas & Rombel' },
          },
          {
            path: 'grades',
            name: 'classrooms.grades',
            component: () => import('@/views/classrooms/GradeListView.vue'),
            meta: { title: 'Tingkat Kelas', permission: PERMISSIONS.CLASSROOM_MANAGE },
          },
          {
            path: 'create',
            name: 'classrooms.create',
            component: () => import('@/views/classrooms/ClassroomFormView.vue'),
            meta: { title: 'Tambah Kelas', permission: PERMISSIONS.CLASSROOM_MANAGE },
          },
          {
            path: ':id',
            name: 'classrooms.detail',
            component: () => import('@/views/classrooms/ClassroomDetailView.vue'),
            meta: { title: 'Detail Kelas' },
          },
          {
            path: ':id/edit',
            name: 'classrooms.edit',
            component: () => import('@/views/classrooms/ClassroomFormView.vue'),
            meta: { title: 'Edit Kelas', permission: PERMISSIONS.CLASSROOM_MANAGE },
          },
        ],
      },

      // ── Guru ──────────────────────────────────────────────
      {
        path: 'teachers',
        meta: { title: 'Data Guru', permission: PERMISSIONS.TEACHER_VIEW },
        children: [
          {
            path: '',
            name: 'teachers',
            component: () => import('@/views/teachers/TeacherListView.vue'),
            meta: { title: 'Data Guru' },
          },
          {
            path: 'create',
            name: 'teachers.create',
            component: () => import('@/views/teachers/TeacherFormView.vue'),
            meta: { title: 'Tambah Guru', permission: PERMISSIONS.TEACHER_MANAGE },
          },
          {
            path: ':id',
            name: 'teachers.detail',
            component: () => import('@/views/teachers/TeacherDetailView.vue'),
            meta: { title: 'Detail Guru' },
          },
          {
            path: ':id/edit',
            name: 'teachers.edit',
            component: () => import('@/views/teachers/TeacherFormView.vue'),
            meta: { title: 'Edit Guru', permission: PERMISSIONS.TEACHER_MANAGE },
          },
        ],
      },

      // ── Laporan ───────────────────────────────────────────
      {
        path: 'reports',
        meta: { title: 'Laporan' },
        children: [
          {
            path: '',
            name: 'reports',
            component: () => import('@/views/reports/ReportView.vue'),
            meta: { title: 'Laporan', permission: PERMISSIONS.REPORT_VIEW_ALL },
          },
        ],
      },

      // ── Pengguna (Admin only) ─────────────────────────────
      {
        path: 'users',
        meta: { title: 'Pengguna', permission: PERMISSIONS.USER_VIEW },
        children: [
          {
            path: '',
            name: 'users',
            component: () => import('@/views/users/UserListView.vue'),
            meta: { title: 'Pengguna' },
          },
          {
            path: 'create',
            name: 'users.create',
            component: () => import('@/views/users/UserFormView.vue'),
            meta: { title: 'Tambah Pengguna', permission: PERMISSIONS.USER_MANAGE },
          },
          {
            path: ':id/edit',
            name: 'users.edit',
            component: () => import('@/views/users/UserFormView.vue'),
            meta: { title: 'Edit Pengguna', permission: PERMISSIONS.USER_MANAGE },
          },
        ],
      },

      // ── Pengaturan ────────────────────────────────────────
      {
        path: 'settings',
        meta: { title: 'Pengaturan', permission: PERMISSIONS.SETTINGS_VIEW },
        children: [
          {
            path: '',
            name: 'settings',
            component: () => import('@/views/settings/SettingsView.vue'),
            meta: { title: 'Pengaturan' },
          },
          {
            path: 'audit-log',
            name: 'settings.audit',
            component: () => import('@/views/settings/AuditLogView.vue'),
            meta: { title: 'Audit Log', permission: PERMISSIONS.AUDIT_VIEW },
          },
        ],
      },

      // ── Profil (semua user) ───────────────────────────────
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/auth/ProfileView.vue'),
        meta: { title: 'Profil Saya' },
      },

      // ── 403 Forbidden ─────────────────────────────────────
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/errors/ForbiddenView.vue'),
        meta: { title: 'Akses Ditolak' },
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/errors/NotFoundView.vue'),
    meta: { title: 'Halaman Tidak Ditemukan' },
  },
]

export default routes
