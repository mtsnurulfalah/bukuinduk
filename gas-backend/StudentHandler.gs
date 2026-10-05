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
      case 'uploadPhoto':     return this.uploadPhoto(payload, user);
      case 'deletePhoto':     return this.deletePhoto(payload, user);
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
    // Permission: admin & principal melihat semua; teacher hanya kelas sendiri.
    // Clone records so enrichment/sanitization never mutates the shared cache.
    var all = this._getAll().map(function(s) { return Object.assign({}, s); });

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
    if (payload.schoolYearId) {
      // Filter tahun pelajaran berdasarkan rombel aktif pada tahun tersebut.
      var yearIds = enrollments
        .filter(function(e) {
          return String(e.schoolYearId) === String(payload.schoolYearId) && e.status === 'active';
        })
        .map(function(e) { return String(e.studentId); });
      all = all.filter(function(s) { return yearIds.indexOf(String(s.id)) !== -1; });
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
      // Roster/list API hanya mengembalikan field yang dibutuhkan guru.
      if (user.role === 'teacher') {
        delete s.nik;
        delete s.phone;
        delete s.email;
        delete s.address;
        delete s.rtRw;
        delete s.village;
        delete s.district;
        delete s.city;
        delete s.province;
        delete s.postalCode;
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
        delete c.incomeRange;
        delete c.phone;
        delete c.address;
        delete c.religion;
        delete c.birthDate;
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
    var fileUrl = payload.fileUrl ? String(payload.fileUrl).trim() : '';
    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      return errorResponse(400, 'URL dokumen harus menggunakan http:// atau https://.');
    }
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

    var nextFileUrl = payload.fileUrl !== undefined ? String(payload.fileUrl).trim() : String(existing.fileUrl || '').trim();
    if (nextFileUrl && !/^https?:\/\//i.test(nextFileUrl)) {
      return errorResponse(400, 'URL dokumen harus menggunakan http:// atau https://.');
    }

    var updated = Object.assign({}, existing, {
      documentType: payload.documentType !== undefined ? String(payload.documentType).trim() : existing.documentType,
      documentName: payload.documentName !== undefined ? String(payload.documentName).trim() : existing.documentName,
      documentNumber: payload.documentNumber !== undefined ? String(payload.documentNumber).trim() : existing.documentNumber,
      fileUrl: nextFileUrl,
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

  uploadPhoto: function(payload, user) {
    if (!hasPermission(user, 'student:create') && !hasPermission(user, 'student:update')) {
      throw new Error('FORBIDDEN');
    }
    if (!payload.studentId) return errorResponse(400, 'ID siswa diperlukan.');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    var mimeType = String(payload.mimeType || '').toLowerCase();
    var allowed = { 'image/jpeg': true, 'image/png': true };
    if (!allowed[mimeType]) return errorResponse(400, 'Format foto harus JPG atau PNG.');

    var base64 = String(payload.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!base64) return errorResponse(400, 'Data foto kosong.');

    var bytes = Utilities.base64Decode(base64);
    if (bytes.length > 2 * 1024 * 1024) {
      return errorResponse(400, 'Ukuran foto maksimal 2 MB.');
    }

    var folder;
    try {
      if (CONFIG.PHOTO_FOLDER_ID) {
        folder = DriveApp.getFolderById(CONFIG.PHOTO_FOLDER_ID);
      } else {
        var folders = DriveApp.getFoldersByName('Buku Induk Digital - Foto Siswa');
        folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Buku Induk Digital - Foto Siswa');
      }
    } catch (e) {
      return errorResponse(500, 'Folder penyimpanan foto tidak dapat diakses.');
    }

    var fileName = 'siswa-' + normalizeIdentifier(student.nis || student.id) + '-' +
      new Date().getTime() + (mimeType === 'image/png' ? '.png' : '.jpg');
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);

    // Foto ditampilkan langsung oleh browser dan PDF. Berkas tidak diletakkan
    // di cache aplikasi; hanya URL Drive yang disimpan pada kolom photoUrl.
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      try { file.setTrashed(true); } catch (trashErr) {}
      return errorResponse(500, 'Foto tersimpan tetapi akses tampilannya ditolak oleh kebijakan Google Drive. Periksa izin berbagi folder.');
    }

    var photoUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    // Hapus foto lama jika merupakan file Drive yang dikelola aplikasi.
    if (student.photoUrl) {
      try {
        var match = String(student.photoUrl).match(/[?&]id=([^&]+)/);
        if (match && match[1] && match[1] !== file.getId()) {
          DriveApp.getFileById(match[1]).setTrashed(true);
        }
      } catch (oldErr) {}
    }

    var sheet = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.studentId);
    if (rowIdx < 0) return errorResponse(404, 'Siswa tidak ditemukan.');
    var updated = Object.assign({}, student, { photoUrl: photoUrl, updatedAt: now() });
    updateRow(sheet, rowIdx, updated, headers);
    this._invalidateCache();

    AuditService.log(user.id, 'UPDATE', 'student_photo', String(payload.studentId),
      { photoUrl: student.photoUrl || '' }, { photoUrl: photoUrl }, 'Perbarui foto siswa');
    return successResponse(updated);
  },

  deletePhoto: function(payload, user) {
    checkPermission(user, 'student:update');
    if (!payload.studentId) return errorResponse(400, 'ID siswa diperlukan.');
    var student = this._getViewableStudent(payload.studentId, user);
    if (!student) return errorResponse(404, 'Siswa tidak ditemukan.');

    if (student.photoUrl) {
      try {
        var match = String(student.photoUrl).match(/[?&]id=([^&]+)/);
        if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
      } catch (e) {}
    }

    var sheet = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var rowIdx = findRowById(sheet, payload.studentId);
    if (rowIdx < 0) return errorResponse(404, 'Siswa tidak ditemukan.');
    var updated = Object.assign({}, student, { photoUrl: '', updatedAt: now() });
    updateRow(sheet, rowIdx, updated, headers);
    this._invalidateCache();

    AuditService.log(user.id, 'UPDATE', 'student_photo', String(payload.studentId),
      { photoUrl: student.photoUrl || '' }, { photoUrl: '' }, 'Hapus foto siswa');
    return successResponse(updated);
  },

  create: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'student:create');

    var normalizedNis = normalizeIdentifier(payload.nis);
    var normalizedNisn = normalizeIdentifier(payload.nisn);

    if (payload.classroomId || payload.schoolYearId) {
      if (!payload.classroomId || !payload.schoolYearId) return errorResponse(400, 'Kelas dan tahun pelajaran harus diisi bersama.');
      this._validateEnrollmentTarget('', payload.classroomId, payload.schoolYearId);
    }

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
    this._saveParents(id, payload, user);
    this._saveHealth(id, payload.health);
    this._saveEducationHistory(id, payload.educationHistory, user);

    // Enroll ke kelas
    if (payload.classroomId && payload.schoolYearId) {
      this._doEnroll(id, payload.classroomId, payload.schoolYearId);
    }

    this._invalidateCache();
    AuditService.log(user.id, 'CREATE', 'student', id, null, student, 'Tambah siswa: ' + student.fullName);
    return successResponse(Object.assign({}, student, { id: id }));
  
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
    checkPermission(user, 'student:update');
    var id = payload.id;
    if (!id) return errorResponse(400, 'ID siswa diperlukan.');

    if (payload.classroomId || payload.schoolYearId) {
      if (!payload.classroomId || !payload.schoolYearId) return errorResponse(400, 'Kelas dan tahun pelajaran harus diisi bersama.');
      this._validateEnrollmentTarget(id, payload.classroomId, payload.schoolYearId);
    }

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
      this._saveParents(id, payload, user);
    }
    if (payload.health) this._saveHealth(id, payload.health);
    if (payload.educationHistory) this._saveEducationHistory(id, payload.educationHistory);

    // Step Pendidikan & Kelas dapat mengubah rombel siswa. Jalankan enrollment
    // hanya saat kedua ID dikirim dan classroom tidak kosong; field opsional yang
    // dikosongkan tidak menghapus riwayat enrollment secara implisit.
    if (payload.classroomId && payload.schoolYearId) {
      this._doEnroll(id, payload.classroomId, payload.schoolYearId);
    }

    this._invalidateCache();
    AuditService.log(user.id, 'UPDATE', 'student', id, old, updated, 'Edit siswa: ' + updated.fullName);
    return successResponse(updated);
  
    } finally {
      _writeLock.releaseLock();
    }},

  archive: function(payload, user) {
    checkPermission(user, 'student:archive');
    return this._setStatus(payload.id, 'inactive', payload.reason, user);
  },

  restore: function(payload, user) {
    checkPermission(user, 'student:update');
    return this._setStatus(payload.id, 'active', null, user);
  },

  _setStatus: function(id, status, reason, user) {
    var allowedStatuses = ['active', 'inactive'];
    if (allowedStatuses.indexOf(status) === -1) {
      return errorResponse(400, 'Status siswa tidak valid.');
    }

    var sheet   = getSheet(CONFIG.SHEETS.STUDENTS);
    var headers = getHeaders(sheet);
    var rowIdx  = findRowById(sheet, id);
    if (rowIdx < 0) return errorResponse(404, 'Siswa tidak ditemukan.');

    var previous = sheetToObjects(sheet).find(function(s) { return String(s.id) === String(id); });
    if (!previous) return errorResponse(404, 'Siswa tidak ditemukan.');

    var statusDate = now().slice(0, 10);
    var colStatus = headers.indexOf('status') + 1;
    var colExitDate = headers.indexOf('exitDate') + 1;
    var colExitReason = headers.indexOf('exitReason') + 1;
    var colUpdatedAt = headers.indexOf('updatedAt') + 1;

    if (colStatus > 0) sheet.getRange(rowIdx, colStatus).setValue(status);
    if (colUpdatedAt > 0) sheet.getRange(rowIdx, colUpdatedAt).setValue(now());

    if (status === 'inactive') {
      if (colExitDate > 0) sheet.getRange(rowIdx, colExitDate).setValue(statusDate);
      if (colExitReason > 0) sheet.getRange(rowIdx, colExitReason).setValue(reason ? String(reason).trim() : '');

      // Siswa nonaktif tidak boleh tetap menjadi anggota aktif sebuah rombel.
      // Riwayat enrollment dipertahankan dengan status inactive.
      var enrollmentSheet = getSheet(CONFIG.SHEETS.ENROLLMENTS);
      var enrollmentHeaders = getHeaders(enrollmentSheet);
      var enrollments = sheetToObjects(enrollmentSheet);
      var colEnrollmentStatus = enrollmentHeaders.indexOf('status') + 1;
      var colEnrollmentExitDate = enrollmentHeaders.indexOf('exitDate') + 1;
      enrollments.forEach(function(enr) {
        if (String(enr.studentId) === String(id) && enr.status === 'active') {
          var enrollmentRow = findRowById(enrollmentSheet, enr.id);
          if (enrollmentRow > 0) {
            if (colEnrollmentStatus > 0) enrollmentSheet.getRange(enrollmentRow, colEnrollmentStatus).setValue('inactive');
            if (colEnrollmentExitDate > 0) enrollmentSheet.getRange(enrollmentRow, colEnrollmentExitDate).setValue(statusDate);
          }
        }
      });
    } else {
      if (colExitDate > 0) sheet.getRange(rowIdx, colExitDate).setValue('');
      if (colExitReason > 0) sheet.getRange(rowIdx, colExitReason).setValue('');
    }

    this._invalidateCache();
    cacheRemove('students_completeness');

    AuditService.log(
      user.id,
      status === 'active' ? 'RESTORE' : 'ARCHIVE',
      'student',
      id,
      {
        status: previous.status,
        exitDate: previous.exitDate || '',
        exitReason: previous.exitReason || '',
      },
      {
        status: status,
        exitDate: status === 'active' ? '' : statusDate,
        exitReason: status === 'active' ? '' : (reason ? String(reason).trim() : ''),
      },
      'Status siswa: ' + status
    );
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

    if (!payload.studentId || ['father','mother','guardian'].indexOf(String(payload.relationship || '')) === -1) {
      return errorResponse(400, 'Siswa dan hubungan orang tua/wali wajib valid.');
    }
    if (!this._getViewableStudent(payload.studentId, user)) return errorResponse(404, 'Siswa tidak ditemukan.');

    if (existing) {
      var rowIdx = findRowById(sheet, existing.id);
      var updated = Object.assign({}, existing);
      headers.forEach(function(h) {
        if (['id','studentId','studentID','relationship','createdAt'].indexOf(h) !== -1) return;
        if (payload[h] !== undefined) updated[h] = payload[h];
      });
      updated.updatedAt = now();
      updateRow(sheet, rowIdx, updated, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'UPDATE', 'student_parent', String(existing.id), existing, updated, 'Perbarui data orang tua/wali');
      return successResponse(updated);
    } else {
      var newParent = Object.assign({ id: generateUUID(), createdAt: now(), updatedAt: now(), isAlive: true },
        payload, { studentId: String(payload.studentId), relationship: String(payload.relationship) });
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

    if (!payload.studentId) return errorResponse(400, 'ID siswa diperlukan.');
    if (!this._getViewableStudent(payload.studentId, user)) return errorResponse(404, 'Siswa tidak ditemukan.');

    if (existing) {
      var rowIdx = findRowById(sheet, existing.id);
      var updated = Object.assign({}, existing);
      headers.forEach(function(h) {
        if (['id','studentId','studentID','createdAt'].indexOf(h) !== -1) return;
        if (payload[h] !== undefined) updated[h] = payload[h];
      });
      updated.updatedAt = now();
      updateRow(sheet, rowIdx, updated, headers);
      cacheRemove('students_completeness');
      AuditService.log(user.id, 'UPDATE', 'student_health', String(existing.id), existing, updated, 'Perbarui data kesehatan siswa');
      return successResponse(updated);
    } else {
      var newHealth = Object.assign({ id: generateUUID(), createdAt: now(), updatedAt: now() },
        payload, { studentId: String(payload.studentId) });
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
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
    checkPermission(user, 'student:update');
    var enr = this._doEnroll(payload.studentId, payload.classroomId, payload.schoolYearId);
    cacheRemove('students_completeness');
    return successResponse(enr);
  
    } finally {
      _writeLock.releaseLock();
    }},

  _validateEnrollmentTarget: function(studentId, classroomId, schoolYearId, enrollments) {
    if (!classroomId || !schoolYearId) throw new Error('Data enrollment tidak lengkap.');

    var classrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var classroom = classrooms.find(function(c) { return String(c.id) === String(classroomId); });
    if (!classroom) throw new Error('Kelas tidak ditemukan.');
    if (String(classroom.schoolYearId) !== String(schoolYearId)) {
      throw new Error('Kelas tidak sesuai dengan tahun pelajaran.');
    }

    var schoolYears = sheetToObjects(getSheet(CONFIG.SHEETS.SCHOOL_YEARS));
    if (!schoolYears.some(function(s) { return String(s.id) === String(schoolYearId); })) {
      throw new Error('Tahun pelajaran tidak ditemukan.');
    }

    var rows = enrollments || sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var capacity = Number(classroom.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      var activeCount = rows.filter(function(e) {
        return String(e.classroomId) === String(classroomId) &&
          String(e.schoolYearId) === String(schoolYearId) &&
          e.status === 'active';
      }).length;
      var existingForStudent = rows.some(function(e) {
        return String(e.studentId) === String(studentId) &&
          String(e.classroomId) === String(classroomId) &&
          String(e.schoolYearId) === String(schoolYearId) &&
          e.status === 'active';
      });
      if (activeCount >= capacity && !existingForStudent) {
        throw new Error('Kelas sudah mencapai kapasitas ' + capacity + ' siswa.');
      }
    }

    return { classroom: classroom, enrollments: rows };
  },

  _doEnroll: function(studentId, classroomId, schoolYearId) {
    if (!studentId || !classroomId || !schoolYearId) throw new Error('Data enrollment tidak lengkap.');

    if (!this._getAll().some(function(s) { return String(s.id) === String(studentId); })) {
      throw new Error('Siswa tidak ditemukan.');
    }

    var sheet   = getSheet(CONFIG.SHEETS.ENROLLMENTS);
    var headers = getHeaders(sheet);
    var all = sheetToObjects(sheet);

    var target = this._validateEnrollmentTarget(studentId, classroomId, schoolYearId, all);
    var existingActive = all.find(function(e) {
      return String(e.studentId) === String(studentId) &&
        String(e.schoolYearId) === String(schoolYearId) &&
        String(e.classroomId) === String(classroomId) &&
        e.status === 'active';
    });
    if (existingActive) return existingActive;

    // Nonaktifkan enrollment lama di tahun pelajaran yang sama.
    all.forEach(function(e) {
      if (String(e.studentId) === String(studentId) &&
          String(e.schoolYearId) === String(schoolYearId) &&
          e.status === 'active') {
        var rowIdx = findRowById(sheet, e.id);
        if (rowIdx > 0) {
          var colStatus = headers.indexOf('status') + 1;
          var colExitDate = headers.indexOf('exitDate') + 1;
          if (colStatus > 0) sheet.getRange(rowIdx, colStatus).setValue('transferred');
          if (colExitDate > 0) sheet.getRange(rowIdx, colExitDate).setValue(now().slice(0, 10));
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
    return Object.assign({}, enr, { classroomName: target.classroom.name });
  },

  importBatch: function(payload, user) {
    var _writeLock = LockService.getScriptLock();
    try {
      _writeLock.waitLock(15000);
    } catch (lockErr) {
      return errorResponse(429, 'Server sedang memproses perubahan lain. Silakan coba lagi.');
    }
    try {
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
        // Gunakan helper alias agar import tetap kompatibel dengan header lama
        // seperti `addres` / `endryDate` di Spreadsheet.
        headers.forEach(function(h) { student[h] = _valueForHeader(row, h); });
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
  
    } finally {
      _writeLock.releaseLock();
    }},

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

    var schoolYearId = payload.schoolYearId ? String(payload.schoolYearId) : '';
    var cacheKey = 'students_stats' + (schoolYearId ? '_' + schoolYearId : '');
    var cached = cacheGet(cacheKey);
    if (cached) return successResponse(cached);

    var allStudents = this._getAll();
    var allEnrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var allClassrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));
    var students = allStudents;

    if (schoolYearId) {
      var yearStudentIds = {};
      allEnrollments.forEach(function(enr) {
        if (String(enr.schoolYearId) === schoolYearId && enr.status === 'active') {
          yearStudentIds[String(enr.studentId)] = true;
        }
      });
      students = allStudents.filter(function(s) { return yearStudentIds[String(s.id)]; });
    }

    var thisYear = new Date().getFullYear();
    var stats = {
      totalStudents:       students.length,
      activeStudents:      students.filter(function(s){ return s.status === 'active'; }).length,
      maleStudents:        students.filter(function(s){ return s.gender === 'L'; }).length,
      femaleStudents:      students.filter(function(s){ return s.gender === 'P'; }).length,
      graduatedStudents:   students.filter(function(s){ return s.status === 'graduated'; }).length,
      transferredStudents: students.filter(function(s){ return s.status === 'transferred'; }).length,
      newStudentsThisYear: schoolYearId
        ? allEnrollments.filter(function(e) {
            return String(e.schoolYearId) === schoolYearId &&
              e.entryDate && String(e.entryDate).slice(0, 4) === String(thisYear);
          }).length
        : students.filter(function(s){
            return s.entryDate && String(s.entryDate).startsWith(String(thisYear));
          }).length,
      totalTeachers: sheetToObjects(getSheet(CONFIG.SHEETS.TEACHERS))
        .filter(function(t){ return t.status === 'active'; }).length,
      totalClassrooms: allClassrooms.filter(function(c){
        return normalizeBoolean(c.isActive, false) &&
          (!schoolYearId || String(c.schoolYearId) === schoolYearId);
      }).length,
    };

    cacheSet(cacheKey, stats, 300);
    return successResponse(stats);
  },

  // ── Private helpers ──────────────────────────────────────────
  _saveParents: function(studentId, payload, user) {
    var sheet   = getSheet(CONFIG.SHEETS.PARENTS);
    var headers = getHeaders(sheet);
    var all     = sheetToObjects(sheet);

    ['father','mother','guardian'].forEach(function(rel) {
      if (!payload[rel]) return;
      var existing = all.find(function(p) {
        return String(p.studentId != null ? p.studentId : p.studentID) === String(studentId) &&
          String(p.relationship || '') === rel;
      });

      var parent = payload[rel];
      var fullName = String(parent.fullName || '').trim();

      // Pada edit, mengosongkan nama berarti menghapus data relasi lama.
      if (!fullName) {
        if (existing) {
          var existingRow = findRowById(sheet, existing.id);
          if (existingRow > 0) {
            sheet.deleteRow(existingRow);
            AuditService.log(user.id, 'DELETE', 'student_parent', String(existing.id), existing, null, 'Hapus data orang tua/wali yang dikosongkan');
          }
        }
        return;
      }

      var data = Object.assign({}, existing || {}, parent, {
        id: existing ? existing.id : generateUUID(),
        studentId: String(studentId),
        relationship: rel,
        createdAt: existing ? existing.createdAt : now(),
        updatedAt: now(),
      });
      if (existing) {
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
    var data = Object.assign({}, existing || {}, health, {
      studentId: String(studentId),
      createdAt: existing ? existing.createdAt : now(),
      updatedAt: now(),
    });
    data.id = existing ? existing.id : generateUUID();

    if (existing) {
      updateRow(sheet, findRowById(sheet, existing.id), data, headers);
    } else {
      appendRow(sheet, data, headers);
    }
  },

  _saveEducationHistory: function(studentId, ed, user) {
    if (!ed) return;
    var sheet   = getSheet(CONFIG.SHEETS.EDUCATION);
    var headers = getHeaders(sheet);
    var all     = sheetToObjects(sheet);

    var existing = ed.id
      ? all.find(function(item) {
          return String(item.id) === String(ed.id) &&
            String(item.studentId != null ? item.studentId : item.studentID) === String(studentId);
        })
      : null;

    // Saat edit, record yang sengaja dikosongkan benar-benar dihapus.
    if (!String(ed.schoolName || '').trim()) {
      if (existing) {
        var existingRow = findRowById(sheet, existing.id);
        if (existingRow > 0) {
          sheet.deleteRow(existingRow);
          AuditService.log(user.id, 'DELETE', 'student_education', String(existing.id), existing, null, 'Hapus riwayat pendidikan yang dikosongkan');
        }
      }
      return;
    }

    // Tanpa ID (misalnya data baru), cari kecocokan lama sebagai fallback.
    if (!existing) {
      existing = all.find(function(item) {
        return String(item.studentId != null ? item.studentId : item.studentID) === String(studentId) &&
          String(item.schoolName || '').trim().toLowerCase() === String(ed.schoolName).trim().toLowerCase() &&
          String(item.level || '') === String(ed.level || '');
      }) || null;
    }

    var data = Object.assign({}, existing || {}, ed, {
      studentId: String(studentId),
      createdAt: existing ? existing.createdAt : now(),
      updatedAt: now(),
    });
    // Kolom ID adalah identitas immutable.
    data.id = existing ? existing.id : generateUUID();

    if (existing) {
      updateRow(sheet, findRowById(sheet, existing.id), data, headers);
    } else {
      appendRow(sheet, data, headers);
    }
  }
};
