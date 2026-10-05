import type { Role } from './roles'

// Definisi semua permission yang ada di aplikasi
export const PERMISSIONS = {
  // Students
  STUDENT_VIEW_ALL: 'student:view:all',
  STUDENT_VIEW_OWN_CLASS: 'student:view:own_class',
  STUDENT_VIEW_SENSITIVE: 'student:view:sensitive',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_ARCHIVE: 'student:archive',
  STUDENT_IMPORT: 'student:import',
  STUDENT_EXPORT: 'student:export',
  STUDENT_EXPORT_OWN: 'student:export:own',
  STUDENT_VERIFY: 'student:verify',

  // Teachers
  TEACHER_VIEW: 'teacher:view',
  TEACHER_MANAGE: 'teacher:manage',

  // Classrooms
  CLASSROOM_VIEW_ALL: 'classroom:view:all',
  CLASSROOM_VIEW_OWN: 'classroom:view:own',
  CLASSROOM_MANAGE: 'classroom:manage',

  // School Years
  SCHOOL_YEAR_VIEW: 'school_year:view',
  SCHOOL_YEAR_MANAGE: 'school_year:manage',

  // Reports
  REPORT_VIEW_ALL: 'report:view:all',
  REPORT_EXPORT: 'report:export',
  SUBJECT_VIEW: 'subject:view',
  SUBJECT_MANAGE: 'subject:manage',
  SCORE_VIEW_ALL: 'score:view:all',
  SCORE_VIEW_OWN_CLASS: 'score:view:own_class',
  SCORE_MANAGE_ALL: 'score:manage:all',
  SCORE_MANAGE_OWN_CLASS: 'score:manage:own_class',
  REPORT_INTELLIGENCE: 'report:intelligence',

  // Users
  USER_VIEW: 'user:view',
  USER_MANAGE: 'user:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // Dashboard
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * Matrix hak akses per role — harus sinkron dengan ROLE_PERMISSIONS di gas-backend/Main.gs
 *
 * BUG-63 FIX: Sinkronkan dengan backend Main.gs.
 * - teacher: hapus STUDENT_VIEW_DETAIL dan DASHBOARD_TEACHER yang tidak ada di backend,
 *   tambahkan SCHOOL_YEAR_VIEW agar teacher bisa lihat daftar tahun pelajaran.
 * - admin: tambahkan DASHBOARD_TEACHER (opsional untuk fallback view).
 *
 * BUG-64 FIX: Tambahkan SETTINGS_VIEW ke principal agar mereka bisa mengakses
 * halaman /settings (read-only). Principal tidak mendapat SETTINGS_MANAGE.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    PERMISSIONS.STUDENT_VIEW_ALL,
    PERMISSIONS.STUDENT_VIEW_SENSITIVE,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_UPDATE,
    PERMISSIONS.STUDENT_ARCHIVE,
    PERMISSIONS.STUDENT_IMPORT,
    PERMISSIONS.STUDENT_EXPORT,
    PERMISSIONS.STUDENT_VERIFY,
    PERMISSIONS.TEACHER_VIEW,
    PERMISSIONS.TEACHER_MANAGE,
    PERMISSIONS.CLASSROOM_VIEW_ALL,
    PERMISSIONS.CLASSROOM_MANAGE,
    PERMISSIONS.SCHOOL_YEAR_VIEW,
    PERMISSIONS.SCHOOL_YEAR_MANAGE,
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.REPORT_INTELLIGENCE,
    PERMISSIONS.SUBJECT_VIEW,
    PERMISSIONS.SUBJECT_MANAGE,
    PERMISSIONS.SCORE_VIEW_ALL,
    PERMISSIONS.SCORE_MANAGE_ALL,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
  ],
  principal: [
    PERMISSIONS.STUDENT_VIEW_ALL,
    PERMISSIONS.STUDENT_VIEW_DETAIL,
    PERMISSIONS.STUDENT_VIEW_SENSITIVE,
    PERMISSIONS.STUDENT_EXPORT,
    PERMISSIONS.STUDENT_VERIFY,
    PERMISSIONS.TEACHER_VIEW,
    PERMISSIONS.CLASSROOM_VIEW_ALL,
    PERMISSIONS.SCHOOL_YEAR_VIEW,
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.REPORT_INTELLIGENCE,
    PERMISSIONS.SUBJECT_VIEW,
    PERMISSIONS.SUBJECT_MANAGE,
    PERMISSIONS.SCORE_VIEW_ALL,
    PERMISSIONS.SCORE_MANAGE_ALL,
    // BUG-64 FIX: Principal dapat melihat settings (read-only)
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.DASHBOARD_PRINCIPAL,
  ],
  teacher: [
    // BUG-63 FIX: Sesuaikan dengan backend Main.gs ROLE_PERMISSIONS.teacher
    // Hapus: STUDENT_VIEW_DETAIL (tidak ada di backend — backend hanya cek view:own_class atau view:all)
    // Hapus: DASHBOARD_TEACHER (tidak ada di backend — tidak perlu permission check untuk dashboard teacher)
    // Tambah: SCHOOL_YEAR_VIEW (ada di backend, dibutuhkan untuk dropdown tahun pelajaran)
    PERMISSIONS.STUDENT_VIEW_OWN_CLASS,
    PERMISSIONS.STUDENT_EXPORT_OWN,
    PERMISSIONS.CLASSROOM_VIEW_OWN,
    PERMISSIONS.SCHOOL_YEAR_VIEW,
    PERMISSIONS.SUBJECT_VIEW,
    PERMISSIONS.SCORE_VIEW_OWN_CLASS,
    PERMISSIONS.SCORE_MANAGE_OWN_CLASS,
  ],
}

// BUG-63 FIX: Sinkronkan juga di gas-backend/Main.gs ROLE_PERMISSIONS:
// teacher sekarang: ['student:view:own_class','student:export:own','classroom:view:own',
//                    'school_year:view','report:view:own']
// (tanpa 'student:view:detail' dan 'dashboard:teacher')
