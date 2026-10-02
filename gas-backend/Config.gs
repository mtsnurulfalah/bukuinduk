// ============================================================
// CONFIG.gs — Konfigurasi aplikasi
// Simpan nilai sensitif di File > Project Properties > Script Properties
// ============================================================

var CONFIG = (function () {
  var props = PropertiesService.getScriptProperties();

  // BUG-34 FIX: JWT_SECRET wajib diset di Script Properties.
  // Tidak lagi menyediakan fallback default agar admin sadar jika lupa mengkonfigurasi.
  var jwtSecret = props.getProperty('JWT_SECRET');
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET belum dikonfigurasi atau terlalu pendek (min 32 karakter). ' +
      'Buka GAS Editor → Project Settings → Script Properties → tambahkan JWT_SECRET.'
    );
  }

  return {
    JWT_SECRET:     jwtSecret,
    JWT_EXPIRES_IN: parseInt(props.getProperty('JWT_EXPIRES_IN') || '3600'), // seconds (1 jam)
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || '',
    ALLOWED_ORIGIN: props.getProperty('ALLOWED_ORIGIN') || '*',
    APP_VERSION:    '1.0.0',

    // Nama sheet
    SHEETS: {
      USERS:         'users',
      STUDENTS:      'students',
      PARENTS:       'student_parents',
      HEALTH:        'student_health',
      EDUCATION:     'student_education',
      ENROLLMENTS:   'student_enrollments',
      TEACHERS:      'teachers',
      CLASSROOMS:    'classrooms',
      GRADES:        'grades',
      SCHOOL_YEARS:  'school_years',
      SETTINGS:      'settings',
      AUDIT_LOGS:    'audit_logs',
    }
  };
})();
