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

  _syncTeacherLink: function(userId, teacherId, previousTeacherId) {
    var sheet = getSheet(CONFIG.SHEETS.TEACHERS);
    var headers = getHeaders(sheet);
    var all = sheetToObjects(sheet);

    if (previousTeacherId && String(previousTeacherId) !== String(teacherId || '')) {
      var previous = all.find(function(t) { return String(t.id) === String(previousTeacherId); });
      if (previous) {
        var previousRow = findRowById(sheet, previous.id);
        var colUserId = headers.indexOf('userId') + 1;
        if (previousRow > 0 && colUserId > 0) {
          var stillLinked = sheetToObjects(getSheet(CONFIG.SHEETS.USERS)).some(function(u) {
            return String(u.id) !== String(userId) &&
              String(u.teacherId || '') === String(previousTeacherId);
          });
          if (!stillLinked && (!previous.userId || String(previous.userId) === String(userId))) {
            sheet.getRange(previousRow, colUserId).setValue('');
          }
        }
      }
    }

    if (!teacherId) return;

    var teacher = all.find(function(t) { return String(t.id) === String(teacherId); });
    if (!teacher) throw new Error('Guru yang ditautkan tidak ditemukan.');

    var linkedUsers = sheetToObjects(getSheet(CONFIG.SHEETS.USERS)).filter(function(u) {
      return String(u.id) !== String(userId) && String(u.teacherId || '') === String(teacherId);
    });
    if (linkedUsers.length > 0) throw new Error('Guru tersebut sudah ditautkan ke akun pengguna lain.');

    var teacherRow = findRowById(sheet, teacherId);
    var teacherUserId = String(teacher.userId || '');
    if (teacherUserId && teacherUserId !== String(userId)) {
      throw new Error('Guru tersebut sudah terhubung ke akun pengguna lain.');
    }

    var col = headers.indexOf('userId') + 1;
    if (teacherRow > 0 && col > 0) {
      sheet.getRange(teacherRow, col).setValue(String(userId));
    }
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
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
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
    var teacherId = payload.teacherId ? String(payload.teacherId) : '';
    if (payload.role === 'teacher') {
      if (!teacherId) return errorResponse(400, 'Akun guru wajib ditautkan ke data guru.');
      var teacher = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS)).find(function(t) { return String(t.id) === teacherId; });
      if (!teacher) return errorResponse(400, 'Guru yang ditautkan tidak ditemukan.');
      if (teacher.userId && String(teacher.userId) !== String(id)) return errorResponse(409, 'Guru tersebut sudah terhubung ke akun pengguna lain.');
      var teacherUsers = all.filter(function(u) { return String(u.teacherId || '') === teacherId; });
      if (teacherUsers.length) return errorResponse(409, 'Guru tersebut sudah terhubung ke akun pengguna lain.');
    } else {
      teacherId = '';
    }

    var newUser = {
      id:           id,
      username:     normalizedUsername,
      fullName:     String(payload.fullName).trim(),
      email:        normalizedEmail,
      role:         payload.role,
      passwordHash: hashPassword(payload.password),
      isActive:     payload.isActive !== false,
      teacherId:    teacherId,
      avatarUrl:    '',
      lastLogin:    '',
      createdAt:    ts,
      updatedAt:    ts,
      createdBy:    user.id,
    };
    appendRow(sheet, newUser, headers);
    if (teacherId) this._syncTeacherLink(id, teacherId, '');
    AuditService.log(user.id, 'CREATE', 'user', id, null, this._sanitize(newUser), 'Buat pengguna: ' + newUser.username);
    return successResponse(this._sanitize(newUser));
  
    } finally {
      _writeLock.releaseLock();
    }},

  update: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'user:manage');
    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(u){ return String(u.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Pengguna tidak ditemukan.');
    if (String(payload.id) === String(user.id) && payload.isActive !== undefined && !normalizeBoolean(payload.isActive, true)) {
      return errorResponse(400, 'Tidak dapat menonaktifkan akun Anda sendiri.');
    }
    var updated = Object.assign({}, old);
    if (payload.role !== undefined && ['admin','principal','teacher'].indexOf(payload.role) === -1) return errorResponse(400, 'Role tidak valid.');
    var nextEmail = payload.email !== undefined ? String(payload.email).trim().toLowerCase() : String(old.email || '').trim().toLowerCase();
    if (payload.email !== undefined && all.some(function(u){ return String(u.id) !== String(payload.id) && String(u.email || '').trim().toLowerCase() === nextEmail; })) return errorResponse(409, 'Email sudah digunakan.');
    var nextRole = payload.role !== undefined ? String(payload.role) : String(old.role || '');
    var nextTeacherId = payload.teacherId !== undefined ? String(payload.teacherId || '') : String(old.teacherId || '');
    var previousTeacherId = String(old.teacherId || '');
    if (nextRole === 'teacher') {
      if (!nextTeacherId) return errorResponse(400, 'Akun guru wajib ditautkan ke data guru.');
      var linkedTeacher = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS)).find(function(t){ return String(t.id) === nextTeacherId; });
      if (!linkedTeacher) return errorResponse(400, 'Guru yang ditautkan tidak ditemukan.');
      if (linkedTeacher.userId && String(linkedTeacher.userId) !== String(payload.id)) return errorResponse(409, 'Guru tersebut sudah terhubung ke akun pengguna lain.');
      if (all.some(function(u){ return String(u.id) !== String(payload.id) && String(u.teacherId || '') === nextTeacherId; })) return errorResponse(409, 'Guru tersebut sudah terhubung ke akun pengguna lain.');
    } else {
      nextTeacherId = '';
    }
    ['fullName','isActive'].forEach(function(f){
      if (payload[f] !== undefined) updated[f] = payload[f];
    });
    updated.role = nextRole;
    if (payload.email !== undefined) updated.email = nextEmail;
    updated.teacherId = nextTeacherId;
    updated.isActive = normalizeBoolean(updated.isActive, false);
    updated.updatedAt = now();
    updateRow(sheet, rowIdx, updated, headers);
    this._syncTeacherLink(payload.id, nextTeacherId, previousTeacherId);
    AuditService.log(user.id, 'UPDATE', 'user', payload.id, this._sanitize(old), this._sanitize(updated), 'Edit pengguna');
    return successResponse(this._sanitize(updated));
  
    } finally {
      _writeLock.releaseLock();
    }},

  toggleActive: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
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
  
    } finally {
      _writeLock.releaseLock();
    }},

  resetPassword: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'user:manage');
    if (!payload.newPassword || payload.newPassword.length < 8)
      return errorResponse(400, 'Password baru minimal 8 karakter.');
    var sheet   = getSheet(CONFIG.SHEETS.USERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var col = ensureHeader(sheet, 'passwordHash');
    if (rowIdx > 0) sheet.getRange(rowIdx, col).setValue(hashPassword(payload.newPassword));
    var colChangedAt = ensureHeader(sheet, 'passwordChangedAt');
    sheet.getRange(rowIdx, colChangedAt).setValue(Math.floor(Date.now() / 1000));
    var colUpdated = ensureHeader(sheet, 'updatedAt');
    sheet.getRange(rowIdx, colUpdated).setValue(now());
    AuditService.log(user.id, 'UPDATE', 'user', payload.id, null, null, 'Reset password pengguna');
    return successResponse({ message: 'Password berhasil direset.' });
  
    } finally {
      _writeLock.releaseLock();
    }},

  remove: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'user:manage');
    if (String(payload.id) === String(user.id))
      return errorResponse(400, 'Tidak dapat menghapus akun Anda sendiri.');
    var sheet  = getSheet(CONFIG.SHEETS.USERS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Pengguna tidak ditemukan.');
    var foundUser = sheetToObjects(sheet).find(function(u){ return String(u.id) === String(payload.id); });
    if (foundUser && foundUser.teacherId) {
      return errorResponse(409, 'Akun tidak dapat dihapus karena masih ditautkan ke data guru. Putuskan relasi akun-guru atau nonaktifkan akun terlebih dahulu.');
    }
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'user', payload.id, null, null, 'Hapus pengguna');
    return successResponse({ message: 'Pengguna berhasil dihapus.' });
  
    } finally {
      _writeLock.releaseLock();
    }},
};
