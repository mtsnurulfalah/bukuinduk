// ============================================================
// ReportHandler.gs + AuditHandler + SettingsHandler
// ============================================================

var ReportHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'dashboardStats':    return this.dashboardStats(payload, user);
      case 'dataCompleteness': return this.dataCompleteness(payload, user);
      case 'classroomStats':    return ClassroomHandler.getStats(payload, user);
      case 'genderDistribution':return this.genderDistribution(payload, user);
      case 'statusDistribution':return this.statusDistribution(payload, user);
      case 'ageDistribution':   return this.ageDistribution(payload, user);
      case 'enrollmentTrend':   return this.enrollmentTrend(payload, user);
      case 'studentReport':     return this.studentReport(payload, user);
      case 'classReport':       return ClassroomHandler.getStats(payload, user);
      default: return errorResponse(404, 'Report method tidak ditemukan.');
    }
  },

  dashboardStats: function(payload, user) {
    if (!hasPermission(user,'student:view:all') && !hasPermission(user,'report:view:all'))
      throw new Error('FORBIDDEN');
    return StudentHandler.getStats(payload, user);
  },

  /**
   * Kualitas data siswa aktif.
   * Setiap bagian dinilai per siswa agar dashboard dapat menunjukkan
   * area yang perlu dilengkapi tanpa menampilkan data sensitif.
   */
  dataCompleteness: function(payload, user) {
    checkPermission(user, 'student:view:all');

    var cached = cacheGet('students_completeness');
    if (cached) return successResponse(cached);

    var students = StudentHandler._getAll().filter(function(s) {
      return s.status === 'active';
    });
    var parents = sheetToObjects(getSheet(CONFIG.SHEETS.PARENTS));
    var health = sheetToObjects(getSheet(CONFIG.SHEETS.HEALTH));
    var education = sheetToObjects(getSheet(CONFIG.SHEETS.EDUCATION));
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));

    var parentByStudent = {};
    parents.forEach(function(p) {
      var studentId = p.studentId != null ? p.studentId : p.studentID;
      var id = String(studentId || '');
      if (!id) return;
      if (!parentByStudent[id]) parentByStudent[id] = {};
      var relationship = String(p.relationship || '').toLowerCase();
      parentByStudent[id][relationship] = p;
    });

    var healthByStudent = {};
    health.forEach(function(h) {
      var studentId = h.studentId != null ? h.studentId : h.studentID;
      var id = String(studentId || '');
      if (id) healthByStudent[id] = h;
    });

    var educationByStudent = {};
    education.forEach(function(e) {
      var studentId = e.studentId != null ? e.studentId : e.studentID;
      var id = String(studentId || '');
      if (id) educationByStudent[id] = true;
    });

    var enrollmentByStudent = {};
    enrollments.forEach(function(e) {
      if (e.status !== 'active') return;
      var id = String(e.studentId != null ? e.studentId : e.studentID || '');
      if (id) enrollmentByStudent[id] = true;
    });

    var sectionDefinitions = [
      {
        key: 'identity',
        label: 'Identitas',
        complete: function(s) {
          return ['nis','nisn','fullName','gender','birthPlace','birthDate','religion','nationality']
            .every(function(field) { return s[field] !== null && s[field] !== undefined && String(s[field]).trim() !== ''; });
        },
      },
      {
        key: 'address',
        label: 'Alamat',
        complete: function(s) {
          return ['address','village','district','city','province']
            .every(function(field) { return s[field] !== null && s[field] !== undefined && String(s[field]).trim() !== ''; });
        },
      },
      {
        key: 'family',
        label: 'Orang Tua/Wali',
        complete: function(s) {
          var p = parentByStudent[String(s.id)] || {};
          var fatherOrGuardian = (p.father && p.father.fullName) || (p.guardian && p.guardian.fullName);
          var mother = p.mother && p.mother.fullName;
          return !!(fatherOrGuardian && String(fatherOrGuardian).trim()) &&
                 !!(mother && String(mother).trim());
        },
      },
      {
        key: 'health',
        label: 'Kesehatan',
        complete: function(s) {
          var h = healthByStudent[String(s.id)];
          if (!h) return false;
          return ['bloodType','heightCm','weightKg'].every(function(field) {
            return h[field] !== null && h[field] !== undefined && String(h[field]).trim() !== '';
          });
        },
      },
      {
        key: 'education',
        label: 'Pendidikan',
        complete: function(s) {
          return !!educationByStudent[String(s.id)];
        },
      },
      {
        key: 'enrollment',
        label: 'Riwayat Kelas',
        complete: function(s) {
          return !!enrollmentByStudent[String(s.id)];
        },
      },
    ];

    var sections = sectionDefinitions.map(function(definition) {
      var completed = students.filter(function(s) { return definition.complete(s); }).length;
      var missing = Math.max(0, students.length - completed);
      var percent = students.length ? Math.round((completed / students.length) * 100) : 100;
      return {
        key: definition.key,
        label: definition.label,
        percent: percent,
        completed: completed,
        missing: missing,
      };
    });

    var completeStudents = students.filter(function(s) {
      return sectionDefinitions.every(function(definition) {
        return definition.complete(s);
      });
    }).length;

    var totalStudents = students.length;
    var overallPercent = sections.length
      ? Math.round(sections.reduce(function(sum, section) { return sum + section.percent; }, 0) / sections.length)
      : 100;

    var insights = [];
    if (!totalStudents) {
      insights.push('Belum ada siswa aktif yang dapat dianalisis.');
    } else {
      var lowest = sections.slice().sort(function(a, b) { return a.percent - b.percent; })[0];
      if (lowest && lowest.missing > 0) {
        insights.push(lowest.label + ' merupakan bagian yang paling banyak perlu dilengkapi (' + lowest.percent + '%).');
      }
      var noEnrollment = sections.find(function(s) { return s.key === 'enrollment'; });
      if (noEnrollment && noEnrollment.missing > 0) {
        insights.push(noEnrollment.missing + ' siswa aktif belum memiliki rombel aktif.');
      }
      if (completeStudents < totalStudents) {
        insights.push('Sebanyak ' + (totalStudents - completeStudents) + ' siswa belum memiliki seluruh bagian data utama yang lengkap.');
      } else {
        insights.push('Seluruh siswa aktif telah memenuhi seluruh bagian data utama.');
      }
    }

    var result = {
      totalStudents: totalStudents,
      completeStudents: completeStudents,
      needsAttention: Math.max(0, totalStudents - completeStudents),
      overallPercent: overallPercent,
      sections: sections,
      insights: insights.slice(0, 3),
      generatedAt: now(),
    };

    cacheSet('students_completeness', result, 60);
    return successResponse(result);
  },

  statusDistribution: function(payload, user) {
    checkPermission(user, 'student:view:all');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    var statuses = ['active','inactive','graduated','transferred','dropped_out'];
    var labels   = { active:'Aktif', inactive:'Tidak Aktif', graduated:'Lulus', transferred:'Pindah', dropped_out:'Keluar' };

    var result = statuses.map(function(s){
      return { status: s, label: labels[s]||s, count: all.filter(function(x){ return x.status === s; }).length };
    });
    return successResponse(result);
  },

  genderDistribution: function(payload, user) {
    checkPermission(user, 'student:view:all');
    // BUG-50 FIX: Sebelumnya mendelegasikan ke ClassroomHandler.getStats() yang
    // mengembalikan format {classroomId, maleStudents, femaleStudents, ...}.
    // Frontend mengharapkan {label, male, female}[] — transform di sini.
    var classStatsResponse = JSON.parse(ClassroomHandler.getStats(payload, user).getContent());
    if (classStatsResponse.status >= 400) {
      return errorResponse(classStatsResponse.status, classStatsResponse.error || 'Gagal mengambil data distribusi gender.');
    }
    var transformed = classStatsResponse.data.map(function(cls) {
      return {
        label:  cls.classroomName,
        male:   cls.maleStudents,
        female: cls.femaleStudents,
      };
    });
    return successResponse(transformed);
  },

  ageDistribution: function(payload, user) {
    checkPermission(user, 'student:view:all');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS))
      .filter(function(s){ return s.status === 'active' && s.birthDate; });
    var groups = { '< 10': 0, '10-12': 0, '13-15': 0, '16-18': 0, '> 18': 0 };
    var now_year = new Date().getFullYear();
    all.forEach(function(s){
      var age = now_year - new Date(s.birthDate).getFullYear();
      if (age < 10)       groups['< 10']++;
      else if (age <= 12) groups['10-12']++;
      else if (age <= 15) groups['13-15']++;
      else if (age <= 18) groups['16-18']++;
      else                groups['> 18']++;
    });
    return successResponse(Object.keys(groups).map(function(k){ return { ageGroup: k, count: groups[k] }; }));
  },

  enrollmentTrend: function(payload, user) {
    checkPermission(user, 'student:view:all');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    var trend = {};
    all.forEach(function(s){
      if (!s.entryDate) return;
      var year = s.entryDate.toString().slice(0, 4);
      trend[year] = (trend[year] || 0) + 1;
    });
    var result = Object.keys(trend).sort().map(function(y){ return { schoolYear: y, count: trend[y] }; });
    return successResponse(result);
  },

  studentReport: function(payload, user) {
    if (!hasPermission(user,'student:export') && !hasPermission(user,'report:export'))
      throw new Error('FORBIDDEN');

    var all = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    if (payload.status)      all = all.filter(function(s){ return s.status === payload.status; });
    if (payload.gender)      all = all.filter(function(s){ return s.gender === payload.gender; });

    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var classrooms  = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));

    all = all.map(function(s){
      var enr = enrollments.find(function(e){ return String(e.studentId)===String(s.id) && e.status==='active'; });
      var cls = enr ? classrooms.find(function(c){ return String(c.id)===String(enr.classroomId); }) : null;
      return Object.assign({}, s, { classroomName: cls ? cls.name : '' });
    });

    if (payload.classroomId) {
      all = all.filter(function(s){ 
        var enr = enrollments.find(function(e){ return String(e.studentId)===String(s.id) && String(e.classroomId)===String(payload.classroomId); });
        return !!enr;
      });
    }

    all.sort(function(a,b){ return (a.fullName||'').localeCompare(b.fullName||''); });
    return successResponse(all);
  },
};

// ── AuditHandler ──────────────────────────────────────────────
var AuditHandler = {
  handle: function(method, payload, user) {
    if (method === 'list') return this.list(payload, user);
    return errorResponse(404, 'Audit method tidak ditemukan.');
  },
  list: function(payload, user) {
    checkPermission(user, 'audit:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.AUDIT_LOGS));

    if (payload.userId)       all = all.filter(function(l){ return String(l.userId)===String(payload.userId); });
    if (payload.action)       all = all.filter(function(l){ return l.action===payload.action; });
    if (payload.resourceType) all = all.filter(function(l){ return l.resourceType===payload.resourceType; });
    if (payload.startDate)    all = all.filter(function(l){ return l.createdAt >= payload.startDate; });
    if (payload.endDate)      all = all.filter(function(l){ return l.createdAt <= payload.endDate + 'T23:59:59'; });

    all.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    return successResponse(paginate(all, payload.page, payload.limit));
  },
};

// ── SettingsHandler ───────────────────────────────────────────
var SettingsHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'get':          return this.get(payload, user);
      case 'update':       return this.update(payload, user);
      case 'exportBackup': return this.exportBackup(payload, user);
      default: return errorResponse(404, 'Settings method tidak ditemukan.');
    }
  },
  get: function(payload, user) {
    checkPermission(user, 'settings:view');
    var all = sheetToObjects(getSheet(CONFIG.SHEETS.SETTINGS));
    var settings = {};
    all.forEach(function(row){ settings[row.key] = row.value; });
    return successResponse(settings);
  },
  update: function(payload, user) {
    checkPermission(user, 'settings:manage');
    var sheet   = getSheet(CONFIG.SHEETS.SETTINGS);
    var all     = sheetToObjects(sheet);
    var headers = getHeaders(sheet);

    Object.keys(payload).forEach(function(key) {
      var existing = all.find(function(r){ return r.key === key; });
      if (existing) {
        var rowIdx = findRowById(sheet, existing.id);
        var colVal = headers.indexOf('value') + 1;
        if (rowIdx > 0 && colVal > 0) sheet.getRange(rowIdx, colVal).setValue(payload[key]);
      } else {
        appendRow(sheet, { id: generateUUID(), key: key, value: payload[key], updatedAt: now() }, headers);
      }
    });

    AuditService.log(user.id, 'UPDATE', 'settings', null, null, null, 'Update pengaturan aplikasi');
    return SettingsHandler.get(payload, user);
  },
  exportBackup: function(payload, user) {
    checkPermission(user, 'settings:manage');
    var backup = {};
    var sheetNames = Object.values(CONFIG.SHEETS);
    var counts = {};
    sheetNames.forEach(function(name) {
      try {
        backup[name] = sheetToObjects(getSheet(name));
        counts[name] = backup[name].length;
      } catch(e) {
        backup[name] = [];
        counts[name] = 0;
      }
    });
    backup._meta = {
      version: CONFIG.APP_VERSION,
      generatedAt: now(),
      sheetCount: sheetNames.length,
      counts: counts,
    };
    AuditService.log(user.id, 'EXPORT', 'settings', null, null, null, 'Backup data');
    return successResponse(backup);
  },
};

// ── AuditService ──────────────────────────────────────────────
var AuditService = {
  log: function(userId, action, resourceType, resourceId, oldValues, newValues, description) {
    try {
      var sheet   = getSheet(CONFIG.SHEETS.AUDIT_LOGS);
      var headers = getHeaders(sheet);
      var log = {
        id:           generateUUID(),
        userId:       userId || '',
        userName:     '',
        action:       action,
        resourceType: resourceType || '',
        resourceId:   resourceId   || '',
        description:  description  || '',
        oldValues:    oldValues  ? JSON.stringify(oldValues)  : '',
        newValues:    newValues  ? JSON.stringify(newValues)  : '',
        createdAt:    now(),
      };

      // Coba ambil nama user
      try {
        var users = sheetToObjects(getSheet(CONFIG.SHEETS.USERS));
        var u = users.find(function(x){ return String(x.id) === String(userId); });
        if (u) log.userName = u.fullName || u.username || '';
      } catch(e) {}

      appendRow(sheet, log, headers);
    } catch(e) {
      // Gagal log tidak perlu crash aplikasi
      console.error('AuditService.log error:', e.message);
    }
  },

  logError: function(context, message) {
    try {
      var sheet   = getSheet(CONFIG.SHEETS.AUDIT_LOGS);
      var headers = getHeaders(sheet);
      appendRow(sheet, {
        id: generateUUID(), userId: 'SYSTEM', userName: 'SYSTEM',
        action: 'ERROR', resourceType: context, resourceId: '',
        description: message, oldValues: '', newValues: '', createdAt: now(),
      }, headers);
    } catch(e) {}
  },
};
