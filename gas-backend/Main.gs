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
    // Ambil dari e.parameter (hasil parse form body oleh GAS)
    var action  = e.parameter.action  || '';
    var token   = e.parameter.token   || '';
    var payload = {};

    try {
      payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    } catch (parseErr) {
      return errorResponse(400, 'Format payload tidak valid: ' + parseErr.message);
    }

    if (!action) {
      return errorResponse(400, 'Parameter "action" diperlukan.');
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
    AuditService.logError('doPost', errMsg);
    return errorResponse(500, 'Terjadi kesalahan server: ' + errMsg);
  }
}

/**
 * doGet untuk health check dan pengujian manual via browser.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // GET API tetap menggunakan router yang sama dengan POST.
    // Terima payload dari dua nama umum: payload dan data.
    if (params.action) {
      return doPost({
        parameter: {
          action: params.action,
          payload: params.payload || params.data || '{}',
          token: params.token || ''
        }
      });
    }

    // Health check biasa — selalu JSON 200 selama deployment GAS aktif.
    return createResponse(200, {
      message: 'Buku Induk Digital API',
      version: CONFIG.APP_VERSION,
      timestamp: now()
    });
  } catch (err) {
    var errMsg = (err && err.message) ? err.message : String(err);
    AuditService.logError('doGet', errMsg);
    return errorResponse(500, 'Terjadi kesalahan server: ' + errMsg);
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
        default:
          return errorResponse(404, 'Action "' + action + '" tidak ditemukan.');
      }
    } catch (err) {
      var errMsg = (err && err.message) ? err.message : String(err);
      if (errMsg === 'FORBIDDEN') return errorResponse(403, 'Anda tidak memiliki izin.');
      AuditService.logError(action, errMsg);
      return errorResponse(500, errMsg || 'Terjadi kesalahan.');
    }
  }
};

// ── RBAC helper ───────────────────────────────────────────────
// BUG-63 FIX: Sinkronkan dengan frontend src/constants/permissions.ts ROLE_PERMISSIONS.
// BUG-64 FIX: Tambahkan 'settings:view' ke principal agar bisa akses halaman settings read-only.
var ROLE_PERMISSIONS = {
  admin: [
    'student:view:all','student:view:detail','student:view:sensitive',
    'student:create','student:update','student:archive','student:delete',
    'student:import','student:export','student:verify',
    'teacher:view','teacher:manage','classroom:view:all','classroom:manage',
    'school_year:view','school_year:manage','report:view:all','report:export','report:intelligence',
    'user:view','user:manage','settings:view','settings:manage','audit:view',
    'dashboard:admin','dashboard:principal',
  ],
  principal: [
    'student:view:all','student:view:detail','student:view:sensitive','student:export','student:verify',
    'teacher:view','classroom:view:all','school_year:view',
    'report:view:all','report:export','report:intelligence',
    'settings:view',
    'dashboard:principal',
  ],
  teacher: [
    'student:view:own_class','student:export:own',
    'classroom:view:own','school_year:view',
    'report:view:own',
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
