// ═══════════════════════════════════════════════════════════════
// MOMENTUM PEAKS — GAS Backend v2 (Code.gs)
// SVD Restaurant OS — Store-Specific Sheets Architecture
// ═══════════════════════════════════════════════════════════════
// 8店舗 × 8シート: Base_Store 命名規則
// 各シートに店舗固有のチャネルヘッダー + フラットデータ行
// ═══════════════════════════════════════════════════════════════

// ── Sheet Configuration ──
const SHEET_AUDIT = 'MP_AuditLog';
const SHEET_CONFIG = 'MP_Config';

// ── 店舗別シート定義 ──
const STORE_SHEETS = {
  'MOIWA_JW':      { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','TO_Food','TO_Drink','席料','南京錠','花束','物販_食品','物販_アパレル'] },
  'TVTOWER_GA':    { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','TO_Food','TO_Drink','宴会_Food','宴会_Drink','宴会人数','室料','展望台','物販_食品','物販_アパレル'] },
  'TVTOWER_BG':    { headers: ['date','Food','Drink','Tent','人数','物販_食品','物販_アパレル'] },
  'OKURAYAMA_NP':  { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','室料','花束','Event_Food','Event_Drink','Event人数','物販_食品','物販_アパレル'] },
  'OKURAYAMA_Ce':  { headers: ['date','Food','Drink','人数','物販_食品','物販_アパレル'] },
  'OKURAYAMA_RP':  { headers: ['date','Food','Drink','人数','物販_食品','物販_アパレル'] },
  'AKARENGA_BQ':   { headers: ['date','L_Food','L_Drink','L人数','AT_Food','AT_Drink','AT人数','D_Food','D_Drink','D人数','席料','物販_食品','物販_アパレル'] },
  'AKARENGA_RYB':  { headers: ['date','Food','Drink','人数','物販_食品','物販_アパレル'] }
};

// ── ベース→店舗マッピング ──
const BASE_MAP = {
  'MOIWA':    ['MOIWA_JW'],
  'TVTOWER':  ['TVTOWER_GA', 'TVTOWER_BG'],
  'OKURAYAMA':['OKURAYAMA_NP', 'OKURAYAMA_Ce', 'OKURAYAMA_RP'],
  'AKARENGA': ['AKARENGA_BQ', 'AKARENGA_RYB']
};

// ── JST Date Alignment ──
function jstNow() {
  return new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
}
function jstDateStr(d) {
  if (!d) d = jstNow();
  if (typeof d === 'string') return d;
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
}
function jstTimestamp() {
  return Utilities.formatDate(jstNow(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
}

// ═══════════════════════════════════════
// TOKEN AUTHENTICATION
// ═══════════════════════════════════════

function verifyToken(e, isPost) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('SVD_API_TOKEN');
  if (!TOKEN) return true; // トークン未設定時はスキップ（段階的導入）
  
  let provided;
  if (isPost) {
    try {
      const data = JSON.parse(e.postData.contents);
      provided = data.token;
    } catch (err) {
      return false;
    }
  } else {
    provided = e?.parameter?.token;
  }
  return provided === TOKEN;
}

function unauthorizedResponse() {
  return respond({ status: 'error', message: 'Unauthorized: Invalid or missing API token' });
}

// ═══════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'loadAll';
  // ── Auth Gate (ping は公開) ──
  if (action !== 'ping') {
    if (!verifyToken(e, false)) return unauthorizedResponse();
  }
  try {
    switch (action) {
      case 'loadAll':
        return respond(handleLoadAll(e));
      case 'loadStore':
        return respond(handleLoadStore(e));
      case 'loadDate':
        return respond(handleLoadDate(e));
      case 'loadRange':
        return respond(handleLoadRange(e));
      case 'loadConfig':
        return respond(handleLoadConfig());
      case 'ping':
        return respond({ status: 'ok', message: 'MP Backend v2 Active', timestamp: jstTimestamp(), stores: Object.keys(STORE_SHEETS) });
      default:
        return respond({ status: 'error', message: 'Unknown GET action: ' + action });
    }
  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}

function doPost(e) {
  // ── Auth Gate ──
  if (!verifyToken(e, true)) return unauthorizedResponse();
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    switch (action) {
      case 'save':
        return respond(handleSave(params));
      case 'bulkSave':
        return respond(handleBulkSave(params));
      case 'import':
        return respond(handleImport(params));
      case 'setupSheets':
        return respond(handleSetupSheets());
      default:
        return respond({ status: 'error', message: 'Unknown POST action: ' + action });
    }
  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════
// SHEET MANAGEMENT
// ═══════════════════════════════════════

/**
 * getStoreSheet — 店舗シートを取得（なければ自動作成）
 */
function getStoreSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    const config = STORE_SHEETS[sheetName];
    if (!config) return null;
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(config.headers);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * setupSheets — 全8シートを作成（初回セットアップ）
 */
function handleSetupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const created = [];

  Object.keys(STORE_SHEETS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = STORE_SHEETS[sheetName].headers;
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      created.push(sheetName);
    }
  });

  // Audit + Config
  if (!ss.getSheetByName(SHEET_AUDIT)) {
    const audit = ss.insertSheet(SHEET_AUDIT);
    audit.appendRow(['timestamp', 'action', 'user', 'sheet', 'date', 'summary']);
    audit.getRange(1, 1, 1, 6).setFontWeight('bold');
    audit.setFrozenRows(1);
    created.push(SHEET_AUDIT);
  }
  if (!ss.getSheetByName(SHEET_CONFIG)) {
    const config = ss.insertSheet(SHEET_CONFIG);
    config.appendRow(['key', 'value']);
    config.appendRow(['version', '2.0.0']);
    config.appendRow(['org_name', 'SVD']);
    config.appendRow(['architecture', 'store-specific-sheets']);
    config.getRange(1, 1, 1, 2).setFontWeight('bold');
    config.setFrozenRows(1);
    created.push(SHEET_CONFIG);
  }

  return { status: 'ok', action: 'setupSheets', created: created, total_sheets: Object.keys(STORE_SHEETS).length };
}

// ═══════════════════════════════════════
// GET HANDLERS
// ═══════════════════════════════════════

/**
 * loadAll — 全店舗データ取得
 * 各シートから読み込み、stores: { JW: [...], GA: [...], ... }
 */
function handleLoadAll(e) {
  const stores = {};
  let totalRecords = 0;

  Object.keys(STORE_SHEETS).forEach(sheetName => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const headers = data[0];
    // シート名から store_id 抽出 (例: MOIWA_JW → JW)
    const storeId = sheetName.split('_').slice(1).join('_');
    const baseId = sheetName.split('_')[0];
    const records = [];

    for (let row = 1; row < data.length; row++) {
      const record = { base_id: baseId };
      for (let col = 0; col < headers.length; col++) {
        const key = headers[col];
        let val = data[row][col];
        if (key === 'date') {
          val = jstDateStr(val);
        }
        record[key] = val;
      }
      // actual_sales を自動計算（数値列の合計 - date列 - 人数列）
      let sales = 0;
      for (let col = 0; col < headers.length; col++) {
        const key = headers[col];
        if (key === 'date' || key.includes('人数')) continue;
        const v = Number(data[row][col]);
        if (!isNaN(v)) sales += v;
      }
      record.actual_sales = sales;
      // actual_count は人数列の合計
      let count = 0;
      for (let col = 0; col < headers.length; col++) {
        if (headers[col].includes('人数')) {
          count += Number(data[row][col]) || 0;
        }
      }
      record.actual_count = count;
      records.push(record);
    }

    stores[storeId] = records;
    totalRecords += records.length;
  });

  return {
    status: 'ok',
    stores: stores,
    meta: {
      total: totalRecords,
      stores: Object.keys(stores).sort(),
      bases: Object.keys(BASE_MAP),
      architecture: 'store-specific-sheets',
      timestamp: jstTimestamp()
    }
  };
}

/**
 * loadStore — 特定店舗のデータ
 * GET ?action=loadStore&store=JW
 */
function handleLoadStore(e) {
  const storeId = e.parameter.store;
  if (!storeId) return { status: 'error', message: 'store parameter required' };

  const all = handleLoadAll(e);
  if (all.status !== 'ok') return all;

  return {
    status: 'ok',
    store_id: storeId,
    records: all.stores[storeId] || [],
    count: (all.stores[storeId] || []).length
  };
}

/**
 * loadDate — 特定日の全店舗
 */
function handleLoadDate(e) {
  const dateStr = e.parameter.date;
  if (!dateStr) return { status: 'error', message: 'date parameter required' };

  const all = handleLoadAll(e);
  if (all.status !== 'ok') return all;

  const result = {};
  Object.entries(all.stores).forEach(([sid, records]) => {
    const match = records.find(r => r.date === dateStr);
    if (match) result[sid] = match;
  });

  return { status: 'ok', date: dateStr, stores: result };
}

/**
 * loadRange — 日付範囲取得
 */
function handleLoadRange(e) {
  const from = e.parameter.from;
  const to = e.parameter.to;
  const storeId = e.parameter.store;
  if (!from || !to) return { status: 'error', message: 'from and to parameters required' };

  const all = handleLoadAll(e);
  if (all.status !== 'ok') return all;

  const result = {};
  Object.entries(all.stores).forEach(([sid, records]) => {
    if (storeId && sid !== storeId) return;
    const filtered = records.filter(r => r.date >= from && r.date <= to);
    if (filtered.length > 0) result[sid] = filtered;
  });

  return { status: 'ok', from, to, stores: result };
}

/**
 * loadConfig — 設定取得
 */
function handleLoadConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return { status: 'ok', config: {} };

  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = data[i][1];
    if (key) config[key] = val;
  }
  return { status: 'ok', config, store_sheets: STORE_SHEETS };
}

// ═══════════════════════════════════════
// POST HANDLERS
// ═══════════════════════════════════════

/**
 * resolveSheetName — store_id からシート名を解決
 */
function resolveSheetName(storeId) {
  for (const sheetName of Object.keys(STORE_SHEETS)) {
    const sid = sheetName.split('_').slice(1).join('_');
    if (sid === storeId) return sheetName;
  }
  return null;
}

/**
 * save — 1店舗1日分を保存（UPSERT）
 * POST { action: 'save', sheet: 'MOIWA_JW', date: '2024-11-02',
 *         values: [日付, L売上, L人数, D売上, D人数, ...], user: 'SAT' }
 *
 * 代替: store_id で指定
 * POST { action: 'save', store_id: 'JW', date: '2024-11-02', values: [...], user: 'SAT' }
 */
function handleSave(params) {
  const sheetName = params.sheet || resolveSheetName(params.store_id);
  if (!sheetName) return { status: 'error', message: 'sheet or store_id required' };

  const date = params.date || (params.values && params.values[0]);
  if (!date) return { status: 'error', message: 'date required' };

  const sheet = getStoreSheet(sheetName);
  if (!sheet) return { status: 'error', message: 'Unknown sheet: ' + sheetName };

  const data = sheet.getDataRange().getValues();
  const values = params.values;
  // date は values[0] に入れる
  if (values && values[0] !== date) values[0] = date;

  // 既存行を探す (UPSERT)
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    const rowDate = jstDateStr(data[i][0]);
    if (rowDate === date) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
    writeAudit('update', params.user || 'SYSTEM', sheetName, date, 'UPSERT');
    return { status: 'ok', action: 'updated', sheet: sheetName, date };
  } else {
    sheet.appendRow(values);
    writeAudit('insert', params.user || 'SYSTEM', sheetName, date, 'INSERT');
    return { status: 'ok', action: 'inserted', sheet: sheetName, date };
  }
}

/**
 * bulkSave — 複数日を一括保存
 * POST { action: 'bulkSave', sheet: 'MOIWA_JW',
 *         rows: [ [date, v1, v2, ...], [date, v1, v2, ...] ], user: 'SAT' }
 */
function handleBulkSave(params) {
  const sheetName = params.sheet || resolveSheetName(params.store_id);
  if (!sheetName) return { status: 'error', message: 'sheet or store_id required' };

  const rows = params.rows;
  if (!rows || !Array.isArray(rows)) return { status: 'error', message: 'rows[] required' };

  const results = [];
  rows.forEach(rowValues => {
    const result = handleSave({ sheet: sheetName, values: rowValues, user: params.user });
    results.push(result);
  });

  return { status: 'ok', action: 'bulkSave', sheet: sheetName, count: results.length };
}

/**
 * import — CSVシードデータの一括インポート
 * POST { action: 'import', sheet: 'MOIWA_JW',
 *         rows: [ [date, v1, v2, ...], ... ], user: 'IMPORT' }
 *
 * 高速版: 既存データを全削除して一括書き込み
 */
function handleImport(params) {
  const sheetName = params.sheet;
  if (!sheetName) return { status: 'error', message: 'sheet required' };

  const rows = params.rows;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { status: 'error', message: 'rows[] required (non-empty)' };
  }

  const sheet = getStoreSheet(sheetName);
  if (!sheet) return { status: 'error', message: 'Unknown sheet: ' + sheetName };

  const config = STORE_SHEETS[sheetName];
  if (!config) return { status: 'error', message: 'No config for: ' + sheetName };

  // ヘッダー保持、データ行をクリアして一括書き込み
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, config.headers.length).clear();
  }

  // 一括書き込み
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  writeAudit('import', params.user || 'IMPORT', sheetName, '-', rows.length + ' rows imported');

  return { status: 'ok', action: 'import', sheet: sheetName, imported: rows.length };
}

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════

function writeAudit(action, user, sheet, date, summary) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName(SHEET_AUDIT);
    if (!auditSheet) {
      auditSheet = ss.insertSheet(SHEET_AUDIT);
      auditSheet.appendRow(['timestamp', 'action', 'user', 'sheet', 'date', 'summary']);
    }
    auditSheet.appendRow([jstTimestamp(), action, user, sheet, date, summary]);
  } catch (e) {
    Logger.log('Audit write failed: ' + e.message);
  }
}

// ── 初回実行用 ──
function setupAllSheets() {
  const result = handleSetupSheets();
  Logger.log(JSON.stringify(result));
}
