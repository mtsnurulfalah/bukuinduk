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
      case 'get':           return this.get(payload, user);
      case 'update':        return this.update(payload, user);
      case 'exportBackup':  return this.exportBackup(payload, user);
      case 'createBackupSnapshot': return this.createBackupSnapshot(payload, user);
      case 'listBackupHistory': return this.listBackupHistory(payload, user);
      case 'getBackupAutomation': return this.getBackupAutomation(payload, user);
      case 'configureBackupAutomation': return this.configureBackupAutomation(payload, user);
      case 'readBackupSnapshot': return this.readBackupSnapshot(payload, user);
      case 'previewRestore': return this.previewRestore(payload, user);
      case 'restoreBackup':  return this.restoreBackup(payload, user);
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
    var backup = this._buildBackupData();
    AuditService.log(user.id, 'EXPORT', 'settings', null, null, null, 'Download backup JSON');
    return successResponse(backup);
  },

  /** Bangun snapshot seluruh sheet; tidak melakukan penulisan data bisnis. */
  _buildBackupData: function() {
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

    return backup;
  },

  _backupProperties: function() {
    return PropertiesService.getScriptProperties();
  },

  _getBackupHistory: function() {
    try {
      var raw = this._backupProperties().getProperty('BID_BACKUP_HISTORY_V1');
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function(item) {
        return item && typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.generatedAt === 'string' &&
          (item.status === 'success' || item.status === 'failed');
      }) : [];
    } catch (error) {
      Logger.log('Riwayat backup tidak dapat dibaca: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  _saveBackupHistory: function(history) {
    this._backupProperties().setProperty('BID_BACKUP_HISTORY_V1', JSON.stringify(history.slice(0, 25)));
  },

  _getBackupAutomationConfig: function() {
    var defaults = { enabled: false, frequency: 'daily', retention: 10 };
    try {
      var raw = this._backupProperties().getProperty('BID_BACKUP_AUTOMATION_V1');
      var parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
      return {
        enabled: parsed.enabled === true,
        frequency: parsed.frequency === 'weekly' ? 'weekly' : 'daily',
        retention: [5, 10, 20].indexOf(Number(parsed.retention)) !== -1 ? Number(parsed.retention) : 10
      };
    } catch (error) {
      return defaults;
    }
  },

  _publicBackupHistoryItem: function(item) {
    if (!item) return null;
    return {
      id: item.id,
      fileName: item.fileName || '',
      generatedAt: item.generatedAt,
      source: item.source === 'scheduled' ? 'scheduled' : 'manual',
      sheetCount: Number(item.sheetCount) || 0,
      recordCount: Number(item.recordCount) || 0,
      sizeBytes: Number(item.sizeBytes) || 0,
      status: item.status === 'success' ? 'success' : 'failed',
      error: item.status === 'failed' ? String(item.error || 'Backup gagal.').slice(0, 300) : ''
    };
  },

  _getBackupFolder: function() {
    var props = this._backupProperties();
    var folderId = props.getProperty('BID_BACKUP_FOLDER_ID');
    if (folderId) {
      try {
        var existing = DriveApp.getFolderById(folderId);
        if (existing && !existing.isTrashed()) return existing;
      } catch (error) {
        Logger.log('Folder backup lama tidak tersedia; membuat folder baru.');
      }
    }
    var folder = DriveApp.createFolder('Buku Induk Digital - Backup Otomatis');
    props.setProperty('BID_BACKUP_FOLDER_ID', folder.getId());
    return folder;
  },

  _applyBackupRetention: function(history, retention) {
    var keptSuccesses = 0;
    var result = [];
    history.forEach(function(item) {
      if (item.status === 'success' && item.fileId) {
        keptSuccesses++;
        if (keptSuccesses > retention) {
          try {
            DriveApp.getFileById(item.fileId).setTrashed(true);
            return;
          } catch (error) {
            item.error = 'Pembersihan retensi tertunda: ' +
              String(error && error.message ? error.message : error).slice(0, 180);
          }
        }
      }
      result.push(item);
    });
    return result.slice(0, 25);
  },

  _storeBackupSnapshot: function(source, actorId) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('Backup tidak dapat dimulai karena ada proses penulisan lain. Coba lagi.');
    }
    try {
      var backup = this._buildBackupData();
      if (!backup._meta || backup._meta.complete !== true ||
          !Array.isArray(backup._meta.failedSheets) || backup._meta.failedSheets.length) {
        var failedNames = backup._meta && Array.isArray(backup._meta.failedSheets)
          ? backup._meta.failedSheets.join(', ') : 'manifest tidak lengkap';
        throw new Error('Snapshot dibatalkan karena tidak semua sheet berhasil dibaca: ' + failedNames + '.');
      }

      var content = JSON.stringify(backup);
      if (!content) throw new Error('Data backup tidak dapat dikonversi menjadi JSON.');
      var folder = this._getBackupFolder();
      var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
      var fileName = 'backup-buku-induk-' + stamp + '-' + String(source === 'scheduled' ? 'otomatis' : 'manual') + '.json';
      var file = folder.createFile(fileName, content, 'application/json');
      var record = {
        id: generateUUID(),
        fileId: file.getId(),
        fileName: file.getName(),
        generatedAt: backup._meta.generatedAt,
        source: source === 'scheduled' ? 'scheduled' : 'manual',
        sheetCount: backup._meta.sheetCount,
        recordCount: Object.keys(backup._meta.counts || {}).reduce(function(sum, name) {
          return sum + (Number(backup._meta.counts[name]) || 0);
        }, 0),
        sizeBytes: file.getSize(),
        status: 'success',
        error: ''
      };
      var history = this._getBackupHistory();
      history.unshift(record);
      history = this._applyBackupRetention(history, this._getBackupAutomationConfig().retention);
      this._saveBackupHistory(history);

      if (source === 'manual' && actorId) {
        AuditService.log(actorId, 'CREATE', 'backup', record.id, null, null,
          'Snapshot backup disimpan di Google Drive; ' + record.recordCount + ' record.');
      }
      return this._publicBackupHistoryItem(record);
    } catch (error) {
      try {
        var failed = {
          id: generateUUID(),
          fileId: '',
          fileName: '',
          generatedAt: now(),
          source: source === 'scheduled' ? 'scheduled' : 'manual',
          sheetCount: 0,
          recordCount: 0,
          sizeBytes: 0,
          status: 'failed',
          error: String(error && error.message ? error.message : error).slice(0, 300)
        };
        var failedHistory = this._getBackupHistory();
        failedHistory.unshift(failed);
        this._saveBackupHistory(failedHistory.slice(0, 25));
      } catch (historyError) {
        Logger.log('Gagal mencatat riwayat error backup: ' +
          String(historyError && historyError.message ? historyError.message : historyError));
      }
      throw error;
    } finally {
      lock.releaseLock();
    }
  },

  createBackupSnapshot: function(payload, user) {
    checkPermission(user, 'settings:manage');
    return successResponse(this._storeBackupSnapshot('manual', user.id));
  },

  listBackupHistory: function(payload, user) {
    checkPermission(user, 'settings:manage');
    return successResponse(this._getBackupHistory().map(function(item) {
      return SettingsHandler._publicBackupHistoryItem(item);
    }));
  },

  getBackupAutomation: function(payload, user) {
    checkPermission(user, 'settings:manage');
    var config = this._getBackupAutomationConfig();
    var props = this._backupProperties();
    var history = this._getBackupHistory();

    // Endpoint pembacaan UI tidak boleh memerlukan scope ScriptApp.
    // Status trigger disimpan setelah konfigurasi berhasil; trigger yang
    // tertinggal ketika dinonaktifkan tetap aman karena runner memeriksa config.
    var triggerInstalled = config.enabled &&
      props.getProperty('BID_BACKUP_TRIGGER_INSTALLED_V1') === 'true';

    return successResponse({
      enabled: config.enabled,
      frequency: config.frequency,
      retention: config.retention,
      timezone: Session.getScriptTimeZone(),
      triggerInstalled: triggerInstalled,
      lastRun: history.length ? this._publicBackupHistoryItem(history[0]) : null
    });
  },

  _backupTriggerPermissionError: function(error) {
    var message = String(error && error.message ? error.message : error);
    if (/script\.scriptapp|ScriptApp|getProjectTriggers|authorization|izin|permission/i.test(message)) {
      return new Error(
        'Otorisasi trigger backup belum tersedia. Di editor Google Apps Script, buka Project Settings, tampilkan appsscript.json, lalu tambahkan scope ' +
        '"https://www.googleapis.com/auth/script.scriptapp" ke array oauthScopes tanpa menghapus scope yang sudah ada. ' +
        'Simpan, jalankan fungsi authorizeBackupAutomationAccess dari editor dan setujui izin, kemudian deploy ulang Web App dengan versi baru. ' +
        'Detail: ' + message
      );
    }
    return error instanceof Error ? error : new Error(message);
  },

  configureBackupAutomation: function(payload, user) {
    checkPermission(user, 'settings:manage');
    if (!payload || typeof payload.enabled !== 'boolean') {
      throw new Error('Status backup otomatis harus dipilih.');
    }
    var frequency = payload.frequency === 'weekly' ? 'weekly' : payload.frequency === 'daily' ? 'daily' : '';
    if (!frequency) throw new Error('Frekuensi backup harus harian atau mingguan.');
    var retention = Number(payload.retention);
    if ([5, 10, 20].indexOf(retention) === -1 || !Number.isInteger(retention)) {
      throw new Error('Retensi backup harus 5, 10, atau 20 snapshot.');
    }

    var props = this._backupProperties();
    var previousValue = props.getProperty('BID_BACKUP_AUTOMATION_V1');
    var previousTriggerValue = props.getProperty('BID_BACKUP_TRIGGER_INSTALLED_V1');
    var next = { enabled: payload.enabled, frequency: frequency, retention: retention };
    var oldTriggers = [];
    var newTrigger = null;

    if (next.enabled) {
      // Membuat jadwal memang membutuhkan scope script.scriptapp. Tangkap
      // error ini agar UI menampilkan langkah otorisasi yang spesifik.
      try {
        oldTriggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
          return trigger.getHandlerFunction() === 'runScheduledBackup';
        });
        var builder = ScriptApp.newTrigger('runScheduledBackup').timeBased();
        builder = next.frequency === 'weekly' ? builder.everyWeeks(1) : builder.everyDays(1);
        newTrigger = builder.atHour(2).inTimezone(Session.getScriptTimeZone()).create();
      } catch (triggerError) {
        throw this._backupTriggerPermissionError(triggerError);
      }
    }

    try {
      props.setProperty('BID_BACKUP_AUTOMATION_V1', JSON.stringify(next));
      props.setProperty('BID_BACKUP_TRIGGER_INSTALLED_V1', next.enabled ? 'true' : 'false');

      if (next.enabled) {
        oldTriggers.forEach(function(trigger) {
          if (!newTrigger || trigger.getUniqueId() !== newTrigger.getUniqueId()) {
            ScriptApp.deleteTrigger(trigger);
          }
        });
      } else {
        // Status config OFF sudah cukup untuk memastikan runner tidak membuat
        // snapshot. Penghapusan trigger lama bersifat best-effort agar proses
        // menonaktifkan backup tidak gagal hanya karena scope belum tersedia.
        try {
          ScriptApp.getProjectTriggers().filter(function(trigger) {
            return trigger.getHandlerFunction() === 'runScheduledBackup';
          }).forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
        } catch (cleanupError) {
          Logger.log('Backup dinonaktifkan; penghapusan trigger lama tertunda: ' +
            String(cleanupError && cleanupError.message ? cleanupError.message : cleanupError));
        }
      }
    } catch (error) {
      if (newTrigger) {
        try { ScriptApp.deleteTrigger(newTrigger); } catch (ignore) {}
      }
      try {
        if (previousValue) props.setProperty('BID_BACKUP_AUTOMATION_V1', previousValue);
        else props.deleteProperty('BID_BACKUP_AUTOMATION_V1');
        if (previousTriggerValue !== null) props.setProperty('BID_BACKUP_TRIGGER_INSTALLED_V1', previousTriggerValue);
        else props.deleteProperty('BID_BACKUP_TRIGGER_INSTALLED_V1');
      } catch (rollbackError) {}
      throw this._backupTriggerPermissionError(error);
    }

    AuditService.log(user.id, 'UPDATE', 'backup', null, null, null,
      next.enabled ? 'Backup otomatis ' + next.frequency + ', retensi ' + next.retention + ' snapshot.' : 'Backup otomatis dinonaktifkan.');
    return this.getBackupAutomation(payload, user);
  },

  readBackupSnapshot: function(payload, user) {
    checkPermission(user, 'settings:manage');
    var historyId = payload && typeof payload.historyId === 'string' ? payload.historyId : '';
    if (!historyId || historyId.length > 100) throw new Error('ID riwayat backup tidak valid.');
    var entry = this._getBackupHistory().find(function(item) {
      return item.id === historyId && item.status === 'success' && typeof item.fileId === 'string' && item.fileId;
    });
    if (!entry) throw new Error('Snapshot tidak ditemukan, telah kedaluwarsa oleh retensi, atau tidak dapat diunduh.');
    var file = DriveApp.getFileById(entry.fileId);
    if (file.isTrashed()) throw new Error('File backup telah dipindahkan ke sampah Google Drive.');
    if (file.getSize() > 50 * 1024 * 1024) throw new Error('File backup melebihi batas unduhan 50 MB.');
    var content = file.getBlob().getDataAsString('UTF-8');
    var backup;
    try { backup = JSON.parse(content); }
    catch (error) { throw new Error('File snapshot di Google Drive bukan JSON yang valid.'); }
    if (!backup || !backup._meta || backup._meta.complete !== true) {
      throw new Error('Snapshot di Google Drive tidak lengkap dan tidak dapat diunduh.');
    }
    return successResponse(backup);
  },

  runScheduledBackup: function() {
    var config = this._getBackupAutomationConfig();
    if (!config.enabled) return { status: 'skipped', reason: 'Backup otomatis dinonaktifkan.' };
    try {
      return this._storeBackupSnapshot('scheduled', 'SYSTEM');
    } catch (error) {
      AuditService.logError('runScheduledBackup',
        String(error && error.message ? error.message : error).slice(0, 300));
      throw error;
    }
  },

  /**
   * Restore aman: hanya admin settings:manage, manifest/skema divalidasi
   * ulang di server, users dan audit_logs dipertahankan, serta snapshot
   * dipakai untuk rollback apabila penulisan lintas-sheet gagal.
   */
  /**
   * Validasi payload restore di server. Sheet users dan audit_logs tidak pernah
   * diizinkan sebagai target oleh endpoint selektif ini.
   */
  _prepareRestoreRequest: function(payload, user) {
    checkPermission(user, 'settings:manage');
    var backup = payload && payload.backup;
    if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
      throw new Error('Payload backup harus berupa objek JSON.');
    }

    var serialized;
    try { serialized = JSON.stringify(backup); }
    catch (serializeError) { throw new Error('Backup tidak dapat diproses sebagai JSON.'); }
    if (!serialized || serialized.length > 15 * 1024 * 1024) {
      throw new Error('Ukuran payload restore melewati batas aman 15 MB. Gunakan backup yang lebih kecil.');
    }

    var sheetNames = Object.values(CONFIG.SHEETS);
    var protectedSheets = [CONFIG.SHEETS.USERS, CONFIG.SHEETS.AUDIT_LOGS];
    var allowedTargets = sheetNames.filter(function(name) {
      return protectedSheets.indexOf(name) === -1;
    });
    var meta = backup._meta;
    var backupKeys = Object.keys(backup);
    var failedSheets = meta && Array.isArray(meta.failedSheets) ? meta.failedSheets : null;

    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      throw new Error('Manifest _meta tidak ditemukan atau formatnya salah.');
    }
    if (meta.complete !== true || !failedSheets || failedSheets.length !== 0) {
      throw new Error('Restore ditolak karena manifest backup tidak lengkap atau memiliki sheet gagal dibaca.');
    }
    if (
      typeof meta.version !== 'string' || !meta.version.trim() ||
      typeof meta.generatedAt !== 'string' || !Number.isFinite(Date.parse(meta.generatedAt)) ||
      meta.sheetCount !== sheetNames.length ||
      !meta.counts || typeof meta.counts !== 'object' || Array.isArray(meta.counts)
    ) {
      throw new Error('Manifest backup tidak cocok dengan format yang didukung aplikasi.');
    }
    if (
      backupKeys.length !== sheetNames.length + 1 ||
      sheetNames.some(function(name) { return !Object.prototype.hasOwnProperty.call(backup, name); }) ||
      backupKeys.some(function(name) { return name !== '_meta' && sheetNames.indexOf(name) === -1; })
    ) {
      throw new Error('Daftar sheet pada backup tidak cocok dengan versi skema aplikasi ini.');
    }

    var countKeys = Object.keys(meta.counts);
    if (
      countKeys.length !== sheetNames.length ||
      sheetNames.some(function(name) { return !Object.prototype.hasOwnProperty.call(meta.counts, name); }) ||
      countKeys.some(function(name) { return sheetNames.indexOf(name) === -1; })
    ) {
      throw new Error('Daftar jumlah record pada manifest tidak cocok dengan daftar sheet backup.');
    }

    sheetNames.forEach(function(name) {
      var rows = backup[name];
      var count = meta.counts[name];
      if (
        !Array.isArray(rows) ||
        typeof count !== 'number' || !Number.isSafeInteger(count) ||
        count < 0 || rows.length !== count
      ) {
        throw new Error('Data sheet "' + name + '" tidak sesuai dengan jumlah record pada manifest.');
      }

      rows.forEach(function(record, index) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error('Record ke-' + (index + 1) + ' pada sheet "' + name + '" harus berupa objek.');
        }
        Object.keys(record).forEach(function(field) {
          var value = record[field];
          if (value !== null && typeof value !== 'string' &&
              typeof value !== 'number' && typeof value !== 'boolean') {
            throw new Error('Field "' + field + '" pada sheet "' + name + '" berisi nilai bertingkat yang tidak didukung.');
          }
          if (typeof value === 'number' && !Number.isFinite(value)) {
            throw new Error('Field "' + field + '" pada sheet "' + name + '" berisi angka tidak valid.');
          }
        });
      });
    });

    if (!payload || !Array.isArray(payload.selectedSheets) || !payload.selectedSheets.length) {
      throw new Error('Pilih minimal satu sheet untuk dipulihkan.');
    }
    var requested = Object.create(null);
    payload.selectedSheets.forEach(function(name) {
      if (typeof name !== 'string' || allowedTargets.indexOf(name) === -1) {
        throw new Error('Sheet "' + String(name) + '" tidak diizinkan untuk restore selektif.');
      }
      if (requested[name]) throw new Error('Sheet "' + name + '" terpilih lebih dari satu kali.');
      requested[name] = true;
    });

    var mode = payload.mode;
    if (mode !== 'merge' && mode !== 'replace') {
      throw new Error('Mode restore harus merge atau replace.');
    }
    var conflictStrategy = mode === 'merge' ? (payload.conflictStrategy || 'keepExisting') : 'none';
    if (mode === 'merge' && conflictStrategy !== 'keepExisting' &&
        conflictStrategy !== 'overwriteExisting') {
      throw new Error('Strategi konflik merge tidak dikenal.');
    }

    return {
      backup: backup,
      meta: meta,
      sheetNames: sheetNames,
      protectedSheets: protectedSheets,
      allowedTargets: allowedTargets,
      selectedSheets: allowedTargets.filter(function(name) { return requested[name]; }),
      mode: mode,
      conflictStrategy: conflictStrategy
    };
  },

  /**
   * Menyusun rencana tanpa menulis. Pratinjau dan eksekusi memakai builder
   * yang sama sehingga hitungan konflik dihitung ulang di server.
   */
  _prepareRestorePlans: function(context) {
    var plans = [];

    context.selectedSheets.forEach(function(name) {
      var sheet = getSheet(name);
      var headers = getHeaders(sheet);
      if (
        !headers.length ||
        headers.some(function(header) { return typeof header !== 'string' || !header.trim(); }) ||
        new Set(headers).size !== headers.length ||
        headers.indexOf('id') === -1
      ) {
        throw new Error('Header sheet "' + name + '" kosong, duplikat, atau tidak memiliki kolom id.');
      }

      var sourceRecords = context.backup[name];
      var seenSourceIds = Object.create(null);
      var sourceRows = sourceRecords.map(function(record, rowIndex) {
        var keys = Object.keys(record);
        if (
          keys.length !== headers.length ||
          headers.some(function(header) { return !Object.prototype.hasOwnProperty.call(record, header); }) ||
          keys.some(function(key) { return headers.indexOf(key) === -1; })
        ) {
          throw new Error(
            'Struktur record ke-' + (rowIndex + 1) + ' pada sheet "' + name +
            '" tidak cocok dengan header Spreadsheet. Tidak ada data yang ditulis.'
          );
        }

        var recordId = record.id === null || record.id === undefined ? '' : String(record.id).trim();
        if (!recordId) throw new Error('Record tanpa ID ditemukan pada sheet "' + name + '". Restore dibatalkan.');
        if (seenSourceIds[recordId]) {
          throw new Error('ID duplikat "' + recordId + '" ditemukan pada sheet "' + name + '". Restore dibatalkan.');
        }
        seenSourceIds[recordId] = true;

        return headers.map(function(header) {
          var value = record[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            // Cegah nilai backup dieksekusi sebagai formula Google Spreadsheet.
            return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
          }
          if (typeof value === 'number' && !Number.isFinite(value)) {
            throw new Error('Angka tidak valid pada sheet "' + name + '".');
          }
          if (typeof value !== 'number' && typeof value !== 'boolean') {
            throw new Error('Nilai field tidak didukung pada sheet "' + name + '".');
          }
          return value;
        });
      });

      var lastRow = sheet.getLastRow();
      var existingCount = Math.max(0, lastRow - 1);
      var currentValues = existingCount
        ? sheet.getRange(2, 1, existingCount, headers.length).getValues()
        : [];
      var currentFormulas = existingCount
        ? sheet.getRange(2, 1, existingCount, headers.length).getFormulas()
        : [];
      var idColumn = headers.indexOf('id');
      var currentIdToRow = Object.create(null);
      var duplicateCurrentIds = Object.create(null);

      currentValues.forEach(function(row, index) {
        var id = row[idColumn] === null || row[idColumn] === undefined ? '' : String(row[idColumn]).trim();
        if (!id) return;
        if (Object.prototype.hasOwnProperty.call(currentIdToRow, id)) duplicateCurrentIds[id] = true;
        else currentIdToRow[id] = index + 2;
      });
      if (context.mode === 'merge' && Object.keys(duplicateCurrentIds).length) {
        throw new Error(
          'Sheet "' + name + '" memiliki ID saat ini yang duplikat (' +
          Object.keys(duplicateCurrentIds).slice(0, 5).join(', ') +
          '). Perbaiki duplikasi sebelum menggunakan mode gabungkan data.'
        );
      }

      var updates = [];
      var appendedRows = [];
      var added = 0;
      var updated = 0;
      var skipped = 0;
      var deleted = context.mode === 'replace' ? currentValues.length : 0;

      if (context.mode === 'replace') {
        added = sourceRows.length;
      } else {
        sourceRows.forEach(function(row, index) {
          var id = String(sourceRecords[index].id).trim();
          if (!Object.prototype.hasOwnProperty.call(currentIdToRow, id)) {
            appendedRows.push(row);
            added++;
          } else if (context.conflictStrategy === 'overwriteExisting') {
            updates.push({ rowIndex: currentIdToRow[id], values: row });
            updated++;
          } else {
            skipped++;
          }
        });
      }

      plans.push({
        name: name,
        sheet: sheet,
        headers: headers,
        sourceRows: sourceRows,
        currentValues: currentValues,
        currentFormulas: currentFormulas,
        lastRow: Math.max(lastRow, 1),
        updates: updates,
        appendedRows: appendedRows,
        added: added,
        updated: updated,
        skipped: skipped,
        deleted: deleted,
        finalRecords: context.mode === 'replace' ? sourceRows.length : currentValues.length + added
      });
    });

    return plans;
  },

  _restoreFingerprint: function(plans) {
    var state = plans.map(function(plan) {
      return {
        name: plan.name,
        headers: plan.headers,
        values: plan.currentValues,
        formulas: plan.currentFormulas
      };
    });
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(state),
      Utilities.Charset.UTF_8
    );
    return digest.map(function(byte) {
      return ('0' + (byte & 255).toString(16)).slice(-2);
    }).join('');
  },

  previewRestore: function(payload, user) {
    var context = this._prepareRestoreRequest(payload, user);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('Pratinjau tidak dapat dihitung karena ada proses penulisan lain. Coba lagi.');
    }

    try {
      var plans = this._prepareRestorePlans(context);
      var sheets = plans.map(function(plan) {
        return {
          sheetName: plan.name,
          backupRecords: plan.sourceRows.length,
          currentRecords: plan.currentValues.length,
          added: plan.added,
          updated: plan.updated,
          skipped: plan.skipped,
          deleted: plan.deleted,
          finalRecords: plan.finalRecords
        };
      });
      return successResponse({
        fingerprint: this._restoreFingerprint(plans),
        mode: context.mode,
        conflictStrategy: context.conflictStrategy,
        selectedSheets: context.selectedSheets,
        sheets: sheets,
        totals: sheets.reduce(function(total, item) {
          total.backupRecords += item.backupRecords;
          total.currentRecords += item.currentRecords;
          total.added += item.added;
          total.updated += item.updated;
          total.skipped += item.skipped;
          total.deleted += item.deleted;
          total.finalRecords += item.finalRecords;
          return total;
        }, { backupRecords: 0, currentRecords: 0, added: 0, updated: 0, skipped: 0, deleted: 0, finalRecords: 0 }),
        generatedAt: now()
      });
    } finally {
      lock.releaseLock();
    }
  },

  restoreBackup: function(payload, user) {
    var context = this._prepareRestoreRequest(payload, user);
    var expectedConfirmation = context.mode === 'replace' ? 'GANTI' : 'GABUNGKAN';
    if (!payload || payload.confirmation !== expectedConfirmation) {
      throw new Error('Konfirmasi tidak sesuai dengan mode pemulihan. Ketik ' + expectedConfirmation + ' lalu ulangi.');
    }
    if (typeof payload.expectedFingerprint !== 'string' || !payload.expectedFingerprint.trim()) {
      throw new Error('Pratinjau restore wajib dijalankan ulang sebelum menulis data.');
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('Restore tidak dapat dimulai karena ada proses lain yang sedang mengubah data. Coba lagi.');
    }

    var plans = [];
    var attempted = [];

    function replaceRows(sheet, headers, rows) {
      var requiredLastRow = rows.length + 1;
      var maxRows = sheet.getMaxRows();
      if (maxRows < requiredLastRow) sheet.insertRowsAfter(maxRows, requiredLastRow - maxRows);
      var lastToClear = Math.max(sheet.getLastRow(), requiredLastRow);
      if (lastToClear > 1) sheet.getRange(2, 1, lastToClear - 1, headers.length).clearContent();
      if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    function applyMerge(plan) {
      // Hanya update ID bentrok jika strategi overwrite dipilih. Record lain
      // tidak disentuh sehingga formula dan nilai yang ada tetap terjaga.
      var updates = plan.updates.slice().sort(function(a, b) { return a.rowIndex - b.rowIndex; });
      var index = 0;
      while (index < updates.length) {
        var group = [updates[index]];
        var next = index + 1;
        while (next < updates.length && updates[next].rowIndex === group[group.length - 1].rowIndex + 1) {
          group.push(updates[next]);
          next++;
        }
        plan.sheet.getRange(group[0].rowIndex, 1, group.length, plan.headers.length)
          .setValues(group.map(function(item) { return item.values; }));
        index = next;
      }

      if (plan.appendedRows.length) {
        var startRow = plan.lastRow + 1;
        var requiredLastRow = startRow + plan.appendedRows.length - 1;
        var maxRows = plan.sheet.getMaxRows();
        if (maxRows < requiredLastRow) plan.sheet.insertRowsAfter(maxRows, requiredLastRow - maxRows);
        plan.sheet.getRange(startRow, 1, plan.appendedRows.length, plan.headers.length)
          .setValues(plan.appendedRows);
      }
    }

    try {
      plans = this._prepareRestorePlans(context);
      var actualFingerprint = this._restoreFingerprint(plans);
      if (actualFingerprint !== payload.expectedFingerprint) {
        throw new Error(
          'Data pada Spreadsheet berubah setelah pratinjau dibuat. Tidak ada data yang ditulis. Hitung pratinjau baru sebelum melanjutkan.'
        );
      }

      try {
        plans.forEach(function(plan) {
          attempted.push(plan.name);
          if (context.mode === 'replace') replaceRows(plan.sheet, plan.headers, plan.sourceRows);
          else applyMerge(plan);
        });
      } catch (writeError) {
        var rollbackErrors = [];
        attempted.slice().reverse().forEach(function(name) {
          try {
            var plan = plans.find(function(item) { return item.name === name; });
            replaceRows(plan.sheet, plan.headers, plan.currentValues);
            plan.currentFormulas.forEach(function(row, rowIndex) {
              row.forEach(function(formula, columnIndex) {
                if (formula) plan.sheet.getRange(rowIndex + 2, columnIndex + 1).setFormula(formula);
              });
            });
          } catch (rollbackError) {
            rollbackErrors.push(name + ': ' + (rollbackError && rollbackError.message ? rollbackError.message : String(rollbackError)));
          }
        });
        if (rollbackErrors.length) {
          throw new Error(
            'Restore gagal dan rollback tidak tuntas untuk: ' + rollbackErrors.join('; ') +
            '. Jangan ulangi restore; periksa Spreadsheet dan buat backup kondisi saat ini.'
          );
        }
        throw new Error(
          'Restore gagal saat menulis data. Backend telah mencoba mengembalikan sheet yang tersentuh ke kondisi sebelumnya. Detail: ' +
          (writeError && writeError.message ? writeError.message : String(writeError))
        );
      }

      var counts = {};
      var restoredSheets = [];
      var totalRecords = 0;
      plans.forEach(function(plan) {
        restoredSheets.push(plan.name);
        counts[plan.name] = {
          added: plan.added,
          updated: plan.updated,
          skipped: plan.skipped,
          deleted: plan.deleted,
          finalRecords: plan.finalRecords
        };
        totalRecords += plan.added + plan.updated;
      });

      try {
        CacheService.getScriptCache().removeAll([
          'students_all', 'students_stats', 'students_completeness', 'reports_intelligence'
        ]);
      } catch (cacheError) {
        Logger.log('Restore berhasil, tetapi invalidasi cache tidak tuntas: ' +
          (cacheError && cacheError.message ? cacheError.message : String(cacheError)));
      }

      AuditService.log(
        user.id, 'RESTORE', 'settings', null, null, null,
        'Restore backup JSON (' + context.mode + '); ' + restoredSheets.length +
          ' sheet terpilih; users dan audit_logs dipertahankan'
      );

      return successResponse({
        restoredAt: now(),
        mode: context.mode,
        conflictStrategy: context.conflictStrategy,
        restoredSheets: restoredSheets,
        preservedSheets: context.protectedSheets,
        unselectedSheets: context.allowedTargets.filter(function(name) {
          return context.selectedSheets.indexOf(name) === -1;
        }),
        counts: counts,
        totalRecords: totalRecords
      });
    } finally {
      lock.releaseLock();
    }
  },
};

/** Dipanggil oleh time-driven trigger Apps Script; status aktif dicek ulang di backend. */
/**
 * Jalankan sekali dari editor Apps Script setelah menambahkan scope
 * https://www.googleapis.com/auth/script.scriptapp pada appsscript.json.
 * Fungsi ini hanya membaca trigger dan tidak membuat atau menghapus jadwal.
 */
function authorizeBackupAutomationAccess() {
  ScriptApp.getProjectTriggers();
  return 'Izin pengelolaan trigger Apps Script sudah tersedia.';
}

function runScheduledBackup() {
  return SettingsHandler.runScheduledBackup();
}

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
