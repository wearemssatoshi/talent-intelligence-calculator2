function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;

  // タイムスタンプ
  var timestamp = params.Timestamp || new Date();

  // ユーザー情報
  var name = params['user-name'] || '';
  var affiliation = params['user-affiliation'] || '';
  var jobTitle = params['user-job-title'] || '';
  var totalScore = params['totalScore'] || '';
  var type = params['user-type-self'] || '';

  // 資格情報
  var qualifications = params['qualifications'] || '';
  var qualScore = params['qualificationScore'] || '';
  var meisterRank = params['meisterRank'] || '';

  // スコアデータの配列を作成
  // p1-p6, s1-s6, e1-e6, m1-m6 の順序で取得
  var scores = [];
  var prefixes = ['p', 's', 'e', 'm'];

  prefixes.forEach(function (prefix) {
    for (var i = 1; i <= 6; i++) {
      var key = prefix + i;
      scores.push(params[key] || '');
    }
  });

  // 行データの作成
  // 列構成: Timestamp, Name, Affiliation, JobTitle, Type, TotalScore, Quals, QualScore, Rank, ...DetailedScores(24 cols)
  var rowData = [timestamp, name, affiliation, jobTitle, type, totalScore, qualifications, qualScore, meisterRank].concat(scores);

  // シートに追加
  sheet.appendRow(rowData);

  // 結果を返す
  var result = {
    result: 'success',
    row: sheet.getLastRow()
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'getStaffData') {
    return getStaffData();
  }

  // デフォルトのレスポンス（疎通確認用）
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', message: 'GAS is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStaffData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  // ヘッダー行を除外（1行目がヘッダーと仮定）
  // データ構造: [Timestamp, Name, Affiliation, JobTitle, Type, TotalScore, Quals, QualScore, Rank, p1...m6]
  // Index: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9...32

  var staffList = [];

  // 2行目からループ
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // 必須項目が空ならスキップ
    if (!row[1]) continue; // Name is empty

    // 詳細スコアの抽出 (9列目以降がスコアと仮定: Index 9 to 32)
    // ※ 列構成は実際のシートに合わせて調整してください。
    //   doPostの構成: [Timestamp, Name, Affiliation, JobTitle, Type, TotalScore, Quals, QualScore, Rank, p1...m6]

    var detailedScores = row.slice(9, 33); // 24個のスコア

    staffList.push({
      name: row[1],
      affiliation: row[2],
      jobTitle: row[3] || '',
      type: row[4] || 'Unknown',
      score: row[5],
      qualifications: row[6] || '',
      qualScore: row[7] || 0,
      meisterRank: row[8] || 'Rookie',
      detailedScores: detailedScores
    });
  }

  var result = {
    status: 'success',
    data: staffList
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
