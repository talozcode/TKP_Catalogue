/** Sheet name constants — change here if you ever rename a tab. */
var SHEETS = {
  PRODUCTS:   'Products',
  CATALOGUES: 'Catalogues',
  ITEMS:      'Catalogue_Items',
  SOURCES:    'Catalogue_Sources',
  METADATA:   'App_Metadata'
};

function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function ensureSheet_(name, headers) {
  var ss = spreadsheet_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Returns { headerName: zeroBasedIndex } from the first row. */
function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim();
    if (h) map[h] = i;
  }
  return map;
}

/** Read all data rows of a sheet as objects keyed by header name. */
function readAll_(sheetName) {
  var sh = getSheet_(sheetName);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values.shift();
  return values.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim();
      if (h) obj[h] = row[i];
    }
    return obj;
  });
}

/** Append a row using a header map; missing fields become ''. */
function appendByHeaders_(sheetName, obj) {
  var sh = getSheet_(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    var key = String(h || '').trim();
    return key in obj ? obj[key] : '';
  });
  sh.appendRow(row);
}

/** Delete every data row whose value in `keyHeader` equals `keyValue`. */
function deleteRowsWhere_(sheetName, keyHeader, keyValue) {
  var sh = getSheet_(sheetName);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  var headerMap = getHeaderMap_(sh);
  var idx = headerMap[keyHeader];
  if (idx === undefined) throw new Error('Header missing: ' + keyHeader);
  var values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  var deleted = 0;
  // Delete from bottom to top so indices stay valid.
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idx]) === String(keyValue)) {
      sh.deleteRow(i + 2);
      deleted++;
    }
  }
  return deleted;
}

function setMetadata_(key, value) {
  var sh = getSheet_(SHEETS.METADATA);
  var data = readAll_(SHEETS.METADATA);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i].key) === String(key)) {
      sh.getRange(i + 2, getHeaderMap_(sh).value + 1).setValue(value);
      return;
    }
  }
  appendByHeaders_(SHEETS.METADATA, { key: key, value: value });
}

function getMetadataValue_(key) {
  var data = readAll_(SHEETS.METADATA);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i].key) === String(key)) return data[i].value;
  }
  return null;
}

function requireToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) throw new Error('Server not configured: API_TOKEN missing');
  if (!token || String(token) !== String(expected)) throw new Error('Unauthorized');
}

function nowIso_() { return new Date().toISOString(); }

function uuid_() { return Utilities.getUuid(); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Split a tag cell — supports comma, semicolon, or newline separated values. */
function splitTags_(value) {
  if (value == null) return [];
  return String(value).split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}
