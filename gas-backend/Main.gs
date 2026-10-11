// ============================================================
// Main.gs — Entry point doGet / doPost
// ============================================================

/**
 * ARSITEKTUR KOMUNIKASI:
 *
 * Frontend mengirim POST dengan Content-Type: application/x-www-form-urlencoded
 * Body berisi field: action=..., payload=...(JSON string), token=...
 *
 * GAS memparsing form body ke e.parameter secara otomatis, sehingga:
 *   e.parameter.action  → nama action
 *   e.parameter.payload → JSON string payload
 *   e.parameter.token   → JWT token
 *
 * Mengapa bukan JSON POST?
 *   → GAS redirect 302, browser ubah POST→GET, server tujuan tolak dengan 405
 *
 * Mengapa bukan GET query param?
 *   → URL bisa terpotong untuk payload besar, e.parameter.data bisa undefined
 *
 * Mengapa application/x-www-form-urlencoded berhasil?
 *   → Ini "simple request" CORS (tidak ada preflight OPTIONS)
 *   → GAS langsung memparsing ke e.parameter SEBELUM redirect terjadi
 *   → Tidak ada batasan panjang body
 */

function doPost(e) {
  try {
    // Ambil hanya parameter form yang sudah diparse oleh GAS.
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (typeof params.action === 'string') ? params.action.trim() : '';
    var token = (typeof params.token === 'string') ? params.token : '';
    var payload = {};
    var payloadText = (typeof params.payload === 'string') ? params.payload : '';

    if (!action) {
      return errorResponse(400, 'Parameter "action" diperlukan.');
    }
    if (action.length > 120 || !/^[a-zA-Z][a-zA-Z0-9_-]*\\.[a-zA-Z][a-zA-Z0-9_-]*$/.test(action)) {
      return errorResponse(400, 'Format action tidak valid.');
    }
    // Batas ukuran mencegah payload tak terbatas menghabiskan memori/waktu eksekusi.
    if (payloadText.length > 2 * 1024 * 1024) {
      return errorResponse(413, 'Payload terlalu besar.');
    }

    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch (parseErr) {
      return errorResponse(400, 'Format payload tidak valid.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return errorResponse(400, 'Payload harus berupa objek JSON.');
    }

    // ── Public routes (tidak perlu token) ──────────────────
    if (action === 'auth.login') {
      return AuthHandler.login(payload);
    }

    // ── Protected routes ───────────────────────────────────
    var user = verifyJWT(token);
    if (!user) {
      return errorResponse(401, 'Token tidak valid atau sudah berakhir. Silakan login kembali.');
    }

    // Rate limiting sederhana
    var rateLimitKey = 'rate_' + user.id;
    var callCount = CacheService.getScriptCache().get(rateLimitKey);
    if (callCount && parseInt(callCount) > 200) {
      return errorResponse(429, 'Terlalu banyak request. Coba lagi setelah 1 menit.');
    }
    CacheService.getScriptCache().put(
      rateLimitKey,
      (parseInt(callCount || '0') + 1).toString(),
      60
    );

    return Router.handle(action, payload, user);

  } catch (err) {
    // BUG-38 FIX: err bisa berupa string (bukan Error object), gunakan String() agar aman.
    var errMsg = (err && err.message) ? err.message : String(err);
    _recordServerError('doPost', errMsg);
    return errorResponse(500, 'Terjadi kesalahan internal. Silakan coba lagi.');
  }
}

/**
 * doGet untuk health check dan pengujian manual via browser.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // GET hanya untuk health check. Jangan menerima token/payload bisnis
    // melalui URL karena dapat masuk browser history atau server logs.
    if (params.action || params.token || params.payload || params.data) {
      return errorResponse(405, 'API bisnis hanya menerima POST. Gunakan endpoint health tanpa parameter.');
    }

    return createResponse(200, {
      message: 'Buku Induk Digital API',
      version: CONFIG.APP_VERSION,
      timestamp: now()
    });
  } catch (err) {
    var errMsg = (err && err.message) ? err.message : String(err);
    _recordServerError('doGet', errMsg);
    return errorResponse(500, 'Terjadi kesalahan internal. Silakan coba lagi.');
  }
}

// ── Router ────────────────────────────────────────────────────
var Router = {
  handle: function(action, payload, user) {
    var parts = action.split('.');
    var module = parts[0];
    var method = parts[1];

    try {
      switch (module) {
        case 'auth':        return AuthHandler.handle(method, payload, user);
        case 'students':    return StudentHandler.handle(method, payload, user);
        case 'teachers':    return TeacherHandler.handle(method, payload, user);
        case 'classrooms':  return ClassroomHandler.handle(method, payload, user);
        case 'grades':      return GradeHandler.handle(method, payload, user);
        case 'schoolYears': return SchoolYearHandler.handle(method, payload, user);
        case 'users':       return UserHandler.handle(method, payload, user);
        case 'reports':     return ReportHandler.handle(method, payload, user);
        case 'audit':       return AuditHandler.handle(method, payload, user);
        case 'settings':    return SettingsHandler.handle(method, payload, user);
        case 'subjects':    return SubjectHandler.handle(method, payload, user);
        case 'scores':      return ScoreHandler.handle(method, payload, user);
        default:
          return errorResponse(404, 'Action "' + action + '" tidak ditemukan.');
      }
    } catch (err) {
      var errMsg = (err && err.message) ? err.message : String(err);
      if (errMsg === 'FORBIDDEN') return errorResponse(403, 'Anda tidak memiliki izin.');
      _recordServerError(action, errMsg);
      return errorResponse(500, 'Terjadi kesalahan internal. Silakan coba lagi.');
    }
  }
};

// ── RBAC helper ───────────────────────────────────────────────
// BUG-63 FIX: Sinkronkan dengan frontend src/constants/permissions.ts ROLE_PERMISSIONS.
// BUG-64 FIX: Tambahkan 'settings:view' ke principal agar bisa akses halaman settings read-only.
var ROLE_PERMISSIONS = {
  admin: [
    'student:view:all','student:view:sensitive',
    'student:create','student:update','student:archive',
    'student:import','student:export','student:verify','subject:view','subject:manage','score:view:all','score:manage:all',
    'teacher:view','teacher:manage','classroom:view:all','classroom:manage',
    'school_year:view','school_year:manage','report:view:all','report:export','report:intelligence',
    'user:view','user:manage','settings:view','settings:manage','audit:view',
    
  ],
  principal: [
    'student:view:all','student:view:sensitive','student:export','student:verify','subject:view','subject:manage','score:view:all','score:manage:all',
    'teacher:view','classroom:view:all','school_year:view',
    'report:view:all','report:export','report:intelligence',
    'settings:view',
    
  ],
  teacher: [
    'student:view:own_class','student:export:own',
    'classroom:view:own','school_year:view',
    'subject:view','score:view:own_class','score:manage:own_class',
  ]
};

function checkPermission(user, permission) {
  var perms = ROLE_PERMISSIONS[user.role] || [];
  if (perms.indexOf(permission) === -1) throw new Error('FORBIDDEN');
}

function hasPermission(user, permission) {
  var perms = ROLE_PERMISSIONS[user.role] || [];
  return perms.indexOf(permission) !== -1;
}


/**
 * Simpan detail error di log internal tanpa mengekspos pesan/stack ke client.
 * Logging failure tidak boleh membuat handler mengembalikan error kedua.
 */
function _recordServerError(context, message) {
  try {
    if (typeof AuditService !== 'undefined' && AuditService &&
        typeof AuditService.logError === 'function') {
      AuditService.logError(context, message);
    } else {
      Logger.log('Internal error recorded without AuditService. Context: ' + context);
    }
  } catch (loggingError) {
    Logger.log('Audit logging failed for context: ' + context);
  }
}
