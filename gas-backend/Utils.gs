// ============================================================
// Utils.gs — Helper functions
// ============================================================

// ── UUID ─────────────────────────────────────────────────────
function generateUUID() {
  return Utilities.getUuid();
}

// ── Response helpers ─────────────────────────────────────────
function createResponse(status, data, error) {
  var body = { status: status };
  if (data !== undefined)  body.data    = data;
  if (error !== undefined) body.error   = error;

  var output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

function successResponse(data) {
  return createResponse(200, data);
}

function errorResponse(status, message) {
  return createResponse(status, undefined, message);
}

// ── Normalisasi nilai Spreadsheet ─────────────────────────────
function normalizeBoolean(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback === undefined ? false : fallback;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  var normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'ya') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'tidak') return false;
  return Boolean(value);
}

function normalizeIdentifier(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// ── Password hashing (SHA-256 + salt) ────────────────────────
function _generateSalt() {
  // BUG-33 FIX: Gunakan Utilities.getUuid() sebagai sumber entropy yang lebih baik
  // daripada Math.random() yang tidak cryptographically secure.
  // UUID v4 mengandung 122 bit random entropy — jauh lebih baik dari 64 bit Math.random().
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function hashPassword(password) {
  var salt   = _generateSalt();
  var salted = salt + ':' + password;
  var bytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salted);
  var hash   = bytes.map(function(b) {
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
  return salt + ':' + hash;
}

function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash || String(storedHash).indexOf(':') === -1) return false;
  var parts = String(storedHash).split(':');
  if (parts.length !== 2) return false;
  var salt = parts[0];
  var salted = salt + ':' + plainPassword;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salted);
  var hash = bytes.map(function(b) {
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
  return hash === parts[1];
}

// ── JWT (HMAC-SHA256 tanpa library eksternal) ────────────────
function base64UrlEncode(str) {
  return Utilities.base64EncodeWebSafe(str).replace(/=+$/, '');
}

function generateJWT(payload) {
  var header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  var now = Math.floor(Date.now() / 1000);
  payload.iat = now;
  payload.exp = now + CONFIG.JWT_EXPIRES_IN;
  var body = base64UrlEncode(JSON.stringify(payload));
  var data = header + '.' + body;
  var sig = base64UrlEncode(
    Utilities.computeHmacSha256Signature(data, CONFIG.JWT_SECRET)
      .map(function(b) { return String.fromCharCode(b < 0 ? b + 256 : b); })
      .join('')
  );
  return data + '.' + sig;
}

function verifyJWT(token) {
  if (!token) return null;
  try {
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var data = parts[0] + '.' + parts[1];
    var expectedSig = base64UrlEncode(
      Utilities.computeHmacSha256Signature(data, CONFIG.JWT_SECRET)
        .map(function(b) { return String.fromCharCode(b < 0 ? b + 256 : b); })
        .join('')
    );
    if (expectedSig !== parts[2]) return null;
    // BUG-35 FIX: Hitung padding base64 yang tepat berdasarkan panjang string.
    var base64Str = parts[1];
    var padLen = (4 - base64Str.length % 4) % 4;
    var padded = base64Str + '='.repeat(padLen);
    var payload = JSON.parse(
      Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString()
    );
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    // BUG-46 FIX: Validasi token tidak diterbitkan sebelum password terakhir diubah.
    // Cek passwordChangedAt dari user record di sheet — jika iat < passwordChangedAt, token lama.
    if (!payload.id) return null;
    var users = sheetToObjects(getSheet(CONFIG.SHEETS.USERS));
    var u = users.find(function(x) { return String(x.id) === String(payload.id); });
    if (!u) return null;
    if (!normalizeBoolean(u.isActive, false)) return null;

    if (u.passwordChangedAt) {
      var changedAt = Number(u.passwordChangedAt);
      if (!Number.isFinite(changedAt)) {
        var parsedChangedAt = new Date(String(u.passwordChangedAt)).getTime();
        changedAt = Number.isFinite(parsedChangedAt) ? Math.floor(parsedChangedAt / 1000) : 0;
      }
      if (changedAt && payload.iat < changedAt) return null;
    }

    // Sheet menjadi sumber kebenaran untuk role/profil agar perubahan role
    // atau teacherId berlaku segera tanpa menunggu JWT lama kadaluarsa.
    payload.username = u.username || payload.username || '';
    payload.fullName = u.fullName || payload.fullName || '';
    payload.email = u.email || payload.email || '';
    payload.role = u.role || payload.role;
    payload.teacherId = u.teacherId || null;
    payload.isActive = true;
    return payload;
  } catch (e) {
    return null;
  }
}

// ── Spreadsheet helpers ───────────────────────────────────────
function getSheet(name) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan.');
  return sheet;
}

/**
 * Ambil sheet administrasi atau buat otomatis jika belum tersedia.
 * Ini menjaga fitur baru tetap mudah diadopsi tanpa harus membuat
 * dua sheet tambahan secara manual terlebih dahulu.
 */
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  if (headers && headers.length) {
    var existingHeaders = getHeaders(sheet);
    var missing = headers.filter(function(header) {
      return existingHeaders.indexOf(header) === -1;
    });
    if (missing.length) {
      var startColumn = existingHeaders.length + 1;
      sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
      sheet.getRange(1, startColumn, 1, missing.length)
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      // Google Sheets getValues() mengembalikan Date object untuk sel bertipe Date/DateTime.
      // Konversi eksplisit ke string ISO agar:
      // 1. Konsisten antara cache hit (JSON.parse → string) dan cache miss (Date object)
      // 2. Tidak ada off-by-one day akibat UTC offset saat JSON.stringify(Date) mengubah
      //    tengah malam WIB (00:00 +07:00) menjadi "T17:00:00.000Z" hari sebelumnya
      // 3. parseISO() di frontend dapat mem-parse dengan benar
      if (val instanceof Date) {
        var y   = val.getFullYear();
        var mo  = ('0' + (val.getMonth() + 1)).slice(-2);
        var d   = ('0' + val.getDate()).slice(-2);
        var hr  = val.getHours();
        var min = val.getMinutes();
        var sec = val.getSeconds();
        if (hr === 0 && min === 0 && sec === 0) {
          // Tanggal saja (birthDate, entryDate, dll.) — simpan sebagai yyyy-MM-dd
          val = y + '-' + mo + '-' + d;
        } else {
          // Datetime dengan waktu (createdAt, updatedAt) — simpan sebagai ISO full
          val = y + '-' + mo + '-' + d + 'T'
              + ('0' + hr).slice(-2) + ':'
              + ('0' + min).slice(-2) + ':'
              + ('0' + sec).slice(-2);
        }
      } else if (val === '' || val === null || val === undefined) {
        val = null;
      }
      obj[h] = val;
    });
    return obj;
  });
}

// Bantu CRUD menangani variasi nama header yang sudah terlanjur dipakai
// pada spreadsheet. Nama kanonis di frontend tetap camelCase.
function _valueForHeader(obj, header) {
  // Saat objek hasil merge memuat nilai lama dengan nama header typo dan nilai
  // baru dengan nama kanonis, nilai kanonis harus menang untuk proses update.
  var preferred = {
    addres: 'address',
    endryDate: 'entryDate',
    HealthNotes: 'healthNotes',
    studentID: 'studentId'
  };
  var canonical = preferred[header];
  if (canonical && obj && obj[canonical] !== undefined) return obj[canonical];
  if (obj && obj[header] !== undefined) return obj[header];

  var aliases = {
    address: ['addres'],
    addres: ['address'],
    entryDate: ['endryDate'],
    endryDate: ['entryDate'],
    healthNotes: ['HealthNotes'],
    HealthNotes: ['healthNotes'],
    studentId: ['studentID'],
    studentID: ['studentId']
  };
  var candidates = aliases[header] || [];
  for (var i = 0; i < candidates.length; i++) {
    if (obj && obj[candidates[i]] !== undefined) return obj[candidates[i]];
  }
  return '';
}

function appendRow(sheet, obj, headers) {
  var row = headers.map(function(h) { return _valueForHeader(obj, h); });
  sheet.appendRow(row);
}

function updateRow(sheet, rowIndex, obj, headers) {
  // rowIndex: 1-based (row 1 = header, row 2 = first data)
  var row = headers.map(function(h) { return _valueForHeader(obj, h); });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function getHeaders(sheet) {
  var data = sheet.getDataRange().getValues();
  return data.length > 0 ? data[0] : [];
}

function ensureHeader(sheet, header) {
  var headers = getHeaders(sheet);
  var index = headers.indexOf(header);
  if (index >= 0) return index + 1;
  var column = headers.length + 1;
  sheet.getRange(1, column).setValue(header);
  return column;
}

function findRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-based
  }
  return -1;
}

// ── Pagination helper ─────────────────────────────────────────
function paginate(items, page, limit) {
  var p = Math.max(1, parseInt(page) || 1);
  var l = Math.max(1, parseInt(limit) || 20);
  var start = (p - 1) * l;
  // BUG-36 FIX: totalPages minimum 0 (konsisten); frontend yang normalkan ke min 1 via Math.max.
  return {
    items: items.slice(start, start + l),
    total: items.length,
    page: p,
    limit: l,
    totalPages: items.length > 0 ? Math.ceil(items.length / l) : 0
  };
}

// ── Search helper ─────────────────────────────────────────────
function searchInObject(obj, query, fields) {
  if (!query) return true;
  var q = query.toString().toLowerCase();
  return fields.some(function(f) {
    var val = obj[f];
    return val && val.toString().toLowerCase().indexOf(q) !== -1;
  });
}

// ── Timestamp ─────────────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

// ── Cache helpers ─────────────────────────────────────────────
function cacheGet(key) {
  var val = CacheService.getScriptCache().get(key);
  if (!val) return null;
  try { return JSON.parse(val); } catch(e) { return null; }
}

function cacheSet(key, data, ttl) {
  CacheService.getScriptCache().put(key, JSON.stringify(data), ttl || 300);
}

function cacheRemove(key) {
  CacheService.getScriptCache().remove(key);
}
