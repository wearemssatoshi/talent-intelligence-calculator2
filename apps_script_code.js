function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = e.parameter;

  // Get headers from the first row
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Prepare a new row based on headers
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    newRow.push(data[headers[i]] || ''); // Use header as key, if not found, push empty string
  }

  // Append the new row to the sheet
  sheet.appendRow(newRow);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': newRow }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doGet - データ取得用
 * Usage: 
 *   ?action=list - 全スタッフ名リスト
 *   ?action=getStaffData - Dashboard用全スタッフデータ
 *   ?action=search&name=スタッフ名 - 名前で検索
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var action = e.parameter.action || 'search';

  // レスポンス作成関数
  function createResponse(content) {
    return ContentService.createTextOutput(JSON.stringify(content))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ヘッダー名取得のヘルパー（複数候補に対応）
  function findHeaderIndex(candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var idx = headers.indexOf(candidates[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // 共通のヘッダーインデックス
  var nameIndex = findHeaderIndex(['Name', 'user-name', 'name']);
  var affiliationIndex = findHeaderIndex(['Affiliation', 'user-affiliation', 'affiliation']);
  var jobTitleIndex = findHeaderIndex(['JobTitle', 'user-job-title', 'jobTitle']);
  var typeIndex = findHeaderIndex(['TypeSelf', 'user-type-self', 'type']);
  var scoreIndex = findHeaderIndex(['TotalScore', 'totalScore', 'score']);
  var meisterIndex = findHeaderIndex(['MeisterRank', 'meisterRank']);
  var qualIndex = findHeaderIndex(['Qualifications', 'qualifications']);

  // 全スタッフ名リストを取得
  if (action === 'list') {
    var names = [];
    for (var i = 1; i < data.length; i++) {
      var name = nameIndex !== -1 ? data[i][nameIndex] : null;
      if (name && names.indexOf(name) === -1) {
        names.push(name);
      }
    }
    return createResponse({ 'result': 'success', 'names': names.sort() });
  }

  // Dashboard用：全スタッフデータを取得
  if (action === 'getStaffData') {
    var staffList = [];
    var skillKeys = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 's1', 's2', 's3', 's4', 's5', 's6', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
    var skillIndices = skillKeys.map(function (key) { return headers.indexOf(key); });

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var name = nameIndex !== -1 ? row[nameIndex] : null;
      if (!name) continue;

      var detailedScores = skillIndices.map(function (idx) {
        return idx !== -1 ? (parseInt(row[idx]) || 0) : 0;
      });

      staffList.push({
        name: name,
        affiliation: affiliationIndex !== -1 ? row[affiliationIndex] : '',
        jobTitle: jobTitleIndex !== -1 ? row[jobTitleIndex] : '',
        type: typeIndex !== -1 ? row[typeIndex] : 'Balance',
        score: scoreIndex !== -1 ? row[scoreIndex] : 0,
        meisterRank: meisterIndex !== -1 ? row[meisterIndex] : 'Rookie',
        qualifications: qualIndex !== -1 ? row[qualIndex] : '',
        detailedScores: detailedScores
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ 'status': 'success', 'data': staffList }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 名前で検索
  var searchName = e.parameter.name;
  if (!searchName) {
    return createResponse({ 'result': 'error', 'message': 'Name parameter is required' });
  }

  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (nameIndex !== -1 && data[i][nameIndex] === searchName) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      results.push(row);
    }
  }

  results.sort(function (a, b) {
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  });

  return createResponse({ 'result': 'success', 'count': results.length, 'data': results });
}
