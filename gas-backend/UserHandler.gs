// ============================================================
// UserHandler.gs
// ============================================================

var UserHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':          return this.list(payload, user);
      case 'get':           return this.get(payload, user);
      case 'create':        return this.create(payload, user);
      case 'update':        return this.update(payload, user);
      case 'toggleActive':  return this.toggleActive(payload, user);
      case 'resetPassword': return this.resetPassword(payload, user);
      case 'delete':        return this.remove(payload, user);
      default: return errorResponse(404, 'User method tidak ditemukan.');
    }
  },

  _sanitize: function(u) {
    var s = Object.assign({}, u);
    delete s.passwordHash;
    return s;
  },

  list: function(payload, user) {
    checkPermission(user, 'user:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.USERS));

    if (payload.role)   all = all.filter(function(u){ return u.role === payload.role; });
    if (payload.search) all = all.filter(function(u){
      return searchInObject(u, payload.search, ['fullName','username','email']);
    });

    all = all.map(this._sanitize);
    all.sort(function(a,b){ return (a.fullName||'').localeCompare(b.fullName||''); });
    return successResponse(paginate(all, payload.page, payload.limit));
  },

  get: function(payload, user) {
    checkPermission(user, 'user:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.USERS));
    var found = all.find(function(u){ return String(u.id) === String(payload.id); });
    if (!found) return errorResponse(404, 'Pengguna tidak ditemukan.');
    return successResponse(this._sanitize(found));
  },

  create: function(payload, user) {
    checkPermission(user, 'user:manage');
    if (!payload.username || !payload.fullName || !payload.email || !payload.role || !payload.password)
      return errorResponse(400, 'Semua field wajib (username, fullName, email, role, password).');

    var validRoles = ['admin','principal','teacher'];
    if (validRoles.indexOf(payload.role) === -1)
      return errorResponse(400, 'Role tidak valid. Gunakan: admin, principal, atau teacher.');

    var normalizedUsername = String(payload.username).trim().toLowerCase();
    var normalizedEmail = String(payload.email).trim().toLowerCase();
    if (normalizedUsername.length < 3) return errorResponse(400, 'Username minimal 3 karakter.');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.USERS));
    if (all.find(function(u){ return String(u.username || '').trim().toLowerCase() === normalizedUsername; }))
      return errorResponse(409, 'Username "' + normalizedUsername + '" sudah digunakan.');
    if (all.find(function(u){ return String(u.email || '').trim().toLowerCase() === normalizedEmail; }))
      return errorResponse(409, 'Email "' + normalizedEmail + '" sudah digunakan.');

    if (payload.password.length < 8)
      return errorResponse(400, 'Password minimal 8 karakter.');

    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var id = generateUUID();
    var ts = now();
    var newUser = {
      id:           id,
      username:     normalizedUsername,
      fullName:     String(payload.fullName).trim(),
      email:        normalizedEmail,
      role:         payload.role,
      passwordHash: hashPassword(payload.password),
      isActive:     payload.isActive !== false,
      teacherId:    payload.teacherId || '',
      avatarUrl:    '',
      lastLogin:    '',
      createdAt:    ts,
      updatedAt:    ts,
      createdBy:    user.id,
    };
    appendRow(sheet, newUser, headers);
    AuditService.log(user.id, 'CREATE', 'user', id, null, this._sanitize(newUser), 'Buat pengguna: ' + newUser.username);
    return successResponse(this._sanitize(newUser));
  },

  update: function(payload, user) {
    checkPermission(user, 'user:manage');
    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(u){ return String(u.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Pengguna tidak ditemukan.');
    if (String(payload.id) === String(user.id) && payload.isActive === false) {
      return errorResponse(400, 'Tidak dapat menonaktifkan akun Anda sendiri.');
    }
    var updated = Object.assign({}, old);
    ['fullName','email','role','teacherId','isActive'].forEach(function(f){
      if (payload[f] !== undefined) updated[f] = payload[f];
    });
    updated.updatedAt = now();
    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'user', payload.id, this._sanitize(old), this._sanitize(updated), 'Edit pengguna');
    return successResponse(this._sanitize(updated));
  },

  toggleActive: function(payload, user) {
    checkPermission(user, 'user:manage');
    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var found = all.find(function(u){ return String(u.id) === String(payload.id); });
    if (!found) return errorResponse(404, 'Pengguna tidak ditemukan.');
    if (String(payload.id) === String(user.id) && normalizeBoolean(found.isActive, false)) {
      return errorResponse(400, 'Tidak dapat menonaktifkan akun Anda sendiri.');
    }
    var newStatus = !normalizeBoolean(found.isActive, false);
    var colActive = headers.indexOf('isActive') + 1;
    if (colActive > 0) sheet.getRange(rowIdx, colActive).setValue(newStatus);
    var colUpdated = headers.indexOf('updatedAt') + 1;
    if (colUpdated > 0) sheet.getRange(rowIdx, colUpdated).setValue(now());
    AuditService.log(user.id, 'UPDATE', 'user', payload.id, null, { isActive: newStatus }, 'Toggle status pengguna');
    return successResponse(this._sanitize(Object.assign({}, found, { isActive: newStatus })));
  },

  resetPassword: function(payload, user) {
    checkPermission(user, 'user:manage');
    if (!payload.newPassword || payload.newPassword.length < 8)
      return errorResponse(400, 'Password baru minimal 8 karakter.');
    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var col = headers.indexOf('passwordHash') + 1;
    if (col > 0) sheet.getRange(rowIdx, col).setValue(hashPassword(payload.newPassword));
    var colChangedAt = ensureHeader(sheet, 'passwordChangedAt');
    sheet.getRange(rowIdx, colChangedAt).setValue(Math.floor(Date.now() / 1000));
    var colUpdated = ensureHeader(sheet, 'updatedAt');
    sheet.getRange(rowIdx, colUpdated).setValue(now());
    AuditService.log(user.id, 'UPDATE', 'user', payload.id, null, null, 'Reset password pengguna');
    return successResponse({ message: 'Password berhasil direset.' });
  },

  remove: function(payload, user) {
    checkPermission(user, 'user:manage');
    if (String(payload.id) === String(user.id))
      return errorResponse(400, 'Tidak dapat menghapus akun Anda sendiri.');
    var sheet  = getSheet(CONFIG.SHEETS.USERS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var linkedTeachers = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS))
      .filter(function(t){ return String(t.userId) === String(payload.id); });
    if (linkedTeachers.length > 0) {
      return errorResponse(409, 'Akun tidak dapat dihapus karena masih terhubung ke data guru. Putuskan relasinya atau nonaktifkan akun terlebih dahulu.');
    }
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'user', payload.id, null, null, 'Hapus pengguna');
    return successResponse({ message: 'Pengguna berhasil dihapus.' });
  },
};
