/**
 * SVD Momentum Peaks - Daily Data Collection Form Setup
 * 
 * このスクリプトをGoogle Apps Scriptで実行すると、
 * Momentum Peaks用のフォームとスプレッドシートが自動作成されます。
 * 
 * 使い方:
 * 1. Google Driveで新しいGoogle Sheetsを作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードをコピペして保存
 * 4. createMomentumPeaksForm() を実行
 */

function createMomentumPeaksForm() {
  // フォーム作成
  const form = FormApp.create('SVD Momentum Peaks 日次入力');
  form.setDescription('毎日の売上・客数データを入力してください。');
  
  // 1. 拠点選択
  form.addListItem()
    .setTitle('拠点')
    .setChoiceValues([
      'THE JEWELS (JW)',
      'THE GARDEN SAPPORO (GA)',
      'ヌーベルプース大倉山 (NP)',
      'もいわ山 (MOIWA)',
      'さっぽろテレビ塔 (TV_TOWER)',
      '赤れんがテラス LA BRIQUE (AKARENGA_BQ)',
      '赤れんがテラス ルスツ羊蹄ぶた (AKARENGA_RYB)'
    ])
    .setRequired(true);
  
  // 2. 日付
  form.addDateItem()
    .setTitle('日付')
    .setRequired(true);
  
  // 3. 実績客数
  form.addTextItem()
    .setTitle('実績客数（人）')
    .setValidation(FormApp.createTextValidation()
      .requireNumber()
      .build())
    .setRequired(true);
  
  // 4. 実績売上
  form.addTextItem()
    .setTitle('実績売上（円）')
    .setValidation(FormApp.createTextValidation()
      .requireNumber()
      .build())
    .setRequired(true);
  
  // 5. 天候
  form.addListItem()
    .setTitle('天候')
    .setChoiceValues(['晴れ', '曇り', '雨', '雪'])
    .setRequired(true);
  
  // 6. 特記事項
  form.addParagraphTextItem()
    .setTitle('特記事項（イベント、異常値の理由など）')
    .setRequired(false);
  
  // フォームをスプレッドシートに紐付け
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  
  // ヘッダー行を追加したシートを作成
  const dataSheet = ss.getSheetByName('フォームの回答 1') || ss.insertSheet('Momentum_Data');
  
  // 計算列用のシートを作成
  const calcSheet = ss.insertSheet('Dashboard');
  calcSheet.getRange('A1').setValue('=QUERY(\'フォームの回答 1\'!A:G, "SELECT * ORDER BY B DESC", 1)');
  
  Logger.log('フォームURL: ' + form.getPublishedUrl());
  Logger.log('編集URL: ' + form.getEditUrl());
  
  // URLをシートにも記録
  const infoSheet = ss.insertSheet('Info');
  infoSheet.getRange('A1').setValue('フォームURL');
  infoSheet.getRange('B1').setValue(form.getPublishedUrl());
  infoSheet.getRange('A2').setValue('編集URL');
  infoSheet.getRange('B2').setValue(form.getEditUrl());
  
  return form.getPublishedUrl();
}

/**
 * 曜日指数を計算する関数
 * 日=4, 月=2, 火=2, 水=2, 木=3, 金=4, 土=5
 */
function getDayIndex(date) {
  const dayOfWeek = date.getDay(); // 0=日, 1=月, ..., 6=土
  const indexMap = [4, 2, 2, 2, 3, 4, 5]; // 日月火水木金土
  return indexMap[dayOfWeek];
}

/**
 * カスタム関数: スプレッドシート内で使用可能
 * =DAY_INDEX(A2) のように使用
 */
function DAY_INDEX(dateValue) {
  const date = new Date(dateValue);
  return getDayIndex(date);
}
