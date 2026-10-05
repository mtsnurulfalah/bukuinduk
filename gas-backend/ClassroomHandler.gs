// ============================================================
// ClassroomHandler.gs + GradeHandler + SchoolYearHandler
// ============================================================

var ClassroomHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':        return this.list(payload, user);
      case 'get':         return this.get(payload, user);
      case 'create':      return this.create(payload, user);
      case 'update':      return this.update(payload, user);
      case 'delete':      return this.remove(payload, user);
      case 'getStats':    return this.getStats(payload, user);
      case 'getByTeacher':return this.getByTeacher(payload, user);
      default: return errorResponse(404, 'Classroom method tidak ditemukan.');
    }
  },

  _getAll: function() {
    return sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
  },

  list: function(payload, user) {
    var canViewAll = hasPermission(user,'classroom:view:all');
    var canViewOwn = hasPermission(user,'classroom:view:own');
    if (!canViewAll && !canViewOwn) throw new Error('FORBIDDEN');
    var all = this._getAll();
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    var activeYear = schoolYears.find(function(y) { return normalizeBoolean(y.isActive, false); });
    var effectiveSchoolYearId = payload.schoolYearId
      ? String(payload.schoolYearId)
      : (user.role === 'teacher' && activeYear ? String(activeYear.id) : '');

    if (effectiveSchoolYearId) {
      all = all.filter(function(c){ return String(c.schoolYearId) === effectiveSchoolYearId; });
    }
    if (user.role === 'teacher' && !canViewAll) {
      if (!user.teacherId) return successResponse([]);
      all = all.filter(function(c) { return String(c.homeroomTeacherId) === String(user.teacherId); });
    }

    var grades = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    var teachers = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));

    all = all.map(function(c) {
      var grade = grades.find(function(g){ return String(g.id) === String(c.gradeId); });
      var teacher = teachers.find(function(t){ return String(t.id) === String(c.homeroomTeacherId); });
      var sy = schoolYears.find(function(s){ return String(s.id) === String(c.schoolYearId); });
      var count = enrollments.filter(function(e){
        return String(e.classroomId) === String(c.id) && e.status === 'active';
      }).length;
      return Object.assign({}, c, {
        gradeName: grade ? grade.name : '',
        homeroomTeacherName: teacher ? teacher.fullName : '',
        schoolYearName: sy ? sy.name : '',
        studentCount: count,
        isActive: normalizeBoolean(c.isActive, false),
      });
    });

    all.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
    return successResponse(all);
  },

  get: function(payload, user) {
    var canViewAll = hasPermission(user,'classroom:view:all');
    if (!canViewAll && !hasPermission(user,'classroom:view:own')) throw new Error('FORBIDDEN');
    var all = this._getAll();
    var c = all.find(function(x){ return String(x.id) === String(payload.id); });
    if (c && user.role === 'teacher') {
      var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
      var activeYear = schoolYears.find(function(y) { return normalizeBoolean(y.isActive, false); });
      if (String(c.homeroomTeacherId) !== String(user.teacherId) ||
          (activeYear && String(c.schoolYearId) !== String(activeYear.id))) {
        throw new Error('FORBIDDEN');
      }
    }
    if (!c) return errorResponse(404, 'Kelas tidak ditemukan.');

    var grades = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    var teachers = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    var grade = grades.find(function(g){ return String(g.id) === String(c.gradeId); });
    var teacher = teachers.find(function(t){ return String(t.id) === String(c.homeroomTeacherId); });
    var sy = schoolYears.find(function(s){ return String(s.id) === String(c.schoolYearId); });

    return successResponse(Object.assign({}, c, {
      gradeName: grade ? grade.name : '',
      homeroomTeacherName: teacher ? teacher.fullName : '',
      schoolYearName: sy ? sy.name : '',
      isActive: normalizeBoolean(c.isActive, false),
    }));
  },

  create: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'classroom:manage');
    if (!payload.name) return errorResponse(400, 'Nama kelas wajib diisi.');
    var id = generateUUID();
    var ts = now();
    if (!payload.gradeId || !payload.schoolYearId) return errorResponse(400, 'Tingkat dan tahun pelajaran wajib diisi.');
    var grades = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    if (!grades.some(function(g){ return String(g.id) === String(payload.gradeId); })) return errorResponse(400, 'Tingkat kelas tidak ditemukan.');
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    if (!schoolYears.some(function(s){ return String(s.id) === String(payload.schoolYearId); })) return errorResponse(400, 'Tahun pelajaran tidak ditemukan.');
    var existingClasses = this._getAll();
    if (existingClasses.some(function(c){ return String(c.schoolYearId) === String(payload.schoolYearId) && String(c.name || '').trim().toLowerCase() === String(payload.name).trim().toLowerCase(); })) return errorResponse(409, 'Nama kelas sudah digunakan pada tahun pelajaran ini.');
    if (payload.homeroomTeacherId) {
      var teachers = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));
      if (!teachers.some(function(t){ return String(t.id) === String(payload.homeroomTeacherId); })) return errorResponse(400, 'Wali kelas tidak ditemukan.');
    }
    var sheet   = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var headers = getHeaders(sheet);
    var capacity = payload.capacity === undefined || payload.capacity === '' ? 30 : Number(payload.capacity);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 50) return errorResponse(400, 'Kapasitas kelas harus antara 1 sampai 50 siswa.');
    var cls = {};
    headers.forEach(function(h){ cls[h] = payload[h] !== undefined ? payload[h] : ''; });
    cls.id = id;
    cls.capacity = capacity;
    cls.isActive = normalizeBoolean(payload.isActive, true);
    cls.createdAt = ts;
    cls.updatedAt = ts;
    appendRow(sheet, cls, headers);
    AuditService.log(user.id, 'CREATE', 'classroom', id, null, cls, 'Tambah kelas: ' + cls.name);
    return successResponse(Object.assign({}, cls, { id: id }));
  
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
    checkPermission(user, 'classroom:manage');
    var sheet   = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Kelas tidak ditemukan.');

    var all = this._getAll();
    var old = all.find(function(c){ return String(c.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Kelas tidak ditemukan.');
    var updated = Object.assign({}, old);

    if (payload.name !== undefined && !String(payload.name).trim()) {
      return errorResponse(400, 'Nama kelas wajib diisi.');
    }
    if (payload.gradeId !== undefined) {
      if (!String(payload.gradeId).trim()) return errorResponse(400, 'Tingkat kelas wajib diisi.');
      if (!sheetToObjects(getSheet(CONFIG.SHEETS.GRADES)).some(function(g){ return String(g.id) === String(payload.gradeId); })) {
        return errorResponse(400, 'Tingkat kelas tidak ditemukan.');
      }
    }
    if (payload.schoolYearId !== undefined) {
      if (!String(payload.schoolYearId).trim()) return errorResponse(400, 'Tahun pelajaran wajib diisi.');
      if (!sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS)).some(function(s){ return String(s.id) === String(payload.schoolYearId); })) {
        return errorResponse(400, 'Tahun pelajaran tidak ditemukan.');
      }
    }
    if (payload.homeroomTeacherId) {
      if (!sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS)).some(function(t){ return String(t.id) === String(payload.homeroomTeacherId); })) return errorResponse(400, 'Wali kelas tidak ditemukan.');
    }
    if (payload.name || payload.schoolYearId) {
      var candidateName = String(payload.name !== undefined ? payload.name : old.name).trim().toLowerCase();
      var candidateYear = String(payload.schoolYearId !== undefined ? payload.schoolYearId : old.schoolYearId);
      if (all.some(function(c){ return String(c.id) !== String(payload.id) && String(c.schoolYearId) === candidateYear && String(c.name || '').trim().toLowerCase() === candidateName; })) return errorResponse(409, 'Nama kelas sudah digunakan pada tahun pelajaran ini.');
    }
    if (payload.capacity !== undefined) {
      var nextCapacity = Number(payload.capacity);
      if (!Number.isFinite(nextCapacity) || nextCapacity < 1 || nextCapacity > 50) return errorResponse(400, 'Kapasitas kelas harus antara 1 sampai 50 siswa.');
      var activeEnrollmentCount = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS)).filter(function(e){ return String(e.classroomId) === String(payload.id) && e.status === 'active'; }).length;
      if (nextCapacity < activeEnrollmentCount) return errorResponse(409, 'Kapasitas baru tidak boleh lebih kecil dari jumlah siswa aktif saat ini (' + activeEnrollmentCount + ').');
      updated.capacity = nextCapacity;
    }
    if (payload.schoolYearId !== undefined && String(payload.schoolYearId) !== String(old.schoolYearId)) {
      var linkedEnrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS)).filter(function(e){ return String(e.classroomId) === String(payload.id); });
      if (linkedEnrollments.length) return errorResponse(409, 'Tahun pelajaran kelas tidak dapat diubah karena sudah memiliki riwayat enrollment. Buat kelas baru untuk tahun pelajaran lain.');
    }
    headers.forEach(function(h){
      if (payload[h] !== undefined && h !== 'id' && h !== 'createdAt' && h !== 'updatedAt' && h !== 'capacity') updated[h] = payload[h];
    });
    updated.capacity = Number(updated.capacity || 30);
    updated.isActive = normalizeBoolean(updated.isActive, false);
    updated.updatedAt = now();
    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'classroom', payload.id, old, updated, 'Edit kelas');
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
    checkPermission(user, 'classroom:manage');
    var sheet  = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Kelas tidak ditemukan.');

    // Kelas adalah referensi historis untuk enrollment. Jangan hapus bila
    // pernah dipakai, karena akan membuat riwayat siswa menjadi orphan.
    var linkedEnrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS))
      .filter(function(e) { return String(e.classroomId) === String(payload.id); });
    if (linkedEnrollments.length > 0) {
      return errorResponse(409,
        'Kelas tidak dapat dihapus karena masih memiliki ' +
        linkedEnrollments.length + ' riwayat enrollment. Arsipkan/nonaktifkan kelas saja.'
      );
    }

    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'classroom', payload.id, null, null, 'Hapus kelas');
    return successResponse({ message: 'Kelas berhasil dihapus.' });
  
    } finally {
      _writeLock.releaseLock();
    }},

  getStats: function(payload, user) {
    var canViewAll = hasPermission(user,'classroom:view:all');
    if (!canViewAll && !hasPermission(user,'classroom:view:own')) throw new Error('FORBIDDEN');
    var all = this._getAll();
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    var activeYear = schoolYears.find(function(y) { return normalizeBoolean(y.isActive, false); });
    var effectiveSchoolYearId = payload.schoolYearId
      ? String(payload.schoolYearId)
      : (user.role === 'teacher' && activeYear ? String(activeYear.id) : '');

    if (user.role === 'teacher' && !canViewAll) {
      all = all.filter(function(c){ return String(c.homeroomTeacherId) === String(user.teacherId); });
    }
    if (effectiveSchoolYearId) {
      all = all.filter(function(c){ return String(c.schoolYearId) === effectiveSchoolYearId; });
    }
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var students    = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    var grades      = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));

    var stats = all.map(function(cls) {
      var enrs = enrollments.filter(function(e){
        return String(e.classroomId) === String(cls.id) && e.status === 'active';
      });
      var sids = enrs.map(function(e){ return String(e.studentId); });
      var clsStudents = students.filter(function(s){ return sids.indexOf(String(s.id)) !== -1; });
      var grade = grades.find(function(g){ return String(g.id) === String(cls.gradeId); });
      return {
        classroomId:     cls.id,
        classroomName:   cls.name,
        gradeName:       grade ? grade.name : '',
        totalStudents:   clsStudents.length,
        maleStudents:    clsStudents.filter(function(s){ return s.gender === 'L'; }).length,
        femaleStudents:  clsStudents.filter(function(s){ return s.gender === 'P'; }).length,
      };
    });

    stats.sort(function(a,b){ return (a.classroomName||'').localeCompare(b.classroomName||''); });
    return successResponse(stats);
  },

  getByTeacher: function(payload, user) {
    var canViewAll = hasPermission(user,'classroom:view:all');
    var canViewOwn = hasPermission(user,'classroom:view:own');
    if (!canViewAll && !canViewOwn) throw new Error('FORBIDDEN');
    var teacherId = canViewAll ? payload.teacherId : user.teacherId;
    if (!teacherId) return successResponse([]);

    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    var activeYear = schoolYears.find(function(y) { return normalizeBoolean(y.isActive, false); });
    var effectiveSchoolYearId = payload.schoolYearId
      ? String(payload.schoolYearId)
      : (!canViewAll && activeYear ? String(activeYear.id) : '');

    var all = this._getAll().filter(function(c){
      return String(c.homeroomTeacherId) === String(teacherId) &&
        (!effectiveSchoolYearId || String(c.schoolYearId) === effectiveSchoolYearId);
    });

    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    all = all.map(function(c){
      var count = enrollments.filter(function(e){
        return String(e.classroomId) === String(c.id) && e.status === 'active';
      }).length;
      var sy = schoolYears.find(function(s){ return String(s.id) === String(c.schoolYearId); });
      return Object.assign({}, c, {
        studentCount: count,
        schoolYearName: sy ? sy.name : '',
        isActive: normalizeBoolean(c.isActive, false),
      });
    });

    return successResponse(all);
  },
};

// ── GradeHandler ─────────────────────────────────────────────
var GradeHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':   return this.list(payload, user);
      case 'create': return this.create(payload, user);
      case 'update': return this.update(payload, user);
      case 'delete': return this.remove(payload, user);
      default: return errorResponse(404, 'Grade method tidak ditemukan.');
    }
  },
  list: function(payload, user) {
    if (!hasPermission(user, 'classroom:view:all') && !hasPermission(user, 'classroom:view:own')) throw new Error('FORBIDDEN');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    all.sort(function(a,b){ return (a.level||0) - (b.level||0); });
    return successResponse(all);
  },
  create: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'classroom:manage');
    var sheet = getSheet(CONFIG.SHEETS.GRADES);
    var headers = getHeaders(sheet);
    var name = String(payload.name || '').trim();
    var level = Number(payload.level);
    if (!name) return errorResponse(400, 'Nama tingkat wajib diisi.');
    if (!Number.isFinite(level) || level < 1) return errorResponse(400, 'Level tingkat tidak valid.');
    var all = sheetToObjects(sheet);
    if (all.some(function(g){ return String(g.name || '').trim().toLowerCase() === name.toLowerCase(); })) return errorResponse(409, 'Nama tingkat sudah digunakan.');
    if (all.some(function(g){ return Number(g.level) === level; })) return errorResponse(409, 'Level tingkat sudah digunakan.');
    var grade = { id: generateUUID(), name: name, level: level, description: String(payload.description || '').trim(), createdAt: now(), updatedAt: now() };
    appendRow(sheet, grade, headers);
    return successResponse(grade);
  
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
    checkPermission(user, 'classroom:manage');
    var sheet  = getSheet(CONFIG.SHEETS.GRADES);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tingkat tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(g){ return String(g.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Tingkat tidak ditemukan.');
    var name = payload.name !== undefined ? String(payload.name).trim() : String(old.name || '').trim();
    var level = payload.level !== undefined ? Number(payload.level) : Number(old.level);
    if (!name) return errorResponse(400, 'Nama tingkat wajib diisi.');
    if (!Number.isFinite(level) || level < 1) return errorResponse(400, 'Level tingkat tidak valid.');
    if (all.some(function(g){ return String(g.id) !== String(payload.id) && String(g.name || '').trim().toLowerCase() === name.toLowerCase(); })) {
      return errorResponse(409, 'Nama tingkat sudah digunakan.');
    }
    if (all.some(function(g){ return String(g.id) !== String(payload.id) && Number(g.level) === level; })) {
      return errorResponse(409, 'Level tingkat sudah digunakan.');
    }
    var updated = Object.assign({}, old);
    updated.name = name;
    updated.level = level;
    if (payload.description !== undefined) updated.description = String(payload.description || '').trim();
    updated.updatedAt = now();
    updateRow(sheet, rowIdx, updated, headers);
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
    checkPermission(user, 'classroom:manage');
    var linkedClassrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS)).filter(function(c){ return String(c.gradeId) === String(payload.id); });
    if (linkedClassrooms.length > 0) return errorResponse(409, 'Tingkat kelas tidak dapat dihapus karena masih digunakan oleh ' + linkedClassrooms.length + ' kelas.');
    var sheet = getSheet(CONFIG.SHEETS.GRADES);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tingkat tidak ditemukan.');
    sheet.deleteRow(rowIdx);
    return successResponse({ message: 'Tingkat berhasil dihapus.' });
  
    } finally {
      _writeLock.releaseLock();
    }},
};

// ── SchoolYearHandler ─────────────────────────────────────────
var SchoolYearHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':      return this.list(payload, user);
      case 'create':    return this.create(payload, user);
      case 'update':    return this.update(payload, user);
      case 'setActive': return this.setActive(payload, user);
      case 'delete':    return this.remove(payload, user);
      default: return errorResponse(404, 'SchoolYear method tidak ditemukan.');
    }
  },
  list: function(payload, user) {
    checkPermission(user, 'school_year:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    all.sort(function(a,b){ return (b.name||'').localeCompare(a.name||''); });
    return successResponse(all.map(function(s){ return Object.assign({}, s, { isActive: normalizeBoolean(s.isActive, false) }); }));
  },
  create: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'school_year:manage');
    var name = String(payload.name || '').trim();
    if (!/^\d{4}\/\d{4}$/.test(name)) {
      return errorResponse(400, 'Format nama harus YYYY/YYYY.');
    }
    var startDate = String(payload.startDate || '').trim();
    var endDate = String(payload.endDate || '').trim();
    if (startDate && endDate && startDate > endDate) {
      return errorResponse(400, 'Tanggal mulai tidak boleh setelah tanggal selesai.');
    }
    var sheet   = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    var all = sheetToObjects(sheet);
    if (all.some(function(item) { return String(item.name || '').trim() === name; })) {
      return errorResponse(409, 'Tahun pelajaran sudah digunakan.');
    }
    var sy = {
      id: generateUUID(),
      name: name,
      startDate: startDate,
      endDate: endDate,
      isActive: normalizeBoolean(payload.isActive, false),
      createdAt: now(),
      updatedAt: now(),
    };
    appendRow(sheet, sy, headers);
    if (sy.isActive) this._deactivateOthers(sheet, headers, sy.id);
    return successResponse(sy);
  
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
    checkPermission(user, 'school_year:manage');
    var sheet  = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(s){ return String(s.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');
    var updated = Object.assign({}, old);
    updated.name = payload.name !== undefined ? String(payload.name).trim() : String(old.name || '').trim();
    updated.startDate = payload.startDate !== undefined ? String(payload.startDate || '').trim() : String(old.startDate || '').trim();
    updated.endDate = payload.endDate !== undefined ? String(payload.endDate || '').trim() : String(old.endDate || '').trim();
    updated.isActive = normalizeBoolean(payload.isActive !== undefined ? payload.isActive : old.isActive, false);
    if (!/^\d{4}\/\d{4}$/.test(updated.name)) return errorResponse(400, 'Format nama harus YYYY/YYYY.');
    if (updated.startDate && updated.endDate && updated.startDate > updated.endDate) return errorResponse(400, 'Tanggal mulai tidak boleh setelah tanggal selesai.');
    if (all.some(function(s){ return String(s.id) !== String(payload.id) && String(s.name || '').trim() === updated.name; })) return errorResponse(409, 'Tahun pelajaran sudah digunakan.');
    if (updated.isActive) this._deactivateOthers(sheet, headers, payload.id);
    updateRow(sheet, rowIdx, updated, headers);
    return successResponse(updated);
  
    } finally {
      _writeLock.releaseLock();
    }},
  setActive: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'school_year:manage');
    var sheet   = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');
    this._deactivateOthers(sheet, headers, payload.id);
    var colIsActive = headers.indexOf('isActive') + 1;
    if (colIsActive > 0) sheet.getRange(rowIdx, colIsActive).setValue(true);
    var all = sheetToObjects(sheet);
    var sy = all.find(function(s){ return String(s.id) === String(payload.id); });
    return successResponse(Object.assign({}, sy, { isActive: true }));
  
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
    checkPermission(user, 'school_year:manage');
    var sheet = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');

    var currentAll = sheetToObjects(sheet);
    var current = currentAll.find(function(item) { return String(item.id) === String(payload.id); });
    if (current && normalizeBoolean(current.isActive, false)) {
      return errorResponse(409, 'Tahun pelajaran aktif tidak dapat dihapus. Tetapkan tahun aktif lain terlebih dahulu.');
    }

    // Jangan hapus tahun pelajaran yang masih direferensikan oleh data historis.
    var linkedClassrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS))
      .filter(function(c) { return String(c.schoolYearId) === String(payload.id); });
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS))
      .filter(function(e) { return String(e.schoolYearId) === String(payload.id); });
    var subjects = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']))
      .filter(function(x){ return String(x.schoolYearId) === String(payload.id); });
    var scores = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']))
      .filter(function(x){ return String(x.schoolYearId) === String(payload.id); });
    var linkedTotal = linkedClassrooms.length + enrollments.length + subjects.length + scores.length;
    if (linkedTotal > 0) {
      return errorResponse(409,
        'Tahun pelajaran tidak dapat dihapus karena masih digunakan oleh ' +
        linkedClassrooms.length + ' kelas, ' + enrollments.length + ' enrollment, ' +
        subjects.length + ' mata pelajaran, dan ' + scores.length + ' nilai.'
      );
    }

    sheet.deleteRow(rowIdx);
    return successResponse({ message: 'Tahun pelajaran dihapus.' });
  
    } finally {
      _writeLock.releaseLock();
    }},
  _deactivateOthers: function(sheet, headers, exceptId) {
    var all = sheetToObjects(sheet);
    var colIsActive = headers.indexOf('isActive') + 1;
    if (colIsActive <= 0) return;
    all.forEach(function(s) {
      if (String(s.id) !== String(exceptId) && normalizeBoolean(s.isActive, false)) {
        var rowIdx = findRowById(sheet, s.id);
        if (rowIdx > 0) sheet.getRange(rowIdx, colIsActive).setValue(false);
      }
    });
  },
};
