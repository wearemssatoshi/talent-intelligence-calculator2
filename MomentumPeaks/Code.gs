/**
 * SVD Momentum Peaks - Google Apps Script API
 * 
 * このスクリプトをGoogle Sheetsの「拡張機能 > Apps Script」に貼り付けてください。
 * デプロイ後、WebアプリURLをHTMLから呼び出してデータの読み書きを行います。
 */

// ========== 設定 ==========
const SHEET_NAME_DATA = 'DailyData';
const SHEET_NAME_CONFIG = 'Config';

// ========== Web App エントリーポイント ==========

/**
 * GETリクエスト: 設定データ（拠点・チャンネル構造）を返す
 */
function doGet(e) {
  const action = e.parameter.action || 'getConfig';
  
  if (action === 'getConfig') {
    return ContentService.createTextOutput(JSON.stringify(getConfigData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getData') {
    return ContentService.createTextOutput(JSON.stringify(getAllData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POSTリクエスト: 日次データを保存
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = saveEntry(data);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== データ操作 ==========

/**
 * 設定データ（拠点・チャンネル構造）を取得
 */
function getConfigData() {
  return {
    bases: [
      {
        id: 'MOIWAYAMA',
        name: '藻岩山',
        channels: [
          { id: 'JW', name: 'THE JEWELS', segments: ['LUNCH', 'DINNER'] },
          { id: 'JW_TO', name: 'JW_TakeOut', segments: ['ALL'] }
        ]
      },
      {
        id: 'OKURAYAMA',
        name: '大倉山',
        channels: [
          { id: 'NP', name: 'NOUVELLE POUSSE OKURAYAMA', segments: ['LUNCH', 'DINNER'] },
          { id: 'CE', name: 'CELESTÉ', segments: ['ALL'] },
          { id: 'RP', name: 'PEPOS', segments: ['ALL'] }
        ]
      },
      {
        id: 'TV_TOWER',
        name: 'さっぽろテレビ塔',
        channels: [
          { id: 'GA', name: 'THE GARDEN SAPPORO HOKKAIDO GRILLE', segments: ['LUNCH', 'DINNER'] },
          { id: 'GA_WINE', name: 'GA_WINEBAR', segments: ['NIGHT'] },
          { id: 'GA_BQ', name: 'GA_BANQUET', segments: ['EVENT'] },
          { id: 'BG', name: 'BEER GARDEN', segments: ['SUMMER'] }
        ]
      },
      {
        id: 'AKARENGA',
        name: '赤れんがテラス',
        channels: [
          { id: 'BQ', name: 'LA BRIQUE SAPPORO Akarenga Terrace', segments: ['LUNCH', 'DINNER'] },
          { id: 'RYB', name: 'ルスツ羊蹄ぶた', segments: ['LUNCH', 'DINNER'] }
        ]
      }
    ],
    weatherOptions: ['晴れ', '曇り', '雨', '雪']
  };
}

/**
 * 日次データを保存
 * シート名のルール: {BaseID}_{FiscalYear}_{Month}
 * 例: MOIWAYAMA_R7_04 (藻岩山 R7年度 4月)
 * 
 * 対応フィールド:
 * - 気温 (Temperature)
 * - 夜景ポイント (NightViewPoints) - 藻岩山専用
 * - ビアガーデン時間帯別 (12:00/15:00/18:00の天気と気温)
 */
function saveEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 年度と月を計算（4月始まり）
  const dateObj = new Date(data.date);
  const month = dateObj.getMonth() + 1; // 1-12
  const year = dateObj.getFullYear();
  
  // 年度計算: 4月以降は当年、1-3月は前年
  const fiscalYear = month >= 4 ? year : year - 1;
  const fiscalYearLabel = 'R' + (fiscalYear - 2018); // 2025 -> R7
  const monthLabel = String(month).padStart(2, '0'); // 01-12
  
  // シート名を構築: {BaseID}_{FiscalYear}_{Month}
  const sheetName = `${data.baseId}_${fiscalYearLabel}_${monthLabel}`;
  
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが無ければ作成（拡張ヘッダー）
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow([
      'Timestamp', 'Date', 'DayOfWeek', 'DayIndex', 
      'BaseVisitors', 'NightViewPoints',
      'ChannelID', 'ChannelName', 'Segment', 
      'Sales', 'Visitors', 'Weather', 'Temperature',
      // ビアガーデン専用カラム
      'BG_Weather_12', 'BG_Temp_12',
      'BG_Weather_15', 'BG_Temp_15',
      'BG_Weather_18', 'BG_Temp_18',
      'Notes'
    ]);
    // ヘッダー行をフォーマット
    sheet.getRange(1, 1, 1, 20).setFontWeight('bold').setBackground('#d4af37');
  }
  
  const timestamp = new Date().toISOString();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  const dayIndex = getDayIndex(data.date);
  const nightViewPoints = data.nightViewPoints || '';
  const entries = data.entries || [];
  
  entries.forEach(entry => {
    // ビアガーデンかどうかで保存するカラムが変わる
    const isBeerGarden = entry.isBeerGarden || false;
    
    sheet.appendRow([
      timestamp,
      data.date,
      dayOfWeek,
      dayIndex,
      data.baseVisitors,
      nightViewPoints,
      entry.channelId,
      entry.channelName,
      entry.segment,
      entry.sales,
      entry.visitors,
      entry.weather || '',
      entry.temperature || '',
      // ビアガーデン時間帯別
      isBeerGarden ? entry.weather12 : '',
      isBeerGarden ? entry.temp12 : '',
      isBeerGarden ? entry.weather15 : '',
      isBeerGarden ? entry.temp15 : '',
      isBeerGarden ? entry.weather18 : '',
      isBeerGarden ? entry.temp18 : '',
      entry.notes || ''
    ]);
  });
  
  return { 
    success: true, 
    rowsAdded: entries.length,
    sheetName: sheetName
  };
}

/**
 * 全データを取得
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_DATA);
  
  if (!sheet) {
    return { data: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return { data: rows };
}

/**
 * 曜日指数を計算（日=4, 月=2, 火=2, 水=2, 木=3, 金=4, 土=5）
 */
function getDayIndex(dateStr) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const indexMap = [4, 2, 2, 2, 3, 4, 5];
  return indexMap[dayOfWeek];
}
