// ============================================================
// StudentHandler.gs
// ============================================================

var StudentHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'list':           return this.list(payload, user);
      case 'get':            return this.get(payload, user);
      case 'getFull':        return this.getFull(payload, user);
      case 'create':         return this.create(payload, user);
      case 'update':         return this.update(payload, user);
      case 'archive':        return this.archive(payload, user);
      case 'restore':        return this.restore(payload, user);
      case 'getParents':     return this.getParents(payload, user);
      case 'updateParent':   return this.updateParent(payload, user);
      case 'getHealth':      return this.getHealth(payload, user);
      case 'updateHealth':   return this.updateHealth(payload, user);
      case 'getEducationHistory': return this.getEducationHistory(payload, user);
      case 'getEnrollments': return this.getEnrollments(payload, user);
      case 'enroll':         return this.enroll(payload, user);
      case 'importBatch':    return this.importBatch(payload, user);
      case 'exportData':     return this.exportData(payload, user);
      case 'getStats':       return this.getStats(payload, user);
      case 'getVerifications': return this.getVerifications(payload, user);
      case 'updateVerification': return this.updateVerification(payload, user);
      case 'getDocuments':    return this.getDocuments(payload, user);
      case 'createDocument':  return this.createDocument(payload, user);
      case 'updateDocument':  return this.updateDocument(payload, user);
      case 'deleteDocument':  return this.deleteDocument(payload, user);
      default: return errorResponse(404, 'Student method tidak ditemukan.');
    }
  },

  _getAll: function() {
    var cacheKey = 'students_all';
    var cached = cacheGet(cacheKey);
    if (cached) return cached;
    var data = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    cacheSet(cacheKey, data, 120);
    return data;
  },

  _invalidateCache: function() {
    cacheRemove('students_all');
    cacheRemove('students_stats');
    cacheRemove('students_completeness');
  },

  list: function(payload, user) {
    // Permission: admin & principal melihat semua; teacher hanya kelas sendiri
    var all = this._getAll();

    // BUG-DUP FIX: Angkat pembacaan sheet ke atas function — dibaca SEKALI,
    // dipakai di blok teacher-filter, classroomId-filter, dan enrich.
    // Sebelumnya: enrollments dibaca 2–3× dan classrooms dibaca 2× per request.
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var classrooms  = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));

    // Teacher filter: hanya siswa di kelas yang diampu
    if (user.role === 'teacher') {
      if (!user.teacherId) return successResponse({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      var myClassrooms = classrooms
        .filter(function(c) { return String(c.homeroomTeacherId) === String(user.teacherId); })
        .map(function(c) { return String(c.id); });

      var myStudentIds = enrollments
        .filter(function(e) { return myClassrooms.indexOf(String(e.classroomId)) !== -1 && e.status === 'active'; })
        .map(function(e) { return String(e.studentId); });

      all = all.filter(function(s) { return myStudentIds.indexOf(String(s.id)) !== -1; });
    } else {
      checkPermission(user, 'student:view:all');
    }

    // Filters
    if (payload.status)      all = all.filter(function(s) { return s.status === payload.status; });
    if (payload.gender)      all = all.filter(function(s) { return s.gender === payload.gender; });
    if (payload.classroomId) {
      // BUG-DUP FIX: Gunakan variabel enrollments yang sudah dibaca di atas
      var ids = enrollments
        .filter(function(e) { return String(e.classroomId) === String(payload.classroomId) && e.status === 'active'; })
        .map(function(e) { return String(e.studentId); });
      all = all.filter(function(s) { return ids.indexOf(String(s.id)) !== -1; });
    }
    if (payload.search) {
      var searchFields = ['fullName','nis','nisn','nickname'];
      // NIK hanya boleh menjadi target pencarian bagi role yang memiliki
      // permission data sensitif (admin/principal).
      if (hasPermission(user, 'student:view:sensitive')) searchFields.push('nik');
      all = all.filter(function(s) {
        return searchInObject(s, payload.search, searchFields);
      });
    }

    // Sort
    var sortBy  = payload.sortBy  || 'fullName';
    var sortDir = payload.sortDir || 'asc';
    all.sort(function(a, b) {
      var va = (a[sortBy] || '').toString().toLowerCase();
      var vb = (b[sortBy] || '').toString().toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    // Enrich dengan nama kelas dari enrollment aktif
    // BUG-DUP FIX: Gunakan enrollments & classrooms yang sama — tidak ada pembacaan ulang
    all = all.map(function(s) {
      var enr = enrollments.find(function(e) { return String(e.studentId) === String(s.id) && e.status === 'active'; });
      if (enr) {
        var cls = classrooms.find(function(c) { return String(c.id) === String(enr.classroomId); });
        s.classroomName = cls ? cls.name : '';
      }
      return s;
    });

    return successResponse(paginate(all, payload.page, payload.limit));
  },

  /**
   * Ambil siswa yang boleh dilihat user. Teacher hanya boleh melihat siswa
   * yang terdaftar aktif pada kelas yang diampunya.
   */
  _getViewableStudent: function(studentId, user) {
    if (!hasPermission(user, 'student:view:all') && !hasPermission(user, 'student:view:own_class')) {
      throw new Error('FORBIDDEN');
    }

    var source = this._getAll().find(function(x) {
      return String(x.id) === String(studentId);
    });
    if (!source) return null;

    if (user.role === 'teacher') {
      if (!user.teacherId) throw new Error('FORBIDDEN');
      var classrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
      var classIds = classrooms
        .filter(function(c) { return String(c.homeroomTeacherId) === String(user.teacherId); })
        .map(function(c) { return String(c.id); });
      var isMyStudent = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS)).some(function(e) {
        return String(e.studentId) === String(studentId) &&
          classIds.indexOf(String(e.classroomId)) !== -1 &&
          e.status === 'active';
      });
      if (!isMyStudent) throw new Error('FORBIDDEN');
    }

    return source;
  },

  get: function(payload, user) {
    var source = this._getViewableStudent(payload.id, user);
    if (!source) return errorResponse(404, 'Siswa tidak ditemukan.');

    // Jangan mutasi objek cache _getAll(): salin sebelum menghapus field sensitif.
    var student = Object.assign({}, source);
    if (user.role === 'teacher') delete student.nik;
    return successResponse(student);
  },

  getFull: function(payload, user) {
    if (!hasPermission(user, 'student:view:all') && !hasPermission(user, 'student:view:own_class')) {
      throw new Error('FORBIDDEN');
    }

    var result = JSON.parse(JSON.stringify(
      this._getAll().find(function(x) { return String(x.id) === String(payload.id); }) || null
    ));
    if (!result) return errorResponse(404, 'Siswa tidak ditemukan.');

    // Normalisasi nama kolom lama/typo dari spreadsheet ke nama field frontend.
    // Header database saat ini memakai "addres" dan "endryDate".
    if (result.address == null && result.addres != null) result.address = result.addres;
    if (result.entryDate == null && result.endryDate != null) result.entryDate = result.endryDate;

    // FIX: Baca semua sheet relasi SEKALI di awal function scope.
    // Sebelumnya `var enrollments` dideklarasikan DUA KALI (untuk teacher check
    // dan untuk currentEnrollment). Dengan `var` hoisting di GAS/V8, deklarasi
    // kedua adalah reassignment sehingga sheet dibaca 2x tanpa perlu.
    // Sekarang dibaca satu kali dan dipakai di kedua blok.
    var allEnrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var allClassrooms  = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var allSchoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));

    // BUG-40 FIX: Untuk teacher, pastikan siswa ada di kelas yang diampu.
    if (user.role === 'teacher') {
      if (!user.teacherId) throw new Error('FORBIDDEN');
      var myClassroomIds = allClassrooms
        .filter(function(c) { return String(c.homeroomTeacherId) === String(user.teacherId); })
        .map(function(c) { return String(c.id); });
      var isMyStudent = allEnrollments.some(function(e) {
        return String(e.studentId) === String(payload.id) &&
               myClassroomIds.indexOf(String(e.classroomId)) !== -1 &&
               e.status === 'active';
      });
      if (!isMyStudent) throw new Error('FORBIDDEN');
      delete result.nik;
    }

    // Lampirkan relasi
    result.parents = sheetToObjects(getSheet(CONFIG.SHEETS.PARENTS))
      .filter(function(p) {
        return String(p.studentId != null ? p.studentId : p.studentID) === String(payload.id);
      })
      .map(function(p) {
        var parent = Object.assign({}, p);
        if (parent.address == null && parent.addres != null) parent.address = parent.addres;
        return parent;
      });

    result.health = sheetToObjects(getSheet(CONFIG.SHEETS.HEALTH))
      .find(function(h) {
        return String(h.studentId != null ? h.studentId : h.studentID) === String(payload.id);
      }) || null;
    if (result.health && result.health.healthNotes == null && result.health.HealthNotes != null) {
      result.health.healthNotes = result.health.HealthNotes;
    }

    result.educationHistory = sheetToObjects(getSheet(CONFIG.SHEETS.EDUCATION))
      .filter(function(e) {
        return String(e.studentId != null ? e.studentId : e.studentID) === String(payload.id);
      })
      .map(function(e) {
        var education = Object.assign({}, e);
        if (education.studentId == null && education.studentID != null) {
          education.studentId = education.studentID;
        }
        return education;
      });

    // Gunakan allEnrollments/allClassrooms/allSchoolYears yang sudah dibaca di atas
    result.currentEnrollment = (function() {
      var enr = allEnrollments.find(function(e) {
        return String(e.studentId) === String(payload.id) && e.status === 'active';
      });
      if (!enr) return null;
      var cls = allClassrooms.find(function(c) { return String(c.id) === String(enr.classroomId); });
      var sy  = allSchoolYears.find(function(s) { return String(s.id) === String(enr.schoolYearId); });
      return Object.assign({}, enr, {
        classroomName:  cls ? cls.name : '',
        schoolYearName: sy  ? sy.name  : '',
      });
    })();

    // Teacher role: hapus data sensitif
    if (user.role === 'teacher') {
      result.parents = result.parents.map(function(p) {
        var c = Object.assign({}, p);
        delete c.nik;
        return c;
      });
      result.health = null;
    }

    return successResponse(result);
  },

  // ── Verifikasi administrasi ─────────────────────────────────
  getVerifications: function(payload, user) {
    checkPermission(user, 'student:view:sensitive');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var headers = ['id','studentId','section','label','status','verifiedBy','verifiedAt','notes'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.VERIFICATIONS, headers);
    var all = sheetToObjects(sheet);
    var existing = all.filter(function(v) {
      return String(v.studentId) === String(payload.studentId);
    });

    var definitions = [
      { section: 'identity', label: 'Identitas' },
      { section: 'address', label: 'Alamat' },
      { section: 'family', label: 'Orang Tua/Wali' },
      { section: 'health', label: 'Kesehatan' },
      { section: 'education', label: 'Pendidikan' },
      { section: 'enrollment', label: 'Riwayat Kelas' },
    ];

    var result = definitions.map(function(definition) {
      var row = existing.find(function(v) { return v.section === definition.section; });
      return Object.assign({
        id: row ? row.id : '',
        studentId: String(payload.studentId),
        section: definition.section,
        label: definition.label,
        status: 'unverified',
        verifiedBy: '',
        verifiedAt: '',
        notes: '',
      }, row || {});
    });

    return successResponse(result);
  },

  updateVerification: function(payload, user) {
    checkPermission(user, 'student:verify');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var allowed = ['identity','address','family','health','education','enrollment'];
    if (allowed.indexOf(payload.section) === -1) {
      return errorResponse(400, 'Bagian verifikasi tidak valid.');
    }

    var validStatuses = ['unverified','verified','needs_revision'];
    if (validStatuses.indexOf(payload.status) === -1) {
      return errorResponse(400, 'Status verifikasi tidak valid.');
    }

    var headers = ['id','studentId','section','label','status','verifiedBy','verifiedAt','notes'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.VERIFICATIONS, headers);
    var all = sheetToObjects(sheet);
    var existing = all.find(function(v) {
      return String(v.studentId) === String(payload.studentId) && v.section === payload.section;
    });

    var labels = {
      identity: 'Identitas',
      address: 'Alamat',
      family: 'Orang Tua/Wali',
      health: 'Kesehatan',
      education: 'Pendidikan',
      enrollment: 'Riwayat Kelas',
    };

    var old = existing ? Object.assign({}, existing) : null;
    var data = {
      id: existing ? existing.id : generateUUID(),
      studentId: String(payload.studentId),
      section: payload.section,
      label: labels[payload.section],
      status: payload.status,
      verifiedBy: payload.status === 'verified'
        ? (user.fullName || user.username || user.id)
        : '',
      verifiedAt: payload.status === 'verified' ? now() : '',
      notes: payload.notes ? String(payload.notes).trim() : '',
    };

    if (existing) {
      updateRow(sheet, findRowById(sheet, existing.id), data, headers);
    } else {
      appendRow(sheet, data, headers);
    }

    cacheRemove('students_completeness');
    AuditService.log(
      user.id,
      'VERIFY',
      'student_verification',
      String(payload.studentId),
      old,
      data,
      'Verifikasi ' + labels[payload.section] + ' siswa'
    );

    return successResponse(data);
  },

  // ── Dokumen siswa ────────────────────────────────────────────
  getDocuments: function(payload, user) {
    checkPermission(user, 'student:view:sensitive');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var headers = ['id','studentId','documentType','documentName','documentNumber','fileUrl','status','notes','createdAt','updatedAt','createdBy'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS, headers);
    var data = sheetToObjects(sheet)
      .filter(function(d) { return String(d.studentId) === String(payload.studentId); })
      .sort(function(a,b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
    return successResponse(data);
  },

  createDocument: function(payload, user) {
    checkPermission(user, 'student:update');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    if (!payload.documentType || !payload.documentName) {
      return errorResponse(400, 'Jenis dan nama dokumen wajib diisi.');
    }

    var headers = ['id','studentId','documentType','documentName','documentNumber','fileUrl','status','notes','createdAt','updatedAt','createdBy'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS, headers);
    var ts = now();
    var data = {
      id: generateUUID(),
      studentId: String(payload.studentId),
      documentType: String(payload.documentType).trim(),
      documentName: String(payload.documentName).trim(),
      documentNumber: payload.documentNumber ? String(payload.documentNumber).trim() : '',
      fileUrl: payload.fileUrl ? String(payload.fileUrl).trim() : '',
      status: payload.status === 'needs_update' ? 'needs_update' : 'available',
      notes: payload.notes ? String(payload.notes).trim() : '',
      createdAt: ts,
      updatedAt: ts,
      createdBy: user.id,
    };

    appendRow(sheet, data, headers);
    AuditService.log(user.id, 'CREATE', 'student_document', data.id, null, data, 'Tambah dokumen siswa');
    return successResponse(data);
  },

  updateDocument: function(payload, user) {
    checkPermission(user, 'student:update');
    if (!payload.id) return errorResponse(400, 'ID dokumen diperlukan.');

    var headers = ['id','studentId','documentType','documentName','documentNumber','fileUrl','status','notes','createdAt','updatedAt','createdBy'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS, headers);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Dokumen tidak ditemukan.');

    var all = sheetToObjects(sheet);
    var existing = all.find(function(d) { return String(d.id) === String(payload.id); });
    if (!existing) return errorResponse(404, 'Dokumen tidak ditemukan.');

    var studentId = String(existing.studentId);
    if (payload.studentId && String(payload.studentId) !== studentId) {
      return errorResponse(400, 'Dokumen tidak boleh dipindahkan ke siswa lain.');
    }

    var updated = Object.assign({}, existing, {
      documentType: payload.documentType !== undefined ? String(payload.documentType).trim() : existing.documentType,
      documentName: payload.documentName !== undefined ? String(payload.documentName).trim() : existing.documentName,
      documentNumber: payload.documentNumber !== undefined ? String(payload.documentNumber).trim() : existing.documentNumber,
      fileUrl: payload.fileUrl !== undefined ? String(payload.fileUrl).trim() : existing.fileUrl,
      status: payload.status === 'needs_update' ? 'needs_update' : 'available',
      notes: payload.notes !== undefined ? String(payload.notes).trim() : existing.notes,
      updatedAt: now(),
    });

    if (!updated.documentType || !updated.documentName) {
      return errorResponse(400, 'Jenis dan nama dokumen wajib diisi.');
    }

    updateRow(sheet, rowIdx, updated, headers);
    AuditService.log(user.id, 'UPDATE', 'student_document', String(payload.id), existing, updated, 'Perbarui dokumen siswa');
    return successResponse(updated);
  },

  deleteDocument: function(payload, user) {
    checkPermission(user, 'student:update');
    if (!payload.id) return errorResponse(400, 'ID dokumen diperlukan.');

    var headers = ['id','studentId','documentType','documentName','documentNumber','fileUrl','status','notes','createdAt','updatedAt','createdBy'];
    var sheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS, headers);
    var rowIdx = findRowById(sheet, payload.id);
    if (rowIdx < 0) return errorResponse(404, 'Dokumen tidak ditemukan.');

    var all = sheetToObjects(sheet);
    var existing = all.find(function(d) { return String(d.id) === String(payload.id); });
    if (!existing) return errorResponse(404, 'Dokumen tidak ditemukan.');

    sheet.deleteRow(rowIdx);
    AuditService.log(user.id, 'DELETE', 'student_document', String(payload.id), existing, null, 'Hapus dokumen siswa');
    return successResponse({ id: String(payload.id), message: 'Dokumen berhasil dihapus.' });
  },

  create: function(payload, user) {
    checkPermission(user, 'student:create');

    var normalizedNis = normalizeIdentifier(payload.nis);
    var normalizedNisn = normalizeIdentifier(payload.nisn);

    if (!payload.fullName) return errorResponse(400, 'Nama lengkap wajib diisi.');
    if (!normalizedNis)    return errorResponse(400, 'NIS wajib diisi.');
    if (!normalizedNisn)   return errorResponse(400, 'NISN wajib diisi.');
    if (!/^\d{10}$/.test(normalizedNisn)) return errorResponse(400, 'NISN harus 10 digit angka.');

    // Cek duplikat NIS/NISN setelah normalisasi tipe dan whitespace.
    var all = this._getAll();
    if (all.find(function(s) { return normalizeIdentifier(s.nis) === normalizedNis; }))
      return errorResponse(409, 'NIS "' + normalizedNis + '" sudah digunakan.');
    if (all.find(function(s) { return normalizeIdentifier(s.nisn) === normalizedNisn; }))
      return errorResponse(409, 'NISN "' + normalizedNisn + '" sudah digunakan.');

    var id = generateUUID();
    var ts = now();
    var sheet   = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);

    var student = {};
    headers.forEach(function(h) { student[h] = _valueForHeader(payload, h); });
    student.id        = id;
    student.nis       = normalizedNis;
    student.nisn      = normalizedNisn;
    student.status    = payload.status || 'active';
    student.createdAt = ts;
    student.updatedAt = ts;
    student.createdBy = user.id;

    appendRow(sheet, student, headers);

    // Simpan data terkait
    this._saveParents(id, payload);
    this._saveHealth(id, payload.health);
    this._saveEducationHistory(id, payload.educationHistory);

    // Enroll ke kelas
    if (payload.classroomId && payload.schoolYearId) {
      this._doEnroll(id, payload.classroomId, payload.schoolYearId);
    }

    this._invalidateCache();
    AuditService.log(user.id, 'CREATE', 'student', id, null, student, 'Tambah siswa: ' + student.fullName);
    return successResponse(Object.assign({}, student, { id: id }));
  },

  update: function(payload, user) {
    checkPermission(user, 'student:update');
    var id = payload.id;
    if (!id) return errorResponse(400, 'ID siswa diperlukan.');

    var sheet   = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, id);
    if (rowIdx < 0) return errorResponse(404, 'Siswa tidak ditemukan.');

    var all = this._getAll();
    var old = all.find(function(s) { return String(s.id) === String(id); });
    if (!old) return errorResponse(404, 'Siswa tidak ditemukan.');

    var normalizedNis = payload.nis !== undefined ? normalizeIdentifier(payload.nis) : undefined;
    var normalizedNisn = payload.nisn !== undefined ? normalizeIdentifier(payload.nisn) : undefined;

    if (normalizedNisn !== undefined && !/^\d{10}$/.test(normalizedNisn)) {
      return errorResponse(400, 'NISN harus 10 digit angka.');
    }

    if (normalizedNis !== undefined && all.some(function(s) {
      return String(s.id) !== String(id) &&
        normalizeIdentifier(s.nis) === normalizedNis;
    })) {
      return errorResponse(409, 'NIS "' + normalizedNis + '" sudah digunakan.');
    }

    if (normalizedNisn !== undefined && all.some(function(s) {
      return String(s.id) !== String(id) &&
        normalizeIdentifier(s.nisn) === normalizedNisn;
    })) {
      return errorResponse(409, 'NISN "' + normalizedNisn + '" sudah digunakan.');
    }

    var updated = Object.assign({}, old);
    headers.forEach(function(h) {
      if (h === 'id' || h === 'createdAt' || h === 'createdBy') return;
      var value = _valueForHeader(payload, h);
      if (h === 'nis' && normalizedNis !== undefined) value = normalizedNis;
      if (h === 'nisn' && normalizedNisn !== undefined) value = normalizedNisn;
      // Alias kosong tidak boleh menimpa nilai lama; update hanya field yang dikirim.
      var hasExact = payload[h] !== undefined;
      var aliasNames = {
        address: ['addres'], addres: ['address'],
        entryDate: ['endryDate'], endryDate: ['entryDate'],
        healthNotes: ['HealthNotes'], HealthNotes: ['healthNotes'],
        studentId: ['studentID'], studentID: ['studentId']
      };
      var hasAlias = (aliasNames[h] || []).some(function(key) { return payload[key] !== undefined; });
      if (hasExact || hasAlias) updated[h] = value;
    });
    updated.updatedAt = now();

    updateRow(sheet, rowIdx, updated, headers);

    if (payload.father || payload.mother || payload.guardian) {
      this._saveParents(id, payload);
    }
    if (payload.health) this._saveHealth(id, payload.health);
    if (payload.educationHistory) this._saveEducationHistory(id, payload.educationHistory);

    this._invalidateCache();
    AuditService.log(user.id, 'UPDATE', 'student', id, old, updated, 'Edit siswa: ' + updated.fullName);
    return successResponse(updated);
  },

  archive: function(payload, user) {
    checkPermission(user, 'student:archive');
    return this._setStatus(payload.id, 'inactive', payload.reason, user);
  },

  restore: function(payload, user) {
    checkPermission(user, 'student:update');
    return this._setStatus(payload.id, 'active', null, user);
  },

  _setStatus: function(id, status, reason, user) {
    var sheet   = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, id);
    if (rowIdx < 0) return errorResponse(404, 'Siswa tidak ditemukan.');

    var colStatus = headers.indexOf('status') + 1;
    if (colStatus > 0) sheet.getRange(rowIdx, colStatus).setValue(status);

    this._invalidateCache();
    AuditService.log(user.id, 'ARCHIVE', 'student', id, null, { status: status }, 'Status siswa: ' + status);
    return successResponse({ message: 'Status siswa diperbarui.' });
  },

  getParents: function(payload, user) {
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var parents = sheetToObjects(getSheet(CONFIG.SHEETS.PARENTS))
      .filter(function(p) { return String(p.studentId != null ? p.studentId : p.studentID) === String(payload.studentId); });
    if (user.role === 'teacher') {
      parents = parents.map(function(p) { var c = Object.assign({}, p); delete c.nik; return c; });
    }
    return successResponse(parents);
  },

  updateParent: function(payload, user) {
    checkPermission(user, 'student:update');
    var sheet   = getSheet(CONFIG.SHEETS.PARENTS);
    var headers = getHeaders(sheet);
    var all     = sheetToObjects(sheet);
    var existing = all.find(function(p) {
      return String(p.studentId != null ? p.studentId : p.studentID) === String(payload.studentId) && p.relationship === payload.relationship;
    });

    if (existing) {
      var rowIdx = findRowById(sheet, existing.id);
      var updated = Object.assign({}, existing, payload);
      updated.updatedAt = now();
      updateRow(sheet, rowIdx, updated, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'UPDATE', 'student_parent', String(existing.id), existing, updated, 'Perbarui data orang tua/wali');
      return successResponse(updated);
    } else {
      var newParent = Object.assign({ id: generateUUID(), createdAt: now(), updatedAt: now(), isAlive: true }, payload);
      appendRow(sheet, newParent, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'CREATE', 'student_parent', String(newParent.id), null, newParent, 'Tambah data orang tua/wali');
      return successResponse(newParent);
    }
  },

  getHealth: function(payload, user) {
    checkPermission(user, 'student:view:sensitive');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var h = sheetToObjects(getSheet(CONFIG.SHEETS.HEALTH))
      .find(function(x) { return String(x.studentId != null ? x.studentId : x.studentID) === String(payload.studentId); });
    return successResponse(h || null);
  },

  updateHealth: function(payload, user) {
    checkPermission(user, 'student:update');
    var sheet   = getSheet(CONFIG.SHEETS.HEALTH);
    var headers = getHeaders(sheet);
    var all     = sheetToObjects(sheet);
    var existing = all.find(function(h) { return String(h.studentId != null ? h.studentId : h.studentID) === String(payload.studentId); });

    if (existing) {
      var rowIdx = findRowById(sheet, existing.id);
      var updated = Object.assign({}, existing, payload, { updatedAt: now() });
      updateRow(sheet, rowIdx, updated, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'UPDATE', 'student_health', String(existing.id), existing, updated, 'Perbarui data kesehatan siswa');
      return successResponse(updated);
    } else {
      var newHealth = Object.assign({ id: generateUUID(), createdAt: now(), updatedAt: now() }, payload);
      appendRow(sheet, newHealth, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'CREATE', 'student_health', String(newHealth.id), null, newHealth, 'Tambah data kesehatan siswa');
      return successResponse(newHealth);
    }
  },

  getEducationHistory: function(payload, user) {
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var data = sheetToObjects(getSheet(CONFIG.SHEETS.EDUCATION))
      .filter(function(e) { return String(e.studentId != null ? e.studentId : e.studentID) === String(payload.studentId); });
    return successResponse(data);
  },

  getEnrollments: function(payload, user) {
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS))
      .filter(function(e) { return String(e.studentId != null ? e.studentId : e.studentID) === String(payload.studentId); });
    var classrooms  = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));

    var result = enrollments.map(function(e) {
      var cls = classrooms.find(function(c) { return String(c.id) === String(e.classroomId); });
      var sy  = schoolYears.find(function(s) { return String(s.id) === String(e.schoolYearId); });
      return Object.assign({}, e, {
        classroomName:  cls ? cls.name : '',
        schoolYearName: sy  ? sy.name  : '',
      });
    });

    return successResponse(result);
  },

  enroll: function(payload, user) {
    checkPermission(user, 'student:update');
    var enr = this._doEnroll(payload.studentId, payload.classroomId, payload.schoolYearId);
    cacheRemove('students_completeness');
    return successResponse(enr);
  },

  _doEnroll: function(studentId, classroomId, schoolYearId) {
    var sheet   = getSheet(CONFIG.SHEETS.ENROLLMENTS);
    var headers = getHeaders(sheet);

    // Nonaktifkan enrollment lama di tahun pelajaran yang sama
    var all = sheetToObjects(sheet);
    all.forEach(function(e, i) {
      if (String(e.studentId) === String(studentId) &&
          String(e.schoolYearId) === String(schoolYearId) &&
          e.status === 'active') {
        var rowIdx = findRowById(sheet, e.id);
        var colStatus = headers.indexOf('status') + 1;
        if (rowIdx > 0 && colStatus > 0) {
          sheet.getRange(rowIdx, colStatus).setValue('transferred');
        }
      }
    });

    var enr = {
      id:           generateUUID(),
      studentId:    studentId,
      classroomId:  classroomId,
      schoolYearId: schoolYearId,
      entryDate:    now().slice(0, 10),
      exitDate:     '',
      status:       'active',
      notes:        '',
      createdAt:    now(),
    };
    appendRow(sheet, enr, headers);
    return enr;
  },

  importBatch: function(payload, user) {
    checkPermission(user, 'student:import');
    var rows    = payload.rows || [];
    var success = 0;
    var failed  = 0;
    var errors  = [];

    var sheet   = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var all     = this._getAll();

    rows.forEach(function(row, i) {
      try {
        if (!row.fullName) throw new Error('Nama lengkap kosong');

        // Normalisasi identifier agar hasil import konsisten meski XLSX/GAS
        // mengirimkannya sebagai number atau mengandung whitespace.
        row.nis = normalizeIdentifier(row.nis);
        row.nisn = normalizeIdentifier(row.nisn);
        if (row.nik !== undefined) row.nik = normalizeIdentifier(row.nik);
        if (row.phone !== undefined) row.phone = normalizeIdentifier(row.phone);

        if (!row.nis)      throw new Error('NIS kosong');
        // BUG-43 FIX: Validasi NISN — wajib ada dan harus 10 digit angka.
        if (!row.nisn)               throw new Error('NISN kosong');
        if (!/^\d{10}$/.test(row.nisn)) throw new Error('NISN harus 10 digit angka');

        if (all.find(function(s) { return normalizeIdentifier(s.nis) === row.nis; })) {
          throw new Error('NIS "' + row.nis + '" sudah ada');
        }
        // BUG-43 FIX: Cek duplikat NISN juga.
        if (all.find(function(s) { return normalizeIdentifier(s.nisn) === row.nisn; })) {
          throw new Error('NISN "' + row.nisn + '" sudah ada');
        }

        var id = generateUUID();
        var ts = now();
        var student = {};
        headers.forEach(function(h) { student[h] = row[h] !== undefined ? row[h] : ''; });
        student.id = id;
        student.status = 'active';
        student.createdAt = ts;
        student.updatedAt = ts;
        student.createdBy = user.id;
        appendRow(sheet, student, headers);
        all.push(student);
        success++;
      } catch (e) {
        failed++;
        errors.push('Baris ' + (i + 2) + ': ' + e.message);
      }
    });

    this._invalidateCache();
    AuditService.log(user.id, 'IMPORT', 'student', null, null, { count: success }, 'Import ' + success + ' siswa');
    return successResponse({ success: success, failed: failed, errors: errors });
  },

  exportData: function(payload, user) {
    if (!hasPermission(user, 'student:export') && !hasPermission(user, 'student:export:own')) {
      throw new Error('FORBIDDEN');
    }
    // BUG-41 FIX: Tangkap status error dari list() sebelum mengakses .data.items
    // agar error 403/404 dari list() tidak tertelan menjadi 500 generic.
    var listResponse = this.list(Object.assign({}, payload, { page: 1, limit: 10000 }), user);
    var listResult = JSON.parse(listResponse.getContent());
    if (listResult.status >= 400) {
      return errorResponse(listResult.status, listResult.error || 'Gagal mengambil data untuk ekspor.');
    }
    return successResponse(listResult.data.items);
  },

  getStats: function(payload, user) {
    checkPermission(user, 'student:view:all');
    var cacheKey = 'students_stats';
    var cached = cacheGet(cacheKey);
    if (cached) return successResponse(cached);

    var all = this._getAll();
    var thisYear = new Date().getFullYear();
    var stats = {
      totalStudents:      all.length,
      activeStudents:     all.filter(function(s){ return s.status === 'active'; }).length,
      maleStudents:       all.filter(function(s){ return s.gender === 'L'; }).length,
      femaleStudents:     all.filter(function(s){ return s.gender === 'P'; }).length,
      graduatedStudents:  all.filter(function(s){ return s.status === 'graduated'; }).length,
      transferredStudents:all.filter(function(s){ return s.status === 'transferred'; }).length,
      newStudentsThisYear:all.filter(function(s){
        return s.entryDate && s.entryDate.toString().startsWith(thisYear.toString());
      }).length,
      totalTeachers:    sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS)).filter(function(t){ return t.status === 'active'; }).length,
      totalClassrooms:  sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS)).filter(function(c){ return normalizeBoolean(c.isActive, false); }).length,
    };

    cacheSet(cacheKey, stats, 300);
    return successResponse(stats);
  },

  // ── Private helpers ──────────────────────────────────────────
  _saveParents: function(studentId, payload) {
    ['father','mother','guardian'].forEach(function(rel) {
      if (!payload[rel] || !payload[rel].fullName) return;
      var sheet   = getSheet(CONFIG.SHEETS.PARENTS);
      var headers = getHeaders(sheet);
      var all     = sheetToObjects(sheet);
      var existing = all.find(function(p) {
        return String(p.studentId != null ? p.studentId : p.studentID) === String(studentId) && p.relationship === rel;
      });

      var data = Object.assign({ id: generateUUID(), createdAt: now(), isAlive: true },
        payload[rel], { studentId: studentId, relationship: rel, updatedAt: now() });

      if (existing) {
        data.id = existing.id;
        data.createdAt = existing.createdAt;
        updateRow(sheet, findRowById(sheet, existing.id), data, headers);
      } else {
        appendRow(sheet, data, headers);
      }
    });
  },

  _saveHealth: function(studentId, health) {
    if (!health) return;
    var sheet    = getSheet(CONFIG.SHEETS.HEALTH);
    var headers  = getHeaders(sheet);
    var existing = sheetToObjects(sheet).find(function(h) { return String(h.studentId != null ? h.studentId : h.studentID) === String(studentId); });
    var data     = Object.assign({ id: generateUUID(), createdAt: now() }, health, { studentId: studentId, updatedAt: now() });

    if (existing) {
      data.id = existing.id;
      data.createdAt = existing.createdAt;
      updateRow(sheet, findRowById(sheet, existing.id), data, headers);
    } else {
      appendRow(sheet, data, headers);
    }
  },

  _saveEducationHistory: function(studentId, ed) {
    // BUG-42/BUG-24 FIX: Selalu append menyebabkan duplikasi setiap kali siswa diedit.
    // Sekarang: cek berdasarkan schoolName + level. Jika sudah ada, update; jika belum, append.
    if (!ed || !ed.schoolName) return;
    var sheet   = getSheet(CONFIG.SHEETS.EDUCATION);
    var headers = getHeaders(sheet);
    var all     = sheetToObjects(sheet);
    var existing = all.find(function(e) {
      return String(e.studentId != null ? e.studentId : e.studentID) === String(studentId) &&
             e.schoolName === ed.schoolName &&
             e.level === ed.level;
    });

    var data = Object.assign({ id: generateUUID(), createdAt: now() }, ed, { studentId: studentId });

    if (existing) {
      // Update row yang sudah ada — jangan duplikasi
      data.id = existing.id;
      data.createdAt = existing.createdAt;
      var rowIdx = findRowById(sheet, existing.id);
      if (rowIdx > 0) updateRow(sheet, rowIdx, data, headers);
    } else {
      appendRow(sheet, data, headers);
    }
  },
};
