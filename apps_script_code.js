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
 * doGet - スタッフ名で検索して過去の診断データを取得
 * Usage: [GAS URL]?action=search&name=スタッフ名
 *        [GAS URL]?action=list (全スタッフ名リストを取得)
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var action = e.parameter.action || 'search';

  // CORS対応のレスポンス作成関数
  function createResponse(content) {
    return ContentService.createTextOutput(JSON.stringify(content))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 全スタッフ名リストを取得
  if (action === 'list') {
    var nameIndex = headers.indexOf('user-name');
    var names = [];
    for (var i = 1; i < data.length; i++) {
      var name = data[i][nameIndex];
      if (name && names.indexOf(name) === -1) {
        names.push(name);
      }
    }
    return createResponse({ 'result': 'success', 'names': names.sort() });
  }

  // 名前で検索
  var searchName = e.parameter.name;
  if (!searchName) {
    return createResponse({ 'result': 'error', 'message': 'Name parameter is required' });
  }

  var results = [];
  var nameIndex = headers.indexOf('user-name');

  for (var i = 1; i < data.length; i++) {
    if (data[i][nameIndex] === searchName) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      results.push(row);
    }
  }

  // 日付順にソート（新しい順）
  results.sort(function (a, b) {
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  });

  return createResponse({ 'result': 'success', 'count': results.length, 'data': results });
}
