// ============================================================
// AcademicHandler.gs — Mata Pelajaran & Nilai Siswa
// ============================================================

var SubjectHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':   return this.list(payload, user);
      case 'create': return this.create(payload, user);
      case 'update': return this.update(payload, user);
      case 'delete': return this.remove(payload, user);
      default: return errorResponse(404, 'Subject method tidak ditemukan.');
    }
  },

  list: function(payload, user) {
    checkPermission(user, 'subject:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.SUBJECTS));
    if (payload.schoolYearId) {
      all = all.filter(function(s) { return String(s.schoolYearId) === String(payload.schoolYearId); });
    }
    if (payload.activeOnly) {
      all = all.filter(function(s) { return normalizeBoolean(s.isActive, true); });
    }
    all.sort(function(a, b) {
      var order = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      return order || String(a.name || '').localeCompare(String(b.name || ''));
    });
    return successResponse(all.map(function(s) {
      return Object.assign({}, s, {
        isActive: normalizeBoolean(s.isActive, true),
        sortOrder: Number(s.sortOrder) || 0,
      });
    }));
  },

  create: function(payload, user) {
    checkPermission(user, 'subject:manage');
    if (!payload.schoolYearId) return errorResponse(400, 'Tahun pelajaran wajib dipilih.');
    if (!payload.name || !String(payload.name).trim()) return errorResponse(400, 'Nama mata pelajaran wajib diisi.');

    var sheet = getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']);
    var headers = getHeaders(sheet);
    var all = sheetToObjects(sheet);
    var code = normalizeIdentifier(payload.code).toUpperCase();
    var name = String(payload.name).trim();

    var duplicate = all.find(function(s) {
      return String(s.schoolYearId) === String(payload.schoolYearId) &&
        (String(s.name || '').trim().toLowerCase() === name.toLowerCase() ||
         (code && normalizeIdentifier(s.code).toUpperCase() === code));
    });
    if (duplicate) return errorResponse(409, 'Mata pelajaran dengan nama/kode tersebut sudah ada pada tahun pelajaran ini.');

    var ts = now();
    var subject = {
      id: generateUUID(),
      schoolYearId: payload.schoolYearId,
      code: code,
      name: name,
      shortName: String(payload.shortName || '').trim(),
      groupName: String(payload.groupName || '').trim(),
      isActive: normalizeBoolean(payload.isActive, true),
      sortOrder: Number(payload.sortOrder) || 0,
      createdAt: ts,
      updatedAt: ts,
      createdBy: user.id,
    };
    appendRow(sheet, subject, headers);
    AuditService.log(user.id, 'CREATE', 'subject', subject.id, null, subject, 'Tambah mata pelajaran: ' + subject.name);
    return successResponse(subject);
  },

  update: function(payload, user) {
    checkPermission(user, 'subject:manage');
    if (!payload.id) return errorResponse(400, 'ID mata pelajaran diperlukan.');
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Mata pelajaran tidak ditemukan.');

    var all = sheetToObjects(sheet);
    var old = all.find(function(s) { return String(s.id) === String(payload.id); });
    if (!old) return errorResponse(404, 'Mata pelajaran tidak ditemukan.');

    var updated = Object.assign({}, old, payload, {
      code: normalizeIdentifier(payload.code !== undefined ? payload.code : old.code).toUpperCase(),
      name: String(payload.name !== undefined ? payload.name : old.name).trim(),
      shortName: String(payload.shortName !== undefined ? payload.shortName : old.shortName || '').trim(),
      groupName: String(payload.groupName !== undefined ? payload.groupName : old.groupName || '').trim(),
      isActive: normalizeBoolean(payload.isActive !== undefined ? payload.isActive : old.isActive, true),
      sortOrder: Number(payload.sortOrder !== undefined ? payload.sortOrder : old.sortOrder) || 0,
      updatedAt: now(),
    });

    if (!updated.name) return errorResponse(400, 'Nama mata pelajaran wajib diisi.');

    var duplicate = all.find(function(s) {
      if (String(s.id) === String(payload.id)) return false;
      return String(s.schoolYearId) === String(updated.schoolYearId) &&
        (String(s.name || '').trim().toLowerCase() === updated.name.toLowerCase() ||
         (updated.code && normalizeIdentifier(s.code).toUpperCase() === updated.code));
    });
    if (duplicate) return errorResponse(409, 'Mata pelajaran dengan nama/kode tersebut sudah ada pada tahun pelajaran ini.');

    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'subject', payload.id, old, updated, 'Edit mata pelajaran');
    return successResponse(updated);
  },

  remove: function(payload, user) {
    checkPermission(user, 'subject:manage');
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Mata pelajaran tidak ditemukan.');

    var scores = getSheet(CONFIG.SHEETS.SCORES);
    var linked = sheetToObjects(scores).filter(function(g) { return String(g.subjectId) === String(payload.id); });
    if (linked.length) {
      return errorResponse(409, 'Mata pelajaran tidak dapat dihapus karena sudah memiliki data nilai. Nonaktifkan saja agar riwayat nilai tetap aman.');
    }

    var all = sheetToObjects(sheet);
    var existing = all.find(function(s) { return String(s.id) === String(payload.id); });
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'subject', String(payload.id), existing, null, 'Hapus mata pelajaran');
    return successResponse({ message: 'Mata pelajaran berhasil dihapus.' });
  },
};

var ScoreHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':      return this.list(payload, user);
      case 'save':      return this.save(payload, user);
      case 'saveBatch': return this.saveBatch(payload, user);
      case 'delete':    return this.remove(payload, user);
      default: return errorResponse(404, 'Score method tidak ditemukan.');
    }
  },

  _allowed: function(studentId, user, mode) {
    var all = hasPermission(user, 'score:view:all');
    if (all) return true;
    if (!hasPermission(user, 'score:view:own_class')) return false;
    try {
      StudentHandler._getViewableStudent(studentId, user);
      return true;
    } catch (e) {
      return false;
    }
  },

  _canManage: function(studentId, user) {
    if (hasPermission(user, 'score:manage:all')) return true;
    if (!hasPermission(user, 'score:manage:own_class')) throw new Error('FORBIDDEN');
    StudentHandler._getViewableStudent(studentId, user);
    return true;
  },

  list: function(payload, user) {
    if (!hasPermission(user, 'score:view:all') && !hasPermission(user, 'score:view:own_class')) {
      throw new Error('FORBIDDEN');
    }

    var all = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']));

    if (payload.schoolYearId) {
      all = all.filter(function(g) { return String(g.schoolYearId) === String(payload.schoolYearId); });
    }
    if (payload.semester) {
      all = all.filter(function(g) { return String(g.semester) === String(payload.semester); });
    }
    if (payload.studentId) {
      if (!this._allowed(payload.studentId, user, 'view')) throw new Error('FORBIDDEN');
      all = all.filter(function(g) { return String(g.studentId) === String(payload.studentId); });
    } else if (payload.classroomId) {
      var classrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
      var classroom = classrooms.find(function(c) { return String(c.id) === String(payload.classroomId); });
      if (!classroom) return errorResponse(404, 'Kelas tidak ditemukan.');
      if (user.role === 'teacher' && String(classroom.homeroomTeacherId) !== String(user.teacherId)) {
        throw new Error('FORBIDDEN');
      }
      var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS)).filter(function(e) {
        return String(e.classroomId) === String(payload.classroomId) &&
          String(e.schoolYearId) === String(payload.schoolYearId || '') &&
          e.status === 'active';
      });
      var ids = enrollments.map(function(e) { return String(e.studentId); });
      all = all.filter(function(g) { return ids.indexOf(String(g.studentId)) !== -1; });
    } else if (user.role === 'teacher') {
      var students = StudentHandler.list({
        page: 1, limit: 10000, schoolYearId: payload.schoolYearId
      }, user);
      var parsed = JSON.parse(students.getContent());
      if (parsed.status >= 400) return errorResponse(parsed.status, parsed.error || 'Gagal mengambil siswa guru.');
      var visibleIds = parsed.data.items.map(function(s) { return String(s.id); });
      all = all.filter(function(g) { return visibleIds.indexOf(String(g.studentId)) !== -1; });
    }

    var subjects = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']));
    var subjectById = {};
    subjects.forEach(function(s) { subjectById[String(s.id)] = s; });

    var studentsAll = StudentHandler._getAll();
    var studentById = {};
    studentsAll.forEach(function(s) { studentById[String(s.id)] = s; });

    var classroomsAll = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var enrollmentAll = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var classById = {};
    classroomsAll.forEach(function(c) { classById[String(c.id)] = c; });

    var result = all.map(function(g) {
      var enrollment = enrollmentAll.find(function(e) {
        return String(e.studentId) === String(g.studentId) &&
          String(e.schoolYearId) === String(g.schoolYearId) &&
          e.status === 'active';
      });
      var student = studentById[String(g.studentId)] || {};
      var subject = subjectById[String(g.subjectId)] || {};
      return Object.assign({}, g, {
        studentName: student.fullName || '',
        nis: normalizeIdentifier(student.nis),
        subjectName: subject.name || '',
        subjectCode: subject.code || '',
        classroomName: enrollment && classById[String(enrollment.classroomId)]
          ? classById[String(enrollment.classroomId)].name
          : '',
        semester: Number(g.semester) || 1,
        score: g.score === '' || g.score == null ? null : Number(g.score),
      });
    });

    result.sort(function(a, b) {
      return String(a.studentName || '').localeCompare(String(b.studentName || '')) ||
        String(a.subjectName || '').localeCompare(String(b.subjectName || ''));
    });
    return successResponse(result);
  },

  _upsert: function(sheet, headers, payload, user) {
    this._canManage(payload.studentId, user);
    if (!payload.schoolYearId) return errorResponse(400, 'Tahun pelajaran wajib diisi.');
    var semester = Number(payload.semester);
    if (semester !== 1 && semester !== 2) return errorResponse(400, 'Semester harus 1 atau 2.');
    if (!payload.subjectId) return errorResponse(400, 'Mata pelajaran wajib dipilih.');

    var subjects = sheetToObjects(getSheet(CONFIG.SHEETS.SUBJECTS));
    var subject = subjects.find(function(s) {
      return String(s.id) === String(payload.subjectId) &&
        String(s.schoolYearId) === String(payload.schoolYearId) &&
        normalizeBoolean(s.isActive, true);
    });
    if (!subject) return errorResponse(400, 'Mata pelajaran tidak aktif/tidak sesuai tahun pelajaran.');

    var score = payload.score === '' || payload.score == null ? null : Number(payload.score);
    if (score !== null && (!isFinite(score) || score < 0 || score > 100)) {
      return errorResponse(400, 'Nilai harus berada antara 0 sampai 100.');
    }

    var all = sheetToObjects(sheet);
    var existing = all.find(function(g) {
      return String(g.studentId) === String(payload.studentId) &&
        String(g.schoolYearId) === String(payload.schoolYearId) &&
        String(g.semester) === String(semester) &&
        String(g.subjectId) === String(payload.subjectId);
    });

    if (score === null) {
      if (existing) {
        var rowIdx = findRowById(sheet, existing.id);
        if (rowIdx > 0) {
          sheet.deleteRow(rowIdx);
          AuditService.log(user.id, 'DELETE', 'student_score', String(existing.id), existing, null, 'Hapus nilai kosong siswa');
        }
      }
      return successResponse({ id: existing ? existing.id : '', deleted: true });
    }

    var predicate = payload.predicate || (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D');
    var base = {
      studentId: payload.studentId,
      schoolYearId: payload.schoolYearId,
      semester: semester,
      subjectId: payload.subjectId,
      score: score,
      predicate: predicate,
      notes: String(payload.notes || '').trim(),
      updatedAt: now(),
    };

    if (existing) {
      var updated = Object.assign({}, existing, base);
      updateRow(sheet, findRowById(sheet, existing.id), updated, headers);
      AuditService.log(user.id, 'UPDATE', 'student_score', String(existing.id), existing, updated, 'Perbarui nilai siswa');
      return successResponse(updated);
    }

    var created = Object.assign({
      id: generateUUID(),
      createdAt: now(),
      createdBy: user.id,
    }, base);
    appendRow(sheet, created, headers);
    AuditService.log(user.id, 'CREATE', 'student_score', String(created.id), null, created, 'Tambah nilai siswa');
    return successResponse(created);
  },

  save: function(payload, user) {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']);
    var headers = getHeaders(sheet);
    return this._upsert(sheet, headers, payload, user);
  },

  saveBatch: function(payload, user) {
    var rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) return errorResponse(400, 'Tidak ada nilai untuk disimpan.');

    // Validasi semua target sebelum menulis apa pun.
    var studentIds = {};
    rows.forEach(function(row) { studentIds[String(row.studentId || '')] = true; });
    Object.keys(studentIds).forEach(function(id) { this._canManage(id, user); }, this);

    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']);
    var headers = getHeaders(sheet);
    var success = 0;
    var failed = 0;
    var errors = [];

    rows.forEach(function(row, i) {
      try {
        var response = this._upsert(sheet, headers, row, user);
        var parsed = JSON.parse(response.getContent());
        if (parsed.status >= 400) {
          failed++;
          errors.push('Baris ' + (i + 1) + ': ' + (parsed.error || 'Gagal menyimpan'));
        } else {
          success++;
        }
      } catch (e) {
        failed++;
        errors.push('Baris ' + (i + 1) + ': ' + (e.message || String(e)));
      }
    }, this);

    return successResponse({ success: success, failed: failed, errors: errors });
  },

  remove: function(payload, user) {
    this._canManage(payload.studentId, user);
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Nilai tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var existing = all.find(function(g) { return String(g.id) === String(payload.id); });
    if (!existing) return errorResponse(404, 'Nilai tidak ditemukan.');
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'student_score', String(payload.id), existing, null, 'Hapus nilai siswa');
    return successResponse({ message: 'Nilai berhasil dihapus.' });
  },
};
