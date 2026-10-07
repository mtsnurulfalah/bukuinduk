// ============================================================
// TeacherHandler.gs
// ============================================================

var TeacherHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':       return this.list(payload, user);
      case 'get':        return this.get(payload, user);
      case 'create':     return this.create(payload, user);
      case 'update':     return this.update(payload, user);
      case 'delete':     return this.remove(payload, user);
      case 'listActive': return this.listActive(payload, user);
      default: return errorResponse(404, 'Teacher method tidak ditemukan.');
    }
  },

  list: function(payload, user) {
    checkPermission(user, 'teacher:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));

    var statusFilter = normalizeIdentifier(payload.status).toLowerCase();
    if (statusFilter) {
      all = all.filter(function(t){
        return normalizeIdentifier(t.status).toLowerCase() === statusFilter;
      });
    }
    if (payload.search) {
      all = all.filter(function(t){
        return searchInObject(t, payload.search, ['fullName','nip','nuptk','email']);
      });
    }

    all.sort(function(a,b){ return (a.fullName||'').localeCompare(b.fullName||''); });
    return successResponse(paginate(all, payload.page, payload.limit));
  },

  get: function(payload, user) {
    checkPermission(user, 'teacher:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));
    var t = all.find(function(x){ return String(x.id) === String(payload.id); });
    if (!t) return errorResponse(404, 'Guru tidak ditemukan.');
    return successResponse(t);
  },

  create: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'teacher:manage');
    var fullName = normalizeIdentifier(payload.fullName);
    if (!fullName) return errorResponse(400, 'Nama lengkap wajib diisi.');

    var status = normalizeIdentifier(payload.status).toLowerCase() || 'active';
    if (['active', 'inactive'].indexOf(status) === -1) {
      return errorResponse(400, 'Status guru tidak valid.');
    }

    var sheet   = getSheet(CONFIG.SHEETS.TEACHERS);
    var headers = getHeaders(sheet);
    var all = sheetToObjects(sheet);
    var nip = normalizeIdentifier(payload.nip);
    var nuptk = normalizeIdentifier(payload.nuptk);
    var email = normalizeIdentifier(payload.email).toLowerCase();
    if (nip && all.some(function(t){ return normalizeIdentifier(t.nip) === nip; })) return errorResponse(409, 'NIP sudah digunakan.');
    if (nuptk && all.some(function(t){ return normalizeIdentifier(t.nuptk) === nuptk; })) return errorResponse(409, 'NUPTK sudah digunakan.');
    if (email && all.some(function(t){ return normalizeIdentifier(t.email).toLowerCase() === email; })) return errorResponse(409, 'Email guru sudah digunakan.');
    var id = generateUUID();
    var ts = now();
    var teacher = {};
    headers.forEach(function(h){
      teacher[h] = h === 'userId' ? '' : (payload[h] !== undefined ? payload[h] : '');
    });
    teacher.id = id;
    teacher.fullName = fullName;
    teacher.nip = nip;
    teacher.nuptk = nuptk;
    teacher.email = email;
    teacher.status = status;
    teacher.createdAt = ts;
    teacher.updatedAt = ts;
    appendRow(sheet, teacher, headers);
    AuditService.log(user.id, 'CREATE', 'teacher', id, null, teacher, 'Tambah guru: ' + teacher.fullName);
    return successResponse(Object.assign({}, teacher, { id: id }));
  
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
    checkPermission(user, 'teacher:manage');
    var sheet   = getSheet(CONFIG.SHEETS.TEACHERS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Guru tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(t){ return String(t.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Guru tidak ditemukan.');

    var nextFullName = payload.fullName !== undefined
      ? normalizeIdentifier(payload.fullName)
      : normalizeIdentifier(old.fullName);
    if (!nextFullName) return errorResponse(400, 'Nama lengkap wajib diisi.');

    var nextStatus = payload.status !== undefined
      ? normalizeIdentifier(payload.status).toLowerCase()
      : (normalizeIdentifier(old.status).toLowerCase() || 'active');
    if (['active', 'inactive'].indexOf(nextStatus) === -1) {
      return errorResponse(400, 'Status guru tidak valid.');
    }

    var nextNip = payload.nip !== undefined ? normalizeIdentifier(payload.nip) : normalizeIdentifier(old.nip);
    var nextNuptk = payload.nuptk !== undefined ? normalizeIdentifier(payload.nuptk) : normalizeIdentifier(old.nuptk);
    var nextEmail = payload.email !== undefined ? normalizeIdentifier(payload.email).toLowerCase() : normalizeIdentifier(old.email).toLowerCase();
    if (nextNip && all.some(function(t){ return String(t.id) !== String(payload.id) && normalizeIdentifier(t.nip) === nextNip; })) return errorResponse(409, 'NIP sudah digunakan.');
    if (nextNuptk && all.some(function(t){ return String(t.id) !== String(payload.id) && normalizeIdentifier(t.nuptk) === nextNuptk; })) return errorResponse(409, 'NUPTK sudah digunakan.');
    if (nextEmail && all.some(function(t){ return String(t.id) !== String(payload.id) && normalizeIdentifier(t.email).toLowerCase() === nextEmail; })) return errorResponse(409, 'Email guru sudah digunakan.');
    var updated = Object.assign({}, old);
    headers.forEach(function(h){
      if (payload[h] !== undefined && h !== 'id' && h !== 'createdAt' && h !== 'userId') updated[h] = payload[h];
    });
    updated.fullName = nextFullName;
    updated.nip = nextNip;
    updated.nuptk = nextNuptk;
    updated.email = nextEmail;
    updated.status = nextStatus;
    updated.updatedAt = now();
    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'teacher', payload.id, old, updated, 'Edit guru');
    return successResponse(updated);
  
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
    checkPermission(user, 'teacher:manage');
    var sheet  = getSheet(CONFIG.SHEETS.TEACHERS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Guru tidak ditemukan.');
    var linkedUsers = sheetToObjects(getSheet(CONFIG.SHEETS.USERS)).filter(function(u){ return String(u.teacherId) === String(payload.id); });
    var linkedClasses = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS)).filter(function(c){ return String(c.homeroomTeacherId) === String(payload.id); });
    if (linkedUsers.length || linkedClasses.length) {
      return errorResponse(409, 'Guru tidak dapat dihapus karena masih terhubung ke ' + linkedUsers.length + ' akun pengguna dan ' + linkedClasses.length + ' kelas. Nonaktifkan guru atau putuskan relasinya terlebih dahulu.');
    }
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'teacher', payload.id, null, null, 'Hapus guru');
    return successResponse({ message: 'Guru berhasil dihapus.' });
  
    } finally {
      _writeLock.releaseLock();
    }},

  listActive: function(payload, user) {
    checkPermission(user, 'teacher:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS))
      .filter(function(t){ return normalizeIdentifier(t.status).toLowerCase() === 'active'; })
      .map(function(t){ return { id: t.id, fullName: t.fullName }; });
    all.sort(function(a,b){ return (a.fullName||'').localeCompare(b.fullName||''); });
    return successResponse(all);
  },
};
