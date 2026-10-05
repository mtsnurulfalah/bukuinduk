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

  // Buat akun admin default jika belum ada
  _createDefaultAdmin(ss);

  Logger.log('Setup selesai!');
  return 'Setup berhasil.';
}

function _createDefaultAdmin(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  // Cek apakah sudah ada user
  if (data.length > 1) {
    Logger.log('Admin sudah ada, skip pembuatan.');
    return;
  }

  var id = generateUUID();
  var admin = [
    id,                         // id
    'admin',                    // username
    'Administrator',            // fullName
    'admin@sekolah.id',         // email
    'admin',                    // role
    hashPassword('Admin@12345'), // passwordHash
    true,                       // isActive
    '',                         // teacherId
    '',                         // avatarUrl
    '',                         // lastLogin
    '',                         // passwordChangedAt
    now(),                      // createdAt
    now(),                      // updatedAt
    '',                         // createdBy
  ];

  sheet.appendRow(admin);
  Logger.log('Admin default dibuat. Username: admin | Password: Admin@12345');
  Logger.log('PENTING: Segera ubah password default setelah login pertama!');
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
