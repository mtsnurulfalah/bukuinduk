// ============================================================
// Setup.gs — Inisialisasi spreadsheet
// Jalankan fungsi setupSpreadsheet() SEKALI saat pertama deploy.
// ============================================================

function setupSpreadsheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  var sheetDefs = [
    {
      name: CONFIG.SHEETS.USERS,
      headers: ['id','username','fullName','email','role','passwordHash','isActive',
                'teacherId','avatarUrl','lastLogin','passwordChangedAt','createdAt','updatedAt','createdBy'],
    },
    {
      name: CONFIG.SHEETS.STUDENTS,
      headers: ['id','nis','nisn','nik','fullName','nickname','gender','birthPlace','birthDate',
                'religion','nationality','familyStatus','childOrder','siblingsCount',
                'address','rtRw','village','district','city','province','postalCode',
                'phone','email','status','entryDate','exitDate','exitReason',
                'photoUrl','notes','createdAt','updatedAt','createdBy'],
    },
    {
      name: CONFIG.SHEETS.PARENTS,
      headers: ['id','studentId','relationship','fullName','nik','birthPlace','birthDate',
                'religion','education','occupation','incomeRange','phone','address',
                'isAlive','createdAt','updatedAt'],
    },
    {
      name: CONFIG.SHEETS.HEALTH,
      headers: ['id','studentId','bloodType','heightCm','weightKg','specialNeeds',
                'healthNotes','allergies','createdAt','updatedAt'],
    },
    {
      name: CONFIG.SHEETS.EDUCATION,
      headers: ['id','studentId','level','schoolName','graduationYear',
                'certificateNumber','participantNumber','createdAt'],
    },
    {
      name: CONFIG.SHEETS.ENROLLMENTS,
      headers: ['id','studentId','classroomId','schoolYearId','entryDate','exitDate',
                'status','notes','createdAt'],
    },
    {
      name: CONFIG.SHEETS.TEACHERS,
      headers: ['id','userId','nip','nuptk','fullName','gender','birthPlace','birthDate',
                'religion','address','phone','email','educationLevel','major','status',
                'joinDate','photoUrl','createdAt','updatedAt'],
    },
    {
      name: CONFIG.SHEETS.CLASSROOMS,
      headers: ['id','name','gradeId','schoolYearId','homeroomTeacherId','capacity',
                'isActive','createdAt'],
    },
    {
      name: CONFIG.SHEETS.GRADES,
      headers: ['id','name','level','description','createdAt'],
    },
    {
      name: CONFIG.SHEETS.SCHOOL_YEARS,
      headers: ['id','name','startDate','endDate','isActive','createdAt'],
    },
    {
      name: CONFIG.SHEETS.SETTINGS,
      headers: ['id','key','value','description','updatedAt'],
    },
    {
      name: CONFIG.SHEETS.AUDIT_LOGS,
      headers: ['id','userId','userName','action','resourceType','resourceId',
                'description','oldValues','newValues','createdAt'],
    },
    {
      name: CONFIG.SHEETS.VERIFICATIONS,
      headers: ['id','studentId','section','label','status','verifiedBy','verifiedAt','notes'],
    },
    {
      name: CONFIG.SHEETS.DOCUMENTS,
      headers: ['id','studentId','documentType','documentName','documentNumber','fileUrl',
                'status','notes','createdAt','updatedAt','createdBy'],
    },
    {
      name: CONFIG.SHEETS.SUBJECTS,
      headers: ['id','schoolYearId','code','name','shortName','groupName','isActive','sortOrder',
                'createdAt','updatedAt','createdBy'],
    },
    {
      name: CONFIG.SHEETS.SCORES,
      headers: ['id','studentId','schoolYearId','semester','subjectId','score','predicate','notes',
                'createdAt','updatedAt','createdBy'],
    },
  ];

  sheetDefs.forEach(function(def) {
    var existing = ss.getSheetByName(def.name);
    if (!existing) {
      var sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      // Format header
      sheet.getRange(1, 1, 1, def.headers.length)
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
      Logger.log('Sheet dibuat: ' + def.name);
    } else {
      Logger.log('Sheet sudah ada: ' + def.name);
    }
  });

  // Jangan pernah membuat akun dengan kredensial default yang tertanam di source code.
  // Untuk instalasi baru, gunakan bootstrapInitialAdmin() setelah mengatur Script Properties.
  Logger.log('Setup selesai. Tidak ada kredensial admin default yang dibuat.');
  return 'Setup berhasil. Jika instalasi baru, atur INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, dan INITIAL_ADMIN_PASSWORD di Script Properties, lalu jalankan bootstrapInitialAdmin().';
}

/**
 * Membuat admin pertama tanpa kredensial bawaan yang tertanam di repository.
 *
 * Sebelum menjalankan fungsi ini, atur Script Properties berikut:
 * INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD.
 * Password minimal 16 karakter. Rahasia dihapus setelah operasi berhasil.
 */
function bootstrapInitialAdmin() {
  var credentials = _readAdminProvisioningProperties(true);
  var sheet = getSheet(CONFIG.SHEETS.USERS);
  var headers = getHeaders(sheet);
  var users = sheetToObjects(sheet);

  if (users.length > 0) {
    _clearAdminProvisioningProperties();
    return 'Bootstrap dibatalkan: sheet pengguna sudah berisi akun. Rahasia provisioning yang tersimpan telah dihapus.';
  }

  var requiredHeaders = ['id', 'username', 'fullName', 'email', 'role', 'passwordHash', 'isActive'];
  var missing = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });
  if (missing.length) {
    throw new Error('Header sheet users belum lengkap. Jalankan setupSpreadsheet() terlebih dahulu.');
  }

  var timestamp = now();
  var admin = {
    id: generateUUID(),
    username: credentials.username,
    fullName: 'Administrator',
    email: credentials.email,
    role: 'admin',
    passwordHash: hashPassword(credentials.password),
    isActive: true,
    teacherId: '',
    avatarUrl: '',
    lastLogin: '',
    passwordChangedAt: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: ''
  };

  appendRow(sheet, admin, headers);
  _clearAdminProvisioningProperties();
  Logger.log('Admin awal dibuat. Kredensial tidak dicatat ke log.');
  return 'Admin awal berhasil dibuat untuk username yang dikonfigurasi. Password tidak ditampilkan atau dicatat.';
}

/**
 * Rotasi password admin untuk instalasi yang sudah memiliki akun.
 * Fungsi ini hanya dapat dijalankan oleh editor project GAS yang berwenang.
 * Atur INITIAL_ADMIN_USERNAME dan INITIAL_ADMIN_PASSWORD sebelum menjalankannya.
 */
function rotateAdminPassword() {
  var credentials = _readAdminProvisioningProperties(false);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var users = sheetToObjects(sheet);
    var target = users.find(function(u) {
      return String(u.username || '').trim().toLowerCase() === credentials.username &&
        String(u.role || '').trim().toLowerCase() === 'admin';
    });
    if (!target) {
      throw new Error('Akun admin tujuan tidak ditemukan. Periksa INITIAL_ADMIN_USERNAME.');
    }

    var row = findRowById(sheet, target.id);
    if (row < 2) throw new Error('Baris akun admin tidak valid.');

    var passwordColumn = ensureHeader(sheet, 'passwordHash');
    var changedColumn = ensureHeader(sheet, 'passwordChangedAt');
    var updatedColumn = ensureHeader(sheet, 'updatedAt');
    var changedAt = Math.floor(Date.now() / 1000);

    sheet.getRange(row, passwordColumn).setValue(hashPassword(credentials.password));
    sheet.getRange(row, changedColumn).setValue(changedAt);
    sheet.getRange(row, updatedColumn).setValue(now());

    _clearAdminProvisioningProperties();
    Logger.log('Password admin berhasil dirotasi. Nilai password tidak dicatat ke log.');
    return 'Password admin berhasil dirotasi. Silakan login menggunakan password baru.';
  } finally {
    lock.releaseLock();
  }
}

function _readAdminProvisioningProperties(requireEmail) {
  var props = PropertiesService.getScriptProperties();
  var username = String(props.getProperty('INITIAL_ADMIN_USERNAME') || '').trim().toLowerCase();
  var email = String(props.getProperty('INITIAL_ADMIN_EMAIL') || '').trim().toLowerCase();
  var password = String(props.getProperty('INITIAL_ADMIN_PASSWORD') || '');

  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error('INITIAL_ADMIN_USERNAME wajib 3–64 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.');
  }
  if (requireEmail && (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error('INITIAL_ADMIN_EMAIL wajib diisi dengan alamat email yang valid.');
  }
  if (password.length < 16 || password.length > 256) {
    throw new Error('INITIAL_ADMIN_PASSWORD wajib 16–256 karakter. Gunakan password manager untuk membuat password unik.');
  }

  return { username: username, email: email, password: password };
}

function _clearAdminProvisioningProperties() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('INITIAL_ADMIN_USERNAME');
  props.deleteProperty('INITIAL_ADMIN_EMAIL');
  props.deleteProperty('INITIAL_ADMIN_PASSWORD');
}

// Jalankan untuk cek koneksi ke spreadsheet
function testConnection() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log('Koneksi OK: ' + ss.getName());
    return 'OK: ' + ss.getName();
  } catch(e) {
    Logger.log('Koneksi GAGAL: ' + e.message);
    return 'GAGAL: ' + e.message;
  }
}
