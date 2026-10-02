// ============================================================
// AuthHandler.gs
// ============================================================

var AuthHandler = {

  login: function(payload) {
    var username = (payload.username || '').trim().toLowerCase();
    var password  = payload.password || '';

    if (!username || !password) {
      return errorResponse(400, 'Username dan password wajib diisi.');
    }

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);
    var user  = users.find(function(u) {
      return u.username && u.username.toString().toLowerCase() === username;
    });

    if (!user) return errorResponse(401, 'Username atau password salah.');
    if (!user.isActive || user.isActive === 'FALSE' || user.isActive === false) {
      return errorResponse(403, 'Akun Anda tidak aktif. Hubungi administrator.');
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return errorResponse(401, 'Username atau password salah.');
    }

    // Update last login
    var rowIdx = findRowById(sheet, user.id);
    if (rowIdx > 0) {
      var headers = getHeaders(sheet);
      var col = headers.indexOf('lastLogin') + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(now());
    }

    var tokenPayload = {
      id:        user.id,
      username:  user.username,
      fullName:  user.fullName,
      email:     user.email || '',
      role:      user.role,
      isActive:  true,
      teacherId: user.teacherId || null,
      createdAt: user.createdAt || '',
    };

    var token = generateJWT(tokenPayload);

    AuditService.log(user.id, 'LOGIN', 'user', user.id, null, null, 'Login berhasil');

    return successResponse({ token: token, user: tokenPayload });
  },

  handle: function(method, payload, user) {
    switch (method) {
      case 'logout':         return this.logout(payload, user);
      case 'me':             return this.me(user);
      case 'changePassword': return this.changePassword(payload, user);
      default: return errorResponse(404, 'Auth method tidak ditemukan.');
    }
  },

  logout: function(payload, user) {
    AuditService.log(user.id, 'LOGOUT', 'user', user.id, null, null, 'Logout');
    return successResponse({ message: 'Berhasil keluar.' });
  },

  me: function(user) {
    // Ambil data terbaru dari sheet
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);
    var found = users.find(function(u) { return String(u.id) === String(user.id); });
    if (!found) return errorResponse(404, 'Pengguna tidak ditemukan.');
    delete found.passwordHash;
    return successResponse(found);
  },

  changePassword: function(payload, user) {
    var currentPw  = payload.currentPassword || '';
    var newPw      = payload.newPassword     || '';
    var confirmPw  = payload.confirmPassword  || '';

    if (!currentPw || !newPw || !confirmPw) return errorResponse(400, 'Semua field wajib diisi.');
    if (newPw !== confirmPw) return errorResponse(400, 'Konfirmasi password tidak cocok.');
    if (newPw.length < 8)    return errorResponse(400, 'Password minimal 8 karakter.');

    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);
    var found = users.find(function(u) { return String(u.id) === String(user.id); });
    if (!found) return errorResponse(404, 'Pengguna tidak ditemukan.');

    if (!verifyPassword(currentPw, found.passwordHash)) {
      return errorResponse(400, 'Password lama tidak sesuai.');
    }

    var rowIdx = findRowById(sheet, user.id);
    var headers = getHeaders(sheet);

    var colPassword = headers.indexOf('passwordHash') + 1;
    if (rowIdx > 0 && colPassword > 0) {
      sheet.getRange(rowIdx, colPassword).setValue(hashPassword(newPw));
    }

    // BUG-46 FIX: Simpan timestamp perubahan password agar token lama bisa diinvalidasi.
    // verifyJWT() akan menolak token dengan iat < passwordChangedAt.
    var colChangedAt = headers.indexOf('passwordChangedAt') + 1;
    if (rowIdx > 0 && colChangedAt > 0) {
      sheet.getRange(rowIdx, colChangedAt).setValue(Math.floor(Date.now() / 1000));
    }

    AuditService.log(user.id, 'UPDATE', 'user', user.id, null, null, 'Ganti password');
    return successResponse({ message: 'Password berhasil diubah. Silakan login kembali.' });
  },
};
