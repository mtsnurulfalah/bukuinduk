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
    var all = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']));
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
    if (!sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS)).some(function(y){ return String(y.id) === String(payload.schoolYearId); })) return errorResponse(400, 'Tahun pelajaran tidak ditemukan.');
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

    if (payload.schoolYearId && !sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS)).some(function(y){ return String(y.id) === String(payload.schoolYearId); })) return errorResponse(400, 'Tahun pelajaran tidak ditemukan.');

    if (payload.schoolYearId && String(payload.schoolYearId) !== String(old.schoolYearId)) {
      var linkedScores = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SCORES,
        ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']))
        .filter(function(g) { return String(g.subjectId) === String(payload.id); });
      if (linkedScores.length) return errorResponse(409, 'Tahun pelajaran mata pelajaran tidak dapat diubah karena sudah memiliki data nilai.');
    }

    var updated = Object.assign({}, old);
    updated.schoolYearId = payload.schoolYearId !== undefined ? String(payload.schoolYearId) : String(old.schoolYearId);
    Object.assign(updated, {
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

    var scores = getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']);
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

  _allowed: function(studentId, user, schoolYearId) {
    if (hasPermission(user, 'score:view:all')) return true;
    if (!hasPermission(user, 'score:view:own_class')) return false;
    try {
      if (user.role === 'teacher' && schoolYearId) this._assertTeacherYearAccess(studentId, schoolYearId, user);
      else StudentHandler._getViewableStudent(studentId, user);
      return true;
    } catch (e) {
      return false;
    }
  },

  _canManage: function(studentId, user, schoolYearId) {
    if (hasPermission(user, 'score:manage:all')) return true;
    if (!hasPermission(user, 'score:manage:own_class')) throw new Error('FORBIDDEN');
    if (schoolYearId && user.role === 'teacher') this._assertTeacherYearAccess(studentId, schoolYearId, user);
    else StudentHandler._getViewableStudent(studentId, user);
    return true;
  },

  _assertTeacherYearAccess: function(studentId, schoolYearId, user) {
    if (!user.teacherId) throw new Error('FORBIDDEN');
    var classrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var myClassroomIds = classrooms.filter(function(c) {
      return String(c.homeroomTeacherId) === String(user.teacherId);
    }).map(function(c) { return String(c.id); });
    var enrolled = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS)).some(function(e) {
      return String(e.studentId) === String(studentId) &&
        String(e.schoolYearId) === String(schoolYearId) &&
        myClassroomIds.indexOf(String(e.classroomId)) !== -1 &&
        e.status === 'active';
    });
    if (!enrolled) throw new Error('FORBIDDEN');
  },

  list: function(payload, user) {
    if (!hasPermission(user, 'score:view:all') && !hasPermission(user, 'score:view:own_class')) {
      throw new Error('FORBIDDEN');
    }

    if (user.role === 'teacher' && !payload.schoolYearId) return errorResponse(400, 'Tahun pelajaran wajib dipilih untuk data nilai guru.');

    var all = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']));

    if (payload.schoolYearId) {
      all = all.filter(function(g) { return String(g.schoolYearId) === String(payload.schoolYearId); });
    }
    if (payload.semester) {
      all = all.filter(function(g) { return String(g.semester) === String(payload.semester); });
    }
    if (payload.studentId) {
      if (!payload.schoolYearId && user.role === 'teacher') return errorResponse(400, 'Tahun pelajaran wajib dipilih untuk data nilai guru.');
      if (!this._allowed(payload.studentId, user, payload.schoolYearId)) throw new Error('FORBIDDEN');
      all = all.filter(function(g) { return String(g.studentId) === String(payload.studentId); });
    } else if (payload.classroomId) {
      if (!payload.schoolYearId) return errorResponse(400, 'Tahun pelajaran wajib dipilih saat memfilter kelas.');
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
    this._canManage(payload.studentId, user, payload.schoolYearId);
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

    var predicate = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';
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

    // Validasi akses sekali per siswa agar teacher tidak memicu pembacaan
    // kelas/enrollment berulang untuk setiap sel nilai.
    var studentIds = {};
    rows.forEach(function(row) {
      if (row.studentId) studentIds[String(row.studentId)] = true;
    });
    var studentIdList = Object.keys(studentIds);
    if (!studentIdList.length) return errorResponse(400, 'ID siswa diperlukan.');
    studentIdList.forEach(function(id) { this._canManage(id, user); }, this);

    var headersDef = ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCORES, headersDef);
    var headers = getHeaders(sheet);
    var existingRows = sheetToObjects(sheet);
    var subjects = sheetToObjects(getOrCreateSheet(CONFIG.SHEETS.SUBJECTS,
      ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder','createdAt','updatedAt','createdBy']));

    var subjectKeys = {};
    subjects.forEach(function(s) {
      if (normalizeBoolean(s.isActive, true)) {
        subjectKeys[String(s.id) + '|' + String(s.schoolYearId)] = true;
      }
    });

    // Deduplikasi payload: kombinasi siswa+tahun+semester+mapel terakhir yang menang.
    var pending = {};
    rows.forEach(function(row) {
      var semester = Number(row.semester);
      var key = String(row.studentId || '') + '|' + String(row.schoolYearId || '') + '|' +
        semester + '|' + String(row.subjectId || '');
      pending[key] = row;
    });

    var existingByKey = {};
    var existingRowIndexById = {};
    existingRows.forEach(function(g, index) {
      var key = String(g.studentId || '') + '|' + String(g.schoolYearId || '') + '|' +
        String(g.semester || '') + '|' + String(g.subjectId || '');
      existingByKey[key] = g;
      existingRowIndexById[String(g.id)] = index + 2;
    });

    var updates = [];
    var newRows = [];
    var deleteRowIndexes = [];
    var success = 0;
    var failed = 0;
    var errors = [];

    Object.keys(pending).forEach(function(key) {
      var row = pending[key];
      try {
        var semester = Number(row.semester);
        if (!row.schoolYearId) throw new Error('Tahun pelajaran wajib diisi');
        if (semester !== 1 && semester !== 2) throw new Error('Semester harus 1 atau 2');
        var subjectKey = String(row.subjectId || '') + '|' + String(row.schoolYearId);
        if (!row.subjectId || !subjectKeys[subjectKey]) {
          throw new Error('Mata pelajaran tidak aktif/tidak sesuai tahun pelajaran');
        }

        var score = row.score === '' || row.score == null ? null : Number(row.score);
        if (score !== null && (!isFinite(score) || score < 0 || score > 100)) {
          throw new Error('Nilai harus berada antara 0 sampai 100');
        }

        var existing = existingByKey[key];
        if (score === null) {
          if (existing) {
            var deleteIdx = existingRowIndexById[String(existing.id)] || -1;
            if (deleteIdx > 0) deleteRowIndexes.push(deleteIdx);
          }
          success++;
          return;
        }

        var updated = Object.assign({}, existing || {}, {
          studentId: row.studentId,
          schoolYearId: row.schoolYearId,
          semester: semester,
          subjectId: row.subjectId,
          score: score,
          predicate: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
          notes: String(row.notes || '').trim(),
          updatedAt: now(),
        });

        if (existing) {
          updates.push({ rowIndex: existingRowIndexById[String(existing.id)] || -1, data: updated });
        } else {
          newRows.push(Object.assign({
            id: generateUUID(),
            createdAt: now(),
            createdBy: user.id,
          }, updated));
        }
        success++;
      } catch (e) {
        failed++;
        errors.push('Nilai ' + (key) + ': ' + (e.message || String(e)));
      }
    });

    // Update existing rows.
    updates.forEach(function(item) {
      if (item.rowIndex > 0) updateRow(sheet, item.rowIndex, item.data, headers);
    });

    // Hapus dari bawah ke atas agar indeks baris tidak bergeser.
    deleteRowIndexes.sort(function(a, b) { return b - a; });
    deleteRowIndexes.forEach(function(rowIndex) {
      if (rowIndex > 0) sheet.deleteRow(rowIndex);
    });

    // Tambah baris baru dalam satu write operation.
    if (newRows.length) {
      var values = newRows.map(function(item) {
        return headers.map(function(header) { return _valueForHeader(item, header); });
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    }

    AuditService.log(user.id, 'UPSERT', 'student_score_batch', null, null,
      { changed: success, failed: failed }, 'Input nilai siswa secara batch');

    return successResponse({
      success: success,
      failed: failed,
      errors: errors.slice(0, 50),
    });
  },

  remove: function(payload, user) {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCORES,
      ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes','createdAt','updatedAt','createdBy']);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Nilai tidak ditemukan.');
    var all = sheetToObjects(sheet);
    var existing = all.find(function(g) { return String(g.id) === String(payload.id); });
    if (!existing) return errorResponse(404, 'Nilai tidak ditemukan.');
    // Otorisasi berdasarkan studentId yang benar-benar dimiliki oleh nilai.
    // Jangan mempercayai studentId dari payload sebelum target row ditemukan.
    this._canManage(existing.studentId, user);
    if (payload.studentId && String(payload.studentId) !== String(existing.studentId)) {
      return errorResponse(400, 'ID siswa tidak cocok dengan data nilai.');
    }
    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'student_score', String(payload.id), existing, null, 'Hapus nilai siswa');
    return successResponse({ message: 'Nilai berhasil dihapus.' });
  },
};
