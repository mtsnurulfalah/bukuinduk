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
    if (!hasPermission(user,'classroom:view:all') && !hasPermission(user,'classroom:view:own')) {
      throw new Error('FORBIDDEN');
    }
    var all = this._getAll();
    if (payload.schoolYearId) {
      all = all.filter(function(c){ return String(c.schoolYearId) === String(payload.schoolYearId); });
    }

    var grades = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    var teachers = sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS));
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
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
    var all = this._getAll();
    var c = all.find(function(x){ return String(x.id) === String(payload.id); });
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
    checkPermission(user, 'classroom:manage');
    if (!payload.name) return errorResponse(400, 'Nama kelas wajib diisi.');
    var id = generateUUID();
    var ts = now();
    var sheet   = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var headers = getHeaders(sheet);
    var cls = {};
    headers.forEach(function(h){ cls[h] = payload[h] !== undefined ? payload[h] : ''; });
    cls.id = id;
    cls.isActive = payload.isActive !== false;
    cls.createdAt = ts;
    appendRow(sheet, cls, headers);
    AuditService.log(user.id, 'CREATE', 'classroom', id, null, cls, 'Tambah kelas: ' + cls.name);
    return successResponse(Object.assign({}, cls, { id: id }));
  },

  update: function(payload, user) {
    checkPermission(user, 'classroom:manage');
    var sheet   = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Kelas tidak ditemukan.');

    var all = this._getAll();
    var old = all.find(function(c){ return String(c.id) === String(payload.id); });
    var updated = Object.assign({}, old);
    headers.forEach(function(h){
      if (payload[h] !== undefined && h !== 'id' && h !== 'createdAt') updated[h] = payload[h];
    });
    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'classroom', payload.id, old, updated, 'Edit kelas');
    return successResponse(updated);
  },

  remove: function(payload, user) {
    checkPermission(user, 'classroom:manage');
    var sheet  = getSheet(CONFIG.SHEETS.CLASSROOMS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Kelas tidak ditemukan.');

    // BUG-44 FIX: Cek apakah kelas masih memiliki siswa aktif.
    // Menghapus kelas yang masih berisi siswa akan meninggalkan orphaned enrollment.
    var activeEnrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS))
      .filter(function(e) {
        return String(e.classroomId) === String(payload.id) && e.status === 'active';
      });
    if (activeEnrollments.length > 0) {
      return errorResponse(409,
        'Kelas tidak dapat dihapus karena masih memiliki ' +
        activeEnrollments.length + ' siswa aktif. ' +
        'Pindahkan atau arsipkan siswa terlebih dahulu.'
      );
    }

    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'classroom', payload.id, null, null, 'Hapus kelas');
    return successResponse({ message: 'Kelas berhasil dihapus.' });
  },

  getStats: function(payload, user) {
    var all = this._getAll();
    if (payload.schoolYearId) {
      all = all.filter(function(c){ return String(c.schoolYearId) === String(payload.schoolYearId); });
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
    var teacherId = payload.teacherId;
    var all = this._getAll().filter(function(c){
      return String(c.homeroomTeacherId) === String(teacherId);
    });

    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));

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
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.GRADES));
    all.sort(function(a,b){ return (a.level||0) - (b.level||0); });
    return successResponse(all);
  },
  create: function(payload, user) {
    checkPermission(user, 'classroom:manage');
    var sheet = getSheet(CONFIG.SHEETS.GRADES);
    var headers = getHeaders(sheet);
    var grade = { id: generateUUID(), name: payload.name, level: payload.level, description: payload.description||'', createdAt: now() };
    appendRow(sheet, grade, headers);
    return successResponse(grade);
  },
  update: function(payload, user) {
    checkPermission(user, 'classroom:manage');
    var sheet  = getSheet(CONFIG.SHEETS.GRADES);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tingkat tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(g){ return String(g.id) === String(payload.id); });
    var updated = Object.assign({}, old, payload);
    updateRow(sheet, rowIdx, updated, headers);
    return successResponse(updated);
  },
  remove: function(payload, user) {
    checkPermission(user, 'classroom:manage');
    var sheet = getSheet(CONFIG.SHEETS.GRADES);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tingkat tidak ditemukan.');
    sheet.deleteRow(rowIdx);
    return successResponse({ message: 'Tingkat berhasil dihapus.' });
  },
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
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    all.sort(function(a,b){ return (b.name||'').localeCompare(a.name||''); });
    return successResponse(all.map(function(s){ return Object.assign({}, s, { isActive: normalizeBoolean(s.isActive, false) }); }));
  },
  create: function(payload, user) {
    checkPermission(user, 'school_year:manage');
    if (!payload.name || !/^\d{4}\/\d{4}$/.test(payload.name))
      return errorResponse(400, 'Format nama harus YYYY/YYYY.');
    var sheet   = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    var sy = { id: generateUUID(), name: payload.name, startDate: payload.startDate||'', endDate: payload.endDate||'', isActive: payload.isActive||false, createdAt: now() };
    appendRow(sheet, sy, headers);
    if (sy.isActive) this._deactivateOthers(sheet, headers, sy.id);
    return successResponse(sy);
  },
  update: function(payload, user) {
    checkPermission(user, 'school_year:manage');
    var sheet  = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var old = all.find(function(s){ return String(s.id) === String(payload.id); });
    var updated = Object.assign({}, old, payload);
    updateRow(sheet, rowIdx, updated, headers);
    return successResponse(Object.assign({}, updated, { isActive: updated.isActive === true || updated.isActive === 'TRUE' }));
  },
  setActive: function(payload, user) {
    checkPermission(user, 'school_year:manage');
    var sheet   = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var headers = getHeaders(sheet);
    this._deactivateOthers(sheet, headers, payload.id);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');
    var colIsActive = headers.indexOf('isActive') + 1;
    if (colIsActive > 0) sheet.getRange(rowIdx, colIsActive).setValue(true);
    var all = sheetToObjects(sheet);
    var sy = all.find(function(s){ return String(s.id) === String(payload.id); });
    return successResponse(Object.assign({}, sy, { isActive: true }));
  },
  remove: function(payload, user) {
    checkPermission(user, 'school_year:manage');
    var sheet = getSheet(CONFIG.SHEETS.SCHOOL_YEARS);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Tahun pelajaran tidak ditemukan.');

    // BUG-45 FIX: Cek apakah masih ada kelas yang menggunakan tahun pelajaran ini.
    // Menghapus school year dengan kelas aktif akan membuat kelas menjadi orphaned.
    var linkedClassrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS))
      .filter(function(c) { return String(c.schoolYearId) === String(payload.id); });
    if (linkedClassrooms.length > 0) {
      return errorResponse(409,
        'Tahun pelajaran tidak dapat dihapus karena masih memiliki ' +
        linkedClassrooms.length + ' kelas. ' +
        'Hapus semua kelas di tahun pelajaran ini terlebih dahulu.'
      );
    }

    sheet.deleteRow(rowIdx);
    return successResponse({ message: 'Tahun pelajaran dihapus.' });
  },
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
