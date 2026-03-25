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
const SHEET_ONHAND = 'MP_OnHand';

// ── OnHand ヘッダー定義 ──
const ONHAND_HEADERS = ['date', 'time', 'store', 'type', 'count', 'amount', 'status', 'course', 'reservation_id'];

// ── 店舗別シート定義 ──
const STORE_SHEETS = {
  'MOIWA_JW':      { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','TO_Food','TO_Drink','席料','南京錠','花束','物販_食品','物販_アパレル','memo','ropeway'] },
  'TVTOWER_GA':    { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','3CH_Food','3CH_Drink','3CH人数','宴会_Food','宴会_Drink','宴会人数','室料','展望台','物販_食品','物販_アパレル','memo'] },
  'TVTOWER_BG':    { headers: ['date','Food','Drink','Tent','人数','物販_食品','物販_アパレル','memo'] },
  'OKURAYAMA_NP':  { headers: ['date','L_Food','L_Drink','L人数','D_Food','D_Drink','D人数','室料','花束','Event_Food','Event_Drink','Event人数','物販_食品','物販_アパレル','memo'] },
  'OKURAYAMA_Ce':  { headers: ['date','Food','Drink','人数','物販_食品','物販_アパレル','memo'] },
  'OKURAYAMA_RP':  { headers: ['date','Food','Drink','人数','物販_食品','物販_アパレル','memo'] },
  'AKARENGA_BQ':   { headers: ['date','L_Food','L_Drink','L人数','AT_Food','AT_Drink','AT人数','D_Food','D_Drink','D人数','席料','物販_食品','物販_アパレル','memo'] },
  'AKARENGA_RYB':  { headers: ['date','Food','Drink','人数','TO_Sales','TO人数','物販_食品','物販_アパレル','memo'] }
};

// ── 来場者数シート定義 (KF3) ──
const VISITOR_SHEETS = {
  'VISITOR_MOIWAYAMA':  { headers: ['date','ropeway','minicable','total','memo'], type: 'daily' },
  'VISITOR_OKURAYAMA':  { headers: ['date','jump_site','total','memo'], type: 'daily' },
  'VISITOR_TVTOWER':    { headers: ['month','observatory','total','memo'], type: 'monthly' },
  'VISITOR_AKARENGA':   { headers: ['month','total','memo'], type: 'monthly' }
};

// ── ベース→店舗マッピング ──
const BASE_MAP = {
  'MOIWA':    ['MOIWA_JW'],
  'TVTOWER':  ['TVTOWER_GA', 'TVTOWER_BG'],
  'OKURAYAMA':['OKURAYAMA_NP', 'OKURAYAMA_Ce', 'OKURAYAMA_RP'],
  'AKARENGA': ['AKARENGA_BQ', 'AKARENGA_RYB']
};

// ── JST Date Alignment ──
// appsscript.json timezone = Asia/Tokyo
// Utilities.formatDate() が JST 変換するため手動オフセット不要
function jstNow() {
  return new Date();
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
      case 'loadOnHand':
        return respond(handleLoadOnHand(e));
      case 'askAI':
        return respond(handleAskAI(e));
      case 'ping':
        const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
        return respond({ status: 'ok', message: 'MP Backend v2 Active', timestamp: jstTimestamp(), stores: Object.keys(STORE_SHEETS), url: url });
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
      case 'saveOnHand':
        return respond(handleSaveOnHand(params));
      case 'importOnHand':
        return respond(handleImportOnHand(params));
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
    const config = STORE_SHEETS[sheetName] || VISITOR_SHEETS[sheetName];
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
  // ── 来場者数シート (KF3) ──
  Object.keys(VISITOR_SHEETS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = VISITOR_SHEETS[sheetName].headers;
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      created.push(sheetName);
    }
  });

  return { status: 'ok', action: 'setupSheets', created: created, total_sheets: Object.keys(STORE_SHEETS).length + Object.keys(VISITOR_SHEETS).length };
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

  // ── 来場者数データ (KF3) ──
  const visitors = {};
  Object.entries(VISITOR_SHEETS).forEach(([sheetName, config]) => {
    const ss2 = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss2.getSheetByName(sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    const headers = data[0];
    const records = [];
    for (let row = 1; row < data.length; row++) {
      const record = { type: config.type };
      for (let col = 0; col < headers.length; col++) {
        const key = headers[col];
        let val = data[row][col];
        if (key === 'date') val = jstDateStr(val);
        if (key === 'month' && val instanceof Date) val = Utilities.formatDate(val, 'Asia/Tokyo', 'yyyy-MM');
        record[key] = val;
      }
      // total自動計算（未設定時）
      if (!record.total || record.total === 0) {
        let sum = 0;
        headers.forEach((h, i) => {
          if (h !== 'date' && h !== 'month' && h !== 'memo' && h !== 'total') {
            sum += Number(data[row][i]) || 0;
          }
        });
        record.total = sum;
      }
      records.push(record);
    }
    // シート名から拠点ID抽出 (VISITOR_MOIWAYAMA → MOIWAYAMA)
    const baseId = sheetName.replace('VISITOR_', '');
    visitors[baseId] = records;
  });

  return {
    status: 'ok',
    stores: stores,
    visitors: visitors,
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

  // ── ヘッダー自動同期（列追加時に自動反映） ──
  const config = STORE_SHEETS[sheetName] || VISITOR_SHEETS[sheetName];
  if (config) {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (currentHeaders.length !== config.headers.length || currentHeaders[currentHeaders.length - 1] !== config.headers[config.headers.length - 1]) {
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    }
  }

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

  // ヘッダー行をSTORE_SHEETSから同期（列構成変更時にも対応）
  const expectedHeaders = config.headers;
  sheet.getRange(1, 1, 1, sheet.getMaxColumns()).clear();
  sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);

  // データ行をクリアして一括書き込み
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).clear();
  }

  // 一括書き込み
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  writeAudit('import', params.user || 'IMPORT', sheetName, '-', rows.length + ' rows imported');

  return { status: 'ok', action: 'import', sheet: sheetName, imported: rows.length };
}

// ═══════════════════════════════════════
// ONHAND HANDLERS
// ═══════════════════════════════════════

/**
 * loadOnHand — OnHandデータを取得
 * GET ?action=loadOnHand[&store=GA][&status=確定]
 */
function handleLoadOnHand(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ONHAND);
  if (!sheet) {
    // シートがなければ自動作成
    sheet = ss.insertSheet(SHEET_ONHAND);
    sheet.appendRow(ONHAND_HEADERS);
    return { status: 'ok', records: [], total: 0, message: 'OnHand sheet created (empty)' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'ok', records: [], total: 0 };

  const headers = data[0];
  const filterStore = e && e.parameter && e.parameter.store;
  const filterStatus = e && e.parameter && e.parameter.status;
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const record = {};
    for (let c = 0; c < headers.length; c++) {
      let val = data[i][c];
      if (headers[c] === 'date' && val instanceof Date) val = jstDateStr(val);
      record[headers[c]] = val;
    }
    // フィルタ適用
    if (filterStore && record.store !== filterStore) continue;
    if (filterStatus && record.status !== filterStatus) continue;
    records.push(record);
  }

  return { status: 'ok', records, total: records.length, timestamp: jstTimestamp() };
}

/**
 * saveOnHand — 1件のOnHandを保存（reservation_id で UPSERT）
 * POST { action: 'saveOnHand', record: { date, time, store, type, count, amount, status, course, reservation_id }, user: 'SAT' }
 */
function handleSaveOnHand(params) {
  const record = params.record;
  if (!record || !record.reservation_id) {
    return { status: 'error', message: 'record with reservation_id required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ONHAND);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ONHAND);
    sheet.appendRow(ONHAND_HEADERS);
  }

  const data = sheet.getDataRange().getValues();
  const resIdCol = ONHAND_HEADERS.indexOf('reservation_id');
  const values = ONHAND_HEADERS.map(h => record[h] || '');

  // reservation_id でUPSERT
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][resIdCol]) === String(record.reservation_id)) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
    writeAudit('onhand_update', params.user || 'SYSTEM', SHEET_ONHAND, record.date, record.reservation_id);
    return { status: 'ok', action: 'updated', reservation_id: record.reservation_id };
  } else {
    sheet.appendRow(values);
    writeAudit('onhand_insert', params.user || 'SYSTEM', SHEET_ONHAND, record.date, record.reservation_id);
    return { status: 'ok', action: 'inserted', reservation_id: record.reservation_id };
  }
}

/**
 * importOnHand — OnHandデータを全件入れ替え（weekly full refresh）
 * POST { action: 'importOnHand', records: [ { date, time, store, ... }, ... ], user: 'IMPORT' }
 */
function handleImportOnHand(params) {
  const records = params.records;
  if (!records || !Array.isArray(records)) {
    return { status: 'error', message: 'records array required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ONHAND);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ONHAND);
  }

  // 全クリア → ヘッダー + 新データ
  sheet.clear();
  sheet.appendRow(ONHAND_HEADERS);

  if (records.length > 0) {
    const rows = records.map(r => ONHAND_HEADERS.map(h => r[h] || ''));
    sheet.getRange(2, 1, rows.length, ONHAND_HEADERS.length).setValues(rows);
  }

  writeAudit('onhand_import', params.user || 'IMPORT', SHEET_ONHAND, jstDateStr(jstNow()), records.length + ' records');
  return { status: 'ok', action: 'imported', count: records.length, timestamp: jstTimestamp() };
}

// ═══════════════════════════════════════
// MEMO HANDLERS
// ═══════════════════════════════════════

/**
 * loadMemo — 全メモを取得
 * GET ?action=loadMemo[&store=JW][&date=2026-02-28]
 */
function handleLoadMemo(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_MEMO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MEMO);
    sheet.appendRow(MEMO_HEADERS);
    return { status: 'ok', memos: [], total: 0, message: 'Memo sheet created (empty)' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'ok', memos: [], total: 0 };

  const headers = data[0];
  const filterStore = e && e.parameter && e.parameter.store;
  const filterDate = e && e.parameter && e.parameter.date;
  const memos = [];

  for (let i = 1; i < data.length; i++) {
    const record = {};
    for (let c = 0; c < headers.length; c++) {
      let val = data[i][c];
      if (headers[c] === 'date' && val instanceof Date) val = jstDateStr(val);
      record[headers[c]] = val;
    }
    if (filterStore && record.store !== filterStore) continue;
    if (filterDate && record.date !== filterDate) continue;
    memos.push(record);
  }

  return { status: 'ok', memos, total: memos.length, timestamp: jstTimestamp() };
}

/**
 * saveMemo — メモを保存 (date+store でUPSERT)
 * POST { action: 'saveMemo', date: '2026-02-28', store: 'JW', memo: 'ロープウェイ運休', user: 'SAT' }
 */
function handleSaveMemo(params) {
  const date = params.date;
  const store = params.store;
  const memo = params.memo;

  if (!date || !store) return { status: 'error', message: 'date and store required' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_MEMO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MEMO);
    sheet.appendRow(MEMO_HEADERS);
  }

  const data = sheet.getDataRange().getValues();
  const values = [date, store, memo || '', jstTimestamp()];

  // date + store でUPSERT
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    const rowDate = (data[i][0] instanceof Date) ? jstDateStr(data[i][0]) : String(data[i][0]);
    const rowStore = String(data[i][1]);
    if (rowDate === date && rowStore === store) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    if (!memo || memo.trim() === '') {
      // メモが空なら行を削除
      sheet.deleteRow(targetRow);
      writeAudit('memo_delete', params.user || 'SYSTEM', SHEET_MEMO, date, store);
      return { status: 'ok', action: 'deleted', date, store };
    }
    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
    writeAudit('memo_update', params.user || 'SYSTEM', SHEET_MEMO, date, store + ': ' + memo);
    return { status: 'ok', action: 'updated', date, store };
  } else {
    if (!memo || memo.trim() === '') {
      return { status: 'ok', action: 'skipped', message: 'Empty memo, nothing to save' };
    }
    sheet.appendRow(values);
    writeAudit('memo_insert', params.user || 'SYSTEM', SHEET_MEMO, date, store + ': ' + memo);
    return { status: 'ok', action: 'inserted', date, store };
  }
}

// ═══════════════════════════════════════
// AI PROXY (SATOSHI AI)
// ═══════════════════════════════════════

/**
 * handleAskAI — GAS経由でGemini APIを呼ぶプロキシ
 * GET ?action=askAI&q=質問テキスト&context=コンテキスト
 * ScriptProperties: GEMINI_API_KEY
 */
function handleAskAI(e) {
  const question = e?.parameter?.q || '';
  const context = e?.parameter?.context || '';

  if (!question) return { status: 'error', message: 'q parameter required' };

  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    return { status: 'error', response: null, message: 'GEMINI_API_KEY not set in Script Properties' };
  }

  const systemPrompt = `あなたはSVDのMomentum Peaks AIアシスタント「SATOSHI AI」です。
レストラングループの売上予測・需要分析の専門家として回答してください。
数字は¥マークと桁区切り、日本語で、3-5行以内で簡潔に。`;

  try {
    const payload = {
      contents: [{ parts: [{ text: systemPrompt + '\n\n' + context + '\n\n質問: ' + question }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    };

    const resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=' + GEMINI_API_KEY,
      { method: 'POST', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }
    );

    const result = JSON.parse(resp.getContentText());
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'AIの回答を取得できませんでした。';

    return { status: 'ok', response: aiText, source: 'gemini', timestamp: jstTimestamp() };
  } catch (err) {
    return { status: 'error', response: null, message: 'AI API call failed: ' + err.message };
  }
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
