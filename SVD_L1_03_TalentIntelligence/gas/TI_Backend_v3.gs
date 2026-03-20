/**
 * ═══════════════════════════════════════════════════════════
 * TALENT INTELLIGENCE BACKEND v3.0 — Revival
 * ═══════════════════════════════════════════════════════════
 *
 * Architecture:
 *   TI_Master (Index)  + Staff_[ID] (History) = 2-Layer System
 *   StaffID-based, Config-Driven, LockService on doPost only
 *
 * Design Principles:
 *   1. GAS = データの土管 (Data pipe, no computation)
 *   2. StaffID (SVD-NNN) = 全データの主キー
 *   3. LockService → doPost のみ (doGetは並列読み込み可)
 *   4. AuditLog → 全操作記録 (エラーも記録)
 *   5. 第七条: 入力したデータが確実に保存される = 前提条件
 *
 * Version: 3.0
 * Last Updated: 2026-03-10
 * SAPPORO VIEWTIFUL DINING
 * ═══════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const TI_CONFIG = {
  MASTER_SHEET: 'TI_Master',
  CONFIG_SHEET: 'TI_Config',
  AUDIT_SHEET: 'TI_AuditLog',
  STAFF_PREFIX: 'Staff_',
  VERSION: '3.0'
};

// Master sheet column indices (0-based)
const MASTER_COL = {
  STAFF_ID: 0,      // A
  NAME: 1,           // B
  AFFILIATION: 2,    // C
  HIERARCHY_ROLE: 3, // D
  SPECIALTY_ROLES: 4,// E
  JOB_TITLE: 5,      // F
  QUALIFICATIONS: 6, // G
  EXPERIENCE: 7,     // H
  COMBAT_POWER: 8,   // I
  CATEGORY_SCORES: 9,// J
  POSITIONS: 10,     // K
  SHIFT_READY: 11,   // L
  PHOTO_URL: 12,     // M
  LAST_EVALUATED: 13,// N
  EVAL_COUNT: 14,    // O
  STATUS: 15         // P
};

const MASTER_HEADERS = [
  'StaffID', 'Name', 'Affiliation', 'HierarchyRole', 'SpecialtyRoles',
  'JobTitle', 'Qualifications', 'Experience', 'CombatPower', 'CategoryScores',
  'Positions', 'ShiftReady', 'PhotoURL', 'LastEvaluated', 'EvalCount', 'Status'
];

// Staff sheet column indices (0-based)
const STAFF_COL = {
  TIMESTAMP: 0,
  EVALUATOR: 1,
  EVAL_TYPE: 2,
  P1: 3, P2: 4, P3: 5, P4: 6, P5: 7, P6: 8,
  S1: 9, S2: 10, S3: 11, S4: 12, S5: 13, S6: 14,
  E1: 15, E2: 16, E3: 17, E4: 18, E5: 19, E6: 20,
  M1: 21, M2: 22, M3: 23, M4: 24, M5: 25, M6: 26,
  TOTAL_SCORE: 27,
  MEMO: 28
};

const STAFF_HEADERS = [
  'Timestamp', 'Evaluator', 'EvalType',
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
  's1', 's2', 's3', 's4', 's5', 's6',
  'e1', 'e2', 'e3', 'e4', 'e5', 'e6',
  'm1', 'm2', 'm3', 'm4', 'm5', 'm6',
  'TotalScore', 'Memo'
];

const AUDIT_HEADERS = ['Timestamp', 'Action', 'User', 'StaffID', 'Detail', 'Result'];


// ═══════════════════════════════════════════════════════════
// TOKEN AUTHENTICATION
// ═══════════════════════════════════════════════════════════
function verifyToken_(e) {
  // ══ 初期セットアップ段階: 認証バイパス ══
  // TODO: 本番運用時に以下のコメントを外してトークン認証を有効化
  return true;
  /*
  const TOKEN = PropertiesService.getScriptProperties().getProperty('SVD_API_TOKEN');
  if (!TOKEN) return true; // 段階的導入: トークン未設定時はスキップ
  const provided = e.parameter?.token;
  return provided === TOKEN;
  */
}

function unauthorizedResponse_() {
  return jsonResponse_({ result: 'error', error: 'Unauthorized: Invalid or missing API token' });
}


// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════
function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jstNow_() {
  return new Date();  // GASプロジェクトのタイムゾーンがAsia/Tokyoなので直接使用
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  return sheet;
}

function auditLog_(action, user, staffId, detail, result) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss, TI_CONFIG.AUDIT_SHEET, AUDIT_HEADERS);
    sheet.appendRow([jstNow_(), action, user || 'system', staffId || '', 
                     typeof detail === 'object' ? JSON.stringify(detail) : (detail || ''),
                     result || 'success']);
  } catch (e) {
    // AuditLog自体のエラーは握りつぶさない（コンソールに出力）
    console.error('AuditLog error:', e);
  }
}

function getConfigValue_(ss, key) {
  const configSheet = ss.getSheetByName(TI_CONFIG.CONFIG_SHEET);
  if (!configSheet) return null;
  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setConfigValue_(ss, key, value) {
  const configSheet = getOrCreateSheet_(ss, TI_CONFIG.CONFIG_SHEET, ['Key', 'Value', 'Description']);
  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      configSheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // 存在しなければ追加
  configSheet.appendRow([key, value, '']);
}

function assignNextId_(ss) {
  const prefix = getConfigValue_(ss, 'ID_PREFIX') || 'SVD';
  const nextIdStr = getConfigValue_(ss, 'NEXT_ID') || (prefix + '-001');
  
  // 現在のIDから番号を抽出
  const match = nextIdStr.match(/(\d+)$/);
  const currentNum = match ? parseInt(match[1], 10) : 1;
  const newId = prefix + '-' + String(currentNum).padStart(3, '0');
  
  // 次のIDを更新
  const nextNum = currentNum + 1;
  setConfigValue_(ss, 'NEXT_ID', prefix + '-' + String(nextNum).padStart(3, '0'));
  
  return newId;
}

function findMasterRow_(masterSheet, staffId) {
  const data = masterSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][MASTER_COL.STAFF_ID] === staffId) {
      return i + 1; // 1-indexed for Sheets
    }
  }
  return -1;
}

function calcCategoryScores_(scores) {
  const avg = (arr) => arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length;
  const P = avg([scores.p1, scores.p2, scores.p3, scores.p4, scores.p5, scores.p6]);
  const S = avg([scores.s1, scores.s2, scores.s3, scores.s4, scores.s5, scores.s6]);
  const E = avg([scores.e1, scores.e2, scores.e3, scores.e4, scores.e5, scores.e6]);
  const M = avg([scores.m1, scores.m2, scores.m3, scores.m4, scores.m5, scores.m6]);
  return {
    P: parseFloat(P.toFixed(2)),
    S: parseFloat(S.toFixed(2)),
    E: parseFloat(E.toFixed(2)),
    M: parseFloat(M.toFixed(2))
  };
}

function calcTotalScore_(scores) {
  const keys = ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6',
                'e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'];
  return keys.reduce((sum, k) => sum + Number(scores[k] || 0), 0);
}

/**
 * スタッフの個別シートを検索（リネーム前後の両形式に対応）
 * - 旧: "Staff_SVD-001"
 * - 新: "SVD-001 池田千草"
 */
function findStaffSheet_(ss, staffId) {
  // ① 旧形式で検索
  const oldName = TI_CONFIG.STAFF_PREFIX + staffId;
  let sheet = ss.getSheetByName(oldName);
  if (sheet) return sheet;
  
  // ② 新形式（staffId + スペース + 名前）で検索
  const sheets = ss.getSheets();
  for (const s of sheets) {
    if (s.getName().startsWith(staffId + ' ')) return s;
  }
  
  return null;
}


// ═══════════════════════════════════════════════════════════
// RULE-BASED AI ADVICE (コストフリー)
// ═══════════════════════════════════════════════════════════
const ADVICE_DB = {
  performance: {
    low: ["🎯 表現力を高めるために、毎日5分間のプレゼン練習を始めましょう",
          "💡 お客様の前でのパフォーマンスを意識的に振り返る習慣をつけましょう",
          "📚 先輩のサービスを観察し、良い点をメモする習慣をつけましょう"],
    mid: ["👍 パフォーマンス力は着実に成長しています！次はより高い目標を設定しましょう",
          "🌟 自分の強みを活かしたオリジナルのサービススタイルを確立しましょう"],
    high: ["🏆 素晴らしいパフォーマンス力です！後輩への指導も意識してみましょう",
           "⭐ トップレベルのパフォーマンス力を維持しつつ、新しい挑戦を続けましょう"]
  },
  service: {
    low: ["💬 お客様との会話を楽しむ気持ちを大切にしましょう",
          "📝 サービスの基本動作を毎日確認する習慣をつけましょう",
          "👀 お客様の表情やしぐさに注目し、ニーズを先読みする練習をしましょう"],
    mid: ["🎯 サービススキルは順調です！より個別対応力を磨きましょう",
          "💡 リピーターのお客様の好みを覚えて、パーソナライズされたサービスを提供しましょう"],
    high: ["✨ 卓越したサービス力です！チーム全体のレベルアップに貢献しましょう",
           "🌟 あなたのサービスがお店の基準になっています。その姿勢を維持してください"]
  },
  expertise: {
    low: ["📖 毎日15分、ワインや料理の知識を学ぶ時間を設けましょう",
          "🍷 資格取得を目標に設定し、計画的に学習を進めましょう",
          "👨‍🍳 シェフやソムリエに積極的に質問する習慣をつけましょう"],
    mid: ["📚 専門知識が着実に身についています！次のステップの資格に挑戦しましょう",
          "🎓 学んだ知識を実践で活かす機会を意識的に作りましょう"],
    high: ["🏅 高い専門性を持っています！その知識をチームに共有しましょう",
           "📘 業界のトレンドを常にキャッチアップし、さらなる高みを目指しましょう"]
  },
  management: {
    low: ["📋 まずは自分のタスク管理を徹底することから始めましょう",
          "👥 小さなチーム活動でリーダーシップを発揮する機会を探しましょう",
          "⏰ 時間管理のスキルを磨き、効率的な働き方を身につけましょう"],
    mid: ["📊 マネジメント力が成長しています！より大きな責任に挑戦しましょう",
          "🤝 チームメンバーとの1on1コミュニケーションを増やしましょう"],
    high: ["👑 優れたマネジメント力です！次世代リーダーの育成に力を入れましょう",
           "🎯 チーム全体のビジョンを明確にし、メンバーを導いていきましょう"]
  },
  overall: {
    beginner: "🌱 素晴らしいスタートです！基礎をしっかり固めて、一歩一歩成長していきましょう。",
    developing: "🌿 着実に成長しています！強みを活かしつつ、弱点を意識的に改善していきましょう。",
    proficient: "🌳 高いレベルに達しています！次はチームへの貢献と後輩育成も意識しましょう。",
    expert: "🏆 エキスパートレベルです！あなたの存在がチーム全体の基準を引き上げています。",
    master: "👑 マスターレベルです！業界全体への貢献も視野に入れた活動を期待しています。"
  }
};

function generateAdvice_(scores) {
  const catScores = calcCategoryScores_(scores);
  const totalScore = calcTotalScore_(scores);
  
  const getLevel = (score) => score < 4 ? 'low' : score < 7 ? 'mid' : 'high';
  const getOverallLevel = (total) => {
    if (total < 72) return 'beginner';     // avg < 3.0
    if (total < 120) return 'developing';  // avg < 5.0
    if (total < 168) return 'proficient';  // avg < 7.0
    if (total < 204) return 'expert';      // avg < 8.5
    return 'master';
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const categories = [
    { key: 'performance', nameJp: 'パフォーマンス', score: catScores.P },
    { key: 'service', nameJp: 'サービス', score: catScores.S },
    { key: 'expertise', nameJp: '専門知識', score: catScores.E },
    { key: 'management', nameJp: 'マネジメント', score: catScores.M }
  ].sort((a, b) => a.score - b.score);
  
  const weakest = categories[0];
  const strongest = categories[3];
  
  return {
    totalScore: totalScore,
    overallLevel: getOverallLevel(totalScore),
    overallAdvice: ADVICE_DB.overall[getOverallLevel(totalScore)],
    strongest: { nameJp: strongest.nameJp, score: strongest.score, 
                 tip: pick(ADVICE_DB[strongest.key][getLevel(strongest.score)]) },
    growthFocus: { nameJp: weakest.nameJp, score: weakest.score,
                   tip: pick(ADVICE_DB[weakest.key][getLevel(weakest.score)]) },
    categoryScores: catScores
  };
}


// ═══════════════════════════════════════════════════════════
// doGet — READ OPERATIONS (ロックなし: 並列読み込み可)
// ═══════════════════════════════════════════════════════════
function doGet(e) {
  // ★ doGet にはロックをかけない — 並列でサクサク読める
  if (!verifyToken_(e)) return unauthorizedResponse_();

  try {
    const action = e.parameter.action || 'roster';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {

      // ── 全スタッフ一覧 (Dashboard用) ──
      case 'roster': {
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (!master) return jsonResponse_({ result: 'error', error: 'TI_Master sheet not found' });
        
        const rows = master.getDataRange().getValues();
        const staff = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[MASTER_COL.STAFF_ID] || row[MASTER_COL.STATUS] === 'archived') continue;
          staff.push({
            staffId: row[MASTER_COL.STAFF_ID],
            name: row[MASTER_COL.NAME],
            affiliation: row[MASTER_COL.AFFILIATION],
            hierarchyRole: row[MASTER_COL.HIERARCHY_ROLE],
            specialtyRoles: row[MASTER_COL.SPECIALTY_ROLES],
            jobTitle: row[MASTER_COL.JOB_TITLE],
            qualifications: row[MASTER_COL.QUALIFICATIONS],
            experience: row[MASTER_COL.EXPERIENCE],
            combatPower: row[MASTER_COL.COMBAT_POWER],
            categoryScores: row[MASTER_COL.CATEGORY_SCORES],
            positions: row[MASTER_COL.POSITIONS],
            shiftReady: row[MASTER_COL.SHIFT_READY],
            photoUrl: row[MASTER_COL.PHOTO_URL],
            lastEvaluated: row[MASTER_COL.LAST_EVALUATED],
            evalCount: row[MASTER_COL.EVAL_COUNT],
            status: row[MASTER_COL.STATUS] || 'active'
          });
        }
        return jsonResponse_({ result: 'success', staff: staff, count: staff.length, version: TI_CONFIG.VERSION });
      }

      // ── 個人プロフィール ──
      case 'profile': {
        const staffId = e.parameter.staffId;
        if (!staffId) return jsonResponse_({ result: 'error', error: 'staffId is required' });
        
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (!master) return jsonResponse_({ result: 'error', error: 'TI_Master not found' });
        
        const rows = master.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][MASTER_COL.STAFF_ID] === staffId) {
            const row = rows[i];
            return jsonResponse_({
              result: 'success',
              profile: {
                staffId: row[MASTER_COL.STAFF_ID],
                name: row[MASTER_COL.NAME],
                affiliation: row[MASTER_COL.AFFILIATION],
                hierarchyRole: row[MASTER_COL.HIERARCHY_ROLE],
                specialtyRoles: row[MASTER_COL.SPECIALTY_ROLES],
                jobTitle: row[MASTER_COL.JOB_TITLE],
                qualifications: row[MASTER_COL.QUALIFICATIONS],
                experience: row[MASTER_COL.EXPERIENCE],
                combatPower: row[MASTER_COL.COMBAT_POWER],
                categoryScores: row[MASTER_COL.CATEGORY_SCORES],
                positions: row[MASTER_COL.POSITIONS],
                shiftReady: row[MASTER_COL.SHIFT_READY],
                photoUrl: row[MASTER_COL.PHOTO_URL],
                lastEvaluated: row[MASTER_COL.LAST_EVALUATED],
                evalCount: row[MASTER_COL.EVAL_COUNT]
              }
            });
          }
        }
        return jsonResponse_({ result: 'error', error: 'Staff not found: ' + staffId });
      }

      // ── 評価履歴（成長曲線用） ──
      case 'history': {
        const staffId = e.parameter.staffId;
        if (!staffId) return jsonResponse_({ result: 'error', error: 'staffId is required' });
        
        const staffSheet = findStaffSheet_(ss, staffId);
        if (!staffSheet) return jsonResponse_({ result: 'error', error: 'Staff sheet not found for: ' + staffId });
        
        const rows = staffSheet.getDataRange().getValues();
        const history = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[STAFF_COL.TIMESTAMP]) continue;
          const record = {
            timestamp: row[STAFF_COL.TIMESTAMP],
            evaluator: row[STAFF_COL.EVALUATOR],
            evalType: row[STAFF_COL.EVAL_TYPE],
            totalScore: row[STAFF_COL.TOTAL_SCORE],
            memo: row[STAFF_COL.MEMO],
            scores: {}
          };
          const skillKeys = ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6',
                             'e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'];
          skillKeys.forEach((k, idx) => { record.scores[k] = row[STAFF_COL.P1 + idx]; });
          history.push(record);
        }
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return jsonResponse_({ result: 'success', history: history, count: history.length, version: TI_CONFIG.VERSION });
      }

      // ── AIアドバイス ──
      case 'advice': {
        const scores = {};
        ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6',
         'e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'].forEach(k => {
          scores[k] = e.parameter[k] || '0';
        });
        return jsonResponse_({ result: 'success', advice: generateAdvice_(scores), version: TI_CONFIG.VERSION });
      }

      // ── シフトエンジン用 Supply データ ──
      case 'shiftData': {
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (!master) return jsonResponse_({ result: 'error', error: 'TI_Master not found' });
        
        const rows = master.getDataRange().getValues();
        const supply = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[MASTER_COL.STAFF_ID] || row[MASTER_COL.STATUS] === 'archived') continue;
          if (row[MASTER_COL.SHIFT_READY] !== 'Y') continue;
          supply.push({
            staffId: row[MASTER_COL.STAFF_ID],
            name: row[MASTER_COL.NAME],
            cp: Number(row[MASTER_COL.COMBAT_POWER]) || 0,
            positions: String(row[MASTER_COL.POSITIONS] || ''),
            hierarchy: String(row[MASTER_COL.HIERARCHY_ROLE] || ''),
            specialties: String(row[MASTER_COL.SPECIALTY_ROLES] || ''),
            affiliation: row[MASTER_COL.AFFILIATION]
          });
        }
        return jsonResponse_({ result: 'success', supply: supply, count: supply.length, version: TI_CONFIG.VERSION });
      }

      // ── 組織マスタ Config ──
      case 'config': {
        const configSheet = ss.getSheetByName(TI_CONFIG.CONFIG_SHEET);
        if (!configSheet) return jsonResponse_({ result: 'error', error: 'TI_Config not found' });
        
        const data = configSheet.getDataRange().getValues();
        const config = {};
        for (let i = 1; i < data.length; i++) {
          if (data[i][0]) config[data[i][0]] = data[i][1];
        }
        return jsonResponse_({ result: 'success', config: config, version: TI_CONFIG.VERSION });
      }

      default:
        return jsonResponse_({ result: 'error', error: 'Unknown action: ' + action });
    }

  } catch (error) {
    auditLog_('doGet_error', '', '', { action: e.parameter?.action, error: error.toString() }, 'error');
    return jsonResponse_({ result: 'error', error: error.toString() });
  }
}


// ═══════════════════════════════════════════════════════════
// doPost — WRITE OPERATIONS (LockService 適用: 30秒)
// ═══════════════════════════════════════════════════════════
function doPost(e) {
  const lock = LockService.getScriptLock();
  const lockAcquired = lock.tryLock(30000);  // ★ 30秒 (GAS最大値)
  
  if (!lockAcquired) {
    return jsonResponse_({ result: 'error', error: 'Server busy. Please retry in a few seconds.' });
  }

  if (!verifyToken_(e)) {
    lock.releaseLock();
    return unauthorizedResponse_();
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const getParam = (name) => (e.parameter && e.parameter[name]) || '';
    const action = getParam('action') || 'save';

    switch (action) {

      // ═════════════════════════════════════
      // CREATE — 新規スタッフ登録
      // ═════════════════════════════════════
      case 'create': {
        const name = getParam('name');
        const affiliation = getParam('affiliation');
        const hierarchyRole = getParam('hierarchyRole') || '⑥';
        
        if (!name) return jsonResponse_({ result: 'error', error: 'name is required' });
        
        // ID自動採番
        const staffId = assignNextId_(ss);
        const sheetName = TI_CONFIG.STAFF_PREFIX + staffId;
        
        // 個人シート作成
        const staffSheet = ss.insertSheet(sheetName);
        staffSheet.appendRow(STAFF_HEADERS);
        staffSheet.getRange(1, 1, 1, STAFF_HEADERS.length).setFontWeight('bold');
        
        // TI_Master に追加
        const master = getOrCreateSheet_(ss, TI_CONFIG.MASTER_SHEET, MASTER_HEADERS);
        const masterRow = [
          staffId,                     // StaffID
          name,                        // Name
          affiliation,                 // Affiliation
          hierarchyRole,               // HierarchyRole
          getParam('specialtyRoles'),  // SpecialtyRoles
          getParam('jobTitle'),        // JobTitle
          getParam('qualifications'),  // Qualifications
          getParam('experience'),      // Experience
          0,                           // CombatPower (初期値)
          '{}',                        // CategoryScores (空JSON)
          getParam('positions'),       // Positions
          getParam('shiftReady') || 'Y', // ShiftReady
          '',                          // PhotoURL
          '',                          // LastEvaluated
          0,                           // EvalCount
          'active'                     // Status
        ];
        master.appendRow(masterRow);
        SpreadsheetApp.flush();
        
        auditLog_('create', getParam('user') || 'system', staffId, { name, affiliation }, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: '新規スタッフを登録しました: ' + name,
          staffId: staffId,
          sheetName: sheetName,
          version: TI_CONFIG.VERSION
        });
      }

      // ═════════════════════════════════════
      // SAVE — 評価記録 (ダブルライト)
      // ═════════════════════════════════════
      case 'save': {
        const staffId = getParam('staffId');
        if (!staffId) return jsonResponse_({ result: 'error', error: 'staffId is required' });
        
        const staffSheet = findStaffSheet_(ss, staffId);
        if (!staffSheet) return jsonResponse_({ result: 'error', error: 'Staff sheet not found for: ' + staffId });
        
        // スキルスコアを収集
        const scores = {};
        const skillKeys = ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6',
                           'e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'];
        skillKeys.forEach(k => { scores[k] = getParam(k) || '0'; });
        
        const totalScore = calcTotalScore_(scores);
        const catScores = calcCategoryScores_(scores);
        
        // ① Staff_[ID] に行追記
        const staffRow = [jstNow_(), getParam('evaluator'), getParam('evalType') || 'Manager'];
        skillKeys.forEach(k => staffRow.push(scores[k]));
        staffRow.push(totalScore);
        staffRow.push(getParam('memo'));
        staffSheet.appendRow(staffRow);
        
        // ② TI_Master 更新
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (master) {
          const masterRow = findMasterRow_(master, staffId);
          if (masterRow > 0) {
            master.getRange(masterRow, MASTER_COL.COMBAT_POWER + 1).setValue(totalScore);
            master.getRange(masterRow, MASTER_COL.CATEGORY_SCORES + 1).setValue(JSON.stringify(catScores));
            master.getRange(masterRow, MASTER_COL.LAST_EVALUATED + 1).setValue(jstNow_());
            const currentCount = master.getRange(masterRow, MASTER_COL.EVAL_COUNT + 1).getValue();
            master.getRange(masterRow, MASTER_COL.EVAL_COUNT + 1).setValue((Number(currentCount) || 0) + 1);
          }
        }
        
        // ③ flush
        SpreadsheetApp.flush();
        
        // ④ AIアドバイス生成
        const advice = generateAdvice_(scores);
        
        // ⑤ AuditLog
        auditLog_('save', getParam('evaluator'), staffId, { totalScore, catScores }, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: '評価データを保存しました',
          staffId: staffId,
          totalScore: totalScore,
          categoryScores: catScores,
          advice: advice,
          version: TI_CONFIG.VERSION
        });
      }

      // ═════════════════════════════════════
      // UPDATE — プロフィール更新
      // ═════════════════════════════════════
      case 'update': {
        const staffId = getParam('staffId');
        if (!staffId) return jsonResponse_({ result: 'error', error: 'staffId is required' });
        
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (!master) return jsonResponse_({ result: 'error', error: 'TI_Master not found' });
        
        const masterRow = findMasterRow_(master, staffId);
        if (masterRow < 0) return jsonResponse_({ result: 'error', error: 'Staff not found: ' + staffId });
        
        const updates = {};
        const fieldMap = {
          'name': MASTER_COL.NAME,
          'affiliation': MASTER_COL.AFFILIATION,
          'hierarchyRole': MASTER_COL.HIERARCHY_ROLE,
          'specialtyRoles': MASTER_COL.SPECIALTY_ROLES,
          'jobTitle': MASTER_COL.JOB_TITLE,
          'qualifications': MASTER_COL.QUALIFICATIONS,
          'experience': MASTER_COL.EXPERIENCE,
          'positions': MASTER_COL.POSITIONS,
          'shiftReady': MASTER_COL.SHIFT_READY
        };
        
        Object.entries(fieldMap).forEach(([param, col]) => {
          const val = getParam(param);
          if (val) {
            master.getRange(masterRow, col + 1).setValue(val);
            updates[param] = val;
          }
        });
        
        SpreadsheetApp.flush();
        auditLog_('update', getParam('user') || 'system', staffId, updates, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: 'プロフィールを更新しました',
          staffId: staffId,
          updates: updates,
          version: TI_CONFIG.VERSION
        });
      }

      // ═════════════════════════════════════
      // ARCHIVE — 非アクティブ化
      // ═════════════════════════════════════
      case 'archive': {
        const staffId = getParam('staffId');
        if (!staffId) return jsonResponse_({ result: 'error', error: 'staffId is required' });
        
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (!master) return jsonResponse_({ result: 'error', error: 'TI_Master not found' });
        
        const masterRow = findMasterRow_(master, staffId);
        if (masterRow < 0) return jsonResponse_({ result: 'error', error: 'Staff not found: ' + staffId });
        
        master.getRange(masterRow, MASTER_COL.STATUS + 1).setValue('archived');
        SpreadsheetApp.flush();
        
        auditLog_('archive', getParam('user') || 'system', staffId, {}, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: 'スタッフをアーカイブしました: ' + staffId,
          version: TI_CONFIG.VERSION
        });
      }

      // ═════════════════════════════════════
      // UPLOAD PHOTO — Google Drive保存
      // ═════════════════════════════════════
      case 'uploadPhoto': {
        const staffId = getParam('staffId');
        const photoData = getParam('photoData');
        if (!staffId || !photoData) {
          return jsonResponse_({ result: 'error', error: 'staffId and photoData are required' });
        }
        
        // Base64デコード → Blob
        const base64Match = photoData.match(/^data:(.+);base64,(.+)$/);
        if (!base64Match) return jsonResponse_({ result: 'error', error: 'Invalid Base64 format' });
        
        const mimeType = base64Match[1];
        const base64Content = base64Match[2];
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, staffId + '_photo.jpg');
        
        // Drive保存
        const folderId = getConfigValue_(ss, 'PHOTO_FOLDER_ID');
        let folder;
        if (folderId) {
          folder = DriveApp.getFolderById(folderId);
        } else {
          // フォルダ未設定の場合、ルートに保存（初回のみ）
          folder = DriveApp.getRootFolder();
        }
        
        const file = folder.createFile(blob);
        // 🚨 権限設定 — これを忘れるとフロントで画像がリンク切れ
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        const photoUrl = 'https://drive.google.com/uc?id=' + file.getId();
        
        // TI_Master更新
        const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
        if (master) {
          const masterRow = findMasterRow_(master, staffId);
          if (masterRow > 0) {
            master.getRange(masterRow, MASTER_COL.PHOTO_URL + 1).setValue(photoUrl);
          }
        }
        SpreadsheetApp.flush();
        
        auditLog_('uploadPhoto', getParam('user') || 'system', staffId, { photoUrl }, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: '写真をアップロードしました',
          staffId: staffId,
          photoUrl: photoUrl,
          version: TI_CONFIG.VERSION
        });
      }

      // ═════════════════════════════════════
      // MIGRATE — v2.1 → v3.0 バッチ移行
      // ═════════════════════════════════════
      case 'migrate': {
        const offset = parseInt(getParam('offset') || '0', 10);
        const batchSize = parseInt(getParam('batchSize') || '10', 10);
        
        const oldSheet = ss.getSheetByName('StaffData');
        if (!oldSheet) return jsonResponse_({ result: 'error', error: 'StaffData sheet not found' });
        
        const master = getOrCreateSheet_(ss, TI_CONFIG.MASTER_SHEET, MASTER_HEADERS);
        
        // 全行を読み込み
        const rows = oldSheet.getDataRange().getValues();
        const oldHeaders = rows[0];
        
        // ユニーク名前一覧を取得
        const namesSet = new Set();
        for (let i = 1; i < rows.length; i++) {
          const name = rows[i][1]; // Name列
          if (name) namesSet.add(name);
        }
        const allNames = Array.from(namesSet).sort();
        
        // バッチ分割
        const chunk = allNames.slice(offset, offset + batchSize);
        const migrated = [];
        
        chunk.forEach(name => {
          // ID採番
          const staffId = assignNextId_(ss);
          const sheetName = TI_CONFIG.STAFF_PREFIX + staffId;
          
          // 個人シート作成
          const staffSheet = ss.insertSheet(sheetName);
          staffSheet.appendRow(STAFF_HEADERS);
          staffSheet.getRange(1, 1, 1, STAFF_HEADERS.length).setFontWeight('bold');
          
          // このスタッフの全履歴を取得
          // 旧 StaffData ヘッダー:
          //   0:Timestamp, 1:Name, 2:Affiliation, 3:JobTitle,
          //   4:TypeSelf, 5:TypeOther, 6:TotalScore, 7:Qualifications,
          //   8:QualScore, 9:MeisterRank,
          //   10:p1..15:p6, 16:s1..21:s6, 22:e1..27:e6, 28:m1..33:m6
          let latestRow = null;
          let evalCount = 0;
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][1] !== name) continue;
            
            const oldRow = rows[i];
            evalCount++;
            latestRow = oldRow;
            
            // 個人シートに転記
            const staffRow = [
              oldRow[0],  // Timestamp
              '',         // Evaluator (旧データにはない)
              'Legacy',   // EvalType
            ];
            // スキルスコア: 旧index 10(p1)〜33(m6) = 24列
            const OLD_SKILL_START = 10;
            for (let j = 0; j < 24; j++) {
              staffRow.push(oldRow[OLD_SKILL_START + j] || 0);
            }
            staffRow.push(oldRow[6] || 0);  // TotalScore (旧index 6)
            staffRow.push('v2.1からの移行データ');  // Memo
            
            staffSheet.appendRow(staffRow);
          }
          
          // TI_Masterに追加 (最新データを使用)
          if (latestRow) {
            // 最新行のスキルスコアからCategoryScoresを計算
            const latestScores = {};
            const skillKeys = ['p1','p2','p3','p4','p5','p6','s1','s2','s3','s4','s5','s6',
                               'e1','e2','e3','e4','e5','e6','m1','m2','m3','m4','m5','m6'];
            skillKeys.forEach((k, idx) => {
              latestScores[k] = latestRow[10 + idx] || 0;
            });
            const catScores = calcCategoryScores_(latestScores);
            
            const masterEntry = [
              staffId,
              name,
              latestRow[2] || '',                // Affiliation
              '',                                 // HierarchyRole (旧にはない → 後で設定)
              '',                                 // SpecialtyRoles (旧にはない → 後で設定)
              latestRow[3] || '',                // JobTitle
              latestRow[7] || '',                // Qualifications
              '',                                 // Experience
              latestRow[6] || 0,                 // CombatPower (TotalScore)
              JSON.stringify(catScores),          // CategoryScores (計算済み)
              '',                                 // Positions (後で設定)
              'Y',                               // ShiftReady
              '',                                 // PhotoURL (旧Base64は移行しない)
              latestRow[0] || '',                // LastEvaluated
              evalCount,                          // EvalCount
              'active'                           // Status
            ];
            master.appendRow(masterEntry);
          }
          
          migrated.push({ name, staffId, sheetName, evalCount });
        });
        
        SpreadsheetApp.flush();
        auditLog_('migrate', getParam('user') || 'system', '', 
                  { offset, batchSize, migrated: migrated.length, total: allNames.length }, 'success');
        
        return jsonResponse_({
          result: 'success',
          message: `${migrated.length}名のデータを移行しました (${offset}〜${offset + migrated.length} / ${allNames.length})`,
          migrated: migrated,
          totalStaff: allNames.length,
          nextOffset: offset + batchSize,
          hasMore: (offset + batchSize) < allNames.length,
          version: TI_CONFIG.VERSION
        });
      }

      default:
        return jsonResponse_({ result: 'error', error: 'Unknown action: ' + action });
    }

  } catch (error) {
    auditLog_('doPost_error', '', '', { action: e.parameter?.action, error: error.toString() }, 'error');
    return jsonResponse_({ result: 'error', error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}


// ═══════════════════════════════════════════════════════════
// SETUP — 初期設定 (手動実行)
// ═══════════════════════════════════════════════════════════
function setupTIv3() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // TI_Master
  getOrCreateSheet_(ss, TI_CONFIG.MASTER_SHEET, MASTER_HEADERS);
  
  // TI_Config
  const configSheet = getOrCreateSheet_(ss, TI_CONFIG.CONFIG_SHEET, ['Key', 'Value', 'Description']);
  const defaults = [
    ['VERSION', '3.0', 'Backend version'],
    ['MAX_STAFF', '60', 'Maximum staff count'],
    ['NEXT_ID', 'SVD-001', 'Next auto-assigned ID'],
    ['ID_PREFIX', 'SVD', 'ID prefix (change for other orgs)'],
    ['PHOTO_FOLDER_ID', '', 'Google Drive folder ID for photos'],
    ['LOCATIONS', 'JW,NP,BQ,GA,BG,RYB,RP,Ce', 'Available locations'],
    ['POSITIONS', 'Kitchen,Hall,Bar,Reception', 'Available positions'],
    ['HIERARCHY', '①Directeur,②Maître,③CdR1,④CdR2,⑤Commis,⑥Staff', 'Hierarchy levels'],
    ['SPECIALTIES', 'sommelier,barman,cuisinier,patissier,hotesse', 'Specialty roles'],
    ['EVAL_CATEGORIES', 'P:Performance,S:Service,E:Expertise,M:Management', 'Evaluation categories']
  ];
  defaults.forEach(row => {
    if (!getConfigValue_(ss, row[0])) {
      configSheet.appendRow(row);
    }
  });
  
  // TI_AuditLog
  getOrCreateSheet_(ss, TI_CONFIG.AUDIT_SHEET, AUDIT_HEADERS);
  
  Logger.log('TI v3.0 setup complete! Sheets created: TI_Master, TI_Config, TI_AuditLog');
}


// ═══════════════════════════════════════════════════════════
// CLEANUP — Self/Manager重複マージ (手動実行)
// ═══════════════════════════════════════════════════════════
function cleanupMergeDuplicates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
  if (!master) { Logger.log('TI_Master not found'); return; }
  
  // ── マッピングテーブル（SATが確認済み） ──
  const MERGE_MAP = [
    // [Self ID, Manager ID] — Manager評価のデータをSelf側にマージ
    ['SVD-001', 'SVD-041'],  // CHIGSA IKEDA ↔ 評価）池田 千草
    ['SVD-002', 'SVD-044'],  // ENDO CHIYUKI ↔ 評価）遠藤 千雪
    ['SVD-003', 'SVD-031'],  // Harasaki Miu ↔ 評価）原崎 美羽
    ['SVD-004', 'SVD-032'],  // KAYAYURINA ↔ 評価）嘉屋 ゆりな
    ['SVD-005', 'SVD-036'],  // ManamiMurayama ↔ 評価）村山 愛美
    ['SVD-007', 'SVD-037'],  // MuramatsuRyosuke ↔ 評価）村松 良介
    ['SVD-008', 'SVD-025'],  // 三品 真二 ↔ 評価）三品 真二
    ['SVD-009', 'SVD-026'],  // 三谷 まどか ↔ 評価）三谷 まどか
    ['SVD-010', 'SVD-027'],  // 下田 このみ ↔ 評価）下田 このみ
    ['SVD-012', 'SVD-028'],  // 佐藤 勝則 ↔ 評価）佐藤 勝則
    ['SVD-013', 'SVD-029'],  // 佐藤 友哉 ↔ 評価）佐藤 友哉
    ['SVD-014', 'SVD-030'],  // 八幡梢 ↔ 評価）八幡 梢
    ['SVD-015', 'SVD-033'],  // 山口 祥隆 ↔ 評価）山口 祥隆
    ['SVD-016', 'SVD-034'],  // 後藤 義人 ↔ 評価）後藤 義人
    ['SVD-017', 'SVD-035'],  // 杉田里美 ↔ 評価）杉田 里美
    ['SVD-018', 'SVD-039'],  // 毛利 颯真 ↔ 評価）毛利 颯真
    ['SVD-019', 'SVD-038'],  // 毛利勲 ↔ 評価）毛利 勲
    ['SVD-020', 'SVD-040'],  // 水上 貴 ↔ 評価）水上 貴
    ['SVD-021', 'SVD-042'],  // 牛田智之 ↔ 評価）牛田 智之
    ['SVD-022', 'SVD-043'],  // 畠山慎一 ↔ 評価）畠山 慎一
    ['SVD-023', 'SVD-024'],  // 記虎草士 ↔ 評価）記虎 草士
    ['SVD-046', 'SVD-045'],  // 長田 翔哉 ↔ 評価）長田 翔哉
  ];
  
  let merged = 0;
  let errors = [];
  
  MERGE_MAP.forEach(([selfId, mgrId]) => {
    try {
      const mgrSheetName = TI_CONFIG.STAFF_PREFIX + mgrId;
      const selfSheetName = TI_CONFIG.STAFF_PREFIX + selfId;
      
      const mgrSheet = ss.getSheetByName(mgrSheetName);
      const selfSheet = ss.getSheetByName(selfSheetName);
      
      if (!mgrSheet) { errors.push(`${mgrId}: sheet not found`); return; }
      if (!selfSheet) { errors.push(`${selfId}: sheet not found`); return; }
      
      // Manager評価のデータをSelf側にコピー（evalType=Managerに上書き）
      const mgrData = mgrSheet.getDataRange().getValues();
      for (let i = 1; i < mgrData.length; i++) {
        const row = mgrData[i];
        if (!row[0]) continue; // Timestamp がないならスキップ
        
        // evalTypeを「Manager」に修正
        row[STAFF_COL.EVAL_TYPE] = 'Manager';
        selfSheet.appendRow(row);
      }
      
      // Self側の既存データのevalTypeを「Self」に修正
      const selfData = selfSheet.getDataRange().getValues();
      for (let i = 1; i < selfData.length; i++) {
        if (selfData[i][STAFF_COL.EVAL_TYPE] === 'Legacy') {
          selfSheet.getRange(i + 1, STAFF_COL.EVAL_TYPE + 1).setValue('Self');
        }
      }
      
      // Manager側のMasterレコードをarchive
      const mgrRow = findMasterRow_(master, mgrId);
      if (mgrRow > 0) {
        master.getRange(mgrRow, MASTER_COL.STATUS + 1).setValue('archived');
      }
      
      merged++;
      Logger.log(`✅ Merged: ${mgrId} → ${selfId}`);
    } catch (e) {
      errors.push(`${selfId}↔${mgrId}: ${e.toString()}`);
    }
  });
  
  // ── 退職者アーカイブ（SVD-006 Mirai Oguro） ──
  const retiredRow = findMasterRow_(master, 'SVD-006');
  if (retiredRow > 0) {
    master.getRange(retiredRow, MASTER_COL.STATUS + 1).setValue('archived');
    Logger.log('📦 Archived: SVD-006 (退職者)');
  }
  
  // ── Self側のevalCountを更新 ──
  const masterData = master.getDataRange().getValues();
  for (let i = 1; i < masterData.length; i++) {
    const staffId = masterData[i][MASTER_COL.STAFF_ID];
    if (!staffId || masterData[i][MASTER_COL.STATUS] === 'archived') continue;
    
    const staffSheet = findStaffSheet_(ss, staffId);
    if (!staffSheet) continue;
    
    const evalCount = Math.max(staffSheet.getLastRow() - 1, 0);
    master.getRange(i + 1, MASTER_COL.EVAL_COUNT + 1).setValue(evalCount);
  }
  
  SpreadsheetApp.flush();
  
  auditLog_('cleanup', 'system', '', 
    { merged, errors: errors.length, retired: ['SVD-006'] }, 'success');
  
  Logger.log(`\n🧹 Cleanup complete! Merged: ${merged}, Errors: ${errors.length}`);
  if (errors.length > 0) Logger.log('Errors: ' + errors.join('\n'));
}


// ═══════════════════════════════════════════════════════════
// DIRECTORY — スタッフ一覧シート自動生成
// ═══════════════════════════════════════════════════════════

/**
 * スプレッドシートを開いた時にメニューを表示
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TI Tools')
    .addItem('📋 Directoryを更新', 'buildDirectory')
    .addItem('🔧 シートを整理', 'organizeSheets')
    .addToUi();
}

/**
 * シートを整理:
 * 1. TI_Master を一番前に移動
 * 2. 個別シートのタブ名に名前を追加（Staff_SVD-001 → SVD-001 池田千草）
 */
function organizeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
  
  if (!master) {
    SpreadsheetApp.getUi().alert('❌ TI_Master が見つかりません');
    return;
  }
  
  // ① TI_Master を一番前に移動
  ss.setActiveSheet(master);
  ss.moveActiveSheet(1);
  
  // ② 名前マップを TI_Master から構築
  const rows = master.getDataRange().getValues();
  const nameMap = {};  // { 'SVD-001': '池田千草', ... }
  for (let i = 1; i < rows.length; i++) {
    const id = rows[i][MASTER_COL.STAFF_ID];
    const name = rows[i][MASTER_COL.NAME];
    if (id && name) nameMap[id] = name;
  }
  
  // ③ 個別シートのタブ名をリネーム
  let renamed = 0;
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const current = sheet.getName();
    const prefix = TI_CONFIG.STAFF_PREFIX; // "Staff_"
    
    if (!current.startsWith(prefix)) return;
    
    // "Staff_SVD-001" → "SVD-001"
    const staffId = current.replace(prefix, '');
    const staffName = nameMap[staffId];
    
    if (!staffName) return;
    
    // 新しいタブ名: "SVD-001 池田千草"
    const newName = staffId + ' ' + staffName;
    
    if (current !== prefix + staffId && current === newName) return; // 既にリネーム済み
    
    try {
      sheet.setName(newName);
      renamed++;
    } catch (e) {
      Logger.log('Rename failed for ' + current + ': ' + e.toString());
    }
  });
  
  SpreadsheetApp.getUi().alert(
    '✅ シート整理完了\n\n' +
    '・TI_Master を先頭に移動しました\n' +
    '・' + renamed + '件のシートに名前を追加しました'
  );
}

/**
 * TI_Master から Directory シートを自動生成
 * - StaffID | 名前 | 所属 | 役職 | 資格 | HBS | シフト | ステータス
 * - TI_Master が Single Source of Truth（揺らぎゼロ）
 */
function buildDirectory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(TI_CONFIG.MASTER_SHEET);
  
  if (!master) {
    SpreadsheetApp.getUi().alert('❌ TI_Master シートが見つかりません');
    return;
  }
  
  const rows = master.getDataRange().getValues();
  const staff = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const staffId = row[MASTER_COL.STAFF_ID];
    if (!staffId) continue;
    
    staff.push([
      staffId,
      row[MASTER_COL.NAME] || '',
      row[MASTER_COL.AFFILIATION] || '',
      row[MASTER_COL.JOB_TITLE] || '',
      row[MASTER_COL.QUALIFICATIONS] || '',
      row[MASTER_COL.COMBAT_POWER] || 0,
      row[MASTER_COL.SHIFT_READY] || '',
      row[MASTER_COL.STATUS] || 'active'
    ]);
  }
  
  // staffId の数値順でソート
  staff.sort((a, b) => {
    const na = parseInt(a[0].replace(/\D/g, '')) || 0;
    const nb = parseInt(b[0].replace(/\D/g, '')) || 0;
    return na - nb;
  });
  
  // Directory シートを作成/クリア
  let dirSheet = ss.getSheetByName('Directory');
  if (!dirSheet) {
    dirSheet = ss.insertSheet('Directory');
    ss.setActiveSheet(dirSheet);
    ss.moveActiveSheet(2);
  }
  dirSheet.clearContents();
  dirSheet.clearFormats();
  
  // ヘッダー
  const headers = ['Staff ID', '名前', '所属', '役職', '資格', 'HBS', 'シフト', 'ステータス'];
  dirSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダーのスタイル
  const headerRange = dirSheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#b8965c');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  // データ書き込み
  if (staff.length > 0) {
    dirSheet.getRange(2, 1, staff.length, headers.length).setValues(staff);
  }
  
  // 列幅の自動調整
  headers.forEach((_, i) => dirSheet.autoResizeColumn(i + 1));
  
  // 交互行の色付け
  for (let i = 2; i <= staff.length + 1; i++) {
    if (i % 2 === 0) {
      dirSheet.getRange(i, 1, 1, headers.length).setBackground('#faf7f2');
    }
  }
  
  // archived 行をグレーアウト
  for (let i = 0; i < staff.length; i++) {
    if (staff[i][7] === 'archived') {
      dirSheet.getRange(i + 2, 1, 1, headers.length)
        .setBackground('#e0e0e0')
        .setFontColor('#999999');
    }
  }
  
  // フリーズ
  dirSheet.setFrozenRows(1);
  
  const activeCount = staff.filter(s => s[7] !== 'archived').length;
  
  SpreadsheetApp.getUi().alert(
    '✅ Directory 更新完了\n\n' +
    '全スタッフ: ' + staff.length + '名\n' +
    'アクティブ: ' + activeCount + '名\n' +
    'アーカイブ: ' + (staff.length - activeCount) + '名'
  );
}
