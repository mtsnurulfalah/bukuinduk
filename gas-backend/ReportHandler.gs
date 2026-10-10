// ============================================================
// ReportHandler.gs + AuditHandler + SettingsHandler
// ============================================================

var ReportHandler = {
  handle: function(method, payload, user) {
    switch (method) {
      case 'dashboardStats':    return this.dashboardStats(payload, user);
      case 'dataCompleteness': return this.dataCompleteness(payload, user);
      case 'intelligence':     return this.intelligence(payload, user);
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

  /**
   * Intelligence Center — analisis rule-based untuk menemukan anomali
   * dan data yang perlu ditinjau. Tidak mengubah data dan tidak memakai
   * layanan AI eksternal.
   */
  intelligence: function(payload, user) {
    checkPermission(user, 'report:intelligence');

    var cached = cacheGet('reports_intelligence');
    if (cached) return successResponse(cached);

    var allStudents = StudentHandler._getAll();
    var activeStudents = allStudents.filter(function(s) { return s.status === 'active'; });
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var classrooms = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));

    var activeEnrollmentByStudent = {};
    var classroomNameById = {};
    classrooms.forEach(function(c) {
      classroomNameById[String(c.id)] = c.name || '';
    });

    enrollments.forEach(function(e) {
      if (e.status !== 'active') return;
      var sid = String(e.studentId != null ? e.studentId : e.studentID || '');
      if (!sid) return;
      // Jika ada lebih dari satu enrollment aktif, gunakan tanggal terbaru.
      // Jangan bergantung pada urutan baris di Spreadsheet.
      var currentEnrollment = activeEnrollmentByStudent[sid];
      var currentDate = currentEnrollment
        ? String(currentEnrollment.entryDate || currentEnrollment.createdAt || '')
        : '';
      var enrollmentDate = String(e.entryDate || e.createdAt || '');
      if (!currentEnrollment || enrollmentDate > currentDate) {
        activeEnrollmentByStudent[sid] = e;
      }
    });

    // Deteksi duplikasi NIS/NISN di seluruh data siswa.
    var nisGroups = {};
    var nisnGroups = {};
    allStudents.forEach(function(s) {
      var nis = normalizeIdentifier(s.nis);
      var nisn = normalizeIdentifier(s.nisn);
      if (nis) {
        if (!nisGroups[nis]) nisGroups[nis] = [];
        nisGroups[nis].push(String(s.id));
      }
      if (nisn) {
        if (!nisnGroups[nisn]) nisnGroups[nisn] = [];
        nisnGroups[nisn].push(String(s.id));
      }
    });

    var duplicateNisIds = {};
    var duplicateStudentIds = {};
    var duplicateNisGroups = 0;
    Object.keys(nisGroups).forEach(function(key) {
      if (nisGroups[key].length > 1) {
        duplicateNisGroups++;
        nisGroups[key].forEach(function(id) { duplicateNisIds[id] = true; duplicateStudentIds[id] = true; });
      }
    });

    var duplicateNisnIds = {};
    var duplicateNisnGroups = 0;
    Object.keys(nisnGroups).forEach(function(key) {
      if (nisnGroups[key].length > 1) {
        duplicateNisnGroups++;
        nisnGroups[key].forEach(function(id) { duplicateNisnIds[id] = true; duplicateStudentIds[id] = true; });
      }
    });

    function hasValue(value) {
      return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function getAge(birthDate) {
      if (!hasValue(birthDate)) return null;
      var date = new Date(birthDate);
      if (isNaN(date.getTime())) return null;
      var today = new Date();
      var age = today.getFullYear() - date.getFullYear();
      var month = today.getMonth() - date.getMonth();
      if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age--;
      return age;
    }

    var issueDefinitions = {
      missing_identity: { label: 'Identitas belum lengkap', severity: 'medium' },
      missing_address: { label: 'Alamat belum lengkap', severity: 'medium' },
      missing_family: { label: 'Data orang tua/wali belum lengkap', severity: 'medium' },
      missing_health: { label: 'Data kesehatan belum lengkap', severity: 'low' },
      missing_education: { label: 'Riwayat pendidikan belum ada', severity: 'low' },
      no_class: { label: 'Belum memiliki rombel aktif', severity: 'high' },
      duplicate_nis: { label: 'NIS terduplikasi', severity: 'high' },
      duplicate_nisn: { label: 'NISN terduplikasi', severity: 'high' },
      age_review: { label: 'Usia/tanggal lahir perlu ditinjau', severity: 'low' },
      invalid_nisn: { label: 'Format NISN perlu ditinjau', severity: 'high' },
    };

    // Data relasi cukup dibaca sekali.
    var parents = sheetToObjects(getSheet(CONFIG.SHEETS.PARENTS));
    var health = sheetToObjects(getSheet(CONFIG.SHEETS.HEALTH));
    var education = sheetToObjects(getSheet(CONFIG.SHEETS.EDUCATION));

    var parentByStudent = {};
    parents.forEach(function(p) {
      var sid = String(p.studentId != null ? p.studentId : p.studentID || '');
      if (!sid) return;
      if (!parentByStudent[sid]) parentByStudent[sid] = {};
      parentByStudent[sid][String(p.relationship || '').toLowerCase()] = p;
    });

    var healthByStudent = {};
    health.forEach(function(h) {
      var sid = String(h.studentId != null ? h.studentId : h.studentID || '');
      if (sid) healthByStudent[sid] = h;
    });

    var educationByStudent = {};
    education.forEach(function(e) {
      var sid = String(e.studentId != null ? e.studentId : e.studentID || '');
      if (sid) educationByStudent[sid] = true;
    });

    var attentionStudents = [];
    var breakdownCounts = {
      missing_identity: 0,
      missing_address: 0,
      missing_family: 0,
      missing_health: 0,
      missing_education: 0,
      no_class: 0,
      duplicate_nis: 0,
      duplicate_nisn: 0,
      age_review: 0,
      invalid_nisn: 0,
    };

    activeStudents.forEach(function(s) {
      var sid = String(s.id);
      var issues = [];
      var parent = parentByStudent[sid] || {};
      var fatherOrGuardian = (parent.father && parent.father.fullName) || (parent.guardian && parent.guardian.fullName);
      var mother = parent.mother && parent.mother.fullName;
      var h = healthByStudent[sid];

      var identityFields = ['nis','nisn','fullName','gender','birthPlace','birthDate','religion','nationality'];
      var addressFields = ['address','village','district','city','province'];
      var healthFields = ['bloodType','heightCm','weightKg'];

      if (!identityFields.every(function(field) { return hasValue(s[field]); })) issues.push('missing_identity');
      if (!addressFields.every(function(field) { return hasValue(s[field]); })) issues.push('missing_address');
      if (!hasValue(fatherOrGuardian) || !hasValue(mother)) issues.push('missing_family');
      if (!h || !healthFields.every(function(field) { return hasValue(h[field]); })) issues.push('missing_health');
      if (!educationByStudent[sid]) issues.push('missing_education');
      if (!activeEnrollmentByStudent[sid]) issues.push('no_class');
      if (duplicateNisIds[sid]) issues.push('duplicate_nis');
      if (duplicateNisnIds[sid]) issues.push('duplicate_nisn');
      var nisn = normalizeIdentifier(s.nisn);
      if (nisn && !/^\d{10}$/.test(nisn)) issues.push('invalid_nisn');

      var age = getAge(s.birthDate);
      // Tanggal lahir terisi tetapi tidak dapat diparse juga perlu ditinjau.
      if ((hasValue(s.birthDate) && age === null) || (age !== null && (age < 10 || age > 20))) {
        issues.push('age_review');
      }

      issues.forEach(function(key) { breakdownCounts[key]++; });

      if (issues.length) {
        attentionStudents.push({
          studentId: sid,
          fullName: s.fullName || 'Tanpa nama',
          nis: normalizeIdentifier(s.nis),
          classroomName: activeEnrollmentByStudent[sid]
            ? (classroomNameById[String(activeEnrollmentByStudent[sid].classroomId)] || '')
            : '',
          issues: issues.map(function(key) {
            return {
              key: key,
              label: issueDefinitions[key].label,
              severity: issueDefinitions[key].severity,
            };
          }),
        });
      }
    });

    attentionStudents.sort(function(a, b) {
      if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    var breakdownOrder = [
      ['no_class', 'Belum ada rombel aktif'],
      ['duplicate_nis', 'NIS terduplikasi'],
      ['duplicate_nisn', 'NISN terduplikasi'],
      ['missing_identity', 'Identitas belum lengkap'],
      ['missing_address', 'Alamat belum lengkap'],
      ['missing_family', 'Orang tua/wali belum lengkap'],
      ['missing_health', 'Kesehatan belum lengkap'],
      ['missing_education', 'Riwayat pendidikan belum ada'],
      ['age_review', 'Usia/tanggal lahir perlu ditinjau'],
      ['invalid_nisn', 'Format NISN perlu ditinjau'],
    ];

    var maxCount = breakdownOrder.reduce(function(max, pair) {
      return Math.max(max, breakdownCounts[pair[0]]);
    }, 0);

    var breakdown = breakdownOrder.map(function(pair) {
      return {
        key: pair[0],
        label: pair[1],
        count: breakdownCounts[pair[0]],
        percent: maxCount ? Math.round((breakdownCounts[pair[0]] / maxCount) * 100) : 0,
      };
    });

    var studentsNeedingAttention = attentionStudents.length;
    var studentsWithoutIssues = Math.max(0, activeStudents.length - studentsNeedingAttention);
    var totalIssueHits = breakdownOrder.reduce(function(sum, pair) {
      return sum + breakdownCounts[pair[0]];
    }, 0);

    var insights = [];

    if (!activeStudents.length) {
      insights.push({
        id: 'empty',
        title: 'Belum ada siswa aktif',
        description: 'Belum ada populasi siswa aktif yang dapat dianalisis oleh Intelligence Center.',
        severity: 'low',
        count: 0,
      });
    } else {
      if (breakdownCounts.no_class > 0) {
        insights.push({
          id: 'no-class',
          title: 'Ada siswa aktif tanpa rombel',
          description: 'Periksa penempatan rombel agar data siswa aktif terhubung dengan kelas yang sesuai.',
          severity: 'high',
          count: breakdownCounts.no_class,
        });
      }
      if (duplicateNisGroups > 0 || duplicateNisnGroups > 0) {
        var duplicateTotal = Object.keys(duplicateNisIds).length + Object.keys(duplicateNisnIds).length;
        insights.push({
          id: 'duplicates',
          title: 'Ditemukan identifier berulang',
          description: 'NIS/NISN yang terindikasi ganda perlu diperiksa sebelum dipakai untuk integrasi atau pelaporan.',
          severity: 'high',
          count: duplicateTotal,
        });
      }
      if (breakdownCounts.missing_identity + breakdownCounts.missing_address > 0) {
        insights.push({
          id: 'profile',
          title: 'Profil dasar masih perlu dilengkapi',
          description: 'Lengkapi identitas dan alamat untuk mengurangi data yang tidak siap digunakan pada laporan.',
          severity: 'medium',
          count: breakdownCounts.missing_identity + breakdownCounts.missing_address,
        });
      }
      if (breakdownCounts.invalid_nisn > 0) {
        insights.push({
          id: 'invalid-nisn',
          title: 'Ada format NISN yang perlu ditinjau',
          description: 'NISN yang terisi tetapi tidak mengikuti format 10 digit perlu diverifikasi dari dokumen sumber.',
          severity: 'high',
          count: breakdownCounts.invalid_nisn,
        });
      }
      if (breakdownCounts.age_review > 0) {
        insights.push({
          id: 'age',
          title: 'Ada tanggal lahir yang perlu ditinjau',
          description: 'Sebagian tanggal lahir tidak dapat dibaca atau menghasilkan usia di luar rentang pemeriksaan 10–20 tahun. Verifikasi data sumber.',
          severity: 'low',
          count: breakdownCounts.age_review,
        });
      }
      if (!insights.length) {
        insights.push({
          id: 'clean',
          title: 'Tidak ada temuan utama',
          description: 'Tidak ditemukan pola data utama yang masuk ke aturan pemeriksaan Intelligence Center.',
          severity: 'low',
          count: 0,
        });
      }
    }

    insights = insights.slice(0, 4);

    var result = {
      summary: {
        activeStudents: activeStudents.length,
        studentsNeedingAttention: studentsNeedingAttention,
        studentsWithoutIssues: studentsWithoutIssues,
        studentsWithoutClass: breakdownCounts.no_class,
        duplicateStudents: Object.keys(duplicateStudentIds).length,
        duplicateNis: Object.keys(duplicateNisIds).length,
        duplicateNisn: Object.keys(duplicateNisnIds).length,
        ageReviewStudents: breakdownCounts.age_review,
        averageIssuesPerStudent: activeStudents.length
          ? Number((totalIssueHits / activeStudents.length).toFixed(2))
          : 0,
      },
      insights: insights,
      breakdown: breakdown,
      attentionStudents: attentionStudents.slice(0, 12),
      generatedAt: now(),
    };

    cacheSet('reports_intelligence', result, 30);
    return successResponse(result);
  },

  statusDistribution: function(payload, user) {
    checkPermission(user, 'student:view:all');
    var students = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var effectiveSchoolYearId = payload.schoolYearId ? String(payload.schoolYearId) : '';
    var studentIds = null;

    if (effectiveSchoolYearId || payload.classroomId) {
      studentIds = {};
      enrollments.forEach(function(e) {
        if (e.status !== 'active') return;
        if (effectiveSchoolYearId && String(e.schoolYearId) !== effectiveSchoolYearId) return;
        if (payload.classroomId && String(e.classroomId) !== String(payload.classroomId)) return;
        studentIds[String(e.studentId)] = true;
      });
      students = students.filter(function(s) { return studentIds[String(s.id)]; });
    }
    if (payload.gender) students = students.filter(function(s) { return s.gender === payload.gender; });
    if (payload.status) students = students.filter(function(s) { return s.status === payload.status; });

    var statuses = ['active','inactive','graduated','transferred','dropped_out'];
    var labels = {
      active:'Aktif', inactive:'Tidak Aktif', graduated:'Lulus',
      transferred:'Pindah', dropped_out:'Keluar'
    };
    return successResponse(statuses.map(function(status) {
      return {
        status: status,
        label: labels[status] || status,
        count: students.filter(function(s){ return s.status === status; }).length,
      };
    }));
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
    var students = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS))
      .filter(function(s){ return s.status === 'active' && s.birthDate; });
    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var effectiveSchoolYearId = payload.schoolYearId ? String(payload.schoolYearId) : '';

    if (effectiveSchoolYearId || payload.classroomId) {
      var ids = {};
      enrollments.forEach(function(e) {
        if (e.status !== 'active') return;
        if (effectiveSchoolYearId && String(e.schoolYearId) !== effectiveSchoolYearId) return;
        if (payload.classroomId && String(e.classroomId) !== String(payload.classroomId)) return;
        ids[String(e.studentId)] = true;
      });
      students = students.filter(function(s) { return ids[String(s.id)]; });
    }
    if (payload.gender) students = students.filter(function(s){ return s.gender === payload.gender; });

    var groups = { '< 10': 0, '10-12': 0, '13-15': 0, '16-18': 0, '> 18': 0 };
    var today = new Date();
    students.forEach(function(s){
      var birth = new Date(String(s.birthDate));
      if (isNaN(birth.getTime())) return;
      var age = today.getFullYear() - birth.getFullYear();
      var beforeBirthday = today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
      if (beforeBirthday) age--;
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

    var all;
    if (user.role === 'teacher') {
      var teacherResponse = StudentHandler.list(Object.assign({}, payload, {
        page: 1,
        limit: 10000,
      }), user);
      var teacherResult = JSON.parse(teacherResponse.getContent());
      if (teacherResult.status >= 400) {
        return errorResponse(teacherResult.status, teacherResult.error || 'Gagal mengambil data siswa guru.');
      }
      all = teacherResult.data.items || [];
    } else {
      all = sheetToObjects(getSheet(CONFIG.SHEETS.STUDENTS));
      if (payload.schoolYearId || payload.classroomId) {
        var filteredEnrollmentRows = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS))
          .filter(function(e) {
            return e.status === 'active' &&
              (!payload.schoolYearId || String(e.schoolYearId) === String(payload.schoolYearId)) &&
              (!payload.classroomId || String(e.classroomId) === String(payload.classroomId));
          });
        var filteredStudentIds = {};
        filteredEnrollmentRows.forEach(function(e) { filteredStudentIds[String(e.studentId)] = true; });
        all = all.filter(function(s) { return filteredStudentIds[String(s.id)]; });
      }
      if (payload.status) all = all.filter(function(s){ return s.status === payload.status; });
      if (payload.gender) all = all.filter(function(s){ return s.gender === payload.gender; });
    }

    // Teacher result dari StudentHandler.list() sudah dibatasi tahun aktif
    // dan sudah memiliki classroomName. Jangan re-enrich dengan enrollment
    // lintas tahun yang dapat mengganti nama kelas menjadi nilai historis.
    if (user.role === 'teacher') {
      all.sort(function(a,b){ return (a.fullName||'').localeCompare(b.fullName||''); });
      return successResponse(all);
    }

    var enrollments = sheetToObjects(getSheet(CONFIG.SHEETS.ENROLLMENTS));
    var classrooms  = sheetToObjects(getSheet(CONFIG.SHEETS.CLASSROOMS));

    all = all.map(function(s){
      // Ikuti filter tahun/kelas saat menentukan kelas yang ditampilkan.
      // Jika semua tahun dipilih, gunakan enrollment aktif terbaru agar label
      // kelas tidak bergantung pada urutan historis baris di Spreadsheet.
      var matchingEnrollments = enrollments.filter(function(e) {
        return String(e.studentId) === String(s.id) &&
          e.status === 'active' &&
          (!payload.schoolYearId || String(e.schoolYearId) === String(payload.schoolYearId)) &&
          (!payload.classroomId || String(e.classroomId) === String(payload.classroomId));
      });
      matchingEnrollments.sort(function(a, b) {
        return String(b.entryDate || '').localeCompare(String(a.entryDate || ''));
      });
      var enr = matchingEnrollments[0];
      var cls = enr ? classrooms.find(function(c) { return String(c.id) === String(enr.classroomId); }) : null;
      return Object.assign({}, s, { classroomName: cls ? cls.name : '' });
    });

    if (payload.classroomId) {
      all = all.filter(function(s){
        var enr = enrollments.find(function(e){ return String(e.studentId)===String(s.id) && String(e.classroomId)===String(payload.classroomId) && e.status==='active'; });
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
    var failedSheets = [];

    // Kedua sheet ini bersifat lazy-created oleh fitur verifikasi/dokumen.
    // Jika belum pernah digunakan, siapkan skema kosong secara idempoten agar
    // backup tetap merepresentasikan seluruh entitas yang didukung aplikasi.
    var lazySheetHeaders = {};
    lazySheetHeaders[CONFIG.SHEETS.VERIFICATIONS] = [
      'id','studentId','section','label','status','verifiedBy','verifiedAt','notes'
    ];
    lazySheetHeaders[CONFIG.SHEETS.DOCUMENTS] = [
      'id','studentId','documentType','documentName','documentNumber','fileUrl',
      'status','notes','createdAt','updatedAt','createdBy'
    ];

    sheetNames.forEach(function(name) {
      try {
        var sheet = lazySheetHeaders[name]
          ? getOrCreateSheet(name, lazySheetHeaders[name])
          : getSheet(name);
        backup[name] = sheetToObjects(sheet);

        // Password hash tidak perlu ikut keluar ke browser/file backup.
        if (name === CONFIG.SHEETS.USERS) {
          backup[name] = backup[name].map(function(userRow) {
            var safe = Object.assign({}, userRow);
            delete safe.passwordHash;
            return safe;
          });
        }
        counts[name] = backup[name].length;
      } catch(e) {
        // Jangan menyamarkan sheet yang gagal dibaca sebagai sheet kosong.
        // Frontend akan menolak unduhan jika complete !== true.
        backup[name] = [];
        counts[name] = 0;
        failedSheets.push(name);
        var errorMessage = e && e.message ? e.message : String(e);
        Logger.log('Backup gagal membaca sheet "' + name + '": ' + errorMessage);
      }
    });

    backup._meta = {
      version: CONFIG.APP_VERSION,
      generatedAt: now(),
      sheetCount: sheetNames.length,
      counts: counts,
      complete: failedSheets.length === 0,
      failedSheets: failedSheets,
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
