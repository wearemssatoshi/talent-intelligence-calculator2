/* ═══════════════════════════════════════════════════
   MOMENTUM PEAKS — Dashboard Application Logic
   ═══════════════════════════════════════════════════ */

// ── Global State ──
let DATA = null;        // mp_data.json
let RESERVES = null;    // reservations.csv (optional)
let STAFFING = null;    // staffing_rules.csv (optional)
let charts = {};        // Chart.js instances
let currentTab = 'command';
let selectedDate = '';
let selectedStore = 'JW';
let selectedBase = 'ALL';  // 拠点フィルタ: 'ALL' or base id
let selectedStoreFilter = 'ALL'; // 店舗フィルタ: 'ALL' or store id
let displayTaxExc = true;  // true=税抜表示, false=税込表示
let ONHAND_DATA = [];       // OnHand records from GAS MP_OnHand sheet

// ── 店舗キャパシティ & OnHand統合設定（SAT × G 設計 2026-03-07） ──
// 満席しきい値を超えた場合: 予約人数×客単価で確定
const STORE_CAPACITY = {
    'JW': { fullThreshold: 36, seats: 46, note: '15卓40席+PS4+LS2' },
    'NP': { fullThreshold: 30, seats: 65, note: '12卓48席+PS4+VIP13, 通常満席25名' },
    'GA': { fullThresholdLunch: 34, fullThresholdDinner: 30, seats: 55, note: '11卓42席+個室3室13名' },
    'BQ': { fullThreshold: 20, seats: 32, note: '6卓24席+サロン8名' },
};

// ═══════════════════════════════════════════════════════════════
// STORE_SCHEMA v3 — Single Source of Truth for all column definitions
// ═══════════════════════════════════════════════════════════════
// 各エントリ: [gasKey, channelId, field]
// gasKey = GASスプレッドシートのヘッダー名
// channelId = channels オブジェクトのキー
// field = チャネル内のフィールド名 (food/drink/count/sales/tent/room/flower/goods)
const STORE_SCHEMA = {
    'JW': {
        gasSheet: 'MOIWA_JW',
        columns: [
            ['L_Food', 'LUNCH', 'food'], ['L_Drink', 'LUNCH', 'drink'], ['L人数', 'LUNCH', 'count'],
            ['D_Food', 'DINNER', 'food'], ['D_Drink', 'DINNER', 'drink'], ['D人数', 'DINNER', 'count'],
            ['TO_Food', 'T.O', 'food'], ['TO_Drink', 'T.O', 'drink'],
            ['席料', '席料', 'sales'], ['南京錠', '南京錠', 'sales'], ['花束', '花束', 'sales'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'GA': {
        gasSheet: 'TVTOWER_GA',
        columns: [
            ['L_Food', 'LUNCH', 'food'], ['L_Drink', 'LUNCH', 'drink'], ['L人数', 'LUNCH', 'count'],
            ['D_Food', 'DINNER', 'food'], ['D_Drink', 'DINNER', 'drink'], ['D人数', 'DINNER', 'count'],
            ['3CH_Food', '3CH', 'food'], ['3CH_Drink', '3CH', 'drink'], ['3CH人数', '3CH', 'count'],
            ['宴会_Food', 'BANQUET', 'food'], ['宴会_Drink', 'BANQUET', 'drink'], ['宴会人数', 'BANQUET', 'count'],
            ['室料', '室料', 'sales'], ['展望台', '展望台', 'sales'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'BG': {
        gasSheet: 'TVTOWER_BG',
        columns: [
            ['Food', 'ALL', 'food'], ['Drink', 'ALL', 'drink'], ['Tent', 'ALL', 'tent'], ['人数', 'ALL', 'count'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'NP': {
        gasSheet: 'OKURAYAMA_NP',
        columns: [
            ['L_Food', 'LUNCH', 'food'], ['L_Drink', 'LUNCH', 'drink'], ['L人数', 'LUNCH', 'count'],
            ['D_Food', 'DINNER', 'food'], ['D_Drink', 'DINNER', 'drink'], ['D人数', 'DINNER', 'count'],
            ['室料', '室料', 'sales'], ['花束', '花束', 'sales'],
            ['Event_Food', 'EVENT', 'food'], ['Event_Drink', 'EVENT', 'drink'], ['Event人数', 'EVENT', 'count'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'Ce': {
        gasSheet: 'OKURAYAMA_Ce',
        readAlias: 'CAFE',  // 読み込み時: ALL → CAFE
        columns: [
            ['Food', 'ALL', 'food'], ['Drink', 'ALL', 'drink'], ['人数', 'ALL', 'count'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'RP': {
        gasSheet: 'OKURAYAMA_RP',
        readAlias: 'CAFE',  // 読み込み時: ALL → CAFE
        columns: [
            ['Food', 'ALL', 'food'], ['Drink', 'ALL', 'drink'], ['人数', 'ALL', 'count'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'BQ': {
        gasSheet: 'AKARENGA_BQ',
        columns: [
            ['L_Food', 'LUNCH', 'food'], ['L_Drink', 'LUNCH', 'drink'], ['L人数', 'LUNCH', 'count'],
            ['AT_Food', 'AFTERNOON_TEA', 'food'], ['AT_Drink', 'AFTERNOON_TEA', 'drink'], ['AT人数', 'AFTERNOON_TEA', 'count'],
            ['D_Food', 'DINNER', 'food'], ['D_Drink', 'DINNER', 'drink'], ['D人数', 'DINNER', 'count'],
            ['席料', '席料', 'sales'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    },
    'RYB': {
        gasSheet: 'AKARENGA_RYB',
        columns: [
            ['Food', 'ALL', 'food'], ['Drink', 'ALL', 'drink'], ['人数', 'ALL', 'count'],
            ['物販_食品', '物販_食品', 'sales'], ['物販_アパレル', '物販_アパレル', 'sales']
        ]
    }
};

// ── STORE_SCHEMA v3 Auto-Generated Functions ──

/**
 * buildChannelsFromSchema — GASレコードからchannelsオブジェクトを自動構築
 * @param {string} storeId - 店舗ID
 * @param {Object} rec - GASから取得した1レコード（key-valueオブジェクト）
 * @returns {Object} channels - { LUNCH: {sales,count,food,drink}, ... }
 */
function buildChannelsFromSchema(storeId, rec) {
    const schema = STORE_SCHEMA[storeId];
    if (!schema) return {};
    const channels = {};
    schema.columns.forEach(([gasKey, chId, field]) => {
        const val = Number(rec[gasKey]) || 0;
        // readAlias: Ce/RPのALL → CAFE変換
        const actualChId = (schema.readAlias && chId === 'ALL') ? schema.readAlias : chId;
        if (!channels[actualChId]) channels[actualChId] = {};
        channels[actualChId][field] = val;
    });
    // salesの自動計算: food + drink がある場合
    Object.entries(channels).forEach(([chId, data]) => {
        if (data.food !== undefined && data.drink !== undefined && data.sales === undefined) {
            data.sales = (data.food || 0) + (data.drink || 0) + (data.tent || 0);
        }
    });
    return channels;
}

/**
 * channelsToGASValuesFromSchema — channelsからGAS保存用の値配列を自動生成
 * @param {string} storeId - 店舗ID
 * @param {Object} channels - { LUNCH: {food, drink, count}, DINNER: {...}, ... }
 * @returns {Array} GAS列順の値配列（dateは含まない）
 */
function channelsToGASValuesFromSchema(storeId, channels) {
    const schema = STORE_SCHEMA[storeId];
    if (!schema) return [];
    return schema.columns.map(([gasKey, chId, field]) => {
        // readAlias逆変換: CAFE → ALL (保存時)
        const actualChId = (schema.readAlias && chId === 'ALL') ? schema.readAlias : chId;
        const chData = channels[actualChId] || {};
        return chData[field] || 0;
    });
}

/**
 * validateSchemaAgainstGAS — STORE_SCHEMAとGAS STORE_SHEETSのヘッダー数を検証
 * @param {Object} storeSheets - GASから取得したSTORE_SHEETS定義
 * @returns {Array} エラーメッセージ配列（空なら正常）
 */
function validateSchemaAgainstGAS(storeSheets) {
    const errors = [];
    Object.entries(STORE_SCHEMA).forEach(([storeId, schema]) => {
        const gasConfig = storeSheets[schema.gasSheet];
        if (!gasConfig) {
            errors.push(`${storeId}: GASシート '${schema.gasSheet}' が見つかりません`);
            return;
        }
        // GASヘッダーの最初は 'date'、STORE_SCHEMAにはdateを含まない
        const gasColCount = gasConfig.headers.length - 1; // dateを除く
        const schemaColCount = schema.columns.length;
        if (gasColCount !== schemaColCount) {
            errors.push(`${storeId}: GASヘッダー${gasColCount}列 ≠ SCHEMA ${schemaColCount}列`);
        }
    });
    return errors;
}


// This config never changes — it's the SVD organizational structure.
// GAS handles dynamic data (actuals), this handles static structure.
const SVD_CONFIG = {
    bases: [
        { id: 'MOIWAYAMA', name: '藻岩山', stores: [{ id: 'JW', name: 'THE JEWELS' }] },
        { id: 'OKURAYAMA', name: '大倉山', stores: [{ id: 'NP', name: 'ヌーベルプース大倉山' }, { id: 'Ce', name: 'セレステ' }, { id: 'RP', name: 'ルポ' }] },
        { id: 'TV_TOWER', name: 'テレビ塔', stores: [{ id: 'GA', name: 'THE GARDEN SAPPORO HOKKAIDO GRILLE' }, { id: 'BG', name: 'さっぽろテレビ塔ビアガーデン' }] },
        { id: 'AKARENGA', name: '赤れんがテラス', stores: [{ id: 'BQ', name: 'LA BRIQUE SAPPORO Akarenga Terrace' }, { id: 'RYB', name: 'ルスツ羊蹄とんかつテラス by BQ' }] }
    ],
    sekki_levels: {
        '白露': { rank: 1, season: 'TOP SEASON', pt: 5.0 }, '立秋': { rank: 2, season: 'TOP SEASON', pt: 4.83 },
        '冬至': { rank: 3, season: 'TOP SEASON', pt: 4.65 }, '小暑': { rank: 4, season: 'TOP SEASON', pt: 4.48 },
        '処暑': { rank: 5, season: 'TOP SEASON', pt: 4.3 }, '大雪': { rank: 6, season: 'HIGH SEASON', pt: 4.13 },
        '夏至': { rank: 7, season: 'HIGH SEASON', pt: 3.96 }, '秋分': { rank: 8, season: 'HIGH SEASON', pt: 3.78 },
        '大暑': { rank: 9, season: 'HIGH SEASON', pt: 3.61 }, '芒種': { rank: 10, season: 'HIGH SEASON', pt: 3.43 },
        '寒露': { rank: 11, season: 'FLOW SEASON', pt: 3.26 }, '立春': { rank: 12, season: 'FLOW SEASON', pt: 3.09 },
        '立夏': { rank: 13, season: 'FLOW SEASON', pt: 2.91 }, '小満': { rank: 14, season: 'FLOW SEASON', pt: 2.74 },
        '霜降': { rank: 15, season: 'FLOW SEASON', pt: 2.57 }, '啓蟄': { rank: 16, season: 'LOW SEASON', pt: 2.39 },
        '春分': { rank: 17, season: 'LOW SEASON', pt: 2.22 }, '穀雨': { rank: 18, season: 'LOW SEASON', pt: 2.04 },
        '小雪': { rank: 19, season: 'LOW SEASON', pt: 1.87 }, '雨水': { rank: 20, season: 'LOW SEASON', pt: 1.7 },
        '大寒': { rank: 21, season: 'OFF SEASON', pt: 1.52 }, '小寒': { rank: 22, season: 'OFF SEASON', pt: 1.35 },
        '立冬': { rank: 23, season: 'OFF SEASON', pt: 1.17 }, '清明': { rank: 24, season: 'OFF SEASON', pt: 1.0 }
    },
    staffing_multiplier: { '1.0-2.0': 0.7, '2.0-3.0': 1.0, '3.0-4.0': 1.3, '4.0-5.0': 1.6 },
    weekday_index: {}
};

// ── 店舗別定休日設定 ──
// NP: 4~10月=水曜定休, 11~3月=火曜・水曜定休, 年末12/27~1/3休み（12/31おせち例外）
// 他店舗: 元旦(1/1)休み + 不定休（不定休は予測不能のため未反映）
// JW: 平日ランチなし — チャネルレベルで処理（isStoreHolidayでは扱わない）
// ※祝日に当たる場合は営業変更あり（将来的に祝日API連携検討）

const GLOBAL_CLOSED_DATES = ['1-1']; // 元旦: 全店共通

const STORE_HOLIDAYS = {
    'NP': {
        seasonal: [
            { months: [4, 5, 6, 7, 8, 9, 10], closedDays: [3] },        // 4-10月: 水曜のみ
            { months: [11, 12, 1, 2, 3], closedDays: [2, 3] }      // 11-3月: 火・水
        ],
        yearEndClosed: { start: [12, 27], end: [1, 3] },
        yearEndExceptions: ['12-31']  // おせち営業日
    }
};

function isStoreHoliday(storeId, dateStr) {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const mmdd = `${month}-${day}`;

    // ── 全店共通: 元旦休み ──
    if (GLOBAL_CLOSED_DATES.includes(mmdd)) return true;

    const config = STORE_HOLIDAYS[storeId];
    if (!config) return false;
    const dow = d.getDay();

    // ── 年末年始チェック ──
    if (config.yearEndClosed) {
        const [sm, sd] = config.yearEndClosed.start;
        const [em, ed] = config.yearEndClosed.end;
        const isYearEnd = (month === sm && day >= sd) || (month === em && day <= ed);
        if (isYearEnd) {
            // 例外日（おせち等）は営業
            return !(config.yearEndExceptions || []).includes(mmdd);
        }
    }

    // ── 季節別定休日チェック ──
    if (config.seasonal) {
        for (const rule of config.seasonal) {
            if (rule.months.includes(month) && rule.closedDays.includes(dow)) {
                return true;
            }
        }
    }

    // ── レガシー: 単純月+曜日 ──
    if (config.months && config.closedDays) {
        return config.months.includes(month) && config.closedDays.includes(dow);
    }

    return false;
}

// ── Tax Display Helper ──
function txv(v) { return displayTaxExc ? Math.round(v / 1.1) : Math.round(v); }
function txvAccurate(totalInc, sales8pct) {
    // 8%軽減税率分と 10%標準税率分を分離して税抜計算
    if (!displayTaxExc) return Math.round(totalInc);
    const s8 = sales8pct || 0;
    const s10 = totalInc - s8;
    return Math.round(s10 / 1.1 + s8 / 1.08);
}
function txLabel() { return displayTaxExc ? '税抜' : '税込'; }
function toggleTaxDisplay() {
    displayTaxExc = !displayTaxExc;
    const btn = document.getElementById('taxDisplayToggle');
    const label = document.getElementById('taxLabel');
    label.textContent = displayTaxExc ? '税抜' : '税込';
    btn.classList.toggle('active', displayTaxExc);
    btn.classList.toggle('tax-inc', !displayTaxExc);
    renderCurrentTab();
}

// ── Fiscal Year (年度: 4月〜3月) ──
// SVDは4月起算の年度制。2025-04 → R7年度, 2025-03 → R6年度
function getFiscalYear(dateStr) {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1; // 1-12
    const y = d.getFullYear();
    return m >= 4 ? y : y - 1; // 4月以降=当年度, 1-3月=前年度
}
function fiscalYearLabel(fy) {
    const reiwa = fy - 2018; // 令和元年=2019
    return `R${reiwa} (${fy}/${fy + 1})`;
}

// ── Sekki Engine (client-side for forecast) ──
const SEKKI_BOUNDARIES = {
    2023: [[1, 5], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 24], [11, 8], [11, 22], [12, 7], [12, 22]],
    2024: [[1, 6], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 19], [5, 5], [5, 20], [6, 5], [6, 21], [7, 6], [7, 22], [8, 7], [8, 22], [9, 7], [9, 22], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]],
    2025: [[1, 5], [1, 20], [2, 3], [2, 18], [3, 5], [3, 20], [4, 4], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
    2026: [[1, 5], [1, 20], [2, 4], [2, 18], [3, 5], [3, 20], [4, 5], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
};
const SEKKI_NAMES = ['小寒', '大寒', '立春', '雨水', '啓蟄', '春分', '清明', '穀雨', '立夏', '小満', '芒種', '夏至', '小暑', '大暑', '立秋', '処暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_IDX = { '日': 4, '月': 2, '火': 2, '水': 2, '木': 3, '金': 4, '土': 5 }; // v1 deprecated
// Real MP v2.0 — 拠点別曜日乗数 (基準=全曜日平均 1.000)
const WEEKDAY_MULTIPLIER = {
    'MOIWAYAMA': { '月': 0.978, '火': 0.890, '水': 0.885, '木': 0.878, '金': 0.908, '土': 1.222, '日': 1.224 },
    'OKURAYAMA': { '月': 0.732, '火': 0.844, '水': 0.890, '木': 0.803, '金': 1.005, '土': 1.330, '日': 1.143 },
    'TV_TOWER': { '月': 0.842, '火': 0.876, '水': 0.939, '木': 0.875, '金': 0.995, '土': 1.307, '日': 1.163 },
    'AKARENGA': { '月': 0.844, '火': 0.921, '水': 0.903, '木': 0.776, '金': 1.009, '土': 1.397, '日': 1.141 },
};
const STORE_TO_BASE = { 'JW': 'MOIWAYAMA', 'NP': 'OKURAYAMA', 'Ce': 'OKURAYAMA', 'RP': 'OKURAYAMA', 'GA': 'TV_TOWER', 'BG': 'TV_TOWER', 'BQ': 'AKARENGA', 'RYB': 'AKARENGA' };

function getSekki(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const bounds = SEKKI_BOUNDARIES[y] || SEKKI_BOUNDARIES[2026];
    // Find which sekki period
    for (let i = bounds.length - 1; i >= 0; i--) {
        const [bm, bd] = bounds[i];
        if (m > bm || (m === bm && day >= bd)) {
            return SEKKI_NAMES[i];
        }
    }
    // Before first boundary → 冬至 of previous year
    return '冬至';
}

// ── Helpers ──
function fmt$(v) { return (v !== null && v !== undefined) ? '¥' + v.toLocaleString() : '—'; }
function fmtK$(v) { return v >= 1000000 ? '¥' + (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? '¥' + Math.round(v / 1000) + 'K' : '¥' + v; }

// ── ロープウェイ式カラーシステム ──
// TOP(1-5)=赤, HIGH(6-10)=橙, FLOW(11-15)=黄, LOW(16-20)=緑, OFF(21-24)=青
// rank 1=最繁忙(TOP), 24=最閑散(OFF)
const ROPEWAY_COLORS = {
    TOP: { bg: '#dc2626', label: 'TOP' },   // 赤
    HIGH: { bg: '#f97316', label: 'HIGH' },  // オレンジ
    FLOW: { bg: '#eab308', label: 'FLOW' },  // 黄
    LOW: { bg: '#22c55e', label: 'LOW' },   // グリーン
    OFF: { bg: '#3b82f6', label: 'OFF' },   // ブルー
};
function rankCategory(rank) {
    if (rank <= 5) return 'TOP';
    if (rank <= 10) return 'HIGH';
    if (rank <= 15) return 'FLOW';
    if (rank <= 20) return 'LOW';
    return 'OFF';
}
function rankCategoryColor(rank) {
    return ROPEWAY_COLORS[rankCategory(rank)].bg;
}
function mpColor(v) {
    const level = mpScoreLevel(v);
    return rankCategoryColor(level);
}
function seasonClass(s) { return 'season-' + (s || '').split(' ')[0]; }
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function rankBadge(rank, size) {
    const sz = size || 'normal';
    const cat = rankCategory(rank);
    const rc = ROPEWAY_COLORS[cat];
    const fs = sz === 'small' ? '9px' : '11px';
    const pad = sz === 'small' ? '2px 6px' : '3px 8px';
    return `<span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:${fs};font-weight:700;letter-spacing:1px;padding:${pad};border-radius:3px;background:${rc.bg};color:#fff">${rc.label} ${rank}</span>`;
}
// MPスコアベースのバッジ（ロープウェイ式カテゴリ表示）
function mpBadge(mpPoint, size) {
    const sz = size || 'normal';
    const level = mpScoreLevel(mpPoint);
    const cat = rankCategory(level);
    const rc = ROPEWAY_COLORS[cat];
    const fs = sz === 'small' ? '9px' : '11px';
    const pad = sz === 'small' ? '2px 6px' : '3px 8px';
    const fs2 = sz === 'small' ? '8px' : '10px';
    const w = sz === 'small' ? '60px' : '76px';
    return `<span style="display:inline-block;width:${w};font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:0.5px;padding:4px 6px;border-radius:4px;background:${rc.bg};color:#fff;text-align:center;line-height:1.4;"><span style="font-size:${fs};display:block;">${mpPoint.toFixed(2)}</span><span style="font-size:${fs2};display:block;opacity:0.85;letter-spacing:0.5px;">${rc.label} ${level}</span></span>`;
}
function getBaseName(storeId) {
    if (!DATA) return '';
    for (const b of DATA.config.bases) {
        for (const s of b.stores) {
            if (s.id === storeId) return b.name;
        }
    }
    return '';
}
function getBaseId(storeId) {
    if (!DATA) return '';
    for (const b of DATA.config.bases) {
        for (const s of b.stores) {
            if (s.id === storeId) return b.id;
        }
    }
    return '';
}
function getStoreName(storeId) {
    if (!DATA) return storeId;
    for (const b of DATA.config.bases) {
        for (const s of b.stores) {
            if (s.id === storeId) return s.name;
        }
    }
    return storeId;
}
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }
function meterBars(mp) {
    const filled = Math.round(mp);
    return Array.from({ length: 5 }, (_, i) =>
        `<div class="bar ${i < filled ? 'filled' : ''}"></div>`
    ).join('');
}

// ═══════════════════════════════════════════════════════════════
// Forecast Engine v3.0 — 100人の仲間の現場のために
// ═══════════════════════════════════════════════════════════════
// POS(過去) × TableCheck(未来) 統合予測エンジン
// 5関数分割: findMatches → predictFromHistory → applyStoreRules → applyFLayer → forecastForDate
// v3.0 改善: 隣接月フォールバック, チャネル独立予測, 動的F2, 祝日判定, 信頼度スコア, Walk-in非破壊, MAPE

const TREND_WINDOW = 4;

// ── 祝日判定（日本の祝日） ──
const JAPAN_HOLIDAYS_2026 = [
    '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23',
    '2026-03-20', '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05',
    '2026-05-06', '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22',
    '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-23'
];
const JAPAN_HOLIDAYS_2025 = [
    '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
    '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
    '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
    '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24'
];
const JAPAN_HOLIDAYS_2027 = [
    '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23',
    '2027-03-21', '2027-04-29', '2027-05-03', '2027-05-04', '2027-05-05',
    '2027-07-19', '2027-08-11', '2027-09-20', '2027-09-23',
    '2027-10-11', '2027-11-03', '2027-11-23'
];
const JAPAN_HOLIDAYS = new Set([...JAPAN_HOLIDAYS_2025, ...JAPAN_HOLIDAYS_2026, ...JAPAN_HOLIDAYS_2027]);
function isPublicHoliday(dateStr) { return JAPAN_HOLIDAYS.has(dateStr); }
function isWeekendOrHoliday(dateStr) {
    const dow = new Date(dateStr).getDay();
    return dow === 0 || dow === 6 || isPublicHoliday(dateStr);
}

// ── 信頼度スコア ──
function computeConfidence(matchCount) {
    if (matchCount >= 8) return { level: 'HIGH', score: 95, label: '⬛ 信頼度: 高（' + matchCount + '件）' };
    if (matchCount >= 4) return { level: 'MEDIUM', score: 75, label: '🟧 信頼度: 中（' + matchCount + '件）' };
    if (matchCount >= 2) return { level: 'LOW', score: 50, label: '🟨 信頼度: 低（' + matchCount + '件）' };
    if (matchCount >= 1) return { level: 'VERY_LOW', score: 25, label: '🟥 信頼度: 極低（' + matchCount + '件）' };
    return { level: 'NONE', score: 0, label: '⬜ データなし' };
}

// ═══════════════════════════════════════
// FUNCTION 1: findHistoricalMatches
// POS過去データから同月同曜日マッチ + 隣接月フォールバック
// ═══════════════════════════════════════
function findHistoricalMatches(storeId, dateStr) {
    const records = DATA.stores[storeId] || [];
    const targetDate = new Date(dateStr);
    const targetMonth = targetDate.getMonth() + 1;
    const targetWeekday = WEEKDAY_JA[targetDate.getDay()];
    const targetYear = targetDate.getFullYear();

    // 同月×同曜日×has_data × 過去データのみ（売上0の営業日も含む）
    let matches = records.filter(r => {
        const rMonth = parseInt(r.date.slice(5, 7));
        return rMonth === targetMonth &&
            r.weekday === targetWeekday &&
            r.has_data &&
            r.date < dateStr;
    });

    // ── 隣接月フォールバック: マッチが2件未満なら前後±1ヶ月を追加 ──
    let fallbackUsed = false;
    if (matches.length < 2) {
        const adjMonth1 = targetMonth === 1 ? 12 : targetMonth - 1;
        const adjMonth2 = targetMonth === 12 ? 1 : targetMonth + 1;
        const adjMatches = records.filter(r => {
            const rMonth = parseInt(r.date.slice(5, 7));
            return (rMonth === adjMonth1 || rMonth === adjMonth2) &&
                r.weekday === targetWeekday &&
                r.has_data &&
                r.date < dateStr;
        });
        if (adjMatches.length > 0) {
            matches = matches.concat(adjMatches);
            fallbackUsed = true;
        }
    }

    // ── Growth Weight (成長加味) ──
    const weights = matches.map(r => {
        const yearsAgo = targetYear - new Date(r.date).getFullYear();
        let w = yearsAgo <= 1 ? 1.05 : yearsAgo <= 2 ? 1.03 : 1.0;
        // 隣接月フォールバック分は×0.7減衰
        if (fallbackUsed) {
            const rMonth = parseInt(r.date.slice(5, 7));
            if (rMonth !== targetMonth) w *= 0.7;
        }
        return w;
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    return { matches, weights, totalWeight, fallbackUsed, targetMonth, targetWeekday };
}

// ═══════════════════════════════════════
// FUNCTION 2: predictFromHistory
// POS統計から客数主軸予測（チャネル独立）
// ═══════════════════════════════════════
function predictFromHistory(storeId, matches, weights, totalWeight) {
    if (matches.length === 0 || totalWeight === 0) {
        return { sales: 0, count: 0, avgSpend: 0, channels: {} };
    }

    // ── 全体 客数 + 客単価 ──
    const weightedCount = matches.reduce((s, r, i) => s + r.actual_count * weights[i], 0);
    const predictedCount = Math.round(weightedCount / totalWeight);
    const spendsWithWeight = matches.map((r, i) => ({
        spend: r.actual_count > 0 ? r.actual_sales / r.actual_count : 0,
        weight: weights[i]
    })).filter(sw => sw.spend > 0);
    const spendWeight = spendsWithWeight.reduce((s, sw) => s + sw.weight, 0);
    const predictedAvgSpend = spendWeight > 0
        ? Math.round(spendsWithWeight.reduce((s, sw) => s + sw.spend * sw.weight, 0) / spendWeight)
        : 0;

    // ── チャネル独立予測: 各チャネルを独立に加重平均 ──
    const channelAgg = {};
    matches.forEach((r, mi) => {
        if (!r.channels) return;
        const w = weights[mi];
        Object.entries(r.channels).forEach(([ch, data]) => {
            if (!channelAgg[ch]) channelAgg[ch] = { sales: 0, count: 0, food: 0, drink: 0, tent: 0, goods: 0, room: 0, flower: 0, wSum: 0 };
            channelAgg[ch].sales += (data.sales || 0) * w;
            channelAgg[ch].count += (data.count || 0) * w;
            channelAgg[ch].food += (data.food || 0) * w;
            channelAgg[ch].drink += (data.drink || 0) * w;
            channelAgg[ch].tent += (data.tent || 0) * w;
            channelAgg[ch].goods += (data.goods || 0) * w;
            channelAgg[ch].room += (data.room || 0) * w;
            channelAgg[ch].flower += (data.flower || 0) * w;
            channelAgg[ch].wSum += w;
        });
    });
    const channels = {};
    Object.entries(channelAgg).forEach(([ch, data]) => {
        if (data.wSum === 0) return;
        channels[ch] = {
            sales: Math.round(data.sales / data.wSum),
            count: Math.round(data.count / data.wSum),
            food: Math.round(data.food / data.wSum),
            drink: Math.round(data.drink / data.wSum)
        };
        // BG tent/goods等の追加フィールドを保持
        if (data.tent > 0) channels[ch].tent = Math.round(data.tent / data.wSum);
        if (data.goods > 0) channels[ch].goods = Math.round(data.goods / data.wSum);
        if (data.room > 0) channels[ch].room = Math.round(data.room / data.wSum);
        if (data.flower > 0) channels[ch].flower = Math.round(data.flower / data.wSum);
    });

    return { sales: predictedCount * predictedAvgSpend, count: predictedCount, avgSpend: predictedAvgSpend, channels };
}

// ═══════════════════════════════════════
// FUNCTION 3: applyStoreRules
// 店舗固有ルール（JW平日LUNCH、席料直近90日）
// ═══════════════════════════════════════
function applyStoreRules(storeId, dateStr, channels, records) {
    // deep copy — 元データを破壊しない
    const ch = JSON.parse(JSON.stringify(channels));

    // ── JW 平日ランチ除外（土日祝のみLUNCH営業） ──
    if (storeId === 'JW' && !isWeekendOrHoliday(dateStr) && ch['LUNCH']) {
        delete ch['LUNCH'];
    }

    // ── 席料系: 直近90日の営業日平均（トレンド反映） ──
    const seatFeeChannels = ['席料', '貸切', '室料', 'テント指定席料', 'アネックス席料'];
    seatFeeChannels.forEach(sfCh => {
        if (ch[sfCh]) {
            const cutoff = new Date(dateStr);
            cutoff.setDate(cutoff.getDate() - 90);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            let sfTotal = 0, sfDays = 0;
            records.forEach(r => {
                if (r.date >= cutoffStr && r.date < dateStr && r.channels && r.channels[sfCh]) {
                    const val = r.channels[sfCh].sales || 0;
                    if (val > 0) { sfTotal += val; sfDays++; }
                }
            });
            if (sfDays > 0) { ch[sfCh].sales = Math.round(sfTotal / sfDays); }
        }
    });

    return ch;
}

// ═══════════════════════════════════════
// FUNCTION 4: applyFLayer
// F-Layer: TableCheck OnHand統合 + Walk-in（非破壊）
// 予約制4店 (JW, NP, GA, BQ) のみ
// ═══════════════════════════════════════
function applyFLayer(storeId, dateStr, basePrediction) {
    // deep copy — Walk-inで元データを破壊しない
    const channels = JSON.parse(JSON.stringify(basePrediction.channels));
    let finalSales = basePrediction.sales;
    let finalCount = basePrediction.count;
    let finalAvgSpend = basePrediction.avgSpend;

    // ── チャネル合計から売上・客数を再計算 ──
    const channelKeys = Object.keys(channels);
    if (channelKeys.length > 0) {
        finalSales = channelKeys.reduce((s, ch) => s + (channels[ch].sales || 0), 0);
        finalCount = channelKeys
            .filter(ch => !['席料', '南京錠', '花束', '室料', '展望台', '物販_食品', '物販_アパレル', '物販', 'GOODS', 'テント指定席料', 'アネックス席料'].includes(ch))
            .reduce((s, ch) => s + (channels[ch].count || 0), 0);
    }
    finalAvgSpend = finalCount > 0 ? Math.round(finalSales / finalCount) : basePrediction.avgSpend;

    // ── OnHand データ取得 ──
    const ONHAND_EXCLUDE = ['キャンセル', 'ノーショー', 'ノーショー（無断キャンセル）'];
    const storeOnHand = ONHAND_DATA.filter(r =>
        r.date === dateStr && r.store === storeId && !ONHAND_EXCLUDE.includes(r.status)
    );
    const onhandAmount = storeOnHand.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const onhandCount = storeOnHand.reduce((s, r) => s + (Number(r.count) || 0), 0);

    // ── Walk-in Layer: 予約制4店 × 当日〜翌日のみ ──
    const WALKIN_STORES = ['JW', 'NP', 'BQ', 'GA'];
    const WALKIN_CHANNELS = ['LUNCH', 'DINNER'];
    const WALKIN_GUESTS = 2;
    let walkInSales = 0, walkInCount = 0;
    const walkInDetail = {};

    if (WALKIN_STORES.includes(storeId)) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDateObj = new Date(dateStr); targetDateObj.setHours(0, 0, 0, 0);
        const isShortTerm = targetDateObj.getTime() === today.getTime() || targetDateObj.getTime() === tomorrow.getTime();

        if (isShortTerm) {
            WALKIN_CHANNELS.forEach(ch => {
                if (!channels[ch]) return;
                const chAvgSpend = channels[ch].count > 0 ? Math.round(channels[ch].sales / channels[ch].count) : 0;
                if (chAvgSpend > 0) {
                    const addSales = WALKIN_GUESTS * chAvgSpend;
                    channels[ch].sales += addSales;
                    channels[ch].count += WALKIN_GUESTS;
                    walkInSales += addSales;
                    walkInCount += WALKIN_GUESTS;
                    walkInDetail[ch] = { guests: WALKIN_GUESTS, avg_spend: chAvgSpend, sales: addSales };
                }
            });
            // Walk-in後にfinalSales/Count再計算
            finalSales += walkInSales;
            finalCount += walkInCount;
            finalAvgSpend = finalCount > 0 ? Math.round(finalSales / finalCount) : finalAvgSpend;
        }
    }

    // ── F-Layer: OnHand時間軸統合 ──
    let fLayer = 'F5';
    const capacity = STORE_CAPACITY[storeId]; // 予約制4店のみ定義あり
    if (capacity && onhandCount > 0) {
        const todayObj = new Date(); todayObj.setHours(0, 0, 0, 0);
        const targetObj = new Date(dateStr); targetObj.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((targetObj - todayObj) / (1000 * 60 * 60 * 24));
        const threshold = capacity.fullThreshold
            || Math.min(capacity.fullThresholdLunch || 999, capacity.fullThresholdDinner || 999);

        const ohSpend = finalAvgSpend || basePrediction.avgSpend;
        const onhandBasedSales = onhandAmount > 0
            ? Math.max(onhandAmount, onhandCount * ohSpend)
            : onhandCount * ohSpend;

        if (daysUntil <= 1) {
            fLayer = 'F0';
            finalSales = Math.max(finalSales, onhandBasedSales);
            finalCount = Math.max(finalCount, onhandCount);
        } else if (daysUntil <= 7) {
            fLayer = 'F1';
            finalSales = Math.max(finalSales, onhandBasedSales);
            finalCount = Math.max(finalCount, onhandCount);
        } else {
            // ── 動的F2ウェイト: 予約確定率ベース ──
            // 過去の同店舗データから「1週間前OnHand → 当日実績」の比率を算出
            fLayer = 'F2';
            const records = DATA.stores[storeId] || [];
            let ohRatioSum = 0, ohRatioCount = 0;
            records.forEach(r => {
                if (r.has_data && r.actual_sales > 0 && r.onhand_at_week_prior) {
                    const ratio = r.actual_sales / r.onhand_at_week_prior;
                    if (ratio > 0 && ratio < 5) { // 異常値除外
                        ohRatioSum += ratio;
                        ohRatioCount++;
                    }
                }
            });
            // 予約確定率データがあれば動的ウェイト、なければ30:70固定
            const statsWeight = ohRatioCount >= 5 ? Math.max(0.1, Math.min(0.5, 1 - (ohRatioSum / ohRatioCount) * 0.5)) : 0.3;
            const ohWeight = 1 - statsWeight;
            finalSales = Math.round(finalSales * statsWeight + onhandBasedSales * ohWeight);
            finalCount = Math.round(finalCount * statsWeight + onhandCount * ohWeight);
        }
        finalAvgSpend = finalCount > 0 ? Math.round(finalSales / finalCount) : ohSpend;
    }

    return {
        finalSales, finalCount, finalAvgSpend, channels,
        fLayer,
        is_full: capacity ? onhandCount >= (capacity.fullThreshold || Math.min(capacity.fullThresholdLunch || 999, capacity.fullThresholdDinner || 999)) : false,
        onhand_amount: onhandAmount, onhand_count: onhandCount, onhand_records: storeOnHand,
        walkin_sales: walkInSales, walkin_count: walkInCount, walkin_detail: walkInDetail
    };
}

// ═══════════════════════════════════════
// FUNCTION 5: computeMPPoint
// MP Point (KF1 × weekday × KF2 × KF3)
// ═══════════════════════════════════════
function computeMPPoint(storeId, dateStr, matches) {
    const targetSekki = getSekki(dateStr);
    const targetWeekday = WEEKDAY_JA[new Date(dateStr).getDay()];
    const sekkiData = SVD_CONFIG.sekki_levels[targetSekki] || { rank: 12, season: 'FLOW SEASON', pt: 3.0 };
    const baseId = STORE_TO_BASE[storeId] || '';
    const wdMult = (WEEKDAY_MULTIPLIER[baseId] || {})[targetWeekday] || 1.0;
    const kf1 = Math.max(1, Math.min(5, Math.round(sekkiData.pt * wdMult * 100) / 100));
    const kf2Arr = matches.filter(r => r.kf2 > 0).map(r => r.kf2);
    const kf3Arr = matches.filter(r => r.kf3 > 0).map(r => r.kf3);
    const kf2 = kf2Arr.length > 0 ? kf2Arr.reduce((a, b) => a + b, 0) / kf2Arr.length : 0;
    const kf3 = kf3Arr.length > 0 ? kf3Arr.reduce((a, b) => a + b, 0) / kf3Arr.length : 0;
    const mpPoint = (kf2 > 0 || kf3 > 0) ? Math.round(((kf1 + kf2 + kf3) / 3) * 100) / 100 : kf1;
    return { mp_point: mpPoint, kf1, kf2: Math.round(kf2 * 100) / 100, kf3: Math.round(kf3 * 100) / 100, rank: sekkiData.rank, season: sekkiData.season };
}

// ═══════════════════════════════════════
// MAPE — 予測精度トラッカー（直近30日）
// ═══════════════════════════════════════
let MAPE_CACHE = {};
function computeMAPE(storeId) {
    if (MAPE_CACHE[storeId] !== undefined) return MAPE_CACHE[storeId];
    const records = DATA.stores[storeId] || [];
    const today = new Date();
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    let totalError = 0, count = 0;
    records.forEach(r => {
        if (r.has_data && r.actual_sales > 0 && r.date >= cutoffStr && r.date < todayStr) {
            // 過去日の予測を再計算（OnHand除外のF5ベース）
            const hist = findHistoricalMatches(storeId, r.date);
            if (hist.matches.length > 0) {
                const pred = predictFromHistory(storeId, hist.matches, hist.weights, hist.totalWeight);
                if (pred.sales > 0) {
                    totalError += Math.abs(r.actual_sales - pred.sales) / r.actual_sales;
                    count++;
                }
            }
        }
    });
    const mape = count > 0 ? Math.round((totalError / count) * 100) : null;
    MAPE_CACHE[storeId] = mape;
    return mape; // MAPE 20 = 「平均±20%の精度」
}
function resetMAPECache() { MAPE_CACHE = {}; }

// ═══════════════════════════════════════
// MAIN: forecastForDate v3.0
// 5関数を統合するオーケストレータ
// ═══════════════════════════════════════
/**
 * forecastForDate — POS×TableCheck統合予測 v3.0
 *
 * @param {string} storeId - 店舗ID (JW, NP, GA, BQ, Ce, RP, BG, RYB)
 * @param {string} dateStr - 予測対象日 (e.g. '2026-03-15')
 * @returns {Object} 予測結果
 */
function forecastForDate(storeId, dateStr) {
    // ── Step 0: 定休日チェック ──
    if (isStoreHoliday(storeId, dateStr)) {
        const hSekki = getSekki(dateStr);
        const hSekkiData = SVD_CONFIG.sekki_levels[hSekki] || { rank: 12, season: 'FLOW SEASON', pt: 3.0 };
        return {
            predicted_sales: 0, predicted_count: 0, predicted_avg_spend: 0,
            channels: {}, matches: [], matchCount: 0,
            sekki: hSekki, weekday: WEEKDAY_JA[new Date(dateStr).getDay()],
            weights: [], is_holiday: true, holiday_note: '定休日',
            onhand_records: [], onhand_amount: 0,
            walkin_sales: 0, walkin_count: 0, walkin_detail: {},
            mp_point: hSekkiData.pt, kf1: hSekkiData.pt, kf2: 0, kf3: 0,
            rank: hSekkiData.rank, season: hSekkiData.season,
            confidence: computeConfidence(0), mape: null,
            f_layer: 'F5', is_full: false, base_sales: 0, base_count: 0,
            fallback_used: false
        };
    }

    // ── Step 1: POS過去データマッチング（隣接月フォールバック付き） ──
    const historical = findHistoricalMatches(storeId, dateStr);

    if (historical.matches.length === 0) {
        const noMatchMp = computeMPPoint(storeId, dateStr, []);
        return {
            predicted_sales: 0, predicted_count: 0, predicted_avg_spend: 0,
            channels: {}, matches: [], matchCount: 0,
            sekki: getSekki(dateStr), weekday: historical.targetWeekday,
            weights: [], is_holiday: false,
            ...noMatchMp,
            onhand_records: [], onhand_amount: 0,
            walkin_sales: 0, walkin_count: 0, walkin_detail: {},
            confidence: computeConfidence(0), mape: computeMAPE(storeId),
            f_layer: 'F5', is_full: false, base_sales: 0, base_count: 0,
            fallback_used: historical.fallbackUsed
        };
    }

    // ── Step 2: POS統計予測（チャネル独立） ──
    const prediction = predictFromHistory(storeId, historical.matches, historical.weights, historical.totalWeight);

    // ── Step 3: 店舗固有ルール適用（JW平日LUNCH除外、席料90日平均） ──
    const records = DATA.stores[storeId] || [];
    const adjustedChannels = applyStoreRules(storeId, dateStr, prediction.channels, records);

    // ── Step 4: F-Layer（TableCheck OnHand統合 + Walk-in）──
    const fResult = applyFLayer(storeId, dateStr, {
        sales: prediction.sales, count: prediction.count,
        avgSpend: prediction.avgSpend, channels: adjustedChannels
    });

    // ── Step 5: MP Point + 信頼度 + MAPE ──
    const mpPoint = computeMPPoint(storeId, dateStr, historical.matches);
    const confidence = computeConfidence(historical.matches.length);
    const mape = computeMAPE(storeId);

    return {
        predicted_sales: fResult.finalSales,
        predicted_count: fResult.finalCount,
        predicted_avg_spend: fResult.finalAvgSpend,
        base_sales: prediction.sales,
        base_count: prediction.count,
        channels: fResult.channels,
        matches: historical.matches.map((r, i) => ({
            date: r.date, weekday: r.weekday, sekki: r.sekki,
            sales: r.actual_sales, count: r.actual_count,
            channels: r.channels, weight: historical.weights[i]
        })),
        matchCount: historical.matches.length,
        sekki: getSekki(dateStr),
        weekday: historical.targetWeekday,
        weights: historical.weights,
        is_holiday: false,
        ...mpPoint,
        f_layer: fResult.fLayer,
        is_full: fResult.is_full,
        onhand_amount: fResult.onhand_amount,
        onhand_count: fResult.onhand_count,
        onhand_records: fResult.onhand_records,
        walkin_sales: fResult.walkin_sales,
        walkin_count: fResult.walkin_count,
        walkin_detail: fResult.walkin_detail,
        confidence,
        mape,
        fallback_used: historical.fallbackUsed
    };
}


// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('selDate').value = today;
    selectedDate = today;

    // GAS Settings Panel
    const gasCard = document.getElementById('gasSettingsCard');
    if (gasCard && typeof GAS_BRIDGE !== 'undefined') {
        gasCard.innerHTML = GAS_BRIDGE.renderSettingsPanel();
        GAS_BRIDGE.updateStatusBadge();
    }

    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) return;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById('p-' + currentTab).classList.add('active');
            renderCurrentTab();
        });
    });

    // Date change
    document.getElementById('selDate').addEventListener('change', e => {
        selectedDate = e.target.value;
        renderCurrentTab();
    });

    // Base selector (Deep Dive)
    document.getElementById('selBase').addEventListener('change', e => {
        selectedBase = e.target.value;
        renderDive();
    });

    // Import
    setupImport();

    // Forecast
    document.getElementById('fcRun').addEventListener('click', runForecast);

    // Staffing date sync
    document.getElementById('stDate').addEventListener('change', e => { renderStaffing(); });

    // CROSS COMPARE modal (on-demand)
    document.getElementById('btn-compare-modal').addEventListener('click', () => {
        document.getElementById('compare-modal').classList.remove('hidden');
        renderCompare();
    });
    document.getElementById('btn-close-compare').addEventListener('click', () => {
        document.getElementById('compare-modal').classList.add('hidden');
    });

    // Load default data (⑤インポートUI削除済み — 要素がなくてもエラーにならない)
    document.getElementById('btn-load-default')?.addEventListener('click', loadDefaultJSON);

    // Save / Clear localStorage (⑤インポートUI削除済み)
    document.getElementById('btn-save-local')?.addEventListener('click', () => {
        alert('ℹ️ データは常にサーバーから最新を読み込みます');
    });
    document.getElementById('btn-clear-local')?.addEventListener('click', () => {
        localStorage.removeItem('mp_data');
        localStorage.removeItem('mp_reserves');
        localStorage.removeItem('mp_staffing');
        alert('🗑 キャッシュをクリアしました');
    });

    // Always load fresh data from server (never use stale localStorage cache)
    // Clear any stale cached mp_data from previous versions
    localStorage.removeItem('mp_data');
    loadDefaultJSON();
});

async function loadDefaultJSON() {
    // ═══ GAS-First Architecture ═══
    // Priority: GAS (live) → mp_data.json (fallback)
    // Config is always from SVD_CONFIG (static, hardcoded)

    const hasGAS = typeof GAS_BRIDGE !== 'undefined' && GAS_BRIDGE.getUrl();

    if (hasGAS) {
        // ── PRIMARY: Load from GAS (Single Source of Truth) ──
        try {
            console.log('[GAS-1st] ☁️ Loading from GAS (primary source)...');
            const gasResult = await GAS_BRIDGE.loadAll();
            if (gasResult && gasResult.stores) {
                DATA = buildDataFromGAS(gasResult);
                console.log(`[GAS-1st] ✅ Loaded ${Object.keys(gasResult.stores).length} stores from GAS`);
                GAS_BRIDGE.showToast(`☁️ GASからライブデータ読込完了`);
                // Load OnHand
                await loadOnHandFromGAS();

                // ── Hybrid: Merge mp_data.json historical data ──
                // GASには最近のデータしかない場合、mp_data.jsonの過去データを補完
                await mergeHistoricalFallback();

                autoCorrectChannelCounts(); // ← チャネル別客数を自動補正

                // ── Load Memos from GAS ──
                try {
                    const memoUrl = `${GAS_BRIDGE.getUrl()}?action=loadMemo${GAS_BRIDGE.tokenParam()}`;
                    const memoResp = await fetch(memoUrl, { redirect: 'follow' });
                    const memoData = await memoResp.json();
                    if (memoData.status === 'ok' && memoData.memos) {
                        memoData.memos.forEach(m => {
                            const storeRecords = DATA.stores[m.store];
                            if (!storeRecords) return;
                            const rec = storeRecords.find(r => r.date === m.date);
                            if (rec && m.memo) rec.memo = m.memo;
                        });
                        console.log(`[GAS] Loaded ${memoData.total} memos`);
                    }
                } catch (e) {
                    console.warn('[GAS] loadMemo failed (GAS未デプロイ?):', e.message);
                }
                onDataLoaded();
                return;
            }
        } catch (e) {
            console.warn('[GAS-1st] ⚠️ GAS load failed, trying fallback:', e.message);
        }
    }

    // ── FALLBACK: Load from mp_data.json (offline / no GAS) ──
    try {
        console.log('[GAS-1st] 📁 Loading from mp_data.json (fallback)...');
        const resp = await fetch('mp_data.json?t=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) throw new Error('mp_data.json not found');
        DATA = await resp.json();
        // Ensure config uses SVD_CONFIG (overwrite any stale config in JSON)
        DATA.config = SVD_CONFIG;
        console.log('[GAS-1st] ✅ Loaded from mp_data.json');
        autoCorrectChannelCounts(); // ← チャネル別客数を自動補正
        onDataLoaded();
    } catch (err) {
        console.warn('[GAS-1st] ❌ All data sources failed:', err);
        updateImportStatus('main', null);
    }
}

/**
 * mergeHistoricalFallback — mp_data.jsonの過去データをGASデータに補完マージ
 *
 * ルール:
 * - GASのデータが優先 (Single Source of Truth)
 * - mp_data.jsonの日付がGASに存在しない場合のみ追加
 * - GASにデータが蓄積されれば、自然にmp_data.jsonへの依存はゼロになる
 */
async function mergeHistoricalFallback() {
    try {
        const resp = await fetch('mp_data.json?t=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) return;
        const fallback = await resp.json();
        if (!fallback.stores) return;

        let merged = 0;

        for (const [storeId, fbRecords] of Object.entries(fallback.stores)) {
            if (!DATA.stores[storeId]) {
                // GASにこの店舗自体がない → 全レコード追加
                DATA.stores[storeId] = fbRecords;
                merged += fbRecords.length;
                continue;
            }

            // GASに存在する日付のセットを作成
            const gasDateSet = new Set(DATA.stores[storeId].map(r => r.date));

            // mp_data.jsonの中でGASにない日付のレコードのみ追加
            fbRecords.forEach(fbRec => {
                if (!gasDateSet.has(fbRec.date) && (fbRec.has_data || fbRec.actual_sales > 0)) {
                    DATA.stores[storeId].push(fbRec);
                    merged++;
                }
            });

            // 日付順にソート
            DATA.stores[storeId].sort((a, b) => a.date.localeCompare(b.date));
        }

        if (merged > 0) {
            console.log(`[Hybrid] 📥 ${merged} historical records merged from mp_data.json`);
        }
    } catch (e) {
        console.warn('[Hybrid] ⚠️ mp_data.json merge skipped:', e.message);
    }
}

/**
 * importHistoricalToGAS — mp_data.jsonの過去データをGASスプレッドシートに一括インポート
 *
 * mp_data.jsonのchannels構造 → GAS STORE_SHEETSヘッダー形式に変換して送信。
 * ワンクリックで3年分のデータをGASに移行する。
 */
async function importHistoricalToGAS() {
    if (typeof GAS_BRIDGE === 'undefined' || !GAS_BRIDGE.getUrl()) {
        alert('❌ GAS URLが設定されていません。先にGAS接続を設定してください。');
        return;
    }

    const btn = document.getElementById('btn-import-historical');
    if (btn) { btn.disabled = true; btn.textContent = '📥 インポート中...'; }

    try {
        // mp_data.jsonを読み込み
        const resp = await fetch('mp_data.json?t=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) throw new Error('mp_data.json not found');
        const mpData = await resp.json();
        if (!mpData.stores) throw new Error('Invalid mp_data.json format');

        // ── 店舗→GASシート変換マッピング ──
        // GAS Code.gs STORE_SHEETS のヘッダーに完全準拠
        const IMPORT_MAP = {
            'JW': {
                sheet: 'MOIWA_JW',
                convert: (r) => [
                    r.date,
                    ch(r, 'LUNCH', 'food'), ch(r, 'LUNCH', 'drink'), ch(r, 'LUNCH', 'count'),
                    ch(r, 'DINNER', 'food'), ch(r, 'DINNER', 'drink'), ch(r, 'DINNER', 'count'),
                    ch(r, 'TAKEOUT', 'food'), ch(r, 'TAKEOUT', 'drink'),
                    ch(r, '席料', 'sales'), ch(r, '南京錠', 'sales'), ch(r, '花束', 'sales'),
                    0, 0  // 物販_食品, 物販_アパレル
                ]
            },
            'GA': {
                sheet: 'TVTOWER_GA',
                convert: (r) => [
                    r.date,
                    ch(r, 'LUNCH', 'food'), ch(r, 'LUNCH', 'drink'), ch(r, 'LUNCH', 'count'),
                    ch(r, 'DINNER', 'food'), ch(r, 'DINNER', 'drink'), ch(r, 'DINNER', 'count'),
                    ch(r, 'TAKEOUT', 'food'), ch(r, 'TAKEOUT', 'drink'),
                    ch(r, 'WINE BAR', 'food'), ch(r, 'WINE BAR', 'drink'), ch(r, 'WINE BAR', 'count'),
                    ch(r, '宴会', 'food'), ch(r, '宴会', 'drink'), ch(r, '宴会', 'count'),
                    ch(r, '室料', 'sales'), ch(r, '展望台', 'sales'),
                    0, 0  // 物販
                ]
            },
            'BG': {
                sheet: 'TVTOWER_BG',
                convert: (r) => {
                    const main = r.channels?.ALL || r.channels?.MAIN || {};
                    return [
                        r.date,
                        main.food || 0, main.drink || 0,
                        ch(r, 'テント指定席料', 'sales') || ch(r, 'Tent', 'sales') || 0,
                        main.count || r.actual_count || 0,
                        0, 0  // 物販
                    ];
                }
            },
            'NP': {
                sheet: 'OKURAYAMA_NP',
                convert: (r) => [
                    r.date,
                    ch(r, 'LUNCH', 'food'), ch(r, 'LUNCH', 'drink'), ch(r, 'LUNCH', 'count'),
                    ch(r, 'DINNER', 'food'), ch(r, 'DINNER', 'drink'), ch(r, 'DINNER', 'count'),
                    ch(r, '室料', 'sales'), ch(r, '花束', 'sales'),
                    ch(r, 'Event', 'food'), ch(r, 'Event', 'drink'), ch(r, 'Event', 'count'),
                    0, 0  // 物販
                ]
            },
            'Ce': {
                sheet: 'OKURAYAMA_Ce',
                convert: (r) => {
                    const all = r.channels?.ALL || r.channels?.CAFE || {};
                    return [r.date, all.food || 0, all.drink || 0, all.count || r.actual_count || 0, 0, 0];
                }
            },
            'RP': {
                sheet: 'OKURAYAMA_RP',
                convert: (r) => {
                    const all = r.channels?.ALL || {};
                    return [r.date, all.food || 0, all.drink || 0, all.count || r.actual_count || 0, 0, 0];
                }
            },
            'BQ': {
                sheet: 'AKARENGA_BQ',
                convert: (r) => [
                    r.date,
                    ch(r, 'LUNCH', 'food'), ch(r, 'LUNCH', 'drink'), ch(r, 'LUNCH', 'count'),
                    ch(r, 'AT', 'food') || ch(r, 'AFTERNOON TEA', 'food'), ch(r, 'AT', 'drink') || ch(r, 'AFTERNOON TEA', 'drink'), ch(r, 'AT', 'count') || ch(r, 'AFTERNOON TEA', 'count'),
                    ch(r, 'DINNER', 'food'), ch(r, 'DINNER', 'drink'), ch(r, 'DINNER', 'count'),
                    ch(r, '席料', 'sales'),
                    0, 0  // 物販
                ]
            },
            'RYB': {
                sheet: 'AKARENGA_RYB',
                convert: (r) => {
                    const all = r.channels?.ALL || {};
                    return [r.date, all.food || 0, all.drink || 0, all.count || r.actual_count || 0, 0, 0];
                }
            }
        };

        // チャネルデータ抽出ヘルパー
        function ch(rec, channelName, field) {
            const c = rec.channels?.[channelName];
            if (!c) return 0;
            return c[field] || 0;
        }

        let totalImported = 0;
        const results = [];

        for (const [storeId, mapping] of Object.entries(IMPORT_MAP)) {
            const records = mpData.stores[storeId];
            if (!records || records.length === 0) {
                results.push(`⏭ ${storeId}: データなし`);
                continue;
            }

            // has_data のレコードのみ（売上0の営業日も含む）
            const activeRecords = records.filter(r => r.has_data || r.actual_sales > 0);
            if (activeRecords.length === 0) {
                results.push(`⏭ ${storeId}: 実績レコードなし`);
                continue;
            }

            // GASヘッダー形式に変換
            const rows = activeRecords.map(r => mapping.convert(r));

            // GASにインポート
            if (btn) btn.textContent = `📥 ${storeId} (${rows.length}行)...`;
            const result = await GAS_BRIDGE.importData(mapping.sheet, rows, 'HISTORICAL_IMPORT');

            if (result.status === 'ok') {
                results.push(`✅ ${storeId}: ${result.imported}行`);
                totalImported += result.imported;
            } else {
                results.push(`❌ ${storeId}: ${result.message}`);
            }
        }

        const summary = `📥 インポート完了\n${results.join('\n')}\n\n合計: ${totalImported}行`;
        console.log(summary);
        alert(summary);

        // データ再読み込み
        if (totalImported > 0) {
            GAS_BRIDGE.showToast('🔄 データを再読み込み中...');
            await loadDefaultJSON();
        }

    } catch (e) {
        alert(`❌ インポートエラー: ${e.message}`);
        console.error('[Import]', e);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '📥 過去データをGASにインポート'; }
    }
}

/**
 * autoCorrectChannelCounts — 単一チャネル店舗の客数自動補正
 * 過去CSVインポートデータでchannels内のcountが0だがactual_countがある場合、
 * actual_countをチャネルのcountに転記してFB単価を算出可能にする。
 *
 * 対象: BG(ALL), Ce(CAFE), RP(CAFE), RYB(ALL) — チャネル1つの店舗
 */
function autoCorrectChannelCounts() {
    if (!DATA || !DATA.stores) return;

    const SINGLE_CHANNEL_MAP = {
        'BG': 'ALL',    // ビアガーデン → ALLチャネル
        'Ce': 'CAFE',   // セレステ → CAFEチャネル
        'RP': 'CAFE',   // ルスツ → CAFEチャネル
        'RYB': 'ALL'     // 赤レンガ羊蹄豚 → ALLチャネル
    };

    let corrected = 0;

    Object.entries(SINGLE_CHANNEL_MAP).forEach(([storeId, channelId]) => {
        const records = DATA.stores[storeId];
        if (!records) return;

        records.forEach(r => {
            if (r.actual_count > 0 && r.channels) {
                const ch = r.channels[channelId];
                if (ch && (ch.count === 0 || ch.count === undefined)) {
                    ch.count = r.actual_count;
                    corrected++;
                }
            }
        });
    });

    if (corrected > 0) {
        console.log(`[AutoCorrect] 🔧 ${corrected} records corrected (channel count ← actual_count)`);
    }
}

/**
     * buildDataFromGAS — GASレスポンスをDATA形式に変換
     * GASは実績データのみ返す。config/MP係数はクライアント側で付与。
     */
function buildDataFromGAS(gasResult) {
    const stores = {};
    const allStoreIds = [];

    for (const [storeId, gasRecords] of Object.entries(gasResult.stores)) {
        allStoreIds.push(storeId);

        // ── Phase 1: Build base records with channels ──
        const baseRecords = gasRecords.map(rec => {
            const dateStr = rec.date;
            const dt = new Date(dateStr);
            const weekday = WEEKDAY_JA[dt.getDay()];
            const sekki = getSekki(dateStr);
            const sekkiData = SVD_CONFIG.sekki_levels[sekki] || { rank: 12, season: 'FLOW SEASON', pt: 3.0 };
            const channels = rec.channels || buildChannelsFromGAS(storeId, rec);

            // ── Ce/RP エイリアス: ALL → CAFE (フォーム定義IDに合わせる) ──
            if ((storeId === 'Ce' || storeId === 'RP') && channels['ALL'] && !channels['CAFE']) {
                channels['CAFE'] = channels['ALL'];
            }

            return {
                date: dateStr,
                weekday,
                sekki,
                rank: sekkiData.rank,
                season: sekkiData.season,
                kf1: sekkiData.pt,
                kf1_seasonal: sekkiData.pt,
                kf2: 0, kf3: 0,
                mp_point: sekkiData.pt,
                actual_sales: Number(rec.actual_sales) || 0,
                actual_count: Number(rec.actual_count) || 0,
                has_data: rec.actual_sales !== undefined && rec.actual_sales !== null && rec.actual_sales !== '',
                channels,
                memo: rec.memo || '',
                labor: rec.labor || null,
                ropeway: rec.ropeway ? (typeof rec.ropeway === 'string' ? (() => { try { return JSON.parse(rec.ropeway); } catch (e) { return null; } })() : rec.ropeway) : null
            };
        });

        // ── Phase 2: Compute KF2/KF3 via min-max normalization ──
        // KF2 = Sales FACTOR (1.0-5.0), KF3 = Customer Count FACTOR (1.0-5.0)
        const activeSales = baseRecords.filter(r => r.has_data && r.actual_sales > 0).map(r => r.actual_sales);
        const activeCounts = baseRecords.filter(r => r.has_data && r.actual_count > 0).map(r => r.actual_count);

        const salesMin = activeSales.length ? Math.min(...activeSales) : 0;
        const salesMax = activeSales.length ? Math.max(...activeSales) : 1;
        const countMin = activeCounts.length ? Math.min(...activeCounts) : 0;
        const countMax = activeCounts.length ? Math.max(...activeCounts) : 1;
        const salesRange = salesMax - salesMin || 1;
        const countRange = countMax - countMin || 1;

        baseRecords.forEach(r => {
            if (r.has_data && r.actual_sales > 0) {
                // Min-max normalize to 1.0-5.0 scale
                r.kf2 = Math.round((1.0 + ((r.actual_sales - salesMin) / salesRange) * 4.0) * 100) / 100;
                r.kf3 = r.actual_count > 0
                    ? Math.round((1.0 + ((r.actual_count - countMin) / countRange) * 4.0) * 100) / 100
                    : 1.0;
                r.mp_point = Math.round(((r.kf1 + r.kf2 + r.kf3) / 3) * 100) / 100;
            }
            // Records with no actuals keep kf2=0, kf3=0, mp_point=kf1 (sekki only)
        });

        stores[storeId] = baseRecords;
    }

    return {
        meta: {
            generated: gasResult.meta?.timestamp || new Date().toISOString(),
            version: 'GAS-live',
            stores: allStoreIds.sort(),
            total_records: allStoreIds.reduce((s, id) => s + (stores[id]?.length || 0), 0)
        },
        config: SVD_CONFIG,
        stores
    };
}

/**
 * buildChannelsFromGAS — GASの生データからchannels構造を構築
 * GAS Code.gs は各列を直接返すため、channels構造に変換
 */
function buildChannelsFromGAS(storeId, rec) {
    const channels = {};
    // GASの生データにはL_Food, L_Drink, L人数, D_Food, D_Drink, D人数 etc. が含まれる
    // これらをchannels形式に変換
    if (rec.L_Food || rec.L_Drink) {
        channels['LUNCH'] = {
            sales: (Number(rec.L_Food) || 0) + (Number(rec.L_Drink) || 0),
            count: Number(rec['L人数']) || 0,
            food: Number(rec.L_Food) || 0,
            drink: Number(rec.L_Drink) || 0
        };
    }
    if (rec.D_Food || rec.D_Drink) {
        channels['DINNER'] = {
            sales: (Number(rec.D_Food) || 0) + (Number(rec.D_Drink) || 0),
            count: Number(rec['D人数']) || 0,
            food: Number(rec.D_Food) || 0,
            drink: Number(rec.D_Drink) || 0
        };
    }
    if (rec.TO_Food || rec.TO_Drink) {
        channels['TAKEOUT'] = {
            sales: (Number(rec.TO_Food) || 0) + (Number(rec.TO_Drink) || 0),
            count: 0,
            food: Number(rec.TO_Food) || 0,
            drink: Number(rec.TO_Drink) || 0
        };
    }
    // 3CH — GA第3チャネル統合 (TO→AT→WB)
    if (rec['3CH_Food'] || rec['3CH_Drink']) {
        channels['3CH'] = {
            sales: (Number(rec['3CH_Food']) || 0) + (Number(rec['3CH_Drink']) || 0),
            count: Number(rec['3CH人数']) || 0,
            food: Number(rec['3CH_Food']) || 0,
            drink: Number(rec['3CH_Drink']) || 0
        };
    }
    // BG specific (Ce, RP, RYB, BG — L_Foodがない単一チャネル店舗)
    if (rec.Food !== undefined && rec.Drink !== undefined && !rec.L_Food) {
        const tentVal = Number(rec.Tent) || 0;
        const mainSales = (Number(rec.Food) || 0) + (Number(rec.Drink) || 0) + tentVal;
        if (mainSales > 0) {
            channels['ALL'] = {
                sales: mainSales,
                count: Number(rec['人数']) || 0,
                food: Number(rec.Food) || 0,
                drink: Number(rec.Drink) || 0,
                tent: tentVal   // ← BG tentバグ修正: tentフィールドを保持
            };
        }
    }
    // 宴会 (GA) → フォーム定義ID 'BANQUET' に合わせる
    if (rec['宴会_Food'] || rec['宴会_Drink']) {
        channels['BANQUET'] = {
            sales: (Number(rec['宴会_Food']) || 0) + (Number(rec['宴会_Drink']) || 0),
            count: Number(rec['宴会人数']) || 0,
            food: Number(rec['宴会_Food']) || 0,
            drink: Number(rec['宴会_Drink']) || 0
        };
    }
    // AT (BQ Afternoon Tea)
    if (rec.AT_Food || rec.AT_Drink) {
        channels['AT'] = {
            sales: (Number(rec.AT_Food) || 0) + (Number(rec.AT_Drink) || 0),
            count: Number(rec['AT人数']) || 0,
            food: Number(rec.AT_Food) || 0,
            drink: Number(rec.AT_Drink) || 0
        };
    }
    // 席料/室料/南京錠/花束/展望台
    ['席料', '室料', '南京錠', '花束', '展望台'].forEach(key => {
        if (Number(rec[key]) > 0) {
            channels[key] = { sales: Number(rec[key]), count: 0 };
        }
    });
    // Event (NP) → フォーム定義ID 'EVENT' に合わせる
    if (rec.Event_Food || rec.Event_Drink) {
        channels['EVENT'] = {
            sales: (Number(rec.Event_Food) || 0) + (Number(rec.Event_Drink) || 0),
            count: Number(rec['Event人数']) || 0,
            food: Number(rec.Event_Food) || 0,
            drink: Number(rec.Event_Drink) || 0
        };
    }
    // テント指定席料 (BG)
    if (Number(rec.Tent) > 0) {
        channels['テント指定席料'] = { sales: Number(rec.Tent), count: 0 };
    }
    // 物販
    if (Number(rec['物販_食品']) > 0 || Number(rec['物販_アパレル']) > 0) {
        channels['物販'] = {
            sales: (Number(rec['物販_食品']) || 0) + (Number(rec['物販_アパレル']) || 0),
            count: 0
        };
    }
    return channels;
}

async function loadOnHandFromGAS() {
    try {
        const onhandResult = await GAS_BRIDGE.loadOnHand();
        if (onhandResult && onhandResult.records) {
            ONHAND_DATA = onhandResult.records;
            console.log(`[GAS-1st] ✅ OnHand loaded: ${ONHAND_DATA.length} records`);
        }
    } catch (e) {
        console.warn('[GAS-1st] OnHand load failed:', e);
    }
}

function onDataLoaded() {
    // Inject RYB as independent store in AKARENGA base if not present
    if (DATA && DATA.config && DATA.config.bases) {
        const akarenga = DATA.config.bases.find(b => b.id === 'AKARENGA');
        if (akarenga && !akarenga.stores.find(s => s.id === 'RYB')) {
            akarenga.stores.push({ id: 'RYB', name: '羊蹄豚 by BQ' });
        }
        // Ensure RYB is in meta.stores list
        if (DATA.meta && DATA.meta.stores && !DATA.meta.stores.includes('RYB')) {
            DATA.meta.stores.push('RYB');
        }
    }
    updateImportStatus('main', DATA);
    populateStoreSelectors();
    renderCurrentTab();
}

function populateStoreSelectors() {
    const stores = DATA.meta.stores;
    // Base selector for Deep Dive
    const baseOpts = DATA.config.bases.map(b =>
        `<option value="${b.id}">${b.name}（${b.stores.length}店）</option>`
    ).join('');
    document.getElementById('selBase').innerHTML = baseOpts;
    selectedBase = DATA.config.bases[0].id;
    // Forecast base selector
    document.getElementById('fcBase').innerHTML = baseOpts;
    selectedStore = stores[0];
}

function renderCurrentTab() {
    if (!DATA) return;
    switch (currentTab) {
        case 'command': renderCommand(); break;
        case 'dive': renderDive(); break;
        case 'forecast': break; // Manual trigger
        case 'entry': renderEntry(); break;
        case 'import': break;
        case 'staffing': renderStaffing(); break;
        case 'report': initReportTab(); break;
        case 'bg': renderBG(); break;
    }
}

// ═══════════════════════════════════════
// ── Base Filter helpers ──
function getStoresForBase(baseId) {
    let stores;
    if (!DATA || baseId === 'ALL') {
        stores = DATA.meta.stores;
    } else {
        const base = DATA.config.bases.find(b => b.id === baseId);
        stores = base ? base.stores.map(s => s.id) : DATA.meta.stores;
    }
    // Apply store-level filter
    if (selectedStoreFilter !== 'ALL') {
        return stores.filter(s => s === selectedStoreFilter);
    }
    return stores;
}

function renderBaseFilter() {
    const bases = DATA.config.bases;
    // Base buttons
    let html = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">`;
    html += `<button class="base-btn ${selectedBase === 'ALL' ? 'active' : ''}" onclick="setBase('ALL')">ALL — SVD統合</button>`;
    bases.forEach(b => {
        const storeCount = b.stores.length;
        html += `<button class="base-btn ${selectedBase === b.id ? 'active' : ''}" onclick="setBase('${b.id}')">${b.name}（${storeCount}店）</button>`;
    });
    html += `</div>`;

    // Store buttons (shown for selected base)
    const storesForFilter = selectedBase === 'ALL' ? DATA.meta.stores : (DATA.config.bases.find(b => b.id === selectedBase)?.stores.map(s => s.id) || []);
    if (storesForFilter.length > 0) {
        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;align-items:center;">`;
        html += `<span style="font-size:10px;color:var(--text-dim);margin-right:4px;">STORE:</span>`;
        html += `<button class="store-btn ${selectedStoreFilter === 'ALL' ? 'active' : ''}" onclick="setStoreFilter('ALL')">ALL</button>`;
        storesForFilter.forEach(sid => {
            const storeName = DATA.config.bases.flatMap(b => b.stores).find(s => s.id === sid);
            const label = storeName ? storeName.name : sid;
            html += `<button class="store-btn ${selectedStoreFilter === sid ? 'active' : ''}" onclick="setStoreFilter('${sid}')" title="${label}">${sid}</button>`;
        });
        html += `</div>`;
    }

    document.getElementById('base-filter').innerHTML = html;
}

function setBase(baseId) {
    selectedBase = baseId;
    selectedStoreFilter = 'ALL'; // Reset store filter when base changes
    renderCommand();
}

function setStoreFilter(storeId) {
    selectedStoreFilter = storeId;
    renderCommand();
}

// ── Ropeway toggle handler ──
function setRopeway(type) {
    document.querySelectorAll('.rw-btn').forEach(btn => btn.classList.remove('rw-active'));
    const activeBtn = document.querySelector(`.rw-btn[data-rw-type="${type}"]`);
    if (activeBtn) activeBtn.classList.add('rw-active');
    const timeInputs = document.getElementById('rw-time-inputs');
    if (timeInputs) timeInputs.style.display = type === 'time' ? 'flex' : 'none';
}

// ① THE BRIDGE — SVD操舵室
// ═══════════════════════════════════════
function renderCommand() {
    // Base Filter buttons
    renderBaseFilter();

    const filteredStores = getStoresForBase(selectedBase);
    const dateStr = selectedDate;

    // --- Collect actual data + forecast for each store ---
    let totalActual = 0, totalForecast = 0, totalActualCount = 0, totalForecastCount = 0;
    let mpSum = 0, activeStores = 0;
    const storeCards = [];
    const allChannelsActual = {};
    const allChannelsForecast = {};

    filteredStores.forEach(sid => {
        const d = (DATA.stores[sid] || []).find(r => r.date === dateStr);
        const fc = forecastForDate(sid, dateStr);
        const isActive = d && d.has_data;

        storeCards.push({ sid, d, fc, isActive });

        if (isActive) {
            totalActual += d.actual_sales;
            totalActualCount += d.actual_count;
            mpSum += d.mp_point;
            activeStores++;
            // Aggregate actual channels
            if (d.channels) {
                Object.entries(d.channels).forEach(([ch, data]) => {
                    if (!allChannelsActual[ch]) allChannelsActual[ch] = { sales: 0, count: 0 };
                    allChannelsActual[ch].sales += data.sales || 0;
                    allChannelsActual[ch].count += data.count || 0;
                });
            }
        }
        // Aggregate forecast channels
        if (fc.predicted_sales > 0) {
            totalForecast += fc.predicted_sales;
            totalForecastCount += fc.predicted_count;
            Object.entries(fc.channels).forEach(([ch, data]) => {
                if (!allChannelsForecast[ch]) allChannelsForecast[ch] = { sales: 0, count: 0, food: 0, drink: 0 };
                allChannelsForecast[ch].sales += data.sales;
                allChannelsForecast[ch].count += data.count;
                allChannelsForecast[ch].food += data.food || 0;
                allChannelsForecast[ch].drink += data.drink || 0;
            });
        }
    });

    const avgMP = activeStores ? (mpSum / activeStores) : 0;
    const sample = storeCards.find(c => c.d);
    const sekki = sample ? sample.d.sekki : getSekki(dateStr);
    const sampleRank = sample ? sample.d.rank : 12;
    const sampleMP = sample ? sample.d.mp_point : 0;
    const weekday = sample ? sample.d.weekday : WEEKDAY_JA[new Date(dateStr).getDay()];
    const progressPct = totalForecast > 0 ? (totalActual / totalForecast * 100) : 0;
    const actualAvg = totalActualCount > 0 ? Math.round(totalActual / totalActualCount) : 0;
    const forecastAvg = totalForecastCount > 0 ? Math.round(totalForecast / totalForecastCount) : 0;

    const scopeLabel = selectedBase === 'ALL' ? 'SVD統合' : DATA.config.bases.find(b => b.id === selectedBase)?.name || selectedBase;

    // --- 3-Column Comparison: 本日 | 前年同日 | 前々年同日 ---
    const tl = txLabel();
    const WDAY_C = ['日', '月', '火', '水', '木', '金', '土'];

    // Helper: aggregate store data for a given date
    function aggregateDate(dStr) {
        let total = 0, count = 0, food = 0, drink = 0;
        let mpSum = 0, mpCount = 0, sampleSekki = '', sampleRank = 12;
        const ch = {};
        filteredStores.forEach(sid => {
            const rec = (DATA.stores[sid] || []).find(r => r.date === dStr);
            if (rec && rec.has_data) {
                total += rec.actual_sales;
                count += rec.actual_count;
                if (rec.mp_point > 0) {
                    mpSum += rec.mp_point;
                    mpCount++;
                }
                if (!sampleSekki && rec.sekki) sampleSekki = rec.sekki;
                if (rec.rank) sampleRank = rec.rank;
                if (rec.channels) {
                    Object.entries(rec.channels).forEach(([name, data]) => {
                        if (!ch[name]) ch[name] = { sales: 0, count: 0, food: 0, drink: 0 };
                        ch[name].sales += data.sales || 0;
                        ch[name].count += data.count || 0;
                        ch[name].food += data.food || 0;
                        ch[name].drink += data.drink || 0;
                        food += data.food || 0;
                        drink += data.drink || 0;
                    });
                }
            }
        });
        const dt = new Date(dStr);
        const avgMP = mpCount > 0 ? mpSum / mpCount : 0;
        return {
            total, count, food, drink, ch,
            weekday: WDAY_C[dt.getDay()], date: dStr,
            mp: avgMP, sekki: sampleSekki || getSekki(dStr), rank: sampleRank
        };
    }

    // Build columns data
    const baseDate = new Date(dateStr);
    const y1Date = new Date(baseDate); y1Date.setFullYear(y1Date.getFullYear() - 1);
    const y2Date = new Date(baseDate); y2Date.setFullYear(y2Date.getFullYear() - 2);
    const y1Str = y1Date.toISOString().slice(0, 10);
    const y2Str = y2Date.toISOString().slice(0, 10);

    const todayData = aggregateDate(dateStr);
    const y1Data = aggregateDate(y1Str);
    const y2Data = aggregateDate(y2Str);

    // Also include forecast for today
    const todayForecast = totalForecast;
    const todayForecastCount = totalForecastCount;

    // Weekday color helper
    function wdayColor(wd) {
        return wd === '土' ? '#60a5fa' : wd === '日' ? '#f87171' : '#ccc';
    }

    // ── Ropeway suspension detection helper ──
    function isRopewaySuspected(salesTotal) {
        return selectedBase === 'MOIWAYAMA' && salesTotal > 0 && salesTotal < 100000;
    }
    function ropewayBadge() {
        return `<div style="display:flex;align-items:center;gap:6px;background:rgba(251,146,60,0.12);border:1px solid rgba(251,146,60,0.3);border-radius:8px;padding:6px 10px;margin-bottom:8px;">
            <span style="font-size:16px;">🚡</span>
            <span style="color:#fb923c;font-size:12px;font-weight:600;">運休の可能性（売上 ¥100,000未満）</span>
        </div>`;
    }
    function ropewayActualBadge(rec) {
        if (!rec || !rec.ropeway) return '';
        const rw = rec.ropeway;
        const labels = { 'full': '🚡 終日運休', 'partial': '🚡 一部運休', 'time': `🚡 ${rw.from || ''}〜${rw.to || ''} 運休` };
        const txt = labels[rw.type] || '';
        if (!txt) return '';
        return `<div style="display:flex;align-items:center;gap:6px;background:rgba(251,146,60,0.15);border:1px solid rgba(251,146,60,0.4);border-radius:8px;padding:6px 10px;margin-bottom:8px;">
            <span style="color:#fb923c;font-size:12px;font-weight:700;">${txt}</span>
        </div>`;
    }

    // Build one column HTML
    function buildColumn(label, emoji, data, refTotal, isForecast, colType) {
        // colType: 'today' | 'y1' | 'y2'
        const isY2 = colType === 'y2';
        const isY1 = colType === 'y1';

        // Card style by column type
        const borderColor = isForecast ? 'rgba(212,168,67,0.35)' : isY2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
        const bgColor = isForecast ? 'rgba(212,168,67,0.03)' : isY2 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)';
        const shadowStyle = isForecast ? 'box-shadow:0 0 24px rgba(212,168,67,0.08);' : '';
        const labelColor = isForecast ? '#d4a843' : isY1 ? '#8899aa' : '#556';
        const salesColor = isForecast ? '#d4a843' : isY1 ? '#aabbcc' : '#778';
        const salesSize = isForecast ? '28px' : isY1 ? '24px' : '20px';
        const opacity = isY2 ? 'opacity:0.75;' : '';

        // Type badge
        const typeBadge = isForecast
            ? (activeStores > 0
                ? `<span style="font-size:10px;background:rgba(74,222,128,0.15);color:#4ade80;padding:2px 8px;border-radius:10px;font-weight:600;">📊 実績</span>`
                : `<span style="font-size:10px;background:rgba(212,168,67,0.15);color:#d4a843;padding:2px 8px;border-radius:10px;font-weight:600;animation:pulse 2s infinite;">⏳ 予測</span>`)
            : `<span style="font-size:10px;background:rgba(255,255,255,0.06);color:#888;padding:2px 8px;border-radius:10px;">📋 実績</span>`;

        if (data.total === 0 && !isForecast) {
            return `<div style="flex:1;min-width:260px;background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:16px;${opacity}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:14px;font-weight:600;color:${labelColor};">${emoji} ${label}</span>
                    ${typeBadge}
                </div>
                <div style="font-size:12px;color:#555;">${data.date} <span style="color:${wdayColor(data.weekday)};font-weight:600;">${data.weekday}</span>曜日</div>
                <div style="color:#555;font-size:13px;padding:24px 0;text-align:center;">データなし</div>
            </div>`;
        }

        const salesDisp = txv(data.total);
        const foodDisp = txv(data.food);
        const drinkDisp = txv(data.drink);
        const avg = data.count > 0 ? Math.round(txv(data.total) / data.count) : 0;
        const foodAvg = data.count > 0 ? Math.round(txv(data.food) / data.count) : 0;
        const drinkAvg = data.count > 0 ? Math.round(txv(data.drink) / data.count) : 0;

        // YoY percentage
        let yoyHtml = '';
        if (refTotal > 0 && data.total !== refTotal) {
            const pct = (data.total / refTotal * 100);
            yoyHtml = `<span class="mono ${pct >= 100 ? 'text-green' : 'text-red'}" style="font-size:13px;margin-left:8px;">${pct.toFixed(1)}%</span>`;
        }

        // Ropeway warning for forecast or ropeway badge for actual
        let ropewayHtml = '';
        if (isForecast && isRopewaySuspected(data.total)) {
            ropewayHtml = ropewayBadge();
        } else if (!isForecast && isRopewaySuspected(data.total)) {
            ropewayHtml = ropewayBadge();
        }
        // Check actual ropeway record for historical data
        if (!isForecast && data.ropeway) {
            ropewayHtml = ropewayActualBadge(data);
        }

        // Channel breakdown
        const sortedChs = Object.entries(data.ch)
            .filter(([, d]) => d.sales > 0)
            .sort((a, b) => b[1].sales - a[1].sales);

        let chRows = sortedChs.map(([ch, d]) => {
            const s = txv(d.sales);
            const f = txv(d.food);
            const dr = txv(d.drink);
            const chAvg = d.count > 0 ? Math.round(s / d.count) : 0;
            const chFAvg = d.count > 0 ? Math.round(f / d.count) : 0;
            const chBAvg = d.count > 0 ? Math.round(dr / d.count) : 0;
            const hasFB = d.food > 0 || d.drink > 0;
            const hasCount = d.count > 0;
            return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
                    <span style="color:#aaa;font-size:12px;font-weight:600;">${ch}</span>
                    <div style="display:flex;align-items:baseline;gap:8px;">
                        <span class="mono" style="color:#ccc;font-size:13px;">${fmt$(s)}</span>
                        <span class="mono" style="color:#666;font-size:11px;">${hasCount ? d.count + '名' : ''}</span>
                    </div>
                </div>
                ${hasCount ? `<div style="display:flex;gap:12px;padding-left:4px;margin-top:2px;">
                    <span style="font-size:10px;color:#555;">客単価 <span class="mono" style="color:#aaa;">${fmt$(chAvg)}</span></span>
                    ${hasFB ? `<span style="font-size:10px;color:#555;">F <span class="mono" style="color:#f0c674;">${fmt$(chFAvg)}</span></span>
                    <span style="font-size:10px;color:#555;">B <span class="mono" style="color:#81a1c1;">${fmt$(chBAvg)}</span></span>` : ''}
                </div>` : ''}
            </div>`;
        }).join('');

        // Forecast row for today column
        let forecastRow = '';
        if (isForecast && todayForecast > 0) {
            const fcDisp = txv(todayForecast);
            const pct = activeStores > 0 ? (totalActual / todayForecast * 100) : 0;
            forecastRow = `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:6px;">
                    <span style="color:#60a5fa;font-size:12px;">MP予測</span>
                    <span class="mono" style="color:#60a5fa;font-size:14px;">${fmt$(fcDisp)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0 0 8px;">
                    <span style="color:#888;font-size:12px;">達成率</span>
                    <span class="mono ${pct >= 100 ? 'text-green' : activeStores > 0 ? 'text-red' : ''}" style="font-size:14px;">${activeStores > 0 ? pct.toFixed(1) + '%' : '—'}</span>
                </div>
            `;
        }

        return `<div style="flex:1;min-width:260px;background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:16px;${shadowStyle}${opacity}">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <span style="font-size:14px;font-weight:600;color:${labelColor};">${emoji} ${label}</span>
                ${typeBadge}
                ${yoyHtml}
            </div>
            <div style="font-size:12px;color:#555;margin-bottom:12px;">${data.date} <span style="color:${wdayColor(data.weekday)};font-weight:600;">${data.weekday}</span>曜日 | ${tl}</div>

            ${ropewayHtml}
            ${forecastRow}

            <div style="margin-bottom:12px;">
                <div class="mono" style="font-size:${salesSize};color:${salesColor};line-height:1.2;">${fmt$(salesDisp)}</div>
                <div style="font-size:11px;color:#666;margin-top:2px;">売上合計</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
                <div>
                    <div class="mono" style="font-size:16px;color:#ccc;">${data.count}名</div>
                    <div style="font-size:10px;color:#555;">客数</div>
                </div>
                <div>
                    <div class="mono" style="font-size:16px;color:#ccc;">${fmt$(avg)}</div>
                    <div style="font-size:10px;color:#555;">客単価</div>
                </div>
                <div>
                    <div style="font-size:14px;">${data.mp > 0 ? mpBadge(data.mp) : rankBadge(data.rank)}</div>
                    <div style="font-size:10px;color:#555;">${data.sekki}</div>
                </div>
            </div>

            ${data.food > 0 || data.drink > 0 ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:10px;">
                <div>
                    <div class="mono" style="font-size:15px;color:#f0c674;">${fmt$(foodDisp)}</div>
                    <div style="font-size:10px;color:#555;">F売上</div>
                    <div class="mono" style="font-size:12px;color:#888;margin-top:2px;">${data.count > 0 ? '@ ' + fmt$(foodAvg) : ''}</div>
                </div>
                <div>
                    <div class="mono" style="font-size:15px;color:#81a1c1;">${fmt$(drinkDisp)}</div>
                    <div style="font-size:10px;color:#555;">B売上</div>
                    <div class="mono" style="font-size:12px;color:#888;margin-top:2px;">${data.count > 0 ? '@ ' + fmt$(drinkAvg) : ''}</div>
                </div>
            </div>
            ` : ''}

            <div style="font-size:11px;color:#666;margin-bottom:4px;">チャネル別</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;">
            ${chRows || '<div style="color:#555;font-size:12px;">—</div>'}
            </div>
        </div>`;
    }

    // §0: 実績が入力済み(activeStores > 0)の場合はforecastで上書きしない
    // 本当にデータがない場合(activeStores === 0)のみforecastを表示用に使う
    if (activeStores === 0 && totalForecast > 0) {
        todayData.total = totalForecast;
        todayData.count = totalForecastCount;
        todayData.ch = {};
        let fTotal = 0, dTotal = 0;
        Object.entries(allChannelsForecast).forEach(([ch, d]) => {
            todayData.ch[ch] = { sales: d.sales, count: d.count, food: d.food || 0, drink: d.drink || 0 };
            fTotal += d.food || 0;
            dTotal += d.drink || 0;
        });
        todayData.food = fTotal;
        todayData.drink = dTotal;
        todayData._isForecastOnly = true;
    }
    // Ensure today has MP/sekki from store records even if no actual sales yet
    if (todayData.mp === 0 && sampleMP > 0) {
        todayData.mp = sampleMP;
        todayData.sekki = sekki;
        todayData.rank = sampleRank;
    }

    const compEl = document.getElementById('forecast-comparison');
    if (compEl) {
        compEl.innerHTML = `
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                ${buildColumn(dateStr, '📍', todayData, y1Data.total, true, 'today')}
                ${buildColumn('前年同日', '📅', y1Data, todayData.total, false, 'y1')}
                ${buildColumn('前々年同日', '📆', y2Data, todayData.total, false, 'y2')}
            </div>
            <div style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;flex-wrap:wrap;">
                <span style="font-size:10px;color:#666;margin-right:4px;">MP LEVEL:</span>
                <span style="font-size:10px;font-weight:700;color:#fff;background:#dc2626;padding:2px 8px;border-radius:3px;">TOP 1-5</span>
                <span style="font-size:10px;font-weight:700;color:#fff;background:#f97316;padding:2px 8px;border-radius:3px;">HIGH 6-10</span>
                <span style="font-size:10px;font-weight:700;color:#000;background:#eab308;padding:2px 8px;border-radius:3px;">FLOW 11-15</span>
                <span style="font-size:10px;font-weight:700;color:#fff;background:#22c55e;padding:2px 8px;border-radius:3px;">LOW 16-20</span>
                <span style="font-size:10px;font-weight:700;color:#fff;background:#3b82f6;padding:2px 8px;border-radius:3px;">OFF 21-24</span>
            </div>
        `;
    }


    const allChannelNames = [...new Set([...Object.keys(allChannelsForecast), ...Object.keys(allChannelsActual)])];
    let channelHtml = '';
    if (allChannelNames.length > 0) {
        const tl2 = txLabel();
        channelHtml = `<table class="ch-table">
            <thead><tr>
                <th>チャネル</th>
                <th>予測売上(${tl2})</th><th>実績売上(${tl2})</th><th>達成率</th>
                <th>予測客数</th><th>実績客数</th>
                <th>予測単価(${tl2})</th><th>実績単価(${tl2})</th>
            </tr></thead><tbody>`;
        allChannelNames.forEach(ch => {
            const fc = allChannelsForecast[ch] || { sales: 0, count: 0 };
            const ac = allChannelsActual[ch] || { sales: 0, count: 0 };

            const fcDisp = txv(fc.sales);
            const acDisp = txv(ac.sales);

            const pct = fc.sales > 0 ? (ac.sales / fc.sales * 100) : 0;
            const fcAvg = fc.count > 0 ? Math.round(fcDisp / fc.count) : 0;
            const acAvg = ac.count > 0 ? Math.round(acDisp / ac.count) : 0;

            channelHtml += `<tr>
                <td><strong>${ch}</strong></td>
                <td class="mono">${fmt$(fcDisp)}</td>
                <td class="mono text-gold">${fmt$(acDisp)}</td>
                <td class="mono ${pct >= 100 ? 'text-green' : pct > 0 ? 'text-red' : ''}">${fc.sales > 0 ? pct.toFixed(1) + '%' : '—'}</td>
                <td class="mono">${fc.count}</td>
                <td class="mono">${ac.count}</td>
                <td class="mono">${fmt$(fcAvg)}</td>
                <td class="mono">${fmt$(acAvg)}</td>
            </tr>`;
        });
        // ── 合計行 ──
        const totalFcSales = allChannelNames.reduce((s, ch) => s + txv((allChannelsForecast[ch] || {}).sales || 0), 0);
        const totalAcSales = allChannelNames.reduce((s, ch) => s + txv((allChannelsActual[ch] || {}).sales || 0), 0);
        const totalFcCount = allChannelNames.reduce((s, ch) => s + ((allChannelsForecast[ch] || {}).count || 0), 0);
        const totalAcCount = allChannelNames.reduce((s, ch) => s + ((allChannelsActual[ch] || {}).count || 0), 0);
        const totalPct = totalFcSales > 0 ? (totalAcSales / totalFcSales * 100) : 0;
        const totalFcAvg = totalFcCount > 0 ? Math.round(totalFcSales / totalFcCount) : 0;
        const totalAcAvg = totalAcCount > 0 ? Math.round(totalAcSales / totalAcCount) : 0;
        channelHtml += `<tr style="border-top:2px solid rgba(255,255,255,0.15);font-weight:700;">
            <td><strong>合計</strong></td>
            <td class="mono">${fmt$(totalFcSales)}</td>
            <td class="mono text-gold">${fmt$(totalAcSales)}</td>
            <td class="mono ${totalPct >= 100 ? 'text-green' : activeStores > 0 ? 'text-red' : ''}">${activeStores > 0 ? totalPct.toFixed(1) + '%' : '—'}</td>
            <td class="mono">${totalFcCount}</td>
            <td class="mono">${totalAcCount}</td>
            <td class="mono">${fmt$(totalFcAvg)}</td>
            <td class="mono">${fmt$(totalAcAvg)}</td>
        </tr>`;
        channelHtml += '</tbody></table>';
    } else {
        channelHtml = '<div class="text-dim" style="padding:16px;text-align:center;">チャネルデータなし</div>';
    }
    document.getElementById('channel-breakdown').innerHTML = channelHtml;

    // --- Store Cards (with per-store forecast + rationale) ---
    document.getElementById('store-grid').innerHTML = storeCards.map(({ sid, d, fc, isActive }) => {
        const fcSales = fc.predicted_sales;
        const actualSales = d ? d.actual_sales : 0;

        const fcDisp2 = txv(fcSales);
        const actualDisp2 = txv(actualSales);

        const storePct = fcSales > 0 ? (actualSales / fcSales * 100) : 0;
        const cardId = `rationale-${sid}`;

        // Build rationale rows from matches
        let rationaleHtml = '';
        if (fc.matches && fc.matches.length > 0) {
            const confidenceCls = fc.matchCount >= 3 ? 'conf-high' : fc.matchCount >= 2 ? 'conf-mid' : 'conf-low';
            const confidenceLabel = fc.matchCount >= 3 ? '信頼度◎' : fc.matchCount >= 2 ? '信頼度○' : '⚠ データ不足';

            rationaleHtml = `
            <div class="rationale-toggle" onclick="event.stopPropagation(); document.getElementById('${cardId}').classList.toggle('open');">
                <span class="rationale-badge ${confidenceCls}">📐 N=${fc.matchCount} ${confidenceLabel}</span>
                <span class="rationale-arrow">▼</span>
            </div>
            <div class="rationale-panel" id="${cardId}">
                <div class="rationale-header">
                    <span>予測条件: <strong>${fc.sekki}</strong> × <strong>${fc.weekday}曜</strong></span>
                </div>
                <div class="rationale-list">
                    ${fc.matches.sort((a, b) => b.date.localeCompare(a.date)).map(m => {
                const mDisp = txv(m.sales);
                return `<div class="rationale-row">
                            <span class="rationale-date mono">${m.date}</span>
                            <span class="rationale-tag">${m.weekday}</span>
                            <span class="rationale-sales mono">¥${mDisp.toLocaleString()}</span>
                            <span class="rationale-count">${m.count}名</span>
                        </div>`;
            }).join('')}
                </div>
                <div class="rationale-avg">
                    → 平均(${txLabel()}): <strong class="mono text-gold">${fmt$(fcDisp2)}</strong>
                    <span style="margin-left:8px;color:var(--text-muted);">${fc.predicted_count}名</span>
                </div>
            </div>`;
        } else if (fcSales === 0) {
            rationaleHtml = `<div class="rationale-empty">📐 マッチデータなし（同節気×同曜日の過去実績が未登録）</div>`;
        }

        return `<div class="store-card ${isActive ? '' : 'inactive'}">
            <div class="store-card-header" onclick="jumpToStore('${sid}')">
                <div class="store-name">${sid}</div>
                <div class="store-base">${getBaseName(sid)} — ${getStoreName(sid)}</div>
                ${(() => {
                const mp = (d && d.mp_point) || (fc && fc.mp_point) || null; return mp ? `<div class="mp-meter">${meterBars(mp)}</div>
                <div class="mp-value mono">${mp.toFixed(2)}</div>
                <div class="mp-season">${mpBadge(mp, 'small')}</div>` : '';
            })()}
                <div class="store-sales mono">${isActive ? fmt$(actualDisp2) : '休業'} <span style="font-size:0.7em">(${txLabel()})</span></div>
                <div class="store-forecast" style="font-size:11px;color:var(--text-dim);">
                    予測(${txLabel()}): ${fcSales > 0 ? fmt$(fcDisp2) : '—'}
                    ${fcSales > 0 && isActive ? ` (${storePct.toFixed(0)}%)` : ''}
                </div>
                ${fc.is_holiday ? `<div style="font-size:11px;color:#f87171;font-weight:600;margin-top:2px;">🔴 ${fc.holiday_note || '定休日'}</div>` : ''}
                ${fc.onhand_records && fc.onhand_records.length > 0 ? `<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">
                    ${fc.onhand_records.map(oh => `<span style="font-size:10px;background:rgba(251,146,60,0.15);color:#fb923c;padding:2px 6px;border-radius:4px;font-weight:600;">🎯 ${oh.type} ${oh.count}名 ¥${Number(oh.amount).toLocaleString()}</span>`).join('')}
                </div>` : ''}
            </div>
            ${rationaleHtml}
        </div>`;
    }).join('');

    // ── OnHand Radar （今後2週間の大型案件） ──
    renderOnHandRadar();

    // Monthly Summary
    renderMonthlySummary();
}

// ── OnHand Radar: 今後の大型案件一覧 ──
function renderOnHandRadar() {
    // OnHandデータがない場合はスキップ
    if (!ONHAND_DATA || ONHAND_DATA.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    // 今後30日のOnHand（有効予約 + 20名以上）
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const RADAR_EXCLUDE = ['キャンセル', 'ノーショー', 'ノーショー（無断キャンセル）'];

    const upcoming = ONHAND_DATA.filter(r =>
        r.date >= today && r.date <= cutoffStr &&
        !RADAR_EXCLUDE.includes(r.status) && Number(r.count) >= 20
    ).sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length === 0) return;

    // 既存のOnHand Radar要素があれば再利用、なければ作成
    let radarEl = document.getElementById('onhand-radar');
    if (!radarEl) {
        radarEl = document.createElement('div');
        radarEl.id = 'onhand-radar';
        const storeGrid = document.getElementById('store-grid');
        if (storeGrid && storeGrid.parentNode) {
            storeGrid.parentNode.insertBefore(radarEl, storeGrid.nextSibling);
        }
    }

    const WDAY = ['日', '月', '火', '水', '木', '金', '土'];

    // 店舗別にグルーピング
    const byStore = {};
    upcoming.forEach(r => {
        if (!byStore[r.store]) byStore[r.store] = [];
        byStore[r.store].push(r);
    });

    let storeIdx = 0;
    const storeBlocksHtml = Object.entries(byStore).map(([store, records]) => {
        const totalPax = records.reduce((s, r) => s + Number(r.count), 0);
        const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0);
        const accordionId = `onhand-acc-${storeIdx++}`;
        const rowsHtml = records.map(r => {
            const d = new Date(r.date);
            const wd = WDAY[d.getDay()];
            const wdColor = wd === '土' ? '#60a5fa' : wd === '日' ? '#f87171' : '#aaa';
            const count = Number(r.count);
            const amount = Number(r.amount);
            const sizeClass = count >= 50 ? 'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);' :
                count >= 30 ? 'background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.2);' :
                    'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);';
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;${sizeClass}">
                        <span class="mono" style="font-size:12px;color:#ccc;min-width:80px;">${r.date.slice(5)}</span>
                        <span style="font-size:12px;color:${wdColor};font-weight:600;min-width:20px;">${wd}</span>
                        <span style="font-size:11px;color:#888;min-width:30px;">${r.type}</span>
                        <span class="mono" style="font-size:13px;color:#fb923c;font-weight:700;min-width:40px;">${count}名</span>
                        <span class="mono" style="font-size:12px;color:#aaa;min-width:80px;">¥${amount.toLocaleString()}</span>
                        <span style="font-size:10px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.course || ''}</span>
                    </div>`;
        }).join('');

        return `<div style="margin-bottom:8px;">
            <div onclick="document.getElementById('${accordionId}').classList.toggle('hidden');this.querySelector('.acc-arrow').textContent=document.getElementById('${accordionId}').classList.contains('hidden')?'▶':'▼'"
                 style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background 0.2s;background:rgba(255,255,255,0.03);"
                 onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'">
                <span class="acc-arrow" style="font-size:10px;color:#888;min-width:14px;">▶</span>
                <span style="font-size:12px;background:rgba(255,255,255,0.08);padding:3px 8px;border-radius:4px;color:#ccc;font-weight:700;">${store}</span>
                <span style="font-size:11px;color:var(--text-dim);">${getStoreName(store)}</span>
                <span class="mono" style="font-size:12px;color:#fb923c;font-weight:600;margin-left:auto;">${totalPax}名 / ${records.length}件</span>
                <span class="mono" style="font-size:11px;color:#888;">¥${totalAmount.toLocaleString()}</span>
            </div>
            <div id="${accordionId}" class="hidden" style="display:grid;gap:4px;padding:6px 8px 6px 28px;margin-top:4px;">
                ${rowsHtml}
            </div>
        </div>`;
    }).join('');

    radarEl.innerHTML = `
        <div style="margin-top:20px;padding:16px;background:rgba(251,146,60,0.05);border:1px solid rgba(251,146,60,0.15);border-radius:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="font-size:16px;">🎯</span>
                <span style="font-size:14px;font-weight:700;color:#fb923c;">OnHand Radar</span>
                <span style="font-size:11px;color:#888;">今後30日の大型案件（${upcoming.length}件）</span>
            </div>
            ${storeBlocksHtml}
        </div>
    `;
}

// ── Store Form Configuration ──
const STORE_FORMS = {
    'JW': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: 'TAKEOUT', type: 'section', title: '📦 TAKEOUT', fields: ['count', 'food', 'drink'] },
        {
            id: 'MISC', type: 'group', title: '📋 その他', items: [
                { ch: '席料', label: '席料' }, { ch: '貸切', label: '貸切' }, { ch: '南京錠', label: '南京錠' },
                { ch: '花代（プラン内）', label: '花代（プラン内）' }, { ch: '花代（預かり金）', label: '花代（預かり金）' },
                { ch: 'カレー', label: 'カレー' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'GA': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: '3CH', type: 'section', title: '🍷 WINE BAR', fields: ['count', 'food', 'drink'] },
        { id: 'BANQUET', type: 'section', title: '🎉 宴会 / バンケット', fields: ['count', 'food', 'drink'] },
        {
            id: 'MISC', type: 'group', title: '📋 施設・その他', items: [
                { ch: '室料', label: '室料' }, { ch: '展望台', label: '展望台チケット' },
                { ch: '席料', label: '席料' }, { ch: '貸切', label: '貸切' }, { ch: '花束', label: '花束' },
                { ch: '南京錠', label: '南京錠' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'NP': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: 'EVENT', type: 'section', title: '💍 婚礼・宴会', fields: ['count', 'food', 'drink', 'room', 'flower'] },
        {
            id: 'MISC', type: 'group', title: '📋 その他', items: [
                { ch: 'TAKEOUT', label: 'おせち・TO' }, { ch: 'その他', label: 'その他売上' },
                { ch: '室料', label: '室料' }, { ch: '貸切', label: '貸切' }, { ch: '物販', label: '物販' },
                { ch: '花代（プラン内）', label: '花代（プラン内）' }, { ch: '花代（預かり金）', label: '花代（預かり金）' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'Ce': [
        { id: 'CAFE', type: 'section', title: '☕️ カフェ売上', fields: ['count', 'food', 'drink'] },
        { id: 'GOODS', type: 'simple', title: '🛍 物販', field: 'sales' },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'RP': [
        { id: 'CAFE', type: 'section', title: '☕️ カフェ売上', fields: ['count', 'food', 'drink'] },
        { id: 'GOODS', type: 'simple', title: '🛍 物販', field: 'sales' },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'BQ': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: 'AT', type: 'section', title: '🍰 Afternoon', fields: ['count', 'food', 'drink'] },
        {
            id: 'MISC', type: 'group', title: '📋 その他', items: [
                { ch: '室料', label: '室料' }, { ch: '貸切', label: '貸切' },
                { ch: '花代（プラン内）', label: '花代（プラン内）' }, { ch: '花代（預かり金）', label: '花代（預かり金）' },
                { ch: 'wolt', label: 'Wolt (RYB)' }, { ch: 'uber', label: 'Uber (RYB)' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'RYB': [
        { id: 'ALL', type: 'section', title: '🐷 RYB (羊蹄豚)', fields: ['count', 'food', 'drink'] },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'BG': [
        { id: 'ALL', type: 'section', title: '🍺 ビアガーデン', fields: ['count', 'food', 'drink', 'tent', 'goods'] },
        {
            id: 'MISC', type: 'group', title: '📋 その他', items: [
                { ch: 'テント指定席料', label: 'テント指定席料' }, { ch: 'アネックス席料', label: 'アネックス席料' },
                { ch: '貸切', label: '貸切' }, { ch: 'アパレル', label: 'アパレル / グッズ' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ]
};

// ── Sales Registration Form (拠点ベース・全店同時入力) ──
function renderSalesForm(storeList, dateStr) {
    // Determine the base to display
    const baseId = selectedBase === 'ALL'
        ? (DATA.config.bases[0]?.id || 'MOIWAYAMA')
        : selectedBase;
    const base = DATA.config.bases.find(b => b.id === baseId);
    const baseName = base ? base.name : baseId;
    const baseStores = base ? base.stores.map(s => s.id) : storeList;

    // Base selector tabs
    const baseTabs = DATA.config.bases.map(b => {
        const active = b.id === baseId ? 'btn-gold' : '';
        return `<button class="btn ${active}" onclick="selectedBase='${b.id}'; selectedStoreFilter='ALL'; renderEntry();">${b.name}</button>`;
    }).join('');

    let formHtml = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${baseTabs}</div>
            <div class="control-group" style="margin-left:auto;">
                <label>入力日</label>
                <input type="date" id="sf-date" value="${dateStr}" onchange="selectedDate=this.value; renderEntry();">
            </div>
            <div class="control-group">
                <label class="tax-toggle">
                    <input type="checkbox" id="sf-tax-inc" checked onchange="updateTaxDisplay()">
                    <span>税込入力</span>
                </label>
            </div>
        </div>
    `;

    // Render each store in this base
    baseStores.forEach(sid => {
        const config = STORE_FORMS[sid] || [];
        if (config.length === 0) return;

        const storeName = getStoreName(sid);
        let dbData = null;
        if (DATA && DATA.stores[sid]) {
            dbData = DATA.stores[sid].find(r => r.date === dateStr);
        }

        // ── Ropeway toggle (Moiwayama / JW only) ──
        let ropewayToggleHtml = '';
        if (sid === 'JW') {
            const rwData = dbData?.ropeway || null;
            const rwType = rwData?.type || 'none';
            const rwFrom = rwData?.from || '';
            const rwTo = rwData?.to || '';
            const rwMemo = rwData?.memo || '';
            ropewayToggleHtml = `
            <div class="sf-ropeway-panel" style="background:rgba(251,146,60,0.06);border:1px solid rgba(251,146,60,0.2);border-radius:10px;padding:12px;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="font-size:18px;">🚡</span>
                    <span style="color:#fb923c;font-weight:700;font-size:13px;">ロープウェイ運休</span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <button class="rw-btn ${rwType === 'none' ? 'rw-active' : ''}" data-rw-type="none" onclick="setRopeway('none')">通常営業</button>
                    <button class="rw-btn ${rwType === 'full' ? 'rw-active' : ''}" data-rw-type="full" onclick="setRopeway('full')">終日運休</button>
                    <button class="rw-btn ${rwType === 'partial' ? 'rw-active' : ''}" data-rw-type="partial" onclick="setRopeway('partial')">一部運休</button>
                    <button class="rw-btn ${rwType === 'time' ? 'rw-active' : ''}" data-rw-type="time" onclick="setRopeway('time')">時間指定</button>
                </div>
                <div id="rw-time-inputs" style="display:${rwType === 'time' ? 'flex' : 'none'};gap:8px;margin-bottom:8px;align-items:center;">
                    <input type="time" id="rw-from" value="${rwFrom}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(251,146,60,0.3);border-radius:6px;color:#fb923c;padding:4px 8px;font-size:12px;">
                    <span style="color:#888;">〜</span>
                    <input type="time" id="rw-to" value="${rwTo}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(251,146,60,0.3);border-radius:6px;color:#fb923c;padding:4px 8px;font-size:12px;">
                    <span style="color:#888;font-size:11px;">運休</span>
                </div>
                <textarea id="rw-memo" placeholder="メモ…" rows="1" onfocus="this.rows=3" onblur="if(!this.value)this.rows=1" style="background:rgba(255,255,255,0.06);color:#ddd;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid rgba(251,146,60,0.15);border-radius:6px;padding:6px 10px;width:100%;box-sizing:border-box;outline:none;resize:vertical;">${rwMemo}</textarea>
            </div>`;
        }

        formHtml += `
        <div class="sf-store-block" data-store="${sid}">
            <div class="sf-store-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <span class="sf-store-tag">${sid}</span>
                <span class="sf-store-title">${storeName}</span>
                <span class="sf-store-total mono" id="sf-total-${sid}">—</span>
                <span class="sf-store-arrow">▼</span>
            </div>
            <div class="sf-store-body">
            ${ropewayToggleHtml}`;

        config.forEach(section => {
            const pfx = `sf-${sid}-${section.id}`; // Namespaced prefix

            formHtml += `<div class="sf-section" data-id="${section.id}" data-type="${section.type}" data-store="${sid}">`;

            if (section.type === 'section') {
                formHtml += `<div class="sf-section-title">${section.title}</div>
                <div class="sf-row">`;

                section.fields.forEach(f => {
                    const label = { 'count': '客数', 'food': 'F売上', 'drink': 'B売上', 'sales': '売上', 'room': '室料', 'flower': '花束', 'goods': '物販', 'tent': 'テント' }[f] || f;
                    let val = '';
                    if (dbData && dbData.channels && dbData.channels[section.id]) {
                        val = dbData.channels[section.id][f] || '';
                        if (f !== 'count' && val) val = Math.round(val);
                    }
                    formHtml += `<div class="sf-field">
                        <label>${label}</label>
                        <input type="number" class="sf-input" id="${pfx}-${f}" data-store="${sid}" data-sec="${section.id}" data-key="${f}" min="0" placeholder="0" value="${val}" oninput="updateTaxDisplay()">
                    </div>`;
                });

                formHtml += `
                    <div class="sf-field sf-calc"><label>小計(税込)</label><div class="sf-subtotal mono" id="disp-${sid}-${section.id}-inc">—</div></div>
                    <div class="sf-field sf-calc bg-gold-dim"><label>小計(税抜)</label><div class="sf-exctax mono text-gold" id="disp-${sid}-${section.id}-exc">—</div></div>
                    ${section.fields.includes('count') ? `<div class="sf-field sf-calc"><label>客単価</label><div class="sf-avg mono" id="disp-${sid}-${section.id}-avg">—</div></div>
                    <div class="sf-field sf-calc"><label style="color:#e08060;">F単価</label><div class="sf-avg mono" style="color:#e08060;" id="disp-${sid}-${section.id}-favg">—</div></div>
                    <div class="sf-field sf-calc"><label style="color:#60a0e0;">B単価</label><div class="sf-avg mono" style="color:#60a0e0;" id="disp-${sid}-${section.id}-bavg">—</div></div>` : ''}
                </div>`;

            } else if (section.type === 'simple') {
                const f = section.field || 'sales';
                let val = '';
                if (dbData && dbData.channels && dbData.channels[section.id]) {
                    val = dbData.channels[section.id][f] || (dbData.channels[section.id].sales) || '';
                }
                formHtml += `<div class="sf-section-title">${section.title}</div>
                <div class="sf-row">
                    <div class="sf-field"><label>売上</label><input type="number" class="sf-input" id="${pfx}-${f}" data-store="${sid}" data-sec="${section.id}" data-key="${f}" min="0" placeholder="0" value="${val}" oninput="updateTaxDisplay()"></div>
                    <div class="sf-field sf-calc bg-gold-dim"><label>税抜</label><div class="sf-exctax mono text-gold" id="disp-${sid}-${section.id}-exc">—</div></div>
                </div>`;

            } else if (section.type === 'group') {
                formHtml += `<div class="sf-section-title">${section.title}</div>
                <div class="sf-row" style="flex-wrap:wrap;">`;
                section.items.forEach(item => {
                    let val = '';
                    if (dbData && dbData.channels && dbData.channels[item.ch]) {
                        val = dbData.channels[item.ch].sales || '';
                    }
                    formHtml += `<div class="sf-field" style="flex:0 0 auto;width:100px;">
                        <label>${item.label}</label>
                        <input type="number" class="sf-input" id="sf-${sid}-${item.ch}-sales" data-store="${sid}" data-sec="${item.ch}" data-key="sales" min="0" placeholder="0" value="${val}" oninput="updateTaxDisplay()">
                    </div>`;
                });
                formHtml += `</div>`;
            } else if (section.type === 'labor') {
                const laborLabels = { 'service': 'サービス', 'kitchen': 'キッチン', 'backoffice': 'バックオフィス共通' };
                formHtml += `<div class="sf-section-title" style="color:#a78bfa;">${section.title}</div>
                <div class="sf-row">`;
                section.fields.forEach(f => {
                    const label = laborLabels[f] || f;
                    let val = '';
                    if (dbData && dbData.labor && dbData.labor[f] !== undefined) {
                        val = dbData.labor[f];
                    }
                    formHtml += `<div class="sf-field">
                        <label style="color:#a78bfa;">${label}</label>
                        <input type="number" class="sf-input sf-labor-input" id="${pfx}-${f}" data-store="${sid}" data-sec="LABOR" data-key="${f}" min="0" step="0.5" placeholder="0" value="${val}" oninput="updateTaxDisplay()" style="border-color:rgba(167,139,250,0.3);">
                    </div>`;
                });
                formHtml += `
                    <div class="sf-field sf-calc" style="background:rgba(167,139,250,0.08);border-radius:8px;">
                        <label style="color:#a78bfa;">合計労働時間</label>
                        <div class="sf-subtotal mono" style="color:#a78bfa;" id="disp-${sid}-LABOR-total">—</div>
                    </div>
                    <div class="sf-field sf-calc" style="background:rgba(167,139,250,0.05);border-radius:8px;">
                        <label style="color:rgba(167,139,250,0.7);font-size:10px;">サービス</label>
                        <div class="sf-subtotal mono" style="color:#a78bfa;font-size:12px;" id="disp-${sid}-LABOR-service-disp">—</div>
                    </div>
                    <div class="sf-field sf-calc" style="background:rgba(167,139,250,0.05);border-radius:8px;">
                        <label style="color:rgba(167,139,250,0.7);font-size:10px;">キッチン</label>
                        <div class="sf-subtotal mono" style="color:#a78bfa;font-size:12px;" id="disp-${sid}-LABOR-kitchen-disp">—</div>
                    </div>
                    <div class="sf-field sf-calc" style="background:rgba(212,168,67,0.1);border-radius:8px;">
                        <label style="color:#d4a843;">人時生産性</label>
                        <div class="sf-subtotal mono text-gold" style="font-weight:800;" id="disp-${sid}-LABOR-productivity">—</div>
                    </div>
                </div>`;
            }

            formHtml += `</div>`;
        });

        // ── メモ欄 ──
        const existingMemo = dbData?.memo || '';
        formHtml += `
            <div class="sf-memo-wrap" style="margin-top:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span style="font-size:14px;">📝</span>
                    <span style="color:var(--text-dim);font-size:11px;font-weight:600;letter-spacing:0.5px;">MEMO</span>
                </div>
                <textarea id="sf-memo-${sid}" data-store="${sid}"
                    placeholder="今日の特記事項、天候、イベント等…"
                    rows="1" onfocus="this.rows=3" onblur="if(!this.value)this.rows=1"
                    style="background:rgba(255,255,255,0.04);color:#ccc;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid rgba(200,164,94,0.15);border-radius:6px;padding:6px 10px;width:100%;box-sizing:border-box;outline:none;resize:vertical;transition:border-color 0.2s;"
                    onfocusin="this.style.borderColor='rgba(200,164,94,0.4)'"
                    onfocusout="this.style.borderColor='rgba(200,164,94,0.15)'"
                >${existingMemo}</textarea>
            </div>
            </div>
        </div>`;
    });

    // ── メモ履歴アコーディオン ──
    const allMemos = [];
    baseStores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            if (r.memo) {
                allMemos.push({ date: r.date, weekday: r.weekday || '', store: sid, memo: r.memo, sales: r.actual_sales || 0 });
            }
        });
    });
    allMemos.sort((a, b) => b.date.localeCompare(a.date));

    if (allMemos.length > 0) {
        formHtml += `
        <div class="card mt-16" style="padding:12px;">
            <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="const b=this.nextElementSibling;b.style.display=b.style.display==='none'?'block':'none';this.querySelector('.memo-arrow').textContent=b.style.display==='none'?'▶':'▼'">
                <span style="font-size:16px;">📝</span>
                <span style="color:var(--gold);font-weight:700;font-size:13px;letter-spacing:1px;">MEMO HISTORY</span>
                <span style="color:var(--text-dim);font-size:11px;">(${allMemos.length}件)</span>
                <span class="memo-arrow" style="margin-left:auto;color:var(--text-dim);">▶</span>
            </div>
            <div style="display:none;margin-top:8px;">`;

        allMemos.slice(0, 30).forEach(m => {
            formHtml += `
                <div style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <span class="mono" style="color:var(--gold);font-weight:700;">${m.date}</span>
                        <span style="color:var(--text-dim);">${m.weekday}</span>
                        <span style="background:rgba(96,165,250,0.15);color:#60a5fa;padding:1px 6px;border-radius:3px;font-weight:700;font-size:10px;">${m.store}</span>
                        ${m.sales > 0 ? `<span style="color:var(--text-dim);margin-left:auto;">¥${m.sales.toLocaleString()}</span>` : ''}
                    </div>
                    <div style="color:#ccc;margin-top:3px;line-height:1.4;">${m.memo}</div>
                </div>`;
        });

        formHtml += `</div></div>`;
    }

    // Grand Total bar across all stores
    formHtml += `
        <div class="sf-total-bar">
            <div><span class="sf-total-label">${baseName} TOTAL (税込)</span><span class="sf-total-val mono" id="sf-grand-inc" style="color:#aaa;">—</span></div>
            <div><span class="sf-total-label">${baseName} TOTAL (税抜)</span><span class="sf-total-val mono text-gold" id="sf-grand-exc" style="font-size:1.4em;">—</span></div>
            <div style="border-top:1px solid rgba(167,139,250,0.2);padding-top:8px;margin-top:8px;">
                <span class="sf-total-label" style="color:#a78bfa;">👥 合計労働時間</span><span class="sf-total-val mono" style="color:#a78bfa;" id="sf-grand-labor">—</span>
            </div>
            <div style="display:flex;gap:24px;">
                <div><span class="sf-total-label" style="color:rgba(167,139,250,0.7);font-size:10px;">サービス</span> <span class="mono" style="color:#a78bfa;font-size:12px;" id="sf-grand-labor-service">—</span></div>
                <div><span class="sf-total-label" style="color:rgba(167,139,250,0.7);font-size:10px;">キッチン</span> <span class="mono" style="color:#a78bfa;font-size:12px;" id="sf-grand-labor-kitchen">—</span></div>
            </div>
            <div>
                <span class="sf-total-label" style="color:#d4a843;">📊 人時生産性</span><span class="sf-total-val mono text-gold" style="font-size:1.4em;font-weight:800;" id="sf-grand-productivity">—</span>
            </div>
        </div>
        <div id="sf-status" style="font-size:11px;margin-top:6px;"></div>
        <div style="display:flex;gap:12px;margin-top:12px;">
            <button class="btn btn-gold" onclick="saveAllSalesEntries()">💾 一括保存 (${baseName})</button>
            <div class="text-dim" style="font-size:10px;align-self:center;">※拠点内全店舗の売上を一括で☁️クラウド保存</div>
        </div>
    `;

    document.getElementById('entry-form').innerHTML = formHtml;
    updateTaxDisplay();
}

// ── ④ ENTRY — 売上入力タブ ──
function renderEntry() {
    if (!DATA) return;
    const filteredStores = getStoresForBase(selectedBase);
    renderSalesForm(filteredStores, selectedDate);
}

// ── ⑧ BG POP UP — さっぽろテレビ塔ビアガーデン ──
function renderBG() {
    if (!DATA) return;
    const bgRecords = DATA.stores['BG'] || [];
    const bgMeta = DATA.bg_meta || {};
    const activeRecords = bgRecords.filter(r => r.has_data);
    const totalDays = activeRecords.length;
    const totalSales = activeRecords.reduce((s, r) => s + r.actual_sales, 0);
    const totalCount = activeRecords.reduce((s, r) => s + r.actual_count, 0);
    const avgSales = totalDays > 0 ? Math.round(totalSales / totalDays) : 0;
    const avgCount = totalDays > 0 ? Math.round(totalCount / totalDays) : 0;
    const maxSales = Math.max(...activeRecords.map(r => r.actual_sales), 0);

    // Year breakdown (FISCAL YEAR: 4月〜3月)
    const byYear = {};
    activeRecords.forEach(r => {
        const fy = getFiscalYear(r.date);
        if (!byYear[fy]) byYear[fy] = { sales: 0, count: 0, days: 0, records: [] };
        byYear[fy].sales += r.actual_sales;
        byYear[fy].count += r.actual_count;
        byYear[fy].days++;
        byYear[fy].records.push(r);
    });

    const yearRows = Object.entries(byYear).sort().map(([fy, d]) => `
        <tr>
            <td style="font-weight:700;color:var(--gold)">${fiscalYearLabel(Number(fy))}</td>
            <td>${d.days}日</td>
            <td>¥${txv(d.sales).toLocaleString()}</td>
            <td>¥${txv(Math.round(d.sales / d.days)).toLocaleString()}</td>
            <td>${d.count.toLocaleString()}名</td>
            <td>${Math.round(d.count / d.days)}名</td>
            <td>¥${d.count > 0 ? txv(Math.round(d.sales / d.count)).toLocaleString() : '—'}</td>
        </tr>
    `).join('');

    // Monthly breakdown (latest FY)
    const fyKeys = Object.keys(byYear).sort();
    const latestFY = Number(fyKeys[fyKeys.length - 1]) || 2025;
    const latestRecords = byYear[latestFY]?.records || [];
    const byMonth = {};
    latestRecords.forEach(r => {
        const m = r.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { sales: 0, count: 0, days: 0 };
        byMonth[m].sales += r.actual_sales;
        byMonth[m].count += r.actual_count;
        byMonth[m].days++;
    });
    const monthRows = Object.entries(byMonth).sort().map(([m, d]) => `
        <tr>
            <td style="font-weight:700;color:var(--gold)">${m}</td>
            <td>${d.days}日</td>
            <td>¥${txv(d.sales).toLocaleString()}</td>
            <td>¥${txv(Math.round(d.sales / d.days)).toLocaleString()}</td>
            <td>${d.count.toLocaleString()}名</td>
            <td>¥${d.count > 0 ? txv(Math.round(d.sales / d.count)).toLocaleString() : '—'}</td>
        </tr>
    `).join('');

    // Forecast
    const forecast = forecastForDate('BG', selectedDate);

    // ── ① Weather × Sales Correlation ──
    const weatherRecords = activeRecords.filter(r => r.weather && r.weather.ws !== null && r.weather.ws !== undefined);
    const weatherByScore = {};
    weatherRecords.forEach(r => {
        const ws = r.weather.ws;
        if (!weatherByScore[ws]) weatherByScore[ws] = { sales: 0, count: 0, days: 0, customers: 0 };
        weatherByScore[ws].sales += r.actual_sales;
        weatherByScore[ws].count++;
        weatherByScore[ws].days++;
        weatherByScore[ws].customers += r.actual_count;
    });
    const weatherScoreLabels = ['0<br>豪雨', '1<br>雨', '2<br>曇', '3<br>曇晴', '4<br>晴25↓', '5<br>晴33↓'];
    const weatherBars = [0, 1, 2, 3, 4, 5].map(ws => {
        const d = weatherByScore[ws] || { sales: 0, days: 0, customers: 0 };
        const avg = d.days > 0 ? Math.round(d.sales / d.days) : 0;
        const maxAvg = Math.max(...Object.values(weatherByScore).map(v => v.days > 0 ? v.sales / v.days : 0), 1);
        const pct = Math.round(avg / maxAvg * 100);
        const color = ws >= 4 ? '#66bb6a' : ws >= 2 ? '#ffa726' : '#ef5350';
        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;">
            <div class="mono" style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:4px;">${d.days > 0 ? '¥' + Math.round(txv(avg) / 1000) + 'K' : '—'}</div>
            <div style="width:100%;max-width:36px;background:rgba(255,255,255,0.05);border-radius:4px;height:80px;position:relative;overflow:hidden;">
                <div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:${color};border-radius:4px;transition:height 0.5s;"></div>
            </div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:4px;text-align:center;line-height:1.2;">${weatherScoreLabels[ws]}</div>
            <div style="font-size:9px;color:var(--text-muted);">${d.days}日</div>
        </div>`;
    }).join('');

    // ── ③ Plan Utilization ──
    const planData = bgMeta.plan || [];
    const planRows = planData.map(p => `
        <tr>
            <td style="font-weight:700;color:var(--gold)">${p.month}</td>
            <td>${p.customers.toLocaleString()}</td>
            <td>${p.p5500.toLocaleString()}</td>
            <td>${p.p6600.toLocaleString()}</td>
            <td>${p.p8800.toLocaleString()}</td>
            <td>${p.ticket.toLocaleString()}</td>
            <td style="font-weight:700;color:#66bb6a">${p.plan_rate}</td>
            <td>${p.alacarte.toLocaleString()}</td>
        </tr>
    `).join('');

    // ── ④ Reservation Data ──
    const resData = bgMeta.reservation || [];
    const resRows = resData.map(r => `
        <tr>
            <td style="font-weight:700;color:var(--gold)">${r.month}</td>
            <td>${r.groups.toLocaleString()}</td>
            <td>${r.tc.toLocaleString()} (${r.tc_rate || '—'})</td>
            <td>${r.phone.toLocaleString()} (${r.phone_rate || '—'})</td>
            <td>${r.passage.toLocaleString()} (${r.passage_rate || '—'})</td>
            <td style="font-weight:700;color:#42a5f5">${r.web_rate}</td>
        </tr>
    `).join('');

    // ── ⑤ Hourly Heatmap (aggregate by hour across all days) ──
    const hourlyRecords = activeRecords.filter(r => r.hourly);
    const hourTotals = Array(10).fill(0);
    hourlyRecords.forEach(r => {
        r.hourly.forEach((v, i) => { hourTotals[i] += v; });
    });
    const hourMax = Math.max(...hourTotals, 1);
    const hourLabels = ['12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
    const hourlyHeatmap = hourLabels.map((h, i) => {
        const pct = Math.round(hourTotals[i] / hourMax * 100);
        const intensity = Math.round(pct * 2.55);
        const color = pct > 70 ? `rgba(239,83,80,${pct / 100})` : pct > 40 ? `rgba(255,167,38,${pct / 100})` : `rgba(102,187,106,${pct / 100})`;
        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;">
            <div class="mono" style="font-size:9px;font-weight:700;color:var(--text-dim);margin-bottom:4px;">${Math.round(txv(hourTotals[i]) / 1000000)}M</div>
            <div style="width:100%;max-width:36px;background:rgba(255,255,255,0.05);border-radius:4px;height:80px;position:relative;overflow:hidden;">
                <div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:${color};border-radius:4px;transition:height 0.5s;"></div>
            </div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${h}時</div>
        </div>`;
    }).join('');

    // ── ② Labor Data (aggregate) ──
    const laborRecords = activeRecords.filter(r => r.labor && r.labor.tt > 0);
    const laborTotal = laborRecords.reduce((s, r) => s + r.labor.tt, 0);
    const laborSales = laborRecords.reduce((s, r) => s + r.actual_sales, 0);
    const laborAvgProd = laborTotal > 0 ? Math.round(laborSales / laborTotal) : 0;
    const laborDays = laborRecords.length;

    document.getElementById('bg-root').innerHTML = `
        <div class="card" style="text-align:center;padding:30px 20px;">
            <div style="font-size:42px;margin-bottom:8px;">🍺</div>
            <div style="font-family:'JetBrains Mono';font-size:22px;font-weight:800;color:var(--gold);letter-spacing:3px;">
                SAPPORO TV TOWER BEER GARDEN</div>
            <div style="font-family:'JetBrains Mono';font-size:11px;color:var(--text-dim);letter-spacing:2px;margin-top:4px;">
                さっぽろテレビ塔ビアガーデン — POP UP SEASONAL</div>
        </div>

        <!-- 🕒 REALTIME ON-HAND (TableCheck Integration Mock -> Actual API) -->
        <div class="card" style="border-color:var(--gold);background:var(--surface-2);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="color:var(--gold);margin-bottom:0;"><span class="pulse-dot">🔴</span> リアルタイム オンハンド (本日)</h3>
                <span class="gas-badge" id="bg-onhand-status" style="background:rgba(212,168,67,0.15);color:#d4a843;">同期を確認中...</span>
            </div>
            
            <div id="bg-onhand-container" style="min-height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-dim);">
                <div class="loader"></div> <span style="margin-left:8px;">TableCheckから最新の予約データを取得中...</span>
            </div>
        </div>

        <!-- KPI Summary -->
        <div class="card">
            <h3>📊 GRATEFUL DATA — 全期間サマリー (${txLabel()})</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0;">
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">営業日数</div>
                    <div style="font-size:24px;font-weight:800;color:var(--gold);">${totalDays}</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">累計売上 (${txLabel()})</div>
                    <div style="font-size:20px;font-weight:800;color:var(--gold);">¥${txv(totalSales).toLocaleString()}</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">日平均売上 (${txLabel()})</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-main);">¥${txv(avgSales).toLocaleString()}</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">累計客数</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-main);">${totalCount.toLocaleString()}名</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">日平均客数</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-main);">${avgCount}名</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">MAX売上</div>
                    <div style="font-size:18px;font-weight:800;color:#ef5350;">¥${txv(maxSales).toLocaleString()}</div>
                </div>
            </div>
        </div>

        <!-- ① Weather × Sales Correlation -->
        <div class="card">
            <h3>🌤️ 天候スコア × 日平均売上 (${txLabel()})</h3>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">
                天候評価0-5 (0=豪雨〜5=晴33℃以下) × 日平均売上の相関 | 対象 ${weatherRecords.length}日分
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;padding:8px 0;">
                ${weatherBars}
            </div>
        </div>

        <!-- ⑤ Hourly Sales Heatmap -->
        <div class="card">
            <h3>⏰ 時間帯別売上ヒートマップ (${txLabel()})</h3>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">
                全${hourlyRecords.length}日分の時間帯別累計売上 | ランチ(12-14) / アイドル(15-16) / ディナー(17-21)
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;padding:8px 0;">
                ${hourlyHeatmap}
            </div>
        </div>

        <!-- Year Breakdown -->
        <div class="card">
            <h3>📅 年度別パフォーマンス (${txLabel()})</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="border-bottom:1px solid var(--border);color:var(--text-dim);font-size:11px;">
                        <th style="padding:8px;text-align:left;">年</th>
                        <th style="padding:8px;text-align:left;">営業日</th>
                        <th style="padding:8px;text-align:left;">売上合計</th>
                        <th style="padding:8px;text-align:left;">日平均売上</th>
                        <th style="padding:8px;text-align:left;">客数合計</th>
                        <th style="padding:8px;text-align:left;">日平均客数</th>
                        <th style="padding:8px;text-align:left;">客単価</th>
                    </tr></thead>
                    <tbody>${yearRows}</tbody>
                </table>
            </div>
        </div>

        <!-- Monthly Breakdown -->
        <div class="card">
            <h3>📆 月別詳細 — ${fiscalYearLabel(latestFY)}</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="border-bottom:1px solid var(--border);color:var(--text-dim);font-size:11px;">
                        <th style="padding:8px;text-align:left;">月</th>
                        <th style="padding:8px;text-align:left;">営業日</th>
                        <th style="padding:8px;text-align:left;">売上合計</th>
                        <th style="padding:8px;text-align:left;">日平均売上</th>
                        <th style="padding:8px;text-align:left;">客数合計</th>
                        <th style="padding:8px;text-align:left;">客単価</th>
                    </tr></thead>
                    <tbody>${monthRows}</tbody>
                </table>
            </div>
        </div>

        <!-- ③ Plan Utilization (R5) -->
        ${planData.length > 0 ? `
        <div class="card">
            <h3>🎫 プラン利用率 — R5 (2023)</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead><tr style="border-bottom:1px solid var(--border);color:var(--text-dim);font-size:10px;">
                        <th style="padding:6px;text-align:left;">月</th>
                        <th style="padding:6px;text-align:left;">客数</th>
                        <th style="padding:6px;text-align:left;">5,500</th>
                        <th style="padding:6px;text-align:left;">6,600</th>
                        <th style="padding:6px;text-align:left;">8,800</th>
                        <th style="padding:6px;text-align:left;">チケット</th>
                        <th style="padding:6px;text-align:left;">プラン率</th>
                        <th style="padding:6px;text-align:left;">アラカルト</th>
                    </tr></thead>
                    <tbody>${planRows}</tbody>
                </table>
            </div>
        </div>` : ''}

        <!-- ④ Reservation Data -->
        ${resData.length > 0 ? `
        <div class="card">
            <h3>📱 予約チャネル分析 — R5 (2023)</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead><tr style="border-bottom:1px solid var(--border);color:var(--text-dim);font-size:10px;">
                        <th style="padding:6px;text-align:left;">月</th>
                        <th style="padding:6px;text-align:left;">組数</th>
                        <th style="padding:6px;text-align:left;">TC(Web予約)</th>
                        <th style="padding:6px;text-align:left;">電話</th>
                        <th style="padding:6px;text-align:left;">パッサージュ</th>
                        <th style="padding:6px;text-align:left;">Web率</th>
                    </tr></thead>
                    <tbody>${resRows}</tbody>
                </table>
            </div>
        </div>` : ''}

        <!-- ② Labor Productivity -->
        ${laborDays > 0 ? `
        <div class="card">
            <h3>👥 人時生産性サマリー</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0;">
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">平均人時生産性</div>
                    <div style="font-size:22px;font-weight:800;color:#a78bfa;">¥${laborAvgProd.toLocaleString()}</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">総労働時間</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-main);">${Math.round(laborTotal).toLocaleString()}h</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">データ日数</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-main);">${laborDays}日</div>
                </div>
            </div>
        </div>` : ''}

        <!-- MP Forecast -->
        <div class="card">
            <h3>🔮 MP予測 — ${selectedDate}</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;">
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">予測売上</div>
                    <div style="font-size:22px;font-weight:800;color:var(--gold);">¥${txv(forecast.predicted_sales).toLocaleString()}</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">予測客数</div>
                    <div style="font-size:22px;font-weight:800;color:var(--text-main);">${forecast.predicted_count}名</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">マッチ数</div>
                    <div style="font-size:22px;font-weight:800;color:var(--text-main);">${forecast.matchCount}日</div>
                </div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">
                節気: ${forecast.sekki} | 曜日: ${forecast.weekday} | 
                ${forecast.matchCount > 0 ? '重み: [' + forecast.weights.join(', ') + ']' : '営業期間外'}
            </div>
        </div>

        <div class="card" style="text-align:center;padding:20px;">
            <div style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono';letter-spacing:1px;">
                🏆 BG 2023 勝利の地図 — SVDの資産として完全統合済</div>
        </div>
    `;
}


// ── Dynamic Tax Calculator (multi-store aware) ──
function updateTaxDisplay() {
    const taxInc = document.getElementById('sf-tax-inc')?.checked;
    const taxRate = 1.10;

    // Get all stores currently in the form
    const storeBlocks = document.querySelectorAll('.sf-store-block');
    let grandInc = 0;
    let grandExc = 0;

    storeBlocks.forEach(block => {
        const sid = block.dataset.store;
        const config = STORE_FORMS[sid] || [];
        let storeInc = 0;
        let storeExc = 0;

        config.forEach(section => {
            if (section.type === 'section') {
                let secTotal = 0;
                let secCount = 0;
                section.fields.forEach(f => {
                    const val = parseInt(document.getElementById(`sf-${sid}-${section.id}-${f}`)?.value) || 0;
                    if (f === 'count') {
                        secCount = val;
                    } else {
                        secTotal += val;
                    }
                });

                const secExc = taxInc ? Math.round(secTotal / taxRate) : secTotal;
                const secInc = taxInc ? secTotal : Math.round(secTotal * taxRate);

                setCalc(`disp-${sid}-${section.id}-inc`, secInc);
                setCalc(`disp-${sid}-${section.id}-exc`, secExc);

                if (section.fields.includes('count')) {
                    const avgInc = secCount > 0 ? Math.round(secInc / secCount) : 0;
                    setCalc(`disp-${sid}-${section.id}-avg`, avgInc);
                    // F単価 and B単価
                    const foodVal = parseInt(document.getElementById(`sf-${sid}-${section.id}-food`)?.value) || 0;
                    const drinkVal = parseInt(document.getElementById(`sf-${sid}-${section.id}-drink`)?.value) || 0;
                    const fUnit = secCount > 0 && foodVal > 0 ? Math.round((taxInc ? Math.round(foodVal / taxRate) : foodVal) / secCount) : 0;
                    const bUnit = secCount > 0 && drinkVal > 0 ? Math.round((taxInc ? Math.round(drinkVal / taxRate) : drinkVal) / secCount) : 0;
                    setCalc(`disp-${sid}-${section.id}-favg`, fUnit);
                    setCalc(`disp-${sid}-${section.id}-bavg`, bUnit);
                }

                storeInc += secInc;
                storeExc += secExc;

            } else if (section.type === 'simple') {
                const f = section.field || 'sales';
                const val = parseInt(document.getElementById(`sf-${sid}-${section.id}-${f}`)?.value) || 0;
                const exc = taxInc ? Math.round(val / taxRate) : val;
                const inc = taxInc ? val : Math.round(val * taxRate);

                setCalc(`disp-${sid}-${section.id}-exc`, exc);
                storeInc += inc;
                storeExc += exc;

            } else if (section.type === 'group') {
                section.items.forEach(item => {
                    const val = parseInt(document.getElementById(`sf-${sid}-${item.ch}-sales`)?.value) || 0;
                    const exc = taxInc ? Math.round(val / taxRate) : val;
                    const inc = taxInc ? val : Math.round(val * taxRate);
                    storeInc += inc;
                    storeExc += exc;
                });
            }
        });

        // Per-store total in header
        const storeTotal = document.getElementById(`sf-total-${sid}`);
        if (storeTotal) storeTotal.textContent = fmt$(storeExc);

        grandInc += storeInc;
        grandExc += storeExc;
    });

    const el1 = document.getElementById('sf-grand-inc');
    const el2 = document.getElementById('sf-grand-exc');
    if (el1) el1.textContent = fmt$(grandInc);
    if (el2) el2.textContent = fmt$(grandExc);

    // ── Labor Productivity Calculation ──
    let grandLaborHours = 0;
    storeBlocks.forEach(block => {
        const sid = block.dataset.store;
        const config = STORE_FORMS[sid] || [];
        const laborSec = config.find(s => s.type === 'labor');
        if (!laborSec) return;

        let storeLaborTotal = 0;
        let serviceHours = 0;
        let kitchenHours = 0;
        laborSec.fields.forEach(f => {
            const val = parseFloat(document.getElementById(`sf-${sid}-LABOR-${f}`)?.value) || 0;
            storeLaborTotal += val;
            if (f === 'service') serviceHours = val;
            if (f === 'kitchen') kitchenHours = val;
        });

        // Store-level labor display
        const laborTotalEl = document.getElementById(`disp-${sid}-LABOR-total`);
        if (laborTotalEl) laborTotalEl.textContent = storeLaborTotal > 0 ? storeLaborTotal.toFixed(1) + '時間' : '—';

        // Show service/kitchen breakdown
        const svcDispEl = document.getElementById(`disp-${sid}-LABOR-service-disp`);
        const kitDispEl = document.getElementById(`disp-${sid}-LABOR-kitchen-disp`);
        if (svcDispEl) svcDispEl.textContent = serviceHours > 0 ? serviceHours.toFixed(1) + '時間' : '—';
        if (kitDispEl) kitDispEl.textContent = kitchenHours > 0 ? kitchenHours.toFixed(1) + '時間' : '—';

        // Store-level productivity
        const storeExcVal = parseInt(document.getElementById(`sf-total-${sid}`)?.textContent?.replace(/[¥,]/g, '')) || 0;
        // Recalculate store exc from config
        let recalcExc = 0;
        config.forEach(section => {
            if (section.type === 'section') {
                let secTotal = 0;
                section.fields.forEach(f => {
                    if (f !== 'count') {
                        secTotal += parseInt(document.getElementById(`sf-${sid}-${section.id}-${f}`)?.value) || 0;
                    }
                });
                recalcExc += (taxInc ? Math.round(secTotal / taxRate) : secTotal);
            } else if (section.type === 'simple') {
                const val = parseInt(document.getElementById(`sf-${sid}-${section.id}-${section.field || 'sales'}`)?.value) || 0;
                recalcExc += (taxInc ? Math.round(val / taxRate) : val);
            } else if (section.type === 'group') {
                section.items.forEach(item => {
                    const val = parseInt(document.getElementById(`sf-${sid}-${item.ch}-sales`)?.value) || 0;
                    recalcExc += (taxInc ? Math.round(val / taxRate) : val);
                });
            }
        });

        const prodEl = document.getElementById(`disp-${sid}-LABOR-productivity`);
        if (prodEl) {
            if (storeLaborTotal > 0 && recalcExc > 0) {
                const prod = Math.round(recalcExc / storeLaborTotal);
                prodEl.textContent = '¥' + prod.toLocaleString();
            } else {
                prodEl.textContent = '—';
            }
        }

        grandLaborHours += storeLaborTotal;
    });

    // Grand labor totals
    let grandServiceHours = 0;
    let grandKitchenHours = 0;
    storeBlocks.forEach(block => {
        const sid = block.dataset.store;
        grandServiceHours += parseFloat(document.getElementById(`sf-${sid}-LABOR-service`)?.value) || 0;
        grandKitchenHours += parseFloat(document.getElementById(`sf-${sid}-LABOR-kitchen`)?.value) || 0;
    });

    const grandLaborEl = document.getElementById('sf-grand-labor');
    const grandProdEl = document.getElementById('sf-grand-productivity');
    const grandSvcEl = document.getElementById('sf-grand-labor-service');
    const grandKitEl = document.getElementById('sf-grand-labor-kitchen');
    if (grandLaborEl) grandLaborEl.textContent = grandLaborHours > 0 ? grandLaborHours.toFixed(1) + '時間' : '—';
    if (grandSvcEl) grandSvcEl.textContent = grandServiceHours > 0 ? grandServiceHours.toFixed(1) + '時間' : '—';
    if (grandKitEl) grandKitEl.textContent = grandKitchenHours > 0 ? grandKitchenHours.toFixed(1) + '時間' : '—';
    if (grandProdEl) {
        if (grandLaborHours > 0 && grandExc > 0) {
            const grandProd = Math.round(grandExc / grandLaborHours);
            grandProdEl.textContent = '¥' + grandProd.toLocaleString();
        } else {
            grandProdEl.textContent = '—';
        }
    }
}

function setCalc(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined) ? fmt$(val) : '—';
}



function renderMonthlySummary() {
    const ym = selectedDate.slice(0, 7); // e.g. "2025-09"
    const prevYm = (() => {
        const [y, m] = ym.split('-').map(Number);
        return `${y - 1}-${String(m).padStart(2, '0')}`;
    })();

    let currentMonth = { sales: 0, count: 0, days: 0, sales_8pct: 0 };
    let prevMonth = { sales: 0, count: 0, days: 0, sales_8pct: 0 };

    const filteredStores = getStoresForBase(selectedBase);
    const actualDates = new Set(); // Track which dates have actual data

    filteredStores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            const rm = r.date.slice(0, 7);
            if (rm === ym && r.has_data) {
                currentMonth.sales += r.actual_sales;
                currentMonth.count += r.actual_count;
                currentMonth.sales_8pct += (r.sales_8pct || 0);
                currentMonth.days++;
                actualDates.add(r.date);
            } else if (rm === prevYm && r.has_data) {
                prevMonth.sales += r.actual_sales;
                prevMonth.count += r.actual_count;
                prevMonth.sales_8pct += (r.sales_8pct || 0);
                prevMonth.days++;
            }
        });
    });

    // ── Monthly Forecast: actual + forecast for remaining days ──
    const [yearNum, monthNum] = ym.split('-').map(Number);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    let forecastTotal = currentMonth.sales; // Start with actual
    let forecastDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
        if (actualDates.has(dateStr)) continue; // Already have actual data
        // Only forecast future or missing dates
        filteredStores.forEach(sid => {
            const fc = forecastForDate(sid, dateStr);
            if (fc && fc.predicted_sales > 0) {
                forecastTotal += fc.predicted_sales;
            }
        });
        forecastDays++;
    }

    const ratio = prevMonth.sales > 0 ? (currentMonth.sales / prevMonth.sales * 100) : 0;

    // ── Always tax-exclusive (8%/10% 分離計算) ──
    const curExc = txvAccurate(currentMonth.sales, currentMonth.sales_8pct);
    const prevExc = txvAccurate(prevMonth.sales, prevMonth.sales_8pct);
    const fcstExc = Math.round(forecastTotal / 1.1);  // 予測は10%一律（実績がないため）
    const progress = fcstExc > 0 ? (curExc / fcstExc * 100) : 0;

    document.getElementById('monthly-summary').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div class="svd-stat">
                <div class="stat-value mono text-gold">${fmt$(curExc)}</div>
                <div class="stat-label">月累計売上 (税抜)</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono" style="color:#81a1c1;">${fmt$(fcstExc)}</div>
                <div class="stat-label">当月予測 (税抜)</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono ${progress >= 80 ? 'text-green' : progress >= 50 ? '' : 'text-red'}">${progress.toFixed(1)}%</div>
                <div class="stat-label">進捗率</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono">${fmt$(prevExc)}</div>
                <div class="stat-label">前年同月 (税抜)</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono ${ratio >= 100 ? 'text-green' : 'text-red'}">${ratio.toFixed(1)}%</div>
                <div class="stat-label">前年比</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono">${currentMonth.days}日 / ${daysInMonth}日</div>
                <div class="stat-label">営業日数</div>
            </div>
        </div>
    `;

    // Monthly chart — daily cumulative sales for current vs previous year
    renderMonthlyCumulativeChart(ym, prevYm);
}

function renderMonthlyCumulativeChart(ym, prevYm) {
    const dailySales = {};  // { 'current': {1: sum, 2: sum...}, 'prev': {1: sum...} }
    dailySales.current = {};
    dailySales.prev = {};

    DATA.meta.stores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            const rm = r.date.slice(0, 7);
            const day = parseInt(r.date.slice(8));
            if (rm === ym) {
                dailySales.current[day] = (dailySales.current[day] || 0) + txv(r.actual_sales);
            } else if (rm === prevYm) {
                dailySales.prev[day] = (dailySales.prev[day] || 0) + txv(r.actual_sales);
            }
        });
    });

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    let cumCur = 0, cumPrev = 0;

    destroyChart('monthly');
    charts.monthly = new Chart(document.getElementById('chart-monthly'), {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: ym,
                    data: days.map(d => { cumCur += (dailySales.current[d] || 0); return dailySales.current[d] !== undefined || d <= new Date(ym + '-01').getDate() ? cumCur : null; }),
                    borderColor: '#c8a45e', borderWidth: 2, tension: 0.3, pointRadius: 0,
                },
                {
                    label: prevYm,
                    data: days.map(d => { cumPrev += (dailySales.prev[d] || 0); return cumPrev; }),
                    borderColor: '#60a5fa', borderWidth: 1.5, borderDash: [4, 4], tension: 0.3, pointRadius: 0,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6a6a8a', font: { size: 10, family: 'JetBrains Mono' } } } },
            scales: {
                x: { ticks: { color: '#4a4a68', font: { size: 9 } }, grid: { display: false } },
                y: { ticks: { color: '#4a4a68', callback: v => fmt$(v) }, grid: { color: '#252548' } }
            }
        }
    });
}

function getBaseId(storeId) {
    if (!DATA) return '';
    for (const b of DATA.config.bases) {
        for (const s of b.stores) {
            if (s.id === storeId) return b.id;
        }
    }
    return '';
}

function jumpToStore(sid) {
    // Find the base for this store and select it
    selectedBase = getBaseId(sid);
    document.getElementById('selBase').value = selectedBase;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="dive"]').classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('p-dive').classList.add('active');
    currentTab = 'dive';
    renderDive();
}

// ═══════════════════════════════════════
// ② STORE DEEP DIVE (拠点ベース)
// ═══════════════════════════════════════
function renderDive() {
    const base = DATA.config.bases.find(b => b.id === selectedBase);
    if (!base) return;
    const storeIds = base.stores.map(s => s.id);
    const container = document.getElementById('dive-content');

    // Destroy existing dive charts
    Object.keys(charts).forEach(k => { if (k.startsWith('dive_')) destroyChart(k); });

    let html = '';

    // Base header
    const sampleSid = storeIds[0];
    const sampleData = DATA.stores[sampleSid] || [];
    const sampleRec = sampleData.find(r => r.date === selectedDate);

    html += `<div class="card" style="text-align:center;padding:20px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:var(--gold);letter-spacing:2px;">${base.name}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${base.name_en || ''} — ${storeIds.length}店舗</div>
        ${sampleRec ? `<div style="margin-top:8px;">${mpBadge(sampleRec.mp_point)} <span style="font-size:12px;color:var(--text-dim);margin-left:8px;">${sampleRec.sekki}（24LV/${ordinal(sampleRec.rank)}）| ${sampleRec.weekday}曜日</span></div>` : ''}
    </div>`;

    // Per-store sections
    storeIds.forEach(sid => {
        const storeData = DATA.stores[sid] || [];
        const rec = storeData.find(r => r.date === selectedDate);
        const storeName = getStoreName(sid);

        html += `<div class="card mt-16" style="border-left:3px solid var(--gold);">`;
        html += `<h3 style="color:var(--gold);">${sid} — ${storeName}</h3>`;

        if (rec) {
            // Hero metrics in compact grid
            html += `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">
                <div class="svd-stat"><div class="stat-value mono text-gold" style="font-size:28px;font-weight:900;">${rec.mp_point.toFixed(2)}</div><div class="stat-label">MP POINT</div></div>
                <div class="svd-stat"><div class="stat-value mono">${fmt$(rec.actual_sales)}</div><div class="stat-label">売上</div></div>
                <div class="svd-stat"><div class="stat-value mono">${rec.actual_count}名</div><div class="stat-label">来客数</div></div>
                <div class="svd-stat"><div class="stat-value mono">${rec.actual_count > 0 ? fmt$(Math.round(rec.actual_sales / rec.actual_count)) : '—'}</div><div class="stat-label">客単価</div></div>
                <div class="svd-stat"><div class="stat-value">${mpBadge(rec.mp_point, 'small')}</div><div class="stat-label">RANK</div></div>
            </div>`;

            // KF Breakdown compact — Real MP v2.0
            const wdMultKey = STORE_TO_BASE[selectedStore] || '';
            const wdMultVal = (WEEKDAY_MULTIPLIER[wdMultKey] || {})[rec.weekday] || 1.0;
            const kf1s = rec.kf1_seasonal || (wdMultVal > 0 ? Math.round(rec.kf1 / wdMultVal * 100) / 100 : rec.kf1);
            html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                <div class="kf-card"><div class="kf-name">KF① 拠点定指数</div><div class="kf-val">${rec.kf1.toFixed(2)}</div><div class="kf-sub">季節${kf1s.toFixed(2)} × ${rec.weekday}曜${wdMultVal.toFixed(3)}</div></div>
                <div class="kf-card"><div class="kf-name">KF② 売上FACTOR</div><div class="kf-val">${rec.kf2.toFixed(2)}</div><div class="kf-sub">過去実績 min-max</div></div>
                <div class="kf-card"><div class="kf-name">KF③ 来客FACTOR</div><div class="kf-val">${rec.kf3.toFixed(2)}</div><div class="kf-sub">過去実績 min-max</div></div>
            </div>`;

            // Channel breakdown table
            if (rec.channels) {
                const chEntries = Object.entries(rec.channels);
                const totalChSales = chEntries.reduce((s, [, v]) => s + v.sales, 0);
                html += `<div style="overflow-x:auto;margin-bottom:12px;"><table class="data-table">
                    <thead><tr><th>チャネル</th><th class="num">売上</th><th class="num">客数</th><th class="num">構成比</th></tr></thead>
                    <tbody>${chEntries.map(([ch, v]) => {
                    const pct = totalChSales > 0 ? (v.sales / totalChSales * 100) : 0;
                    return `<tr><td>${ch}</td><td class="num">${fmt$(v.sales)}</td><td class="num">${v.count || '—'}</td><td class="num">${pct.toFixed(1)}%</td></tr>`;
                }).join('')}</tbody>
                </table></div>`;
            }
        } else {
            html += `<div style="padding:16px;color:var(--text-dim);">${selectedDate} のデータなし</div>`;
        }

        // Heatmap per store
        html += `<div style="margin-top:12px;"><div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:8px;">🗓 HEATMAP</div><div id="hm-${sid}"></div></div>`;
        html += '</div>'; // close card
    });

    container.innerHTML = html;

    // Render heatmaps after DOM is updated
    storeIds.forEach(sid => {
        const storeData = DATA.stores[sid] || [];
        renderHeatmapInto(`hm-${sid}`, storeData);
    });
}

// ═══════════════════════════════════════
// PERFORMANCE REPORT — 実績レポート
// ═══════════════════════════════════════

function initReportTab() {
    const root = document.getElementById('report-root');
    if (!root || !DATA) return;

    // ── 既存の選択状態を保存（税切替等でリセットされないように） ──
    const prevMonth = document.getElementById('rpt-month')?.value || null;
    const prevBase = document.getElementById('rpt-base')?.value || null;
    const prevStore = document.getElementById('rpt-store')?.value || null;
    const prevMode = document.querySelector('.period-btn.active[data-rptmode]')?.dataset.rptmode || null;

    // Build available year-month list from all stores
    const allMonths = new Set();
    Object.values(DATA.stores).forEach(records => {
        records.forEach(r => {
            if (r.has_data) allMonths.add(r.date.slice(0, 7));
        });
    });
    const sortedMonths = [...allMonths].sort();
    const latestMonth = prevMonth || sortedMonths[sortedMonths.length - 1] || new Date().toISOString().slice(0, 7);

    // Build base options
    const baseOptions = DATA.config.bases.map(b =>
        `<option value="${b.id}">${b.name}（${b.stores.length}店）</option>`
    ).join('');

    // Build year-month options
    const monthOptions = sortedMonths.map(m =>
        `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${m}</option>`
    ).join('');

    // Build year options
    const years = [...new Set(sortedMonths.map(m => m.slice(0, 4)))].sort();
    const yearOptions = years.map(y =>
        `<option value="${y}">${y}年</option>`
    ).join('');

    root.innerHTML = `
        <div class="card" style="border-top:3px solid var(--gold);">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                <h2 style="color:var(--gold);margin:0;font-family:'JetBrains Mono',monospace;letter-spacing:3px;">📊 PERFORMANCE REPORT</h2>
                <div style="display:flex;gap:8px;">
                    <button class="svd-btn" onclick="exportReportCSV()">📄 CSV出力</button>
                    <button class="svd-btn gold" onclick="exportReportPDF()">📋 PDF出力</button>
                </div>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;align-items:flex-end;">
                <div>
                    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px;">拠点</div>
                    <select id="rpt-base" onchange="updateRptStoreOptions(); refreshReport()" style="font-size:13px;padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ccc;">
                        <option value="ALL">ALL — SVD統合</option>
                        ${baseOptions}
                    </select>
                </div>
                <div>
                    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px;">店舗</div>
                    <select id="rpt-store" onchange="refreshReport()" style="font-size:13px;padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(96,165,250,0.25);border-radius:6px;color:#60a5fa;">
                        <option value="ALL">ALL</option>
                    </select>
                </div>
                <div>
                    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px;">表示モード</div>
                    <div style="display:flex;gap:6px;">
                        <button class="period-btn active" data-rptmode="month" onclick="setReportMode(this,'month')">月別</button>
                        <button class="period-btn" data-rptmode="range" onclick="setReportMode(this,'range')">期間指定</button>
                    </div>
                </div>
                <div id="rpt-month-selector">
                    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px;">年月</div>
                    <select id="rpt-month" onchange="refreshReport()" style="font-size:13px;padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ccc;">
                        ${monthOptions}
                    </select>
                </div>
                <div id="rpt-range-selector" style="display:none;">
                    <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px;">期間</div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="period-btn" onclick="setRptRange(this,'1M')">1ヶ月</button>
                        <button class="period-btn" onclick="setRptRange(this,'3M')">3ヶ月</button>
                        <button class="period-btn active" onclick="setRptRange(this,'6M')">半年</button>
                        <button class="period-btn" onclick="setRptRange(this,'1Y')">1年</button>
                        <button class="period-btn" onclick="setRptRange(this,'ALL')">全期間</button>
                        <span style="color:var(--text-dim);font-size:12px;">|</span>
                        <input type="date" id="rpt-from" style="font-size:12px;" onchange="refreshReport()">
                        <span style="color:var(--text-dim);font-size:12px;">→</span>
                        <input type="date" id="rpt-to" style="font-size:12px;" onchange="refreshReport()">
                    </div>
                </div>
            </div>

            <div id="rpt-body"></div>
        </div>
    `;

    // Set default range dates for range mode
    const today = new Date().toISOString().slice(0, 10);
    const sixAgo = new Date(); sixAgo.setMonth(sixAgo.getMonth() - 6);
    const fromEl = document.getElementById('rpt-from');
    const toEl = document.getElementById('rpt-to');
    if (fromEl) fromEl.value = sixAgo.toISOString().slice(0, 10);
    if (toEl) toEl.value = today;

    window._rptMode = prevMode || 'month';

    // ── 保存していた選択状態を復元 ──
    if (prevBase) {
        const baseEl = document.getElementById('rpt-base');
        if (baseEl) baseEl.value = prevBase;
    }
    updateRptStoreOptions();
    if (prevStore) {
        const storeEl = document.getElementById('rpt-store');
        if (storeEl) storeEl.value = prevStore;
    }
    if (prevMode) {
        document.querySelectorAll('.period-btn[data-rptmode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.rptmode === prevMode);
        });
        if (prevMode === 'range') {
            const monthSel = document.getElementById('rpt-month-selector');
            const rangeSel = document.getElementById('rpt-range-selector');
            if (monthSel) monthSel.style.display = 'none';
            if (rangeSel) rangeSel.style.display = '';
        }
    }
    refreshReport();
}

function updateRptStoreOptions() {
    const rptBase = document.getElementById('rpt-base')?.value || 'ALL';
    const storeSelect = document.getElementById('rpt-store');
    if (!storeSelect) return;

    let stores;
    if (rptBase === 'ALL') {
        stores = DATA.meta.stores;
    } else {
        const base = DATA.config.bases.find(b => b.id === rptBase);
        stores = base ? base.stores.map(s => s.id) : DATA.meta.stores;
    }

    let opts = '<option value="ALL">ALL</option>';
    stores.forEach(sid => {
        const storeDef = DATA.config.bases.flatMap(b => b.stores).find(s => s.id === sid);
        const label = storeDef ? `${sid} (${storeDef.name})` : sid;
        opts += `<option value="${sid}">${label}</option>`;
    });
    storeSelect.innerHTML = opts;
}

function setReportMode(btn, mode) {
    document.querySelectorAll('[data-rptmode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window._rptMode = mode;
    document.getElementById('rpt-month-selector').style.display = mode === 'month' ? '' : 'none';
    document.getElementById('rpt-range-selector').style.display = mode === 'range' ? '' : 'none';
    refreshReport();
}

function setRptRange(btn, period) {
    document.querySelectorAll('#rpt-range-selector .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const end = new Date();
    let start = new Date(end);
    switch (period) {
        case '1M': start.setMonth(start.getMonth() - 1); break;
        case '3M': start.setMonth(start.getMonth() - 3); break;
        case '6M': start.setMonth(start.getMonth() - 6); break;
        case '1Y': start.setFullYear(start.getFullYear() - 1); break;
        case 'ALL': start = new Date('2023-01-01'); break;
    }
    document.getElementById('rpt-from').value = start.toISOString().slice(0, 10);
    document.getElementById('rpt-to').value = end.toISOString().slice(0, 10);
    refreshReport();
}

function refreshReport() {
    // Determine date range based on mode
    let from, to;
    const mode = window._rptMode || 'month';

    if (mode === 'month') {
        const month = document.getElementById('rpt-month')?.value;
        if (!month) return;
        from = month + '-01';
        // Last day of month
        const parts = month.split('-');
        const lastDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
        to = month + '-' + String(lastDay).padStart(2, '0');
    } else {
        from = document.getElementById('rpt-from')?.value;
        to = document.getElementById('rpt-to')?.value;
        if (!from || !to) return;
    }

    // Determine stores from rpt-base + rpt-store selector
    const rptBase = document.getElementById('rpt-base')?.value || 'ALL';
    const rptStore = document.getElementById('rpt-store')?.value || 'ALL';
    let storeIds;
    let scopeLabel;

    if (rptBase === 'ALL') {
        storeIds = DATA.meta.stores;
        scopeLabel = 'SVD統合';
    } else {
        const base = DATA.config.bases.find(b => b.id === rptBase);
        if (!base) return;
        storeIds = base.stores.map(s => s.id);
        scopeLabel = base.name;
    }

    // Apply store-level filter
    if (rptStore !== 'ALL') {
        storeIds = storeIds.filter(s => s === rptStore);
        scopeLabel = rptStore;
    }
    const tl = txLabel();

    // Aggregate data per store and per channel
    const storeAgg = {};
    const channelGlobal = {};
    let totalSales = 0, totalCount = 0, activeDays = 0, totalSales8pct = 0;
    const dailyTotals = {};

    storeIds.forEach(sid => {
        const records = (DATA.stores[sid] || []).filter(r =>
            r.date >= from && r.date <= to && r.has_data
        );

        const agg = { sales: 0, count: 0, days: records.length, channels: {}, sales_8pct: 0 };
        records.forEach(r => {
            agg.sales += r.actual_sales;
            agg.count += r.actual_count;
            agg.sales_8pct += (r.sales_8pct || 0);
            totalSales += r.actual_sales;
            totalCount += r.actual_count;
            totalSales8pct += (r.sales_8pct || 0);

            // Track daily totals for active days count
            if (!dailyTotals[r.date]) { dailyTotals[r.date] = 0; activeDays++; }
            dailyTotals[r.date] += r.actual_sales;

            if (r.channels) {
                Object.entries(r.channels).forEach(([ch, data]) => {
                    if (!agg.channels[ch]) agg.channels[ch] = { sales: 0, count: 0, food: 0, drink: 0 };
                    agg.channels[ch].sales += data.sales || 0;
                    agg.channels[ch].count += data.count || 0;
                    agg.channels[ch].food += data.food || 0;
                    agg.channels[ch].drink += data.drink || 0;

                    if (!channelGlobal[ch]) channelGlobal[ch] = { sales: 0, count: 0, food: 0, drink: 0 };
                    channelGlobal[ch].sales += data.sales || 0;
                    channelGlobal[ch].count += data.count || 0;
                    channelGlobal[ch].food += data.food || 0;
                    channelGlobal[ch].drink += data.drink || 0;
                });
            }
        });
        storeAgg[sid] = agg;
    });

    // YoY comparison period
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
    const yoyFrom = new Date(fromDate); yoyFrom.setFullYear(yoyFrom.getFullYear() - 1);
    const yoyTo = new Date(toDate); yoyTo.setFullYear(yoyTo.getFullYear() - 1);
    const yoyFromStr = yoyFrom.toISOString().slice(0, 10);
    const yoyToStr = yoyTo.toISOString().slice(0, 10);

    let yoySales = 0, yoyCount = 0;
    storeIds.forEach(sid => {
        (DATA.stores[sid] || []).filter(r =>
            r.date >= yoyFromStr && r.date <= yoyToStr && r.has_data
        ).forEach(r => { yoySales += r.actual_sales; yoyCount += r.actual_count; });
    });

    const yoyPct = yoySales > 0 ? (totalSales / yoySales * 100) : 0;
    const yoyCountPct = yoyCount > 0 ? (totalCount / yoyCount * 100) : 0;
    const avgDaily = activeDays > 0 ? Math.round(totalSales / activeDays) : 0;
    // レストランチャネル（客数が取れるチャネル）の売上・客数を集計
    const REST_CH = ['LUNCH', 'DINNER', '3CH', 'CAFE', 'ランチ', 'ディナー'];
    let restSales = 0, restCount = 0;
    storeIds.forEach(sid => {
        Object.entries(storeAgg[sid]?.channels || {}).forEach(([ch, v]) => {
            if (REST_CH.some(rc => ch.includes(rc))) {
                restSales += v.sales || 0;
                restCount += v.count || 0;
            }
        });
    });
    const avgPerCustomer = restCount > 0 ? Math.round(txv(restSales) / restCount) : 0;

    // ── Build Report HTML ──
    let html = '';

    // Summary Cards
    html += `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
            <div class="svd-stat" style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:10px;padding:14px;">
                <div class="stat-value mono text-gold" style="font-size:22px;">${fmt$(txvAccurate(totalSales, totalSales8pct))}</div>
                <div class="stat-label">期間売上合計(${tl})</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${restCount.toLocaleString()}名</div>
                <div class="stat-label">レストラン来客数</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${fmt$(avgPerCustomer)}</div>
                <div class="stat-label">レストラン客単価(${tl})</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${fmt$(activeDays > 0 ? Math.round(txvAccurate(totalSales, totalSales8pct) / activeDays) : 0)}</div>
                <div class="stat-label">日平均売上(${tl})</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono ${yoyPct >= 100 ? 'text-green' : yoyPct > 0 ? 'text-red' : ''}" style="font-size:22px;">${yoyPct > 0 ? yoyPct.toFixed(1) + '%' : '—'}</div>
                <div class="stat-label">前年比(売上)</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${activeDays}日</div>
                <div class="stat-label">営業日数</div>
            </div>
        </div>
    `;

    // ── Store Breakdown Table ──
    html += `<div style="overflow-x:auto;margin-bottom:20px;">
        <div style="font-size:12px;color:var(--gold);letter-spacing:2px;font-weight:700;margin-bottom:8px;">🏪 店舗別実績 — ${scopeLabel}</div>
        <table class="data-table" id="rpt-store-table">
            <thead><tr>
                <th>店舗</th><th class="num">売上(${tl})</th><th class="num">構成比</th>
                <th class="num">客数</th><th class="num">客単価(${tl})</th>
                <th class="num">営業日</th><th class="num">日平均(${tl})</th>
                <th class="num">前年比</th>
            </tr></thead><tbody>`;

    storeIds.forEach(sid => {
        const a = storeAgg[sid];
        if (!a) return;
        const pct = totalSales > 0 ? (a.sales / totalSales * 100) : 0;
        const salesExc = txvAccurate(a.sales, a.sales_8pct);
        const avg = a.count > 0 ? Math.round(salesExc / a.count) : 0;
        const dayAvg = a.days > 0 ? Math.round(salesExc / a.days) : 0;

        // Store YoY
        let syoySales = 0;
        (DATA.stores[sid] || []).filter(r =>
            r.date >= yoyFromStr && r.date <= yoyToStr && r.has_data
        ).forEach(r => { syoySales += r.actual_sales; });
        const syoyPct = syoySales > 0 ? (a.sales / syoySales * 100) : 0;

        html += `<tr>
            <td><strong>${sid}</strong> <span style="color:var(--text-dim);font-size:11px;">${getStoreName(sid)}</span></td>
            <td class="num mono">${fmt$(salesExc)}</td>
            <td class="num mono">${pct.toFixed(1)}%</td>
            <td class="num mono">${a.count.toLocaleString()}</td>
            <td class="num mono">${fmt$(avg)}</td>
            <td class="num mono">${a.days}</td>
            <td class="num mono">${fmt$(dayAvg)}</td>
            <td class="num mono ${syoyPct >= 100 ? 'text-green' : syoyPct > 0 ? 'text-red' : ''}">${syoyPct > 0 ? syoyPct.toFixed(1) + '%' : '—'}</td>
        </tr>`;
    });

    html += `<tr style="border-top:2px solid var(--gold);font-weight:700;">
        <td>合計</td>
        <td class="num mono text-gold">${fmt$(txvAccurate(totalSales, totalSales8pct))}</td>
        <td class="num">100%</td>
        <td class="num mono">${totalCount.toLocaleString()}</td>
        <td class="num mono">${fmt$(totalCount > 0 ? Math.round(txvAccurate(totalSales, totalSales8pct) / totalCount) : 0)}</td>
        <td class="num mono">${activeDays}</td>
        <td class="num mono">${fmt$(activeDays > 0 ? Math.round(txvAccurate(totalSales, totalSales8pct) / activeDays) : 0)}</td>
        <td class="num mono ${yoyPct >= 100 ? 'text-green' : yoyPct > 0 ? 'text-red' : ''}">${yoyPct > 0 ? yoyPct.toFixed(1) + '%' : '—'}</td>
    </tr>`;
    html += `</tbody></table></div>`;

    // ── Channel Breakdown Table (Global) ──
    const sortedChannels = Object.entries(channelGlobal).sort((a, b) => b[1].sales - a[1].sales);
    if (sortedChannels.length > 0) {
        html += `<div style="overflow-x:auto;margin-bottom:20px;">
            <div style="font-size:12px;color:var(--gold);letter-spacing:2px;font-weight:700;margin-bottom:8px;">📊 チャネル別実績 — ${scopeLabel}</div>
            <table class="data-table" id="rpt-channel-table">
                <thead><tr>
                    <th>チャネル</th><th class="num">売上(${tl})</th><th class="num">構成比</th>
                    <th class="num">客数</th><th class="num">客単価(${tl})</th>
                    <th class="num" style="color:#e08060;">F単価(${tl})</th><th class="num" style="color:#60a0e0;">B単価(${tl})</th>
                </tr></thead><tbody>`;

        sortedChannels.forEach(([ch, d]) => {
            const pct = totalSales > 0 ? (d.sales / totalSales * 100) : 0;
            const avg = d.count > 0 ? Math.round(d.sales / d.count) : 0;
            const fAvg = d.count > 0 && d.food > 0 ? Math.round(d.food / d.count) : 0;
            const bAvg = d.count > 0 && d.drink > 0 ? Math.round(d.drink / d.count) : 0;
            html += `<tr>
                <td><strong>${ch}</strong></td>
                <td class="num mono">${fmt$(txv(d.sales))}</td>
                <td class="num mono">${pct.toFixed(1)}%</td>
                <td class="num mono">${d.count > 0 ? d.count.toLocaleString() : '—'}</td>
                <td class="num mono">${avg > 0 ? fmt$(txv(avg)) : '—'}</td>
                <td class="num mono" style="color:#e08060;">${fAvg > 0 ? fmt$(txv(fAvg)) : '—'}</td>
                <td class="num mono" style="color:#60a0e0;">${bAvg > 0 ? fmt$(txv(bAvg)) : '—'}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // ── Per-Store Channel Matrix ──
    if (storeIds.length > 0) {
        const FB_CHANNELS = ['DINNER', 'LUNCH', 'TAKEOUT'];
        html += `<div style="overflow-x:auto;margin-bottom:20px;">
            <div style="font-size:12px;color:var(--gold);letter-spacing:2px;font-weight:700;margin-bottom:8px;">🔬 店舗×チャネル マトリクス</div>
            <table class="data-table" id="rpt-matrix-table">
                <thead><tr><th>チャネル</th><th style="min-width:50px;"></th>${storeIds.map(sid => `<th class="num">${sid}</th>`).join('')}<th class="num">合計</th></tr></thead>
                <tbody>`;

        const allChNames = [...new Set(storeIds.flatMap(sid => Object.keys(storeAgg[sid]?.channels || {})))];
        allChNames.sort((a, b) => {
            const sa = storeIds.reduce((s, sid) => s + (storeAgg[sid]?.channels[a]?.sales || 0), 0);
            const sb = storeIds.reduce((s, sid) => s + (storeAgg[sid]?.channels[b]?.sales || 0), 0);
            return sb - sa;
        });

        allChNames.forEach(ch => {
            const isFB = FB_CHANNELS.includes(ch);
            // Sales row
            let rowSales = 0;
            const salesCells = storeIds.map(sid => {
                const v = storeAgg[sid]?.channels[ch]?.sales || 0;
                rowSales += v;
                return `<td class="num mono">${v > 0 ? fmt$(txv(v)) : '—'}</td>`;
            }).join('');
            html += `<tr${isFB ? ' style="border-top:1px solid rgba(212,168,67,0.15);"' : ''}>
                <td ${isFB ? 'rowspan="5"' : ''}><strong>${ch}</strong>${isFB ? ' <span style="font-size:9px;color:var(--gold);">FB</span>' : ''}</td>
                <td style="font-size:10px;color:var(--text-dim);">売上</td>
                ${salesCells}<td class="num mono text-gold">${fmt$(txv(rowSales))}</td>
            </tr>`;

            if (isFB) {
                // Count row
                let rowCount = 0;
                const countCells = storeIds.map(sid => {
                    const c = storeAgg[sid]?.channels[ch]?.count || 0;
                    rowCount += c;
                    return `<td class="num mono" style="font-size:11px;color:#999;">${c > 0 ? c.toLocaleString() : '—'}</td>`;
                }).join('');
                html += `<tr>
                    <td style="font-size:10px;color:var(--text-dim);">客数</td>
                    ${countCells}<td class="num mono" style="font-size:11px;color:#999;">${rowCount > 0 ? rowCount.toLocaleString() : '—'}</td>
                </tr>`;

                // Unit price row (total)
                const unitCells = storeIds.map(sid => {
                    const s = storeAgg[sid]?.channels[ch]?.sales || 0;
                    const c = storeAgg[sid]?.channels[ch]?.count || 0;
                    const unit = c > 0 ? Math.round(s / c) : 0;
                    return `<td class="num mono" style="font-size:11px;color:#d4a843;">${unit > 0 ? fmt$(txv(unit)) : '—'}</td>`;
                }).join('');
                const totalUnit = rowCount > 0 ? Math.round(rowSales / rowCount) : 0;
                html += `<tr>
                    <td style="font-size:10px;color:var(--gold);">単価</td>
                    ${unitCells}<td class="num mono" style="font-size:11px;color:#d4a843;font-weight:700;">${totalUnit > 0 ? fmt$(txv(totalUnit)) : '—'}</td>
                </tr>`;

                // F単価 row (Food unit price)
                let rowFood = 0;
                const fUnitCells = storeIds.map(sid => {
                    const f = storeAgg[sid]?.channels[ch]?.food || 0;
                    const c = storeAgg[sid]?.channels[ch]?.count || 0;
                    rowFood += f;
                    const unit = c > 0 ? Math.round(f / c) : 0;
                    return `<td class="num mono" style="font-size:10px;color:#e08060;">${unit > 0 ? fmt$(txv(unit)) : '—'}</td>`;
                }).join('');
                const totalFUnit = rowCount > 0 ? Math.round(rowFood / rowCount) : 0;
                html += `<tr>
                    <td style="font-size:10px;color:#e08060;">F単価</td>
                    ${fUnitCells}<td class="num mono" style="font-size:10px;color:#e08060;font-weight:700;">${totalFUnit > 0 ? fmt$(txv(totalFUnit)) : '—'}</td>
                </tr>`;

                // B単価 row (Beverage unit price)
                let rowDrink = 0;
                const bUnitCells = storeIds.map(sid => {
                    const d = storeAgg[sid]?.channels[ch]?.drink || 0;
                    const c = storeAgg[sid]?.channels[ch]?.count || 0;
                    rowDrink += d;
                    const unit = c > 0 ? Math.round(d / c) : 0;
                    return `<td class="num mono" style="font-size:10px;color:#60a0e0;">${unit > 0 ? fmt$(txv(unit)) : '—'}</td>`;
                }).join('');
                const totalBUnit = rowCount > 0 ? Math.round(rowDrink / rowCount) : 0;
                html += `<tr>
                    <td style="font-size:10px;color:#60a0e0;">B単価</td>
                    ${bUnitCells}<td class="num mono" style="font-size:10px;color:#60a0e0;font-weight:700;">${totalBUnit > 0 ? fmt$(txv(totalBUnit)) : '—'}</td>
                </tr>`;
            }
        });

        html += `</tbody></table></div>`;
    }

    // ── Monthly Trend Table ──
    const monthlyAgg = {};
    storeIds.forEach(sid => {
        (DATA.stores[sid] || []).filter(r =>
            r.date >= from && r.date <= to && r.has_data
        ).forEach(r => {
            const m = r.date.slice(0, 7);
            if (!monthlyAgg[m]) monthlyAgg[m] = { sales: 0, count: 0, days: new Set(), sales_8pct: 0 };
            monthlyAgg[m].sales += r.actual_sales;
            monthlyAgg[m].count += r.actual_count;
            monthlyAgg[m].sales_8pct += (r.sales_8pct || 0);
            monthlyAgg[m].days.add(r.date);
        });
    });

    const monthKeys = Object.keys(monthlyAgg).sort();
    if (monthKeys.length > 1) {
        html += `<div style="overflow-x:auto;margin-bottom:20px;">
            <div style="font-size:12px;color:var(--gold);letter-spacing:2px;font-weight:700;margin-bottom:8px;">📈 月別推移</div>
            <table class="data-table" id="rpt-monthly-table">
                <thead><tr><th>月</th><th class="num">売上(${tl})</th><th class="num">客数</th><th class="num">客単価(${tl})</th><th class="num">営業日</th><th class="num">日平均(${tl})</th></tr></thead>
                <tbody>`;

        monthKeys.forEach(m => {
            const d = monthlyAgg[m];
            const days = d.days.size;
            const salesExc = txvAccurate(d.sales, d.sales_8pct);
            const avg = d.count > 0 ? Math.round(salesExc / d.count) : 0;
            const dayAvg = days > 0 ? Math.round(salesExc / days) : 0;
            html += `<tr>
                <td><strong>${m}</strong></td>
                <td class="num mono">${fmt$(salesExc)}</td>
                <td class="num mono">${d.count.toLocaleString()}</td>
                <td class="num mono">${fmt$(avg)}</td>
                <td class="num mono">${days}</td>
                <td class="num mono">${fmt$(dayAvg)}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // ── 日別実績テーブル ──
    {
        const allDates = [];
        let d = new Date(from);
        const endD = new Date(to);
        while (d <= endD) { allDates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }

        const RESTAURANT_CH = ['LUNCH', 'DINNER', '3CH', 'CAFE', 'ランチ', 'ディナー', 'レストラン'];

        html += `<div style="overflow-x:auto;margin-bottom:20px;">
            <div style="font-size:12px;color:var(--gold);letter-spacing:2px;font-weight:700;margin-bottom:8px;">📅 日別実績</div>
            <div style="max-height:500px;overflow-y:auto;">
            <table class="data-table" id="rpt-daily-table">
                <thead><tr>
                    <th>DATE</th><th>曜日</th>
                    <th class="num">予測売上(${tl})</th>
                    <th class="num">実績売上(${tl})</th>
                    <th class="num">達成率</th>
                    <th class="num">客数</th>
                    <th class="num">客単価(${tl})</th>
                    <th>メモ</th>
                </tr></thead><tbody>`;

        allDates.forEach(dateStr => {
            // 全対象店舗の当日データを集計
            let daySales = 0, dayCount = 0, dayRestCount = 0, dayRestSales = 0;
            let dayHasData = false;
            let dayMemo = '', dayRopeway = null;
            let dayFcSales = 0;
            const dayCh = {};
            const WDAY = ['日', '月', '火', '水', '木', '金', '土'];
            const wday = WDAY[new Date(dateStr).getDay()];
            const wdayColor = wday === '土' ? '#60a5fa' : wday === '日' ? '#f87171' : '#ccc';

            storeIds.forEach(sid => {
                const fc = forecastForDate(sid, dateStr);
                dayFcSales += fc.predicted_sales || 0;
                const rec = (DATA.stores[sid] || []).find(r => r.date === dateStr);
                if (rec && rec.has_data) {
                    dayHasData = true;
                    daySales += rec.actual_sales;
                    dayCount += rec.actual_count;
                    if (rec.memo && !dayMemo) dayMemo = rec.memo;
                    if (rec.ropeway && !dayRopeway) dayRopeway = rec.ropeway;
                    if (rec.channels) {
                        Object.entries(rec.channels).forEach(([ch, v]) => {
                            if (!dayCh[ch]) dayCh[ch] = { sales: 0, count: 0, food: 0, drink: 0 };
                            dayCh[ch].sales += v.sales || 0;
                            dayCh[ch].count += v.count || 0;
                            dayCh[ch].food += v.food || 0;
                            dayCh[ch].drink += v.drink || 0;
                            if (RESTAURANT_CH.some(rc => ch.includes(rc))) {
                                dayRestSales += v.sales || 0;
                                dayRestCount += v.count || 0;
                            }
                        });
                    }
                }
            });

            if (!dayHasData && dayFcSales === 0) return; // 未来+データなし はスキップ

            const rowStyle = !dayHasData ? 'opacity:0.5;' : '';
            const fcDisp = txv(dayFcSales);
            const acDisp = txv(daySales);
            const achRate = dayHasData && dayFcSales > 0 ? (daySales / dayFcSales * 100).toFixed(1) + '%' : '—';
            const achClass = dayHasData && dayFcSales > 0 ? (daySales / dayFcSales * 100 >= 100 ? 'text-green' : 'text-red') : '';
            const unitPrice = dayRestCount > 0 ? fmt$(Math.round(txv(dayRestSales) / dayRestCount))
                : dayCount > 0 ? '—' : '—';

            // メモ + ロープウェイバッジ
            let memoCell = '';
            if (dayRopeway && dayRopeway.type && dayRopeway.type !== 'none') {
                const rwLabels = { 'full': '🚡終日運休', 'partial': '🚡一部運休', 'time': `🚡${dayRopeway.from || ''}〜${dayRopeway.to || ''}` };
                memoCell += `<span style="display:inline-block;background:rgba(251,146,60,0.15);color:#fb923c;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-bottom:2px;">${rwLabels[dayRopeway.type] || ''}</span><br>`;
            }
            if (dayMemo) memoCell += `<span style="color:#aaa;font-size:11px;">${dayMemo}</span>`;

            // チャネル詳細展開
            const chEntries = Object.entries(dayCh).filter(([, v]) => v && (v.sales > 0 || v.count > 0));
            const chDetailId = `rptch_${dateStr.replace(/-/g, '')}`;
            let chDetail = '';
            if (chEntries.length > 0) {
                chDetail = `<tr id="${chDetailId}" style="display:none;"><td colspan="8" style="padding:4px 16px 8px;background:rgba(255,255,255,0.02);">
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${chEntries.map(([ch, v]) => {
                    const s = txv(v.sales || 0);
                    const avg = v.count > 0 ? fmt$(Math.round(s / v.count)) : '';
                    return `<div style="background:rgba(200,164,94,0.08);border:1px solid rgba(200,164,94,0.15);border-radius:6px;padding:4px 8px;font-size:11px;">
                            <strong style="color:#c8a45e;">${ch}</strong>
                            <span class="mono" style="color:#ccc;margin-left:4px;">${fmt$(s)}</span>
                            ${v.count > 0 ? `<span style="color:#888;margin-left:4px;">${v.count}名</span>` : ''}
                            ${avg ? `<span style="color:#666;margin-left:4px;">@${avg}</span>` : ''}
                        </div>`;
                }).join('')}
                    </div>
                </td></tr>`;
            }

            const rowClick = chEntries.length > 0
                ? `onclick="const el=document.getElementById('${chDetailId}');if(el)el.style.display=el.style.display==='none'?'table-row':'none'" style="cursor:pointer;${rowStyle}"`
                : `style="${rowStyle}"`;

            html += `<tr ${rowClick}>
                <td>${dateStr}</td>
                <td style="color:${wdayColor};font-weight:600;">${wday}</td>
                <td class="num" style="color:var(--blue);">${dayHasData ? '—' : fmt$(fcDisp)}</td>
                <td class="num" style="color:var(--green);">${dayHasData ? fmt$(acDisp) : '—'}</td>
                <td class="num ${achClass}">${achRate}</td>
                <td class="num">${dayHasData ? dayCount : '—'}</td>
                <td class="num">${dayHasData ? unitPrice : '—'}</td>
                <td style="font-size:11px;max-width:200px;">${memoCell}</td>
            </tr>${chDetail}`;
        });

        html += `</tbody></table></div></div>`;
    }

    // Store report data globally for export
    window._reportData = { storeIds, storeAgg, channelGlobal, sortedChannels, monthlyAgg, monthKeys, totalSales, totalCount, activeDays, avgDaily, avgPerCustomer, yoyPct, yoySales, from, to, scopeLabel };

    document.getElementById('rpt-body').innerHTML = html;
}

// ═══════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════
function exportReportCSV() {
    const r = window._reportData;
    if (!r) return;
    const tl = txLabel();
    let csv = '\ufeff'; // BOM for Excel

    // Header
    csv += `MOMENTUM PEAKS — 実績レポート (${tl})\n`;
    csv += `期間,${r.from},～,${r.to}\n`;
    csv += `拠点,${r.scopeLabel}\n\n`;

    // Store summary
    csv += `店舗別実績\n`;
    csv += `店舗,売上,構成比,客数,客単価,営業日,日平均,前年比\n`;
    r.storeIds.forEach(sid => {
        const a = r.storeAgg[sid];
        if (!a) return;
        const pct = r.totalSales > 0 ? (a.sales / r.totalSales * 100).toFixed(1) : '0';
        const avg = a.count > 0 ? Math.round(a.sales / a.count) : 0;
        const dayAvg = a.days > 0 ? Math.round(a.sales / a.days) : 0;
        csv += `${sid},${txv(a.sales)},${pct}%,${a.count},${txv(avg)},${a.days},${txv(dayAvg)}\n`;
    });
    csv += `合計,${txv(r.totalSales)},100%,${r.totalCount},${txv(r.avgPerCustomer)},${r.activeDays},${txv(r.avgDaily)},${r.yoyPct > 0 ? r.yoyPct.toFixed(1) + '%' : '—'}\n\n`;

    // Channel breakdown
    csv += `チャネル別実績\n`;
    csv += `チャネル,売上,構成比,客数,客単価\n`;
    r.sortedChannels.forEach(([ch, d]) => {
        const pct = r.totalSales > 0 ? (d.sales / r.totalSales * 100).toFixed(1) : '0';
        const avg = d.count > 0 ? Math.round(d.sales / d.count) : 0;
        csv += `${ch},${txv(d.sales)},${pct}%,${d.count},${txv(avg)}\n`;
    });
    csv += '\n';

    // Store x Channel matrix
    csv += `店舗×チャネル マトリクス\n`;
    csv += `チャネル,${r.storeIds.join(',')},合計\n`;
    const allChNames = [...new Set(r.storeIds.flatMap(sid => Object.keys(r.storeAgg[sid]?.channels || {})))];
    allChNames.forEach(ch => {
        let total = 0;
        const vals = r.storeIds.map(sid => {
            const v = r.storeAgg[sid]?.channels[ch]?.sales || 0;
            total += v;
            return txv(v);
        });
        csv += `${ch},${vals.join(',')},${txv(total)}\n`;
    });
    csv += '\n';

    // Monthly
    if (r.monthKeys.length > 1) {
        csv += `月別推移\n`;
        csv += `月,売上,客数,客単価,営業日,日平均\n`;
        r.monthKeys.forEach(m => {
            const d = r.monthlyAgg[m];
            const days = d.days.size;
            const avg = d.count > 0 ? Math.round(d.sales / d.count) : 0;
            const dayAvg = days > 0 ? Math.round(d.sales / days) : 0;
            csv += `${m},${txv(d.sales)},${d.count},${txv(avg)},${days},${txv(dayAvg)}\n`;
        });
    }
    csv += '\n';

    // Daily breakdown (予測 vs 実績)
    csv += `日別実績（予測 vs 実績）\n`;
    csv += `日付,曜日,予測売上(${tl}),実績売上(${tl}),達成率,客数,客単価(${tl}),メモ\n`;
    const WDAY_CSV = ['日', '月', '火', '水', '木', '金', '土'];
    const REST_CH_CSV = ['LUNCH', 'DINNER', '3CH', 'CAFE', 'ランチ', 'ディナー'];
    let dCsv = new Date(r.from);
    const dEnd = new Date(r.to);
    while (dCsv <= dEnd) {
        const dateStr = dCsv.toISOString().slice(0, 10);
        const wday = WDAY_CSV[dCsv.getDay()];
        let daySales = 0, dayCount = 0, dayRestSales = 0, dayRestCount = 0;
        let dayHasData = false, dayFcSales = 0, dayMemo = '';

        r.storeIds.forEach(sid => {
            const fc = forecastForDate(sid, dateStr);
            dayFcSales += fc.predicted_sales || 0;
            const rec = (DATA.stores[sid] || []).find(x => x.date === dateStr);
            if (rec && rec.has_data) {
                dayHasData = true;
                daySales += rec.actual_sales;
                dayCount += rec.actual_count;
                if (rec.memo && !dayMemo) dayMemo = rec.memo;
                if (rec.channels) {
                    Object.entries(rec.channels).forEach(([ch, v]) => {
                        if (REST_CH_CSV.some(rc => ch.includes(rc))) {
                            dayRestSales += v.sales || 0;
                            dayRestCount += v.count || 0;
                        }
                    });
                }
            }
        });

        const fcDisp = txv(dayFcSales);
        const acDisp = dayHasData ? txv(daySales) : '';
        const achRate = dayHasData && dayFcSales > 0 ? (daySales / dayFcSales * 100).toFixed(1) + '%' : '';
        const unitPrice = dayRestCount > 0 ? Math.round(txv(dayRestSales) / dayRestCount) : '';
        const memoSafe = dayMemo.replace(/,/g, '，').replace(/\n/g, ' ');

        csv += `${dateStr},${wday},${fcDisp},${acDisp},${achRate},${dayHasData ? dayCount : ''},${unitPrice},${memoSafe}\n`;
        dCsv.setDate(dCsv.getDate() + 1);
    }

    // Download (BOM付きでExcel/Chrome互換)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MP_Report_${r.scopeLabel}_${r.from}_${r.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════
// PDF Export (html2canvas → jsPDF)
// ═══════════════════════════════════════
function exportReportPDF() {
    const reportBody = document.getElementById('rpt-body');
    if (!reportBody) return;
    const r = window._reportData;
    if (!r) return;

    // Dynamically load html2canvas + jsPDF if not loaded
    const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });

    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js')
    ]).then(() => {
        const btn = document.querySelector('.svd-btn.gold');
        if (btn) btn.textContent = '⏳ 生成中...';

        // Create a styled clone for PDF
        const clone = reportBody.cloneNode(true);
        clone.style.cssText = 'background:#0a0a1a;color:#e0e0e0;padding:20px;width:1100px;font-family:system-ui,sans-serif;';

        // Add header
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="text-align:center;padding:16px 0 20px;border-bottom:2px solid #c8a45e;">
                <div style="font-size:24px;font-weight:800;color:#c8a45e;letter-spacing:4px;">MOMENTUM PEAKS</div>
                <div style="font-size:12px;color:#888;margin-top:4px;">PERFORMANCE REPORT — ${r.scopeLabel}</div>
                <div style="font-size:14px;color:#ccc;margin-top:8px;">${r.from} ～ ${r.to}</div>
            </div>
        `;
        clone.insertBefore(header, clone.firstChild);

        document.body.appendChild(clone);

        html2canvas(clone, { scale: 2, backgroundColor: '#0a0a1a', useCORS: true }).then(canvas => {
            document.body.removeChild(clone);
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            const pdfW = 297; // A4 landscape width
            const pdfH = 210;
            const imgW = pdfW - 20;
            const imgH = canvas.height * imgW / canvas.width;

            const pdf = new jsPDF({ orientation: imgH > pdfH ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
            const pageH = pdf.internal.pageSize.getHeight() - 20;
            let y = 10;

            if (imgH <= pageH) {
                pdf.addImage(imgData, 'PNG', 10, y, imgW, imgH);
            } else {
                // Multi-page
                const pages = Math.ceil(imgH / pageH);
                for (let p = 0; p < pages; p++) {
                    if (p > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 10, 10 - (p * pageH), imgW, imgH);
                }
            }

            pdf.save(`MP_Report_${r.scopeLabel}_${r.from}_${r.to}.pdf`);
            if (btn) btn.textContent = '📋 PDF出力';
        });
    }).catch(err => {
        alert('PDF library load failed: ' + err.message);
    });
}

// 節気rank(1=TOP → 24=OFF)から天気配色を返す（バッジ表示用に残す）
// ロープウェイ式 24段階カラーパレット（5カテゴリ内グラデーション）
function sekkiWeatherColor(rank) {
    // TOP(1-5)=赤系, HIGH(6-10)=橙系, FLOW(11-15)=黄系, LOW(16-20)=緑系, OFF(21-24)=青系
    const palette = [
        '#dc2626', '#e03030', '#e53a3a', '#e44a18', '#ea5e06',  // TOP: 1-5 赤
        '#f97316', '#f98320', '#f0932a', '#e8a334', '#e8b030',  // HIGH: 6-10 橙
        '#eab308', '#e0c010', '#d4c820', '#c8c830', '#b8c040',  // FLOW: 11-15 黄
        '#22c55e', '#30b860', '#3aac62', '#44a064', '#4e9466',  // LOW: 16-20 緑
        '#3b82f6', '#3070e0', '#2960cc', '#2250b8',             // OFF: 21-24 青
    ];
    const idx = Math.max(0, Math.min(23, rank - 1));
    return palette[idx];
}

// 日別MPスコア → 24段階レベル（24=最繁忙, 1=最閑散）
const MP_MIN = 1.2, MP_MAX = 5.0;
function mpScoreLevel(mpPoint) {
    const t = (mpPoint - MP_MIN) / (MP_MAX - MP_MIN); // 0..1
    const clamped = Math.max(0, Math.min(1, t));
    // Higher score = more busy = lower level number (1 = busiest)
    return Math.max(1, Math.min(24, 25 - Math.ceil(clamped * 24)));
}

// 日別MPスコア → ヒートマップカラー（ロープウェイ式）
function mpScoreColor(mpPoint) {
    const level = mpScoreLevel(mpPoint);
    return rankCategoryColor(level);
}

function renderHeatmapInto(containerId, storeData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const yr = selectedDate.slice(0, 4);
    const yd = storeData.filter(r => r.date.startsWith(yr));
    if (!yd.length) { container.innerHTML = '<p style="color:var(--text-dim);">データなし</p>'; return; }

    const months = {};
    yd.forEach(r => { const m = r.date.slice(0, 7); if (!months[m]) months[m] = []; months[m].push(r); });

    let html = '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    Object.entries(months).sort().forEach(([m, days]) => {
        html += `<div style="min-width:160px"><div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;text-align:center;font-family:JetBrains Mono">${m}</div>`;
        html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';
        const fd = new Date(days[0].date).getDay();
        for (let i = 0; i < fd; i++) html += '<div></div>';
        days.forEach(x => {
            const day = parseInt(x.date.slice(8));
            const active = x.has_data;
            const level = mpScoreLevel(x.mp_point);
            const bg = mpScoreColor(x.mp_point);
            html += `<div class="hm-cell" style="background:${bg}" title="${x.date} ${x.weekday}\n${x.sekki}（24LV/${ordinal(x.rank)}）\nMP: ${x.mp_point.toFixed(2)} → Daily ${ordinal(level)}${active ? '\n実績: ¥' + x.actual_sales.toLocaleString() : ''}">${day}</div>`;
        });
        html += '</div></div>';
    });
    html += '</div>';
    // Legend - MP score based (daily)
    html += '<div style="display:flex;gap:2px;margin-top:8px;align-items:center;font-size:9px;color:var(--text-dim);flex-wrap:wrap;">';
    html += '<span style="margin-right:4px;">🔥 MP 5.0</span>';
    for (let lv = 1; lv <= 24; lv++) {
        const score = MP_MAX - (lv - 1) * (MP_MAX - MP_MIN) / 24;
        html += `<div style="width:12px;height:12px;background:${sekkiWeatherColor(lv)};border-radius:2px;cursor:pointer;" title="Daily ${ordinal(lv)}\nMP ≈ ${score.toFixed(1)}"></div>`;
    }
    html += '<span style="margin-left:4px;">❄️ MP 1.2</span></div>';
    container.innerHTML = html;
}

// ═══════════════════════════════════════
// ③ FORECAST (拠点ベース)
// ═══════════════════════════════════════
function runForecast() {
    const baseId = document.getElementById('fcBase').value;
    const from = document.getElementById('fcFrom').value;
    const to = document.getElementById('fcTo').value;
    if (!from || !to) { alert('期間を指定してください'); return; }

    const base = DATA.config.bases.find(b => b.id === baseId);
    if (!base) return;
    const storeIds = base.stores.map(s => s.id);
    const sekki = DATA.config.sekki_levels || {};
    const storeColors = ['#c8a45e', '#60a5fa', '#a78bfa', '#4ade80', '#f97316', '#ef4444', '#eab308'];

    // Generate dates
    const dates = [];
    let d = new Date(from);
    const end = new Date(to);
    while (d <= end) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }

    // Per-store forecast
    const allStoreResults = {}; // { sid: [{ date, ... }] }
    storeIds.forEach(sid => {
        const storeData = DATA.stores[sid] || [];

        const results = [];
        dates.forEach(dateStr => {
            // ── forecastForDate() を直接使用（F-Layer OnHand統合済み） ──
            const fc = forecastForDate(sid, dateStr);
            const existingRec = storeData.find(r => r.date === dateStr);

            results.push({
                date: dateStr,
                weekday: fc.weekday,
                sekki: fc.sekki,
                rank: fc.rank,
                kf1: fc.kf1,
                kf2: fc.kf2,
                kf3: fc.kf3,
                mp_point: fc.mp_point,
                predicted_sales: fc.predicted_sales,
                is_actual: !!existingRec && existingRec.has_data,
                actual_sales: existingRec ? existingRec.actual_sales : 0,
                is_holiday: fc.is_holiday,
                holiday_note: fc.holiday_note,
                onhand_tags: fc.onhand_records || [],
                f_layer: fc.f_layer,
                is_full: fc.is_full,
                onhand_amount: fc.onhand_amount || 0,
                onhand_count: fc.onhand_count || 0,
                confidence: fc.confidence,
                mape: fc.mape,
                fallback_used: fc.fallback_used,
                memo: existingRec ? existingRec.memo || '' : '',
                channels: existingRec ? existingRec.channels || {} : {},
                ropeway: existingRec ? existingRec.ropeway || null : null,
                actual_count: existingRec ? existingRec.actual_count || 0 : 0,
            });
        });
        allStoreResults[sid] = results;
    });

    // ── Chart: overlay all stores ──
    destroyChart('forecast');
    const datasets = [];
    storeIds.forEach((sid, i) => {
        const color = storeColors[i % storeColors.length];
        const results = allStoreResults[sid];
        datasets.push({
            label: `${sid} 予測売上`,
            data: results.map(r => r.predicted_sales),
            borderColor: color, borderWidth: 1.5, tension: 0.3, pointRadius: 0, yAxisID: 'y1',
        });
        datasets.push({
            label: `${sid} 実績売上`,
            data: results.map(r => r.is_actual ? r.actual_sales : null),
            borderColor: color, borderWidth: 1, borderDash: [3, 3], tension: 0.3, pointRadius: 1, yAxisID: 'y1', spanGaps: false,
        });
    });
    // Add combined MP line (average across stores)
    const avgMp = dates.map((_, di) => {
        let total = 0;
        storeIds.forEach(sid => total += allStoreResults[sid][di].mp_point);
        return Math.round(total / storeIds.length * 100) / 100;
    });
    datasets.unshift({
        label: '拠点平均MP',
        data: avgMp,
        borderColor: '#ffffff', borderWidth: 2, tension: 0.3, pointRadius: 1, yAxisID: 'y',
    });

    charts.forecast = new Chart(document.getElementById('chart-forecast'), {
        type: 'line',
        data: { labels: dates.map(d => d.slice(5)), datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6a6a8a', font: { size: 10, family: 'JetBrains Mono' } } } },
            scales: {
                x: { ticks: { color: '#4a4a68', font: { size: 9 }, maxTicksLimit: 20 }, grid: { display: false } },
                y: { position: 'left', min: 1, max: 5, ticks: { color: '#fff' }, grid: { color: '#252548' }, title: { display: true, text: 'MP', color: '#fff' } },
                y1: { position: 'right', ticks: { color: '#60a5fa', callback: v => fmt$(v) }, grid: { display: false }, title: { display: true, text: '売上', color: '#60a5fa' } },
            }
        }
    });

    // ── Per-store tables + base total ──
    const fcContent = document.getElementById('fc-content');
    let html = '';

    // Base total summary
    let totalPredicted = 0, totalActual = 0;
    dates.forEach((_, di) => {
        storeIds.forEach(sid => {
            totalPredicted += allStoreResults[sid][di].predicted_sales;
            totalActual += allStoreResults[sid][di].actual_sales;
        });
    });
    // MAPE & 信頼度バッジ生成
    const mapeInfo = storeIds.map(sid => {
        const m = computeMAPE(sid);
        const storeName = (base.stores.find(s => s.id === sid) || { name: sid }).name;
        const mapeLabel = m !== null ? `${m}%` : '—';
        const mapeColor = m === null ? '#4a4a68' : m <= 15 ? '#4ade80' : m <= 25 ? '#eab308' : m <= 40 ? '#f97316' : '#ef4444';
        return `<span style="margin:0 8px;color:${mapeColor};font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">${sid}:${mapeLabel}</span>`;
    }).join('');
    // 代表信頼度：最初の店舗の最初の非休日日
    const repConf = Object.values(allStoreResults)[0]?.find(r => !r.is_holiday && r.confidence)?.confidence;
    const confLabel = repConf ? repConf.label : '⬜ データなし';

    html += `<div class="card mt-16" style="text-align:center;padding:16px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--gold);letter-spacing:2px;">${base.name} — FORECAST SUMMARY</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${displayTaxExc ? '税抜' : '税込'}表示</div>
        <div style="display:flex;justify-content:center;gap:32px;margin-top:12px;">
            <div><div class="label">予測合計</div><div class="mono fw-900" style="font-size:28px;color:var(--blue);">${fmt$(txv(totalPredicted))}</div></div>
            <div><div class="label">実績合計</div><div class="mono fw-900" style="font-size:28px;color:var(--green);">${fmt$(txv(totalActual))}</div></div>
            <div><div class="label">期間</div><div class="mono" style="font-size:16px;color:var(--text-dim);">${dates.length}日間</div></div>
        </div>
        <div style="margin-top:12px;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03);">
            <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;letter-spacing:1px;">📊 MAPE（直近30日予測精度）</div>
            <div>${mapeInfo}</div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-dim);">${confLabel}</div>
        <button onclick="exportForecastCSV()" style="margin-top:16px;padding:8px 24px;background:var(--blue);color:#fff;border:none;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">📥 CSV EXPORT</button>
    </div>`;
    // Store for CSV export
    window._forecastExportData = { allStoreResults, storeIds, dates, baseName: base.name };

    // Per-store forecast tables
    storeIds.forEach((sid, i) => {
        const results = allStoreResults[sid];
        const storeName = getStoreName(sid);
        const color = storeColors[i % storeColors.length];
        const storePredTotal = results.reduce((s, r) => s + r.predicted_sales, 0);
        const storeActTotal = results.reduce((s, r) => s + r.actual_sales, 0);

        html += `<div class="card mt-16">
            <h3 style="color:${color};">${sid} — ${storeName}</h3>
            <div style="display:flex;gap:24px;margin-bottom:8px;font-size:12px;">
                <span style="color:var(--text-dim);">予測: <strong style="color:${color};">${fmt$(txv(storePredTotal))}</strong></span>
                <span style="color:var(--text-dim);">実績: <strong style="color:var(--green);">${fmt$(txv(storeActTotal))}</strong></span>
                <span style="color:var(--text-dim);">達成率: <strong class="${storeActTotal > 0 && storePredTotal > 0 ? (storeActTotal / storePredTotal * 100 >= 100 ? 'text-green' : 'text-red') : ''}">${storePredTotal > 0 ? (storeActTotal / storePredTotal * 100).toFixed(1) + '%' : '—'}</strong></span>
            </div>
            <div style="overflow-x:auto;max-height:600px;overflow-y:auto;">
            <table class="data-table fc-table"><thead><tr>
                <th style="width:120px;">DATE</th><th style="width:36px;">曜日</th>
                <th class="num" style="width:90px;">予測売上</th><th class="num" style="width:90px;">実績売上</th>
                <th class="num" style="width:60px;">達成率</th>
                <th class="num" style="width:50px;">客数</th><th class="num" style="width:70px;">客単価</th>
                <th style="min-width:120px;">メモ</th>
            </tr></thead><tbody>`;

        results.forEach(r => {
            const holidayStyle = r.is_holiday ? 'opacity:0.4;' : (!r.is_actual ? 'opacity:0.7' : '');
            const predCell = r.is_holiday
                ? `<span style="color:#f87171;font-weight:600;">🔴 定休日</span>`
                : `${fmt$(txv(r.predicted_sales))}`;
            const achRate = r.is_actual && r.predicted_sales > 0
                ? (r.actual_sales / r.predicted_sales * 100).toFixed(1) + '%'
                : '—';
            const achClass = r.is_actual && r.predicted_sales > 0
                ? (r.actual_sales / r.predicted_sales * 100 >= 100 ? 'text-green' : 'text-red')
                : '';
            const actCount = r.is_actual ? r.actual_count : 0;
            const actAvg = actCount > 0 ? fmt$(Math.round(txv(r.actual_sales) / actCount)) : '—';

            // メモ + ロープウェイバッジ
            let memoCell = '';
            if (r.ropeway && r.ropeway.type && r.ropeway.type !== 'none') {
                const rwLabels = { 'full': '🚡終日運休', 'partial': '🚡一部運休', 'time': `🚡${r.ropeway.from || ''}〜${r.ropeway.to || ''}` };
                memoCell += `<span style="display:inline-block;background:rgba(251,146,60,0.15);color:#fb923c;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-bottom:2px;">${rwLabels[r.ropeway.type] || ''}</span><br>`;
            }
            if (r.memo) {
                memoCell += `<span style="color:#aaa;font-size:11px;">${r.memo}</span>`;
            }

            // チャネル詳細（展開トグル）
            let chDetail = '';
            const chEntries = Object.entries(r.channels).filter(([, v]) => v && (v.sales > 0 || v.food > 0 || v.drink > 0 || v.count > 0));
            if (chEntries.length > 0) {
                const detailId = `ch_${sid}_${r.date.replace(/-/g, '')}`;
                chDetail = `<tr class="ch-detail-row" id="${detailId}" style="display:none;"><td colspan="8" style="padding:4px 16px 8px;background:rgba(255,255,255,0.02);">
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${chEntries.map(([ch, v]) => {
                    const s = txv(v.sales || 0);
                    const avg = v.count > 0 ? fmt$(Math.round(s / v.count)) : '';
                    return `<div style="background:rgba(200,164,94,0.08);border:1px solid rgba(200,164,94,0.15);border-radius:6px;padding:4px 8px;font-size:11px;">
                            <strong style="color:#c8a45e;">${ch}</strong>
                            <span class="mono" style="color:#ccc;margin-left:4px;">${fmt$(s)}</span>
                            ${v.count > 0 ? `<span style="color:#888;margin-left:4px;">${v.count}名</span>` : ''}
                            ${avg ? `<span style="color:#666;margin-left:4px;">@${avg}</span>` : ''}
                        </div>`;
                }).join('')}
                    </div>
                </td></tr>`;
            }

            // OnHand
            let ohAccordion = '';
            if (r.onhand_tags && r.onhand_tags.length > 0) {
                const totalOhCount = r.onhand_tags.reduce((s, oh) => s + (Number(oh.count) || 0), 0);
                const totalOhAmt = r.onhand_tags.reduce((s, oh) => s + (Number(oh.amount) || 0), 0);
                ohAccordion = `<span style="font-size:10px;background:rgba(251,146,60,0.12);color:#fb923c;padding:1px 6px;border-radius:4px;margin-left:4px;">🎯${totalOhCount}名 ¥${totalOhAmt.toLocaleString()}</span>`;
            }

            const rowClick = chEntries.length > 0
                ? `onclick="const el=document.getElementById('ch_${sid}_${r.date.replace(/-/g, '')}');if(el)el.style.display=el.style.display==='none'?'table-row':'none'" style="cursor:pointer;${holidayStyle}"`
                : `style="${holidayStyle}"`;

            html += `<tr ${rowClick}>
                <td>${r.date}${ohAccordion}</td><td>${r.weekday}</td>
                <td class="num" style="color:var(--blue)">${predCell}</td>
                <td class="num" style="color:var(--green)">${r.is_actual ? fmt$(txv(r.actual_sales)) : '—'}</td>
                <td class="num ${achClass}">${achRate}</td>
                <td class="num">${r.is_actual ? actCount : '—'}</td>
                <td class="num">${r.is_actual ? actAvg : '—'}</td>
                <td style="font-size:11px;max-width:200px;">${memoCell}</td>
            </tr>${chDetail}`;
        });

        html += `</tbody></table></div></div>`;
    });

    fcContent.innerHTML = html;
}

// ═══════════════════════════════════════
// ④ CROSS COMPARE
// ═══════════════════════════════════════
function renderCompare() {
    const stores = DATA.meta.stores;
    const colors = ['#c8a45e', '#60a5fa', '#a78bfa', '#4ade80', '#f97316', '#ef4444', '#eab308'];

    // Monthly average MP per store
    const monthlyMp = {};  // { storeId: { 1: avgMp, 2: avgMp ... } }
    stores.forEach(sid => {
        const mm = {};
        (DATA.stores[sid] || []).forEach(r => {
            if (r.actual_sales <= 0) return;
            const m = parseInt(r.date.slice(5, 7));
            if (!mm[m]) mm[m] = [];
            mm[m].push(r.mp_point);
        });
        monthlyMp[sid] = {};
        for (let m = 1; m <= 12; m++) {
            const vals = mm[m] || [];
            monthlyMp[sid][m] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }
    });

    // Chart: Monthly MP comparison
    destroyChart('compareMonthly');
    charts.compareMonthly = new Chart(document.getElementById('chart-compare-monthly'), {
        type: 'bar',
        data: {
            labels: Array.from({ length: 12 }, (_, i) => `${i + 1} 月`),
            datasets: stores.map((sid, i) => ({
                label: sid,
                data: Array.from({ length: 12 }, (_, m) => monthlyMp[sid][m + 1]),
                backgroundColor: colors[i % colors.length] + '80',
                borderColor: colors[i % colors.length],
                borderWidth: 1,
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6a6a8a', font: { size: 10, family: 'JetBrains Mono' } } } },
            scales: {
                x: { ticks: { color: '#4a4a68' }, grid: { display: false } },
                y: { min: 1, max: 5, ticks: { color: '#4a4a68' }, grid: { color: '#252548' } }
            }
        }
    });

    // Season Performance
    const seasons = ['TOP SEASON', 'HIGH SEASON', 'FLOW SEASON', 'LOW SEASON', 'OFF SEASON'];
    const seasonMp = {};
    stores.forEach(sid => {
        seasonMp[sid] = {};
        seasons.forEach(s => {
            const vals = (DATA.stores[sid] || []).filter(r => r.season === s && r.has_data).map(r => r.mp_point);
            seasonMp[sid][s] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        });
    });

    destroyChart('seasonPerf');
    charts.seasonPerf = new Chart(document.getElementById('chart-season-perf'), {
        type: 'radar',
        data: {
            labels: seasons.map(s => s.split(' ')[0]),
            datasets: stores.map((sid, i) => ({
                label: sid,
                data: seasons.map(s => seasonMp[sid][s]),
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length] + '15',
                borderWidth: 1.5, pointRadius: 2,
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6a6a8a', font: { size: 10, family: 'JetBrains Mono' } } } },
            scales: {
                r: {
                    min: 1, max: 5,
                    ticks: { color: '#4a4a68', backdropColor: 'transparent' },
                    grid: { color: '#252548' },
                    pointLabels: { color: '#a0a0b8', font: { size: 10 } }
                }
            }
        }
    });

    // Year Compare Cards
    const targetMonth = parseInt(selectedDate.slice(5, 7));
    const yearCards = {};

    stores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            if (parseInt(r.date.slice(5, 7)) !== targetMonth || !r.has_data) return;
            const y = r.date.slice(0, 4);
            const key = `${y} -${sid} `;
            if (!yearCards[key]) yearCards[key] = { year: y, store: sid, sales: 0, count: 0, days: 0, mpSum: 0 };
            yearCards[key].sales += r.actual_sales;
            yearCards[key].count += r.actual_count;
            yearCards[key].mpSum += r.mp_point;
            yearCards[key].days++;
        });
    });

    // Group by store
    const byStore = {};
    Object.values(yearCards).forEach(v => {
        if (!byStore[v.store]) byStore[v.store] = [];
        byStore[v.store].push(v);
    });

    document.getElementById('compare-year-cards').innerHTML = Object.entries(byStore).map(([sid, years]) => {
        const sorted = years.sort((a, b) => a.year.localeCompare(b.year));
        return sorted.map(v => `
    < div class="year-card" >
                <h4>${sid} — ${v.year}年 ${targetMonth}月</h4>
                <div class="year-stat"><span class="yl">売上合計</span><span class="yv text-gold mono">${fmt$(v.sales)}</span></div>
                <div class="year-stat"><span class="yl">来客合計</span><span class="yv mono">${v.count}名</span></div>
                <div class="year-stat"><span class="yl">営業日数</span><span class="yv mono">${v.days}日</span></div>
                <div class="year-stat"><span class="yl">平均MP</span><span class="yv text-gold mono">${(v.mpSum / v.days).toFixed(2)}</span></div>
            </div >
    `).join('');
    }).join('');

    // KF Rankings
    renderKfRankings();
}

function renderKfRankings() {
    const stores = DATA.meta.stores;
    const ranks = stores.map(sid => {
        const active = (DATA.stores[sid] || []).filter(r => r.has_data);
        const avgKf2 = active.length ? active.reduce((s, r) => s + r.kf2, 0) / active.length : 0;
        const avgKf3 = active.length ? active.reduce((s, r) => s + r.kf3, 0) / active.length : 0;
        return { sid, avgKf2, avgKf3 };
    });

    const kf2Sorted = [...ranks].sort((a, b) => b.avgKf2 - a.avgKf2);
    const kf3Sorted = [...ranks].sort((a, b) => b.avgKf3 - a.avgKf3);

    document.getElementById('rank-kf2').innerHTML = kf2Sorted.map((r, i) =>
        `< div class="year-stat" ><span class="yl">#${i + 1} ${r.sid}</span><span class="yv mono text-blue">${r.avgKf2.toFixed(2)}</span></div > `
    ).join('');

    document.getElementById('rank-kf3').innerHTML = kf3Sorted.map((r, i) =>
        `< div class="year-stat" ><span class="yl">#${i + 1} ${r.sid}</span><span class="yv mono text-green">${r.avgKf3.toFixed(2)}</span></div > `
    ).join('');
}

// ═══════════════════════════════════════
// ⑤ DATA IMPORT
// ═══════════════════════════════════════
function setupImport() {
    ['main', 'reserve', 'staff'].forEach(type => {
        const dz = document.getElementById(`dz-${type}`);
        const fi = document.getElementById(`fi-${type}`);
        if (!dz || !fi) return;

        dz.addEventListener('click', () => fi.click());
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => {
            e.preventDefault();
            dz.classList.remove('dragover');
            handleFile(type, e.dataTransfer.files[0]);
        });
        fi.addEventListener('change', e => {
            if (e.target.files[0]) handleFile(type, e.target.files[0]);
        });
    });
}

function handleFile(type, file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            if (type === 'main') {
                DATA = JSON.parse(e.target.result);
                updateImportStatus('main', DATA);
                onDataLoaded();
            } else if (type === 'reserve') {
                RESERVES = parseCSV(e.target.result);
                updateImportStatus('reserve', RESERVES);
            } else if (type === 'staff') {
                STAFFING = parseCSV(e.target.result);
                updateImportStatus('staff', STAFFING);
            }
        } catch (err) {
            alert('❌ ファイル読み込みエラー: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return obj;
    });
}

function updateImportStatus(type, data) {
    const el = document.getElementById(`is-${type}`);
    if (!el) return;
    if (!data) {
        el.className = 'import-status empty';
        el.innerHTML = '⚪ 未ロード';
        return;
    }
    el.className = 'import-status loaded';
    if (type === 'main') {
        el.innerHTML = `✅ v${data.meta.version} | ${data.meta.stores.length} 店舗 | ${data.meta.total_records.toLocaleString()} レコード | ${data.meta.generated.slice(0, 16)}`;
    } else if (type === 'reserve') {
        el.innerHTML = `✅ ${data.length} 件の予約データ`;
    } else if (type === 'staff') {
        el.innerHTML = `✅ ${data.length} 件の人員定義`;
    }
}

// ═══════════════════════════════════════
// ⑥ STAFFING
// ═══════════════════════════════════════
function renderStaffing() {
    const dateStr = document.getElementById('stDate').value || selectedDate;
    const grid = document.getElementById('staffing-grid');
    const placeholder = document.getElementById('enter-placeholder');

    if (!DATA) { grid.innerHTML = '<p style="color:var(--text-dim)">データ未ロード</p>'; return; }

    // Default staffing multipliers
    const multipliers = DATA.config.staffing_multiplier || {
        '1.0-2.0': 0.7, '2.0-3.0': 1.0, '3.0-4.0': 1.3, '4.0-5.0': 1.6
    };

    function getMultiplier(mp) {
        if (mp >= 4.0) return multipliers['4.0-5.0'] || 1.6;
        if (mp >= 3.0) return multipliers['3.0-4.0'] || 1.3;
        if (mp >= 2.0) return multipliers['2.0-3.0'] || 1.0;
        return multipliers['1.0-2.0'] || 0.7;
    }

    function getIntensity(mp) {
        if (mp >= 4.0) return { label: 'PEAK', color: 'var(--red)' };
        if (mp >= 3.0) return { label: 'HIGH', color: 'var(--gold)' };
        if (mp >= 2.0) return { label: 'NORMAL', color: 'var(--blue)' };
        return { label: 'LOW', color: 'var(--text-dim)' };
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">';

    DATA.meta.stores.forEach(sid => {
        const rec = (DATA.stores[sid] || []).find(r => r.date === dateStr);
        if (!rec) {
            html += `<div class="year-card"><h4>${sid}</h4><p style="color:var(--text-dim)">データなし</p></div>`;
            return;
        }

        const mp = rec.mp_point;
        const mult = getMultiplier(mp);
        const intensity = getIntensity(mp);

        // If custom staffing rules loaded
        let staffDetail = '';
        if (STAFFING) {
            const rules = STAFFING.filter(r => r.store_id === sid && mp >= parseFloat(r.mp_low) && mp < parseFloat(r.mp_high));
            if (rules.length) {
                staffDetail = rules.map(r =>
                    `<div class="year-stat"><span class="yl">${r.segment}</span><span class="yv mono">H:${r.hall_count} K:${r.kitchen_count}</span></div>`
                ).join('');
            }
        }

        if (!staffDetail) {
            // Default estimation
            const baseStaff = sid === 'Ce' || sid === 'RP' ? 2 : sid === 'BG' ? 8 : 4;
            const est = Math.round(baseStaff * mult);
            staffDetail = `<div class="year-stat"><span class="yl">推定人員</span><span class="yv mono">${est}名</span></div>
    <div class="year-stat"><span class="yl">倍率</span><span class="yv mono">×${mult}</span></div>`;
        }

        html += `<div class="year-card">
            <h4>${sid} <span style="font-size:11px;color:${intensity.color}">${intensity.label}</span></h4>
            <div class="year-stat"><span class="yl">MP Point</span><span class="yv text-gold mono">${mp.toFixed(2)}</span></div>
            <div class="year-stat"><span class="yl">節気</span><span class="yv mono">${rec.sekki}</span></div>
            <div class="year-stat"><span class="yl">RANK</span><span class="yv">${mpBadge(rec.mp_point, 'small')}</span></div>
            <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
            ${staffDetail}
        </div>`;
    });

    html += '</div>';
    grid.innerHTML = html;

    // Show ENTER placeholder
    placeholder.classList.remove('hidden');
}

// ═══════════════════════════════════════
// ── Sales Registration Persistence ──
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ── Sales Registration Persistence ──
// ═══════════════════════════════════════
async function saveAllSalesEntries() {
    const date = document.getElementById('sf-date')?.value;
    if (!date) return;

    const taxInc = document.getElementById('sf-tax-inc')?.checked;
    const taxRate = 1.10;
    function toInc(v) { return taxInc ? v : Math.round(v * taxRate); }
    const gv = id => parseInt(document.getElementById(id)?.value) || 0;

    const storeBlocks = document.querySelectorAll('.sf-store-block');
    let savedCount = 0;
    let totalAllSales = 0;

    storeBlocks.forEach(block => {
        const store = block.dataset.store;
        const config = STORE_FORMS[store] || [];

        const channels = {};
        let totalSales = 0;
        let totalCount = 0;

        config.forEach(section => {
            if (section.type === 'section') {
                const chData = {};
                let secSales = 0;
                section.fields.forEach(f => {
                    const rawVal = gv(`sf-${store}-${section.id}-${f}`);
                    if (f === 'count') {
                        chData.count = rawVal;
                        totalCount += rawVal;
                    } else {
                        const valInc = toInc(rawVal);
                        chData[f] = valInc;
                        secSales += valInc;
                    }
                });
                chData.sales = secSales;
                channels[section.id] = chData;
                totalSales += secSales;

            } else if (section.type === 'simple') {
                const f = section.field || 'sales';
                const rawVal = gv(`sf-${store}-${section.id}-${f}`);
                const valInc = toInc(rawVal);
                channels[section.id] = { [f]: valInc, sales: valInc };
                totalSales += valInc;

            } else if (section.type === 'group') {
                section.items.forEach(item => {
                    const rawVal = gv(`sf-${store}-${item.ch}-sales`);
                    const valInc = toInc(rawVal);
                    channels[item.ch] = { sales: valInc };
                    totalSales += valInc;
                });
            }
        });

        // §0: 保存ボタンを押した = この拠点のデータを保存する意図がある
        // 売上0（フォーム空 = 全フィールド0）は正常なデータ入力として扱う

        // Update DATA in memory
        if (!DATA.stores[store]) DATA.stores[store] = [];
        let record = DATA.stores[store].find(r => r.date === date);

        if (!record) {
            record = {
                date: date,
                weekday: WEEKDAY_JA[new Date(date).getDay()],
                sekki: getSekki(date),
                rank: 12, mp_point: 2.0
            };
            DATA.stores[store].push(record);
        }

        record.actual_sales = totalSales;
        record.actual_count = totalCount;
        record.has_data = true;
        record.channels = channels;

        // ── Labor data ──
        const laborSec = config.find(s => s.type === 'labor');
        if (laborSec) {
            const labor = {};
            let laborTotal = 0;
            laborSec.fields.forEach(f => {
                const val = parseFloat(document.getElementById(`sf-${store}-LABOR-${f}`)?.value) || 0;
                labor[f] = val;
                laborTotal += val;
            });
            labor.total_hours = laborTotal;
            if (laborTotal > 0 && totalSales > 0) {
                // Calculate productivity using tax-exclusive sales
                const excSales = Math.round(totalSales / (taxInc ? 1.10 : 1));
                labor.productivity = Math.round(excSales / laborTotal);
            } else {
                labor.productivity = 0;
            }
            record.labor = labor;
        }

        // ── Ropeway data (JW only) ──
        if (store === 'JW') {
            const rwBtns = document.querySelectorAll('.rw-btn.rw-active');
            const rwType = rwBtns.length > 0 ? rwBtns[0].dataset.rwType : 'none';
            if (rwType !== 'none') {
                record.ropeway = { type: rwType };
                if (rwType === 'time') {
                    record.ropeway.from = document.getElementById('rw-from')?.value || '';
                    record.ropeway.to = document.getElementById('rw-to')?.value || '';
                }
                const memo = document.getElementById('rw-memo')?.value?.trim() || '';
                if (memo) record.ropeway.memo = memo;
            } else {
                // Even if normal, save memo if present
                const memo = document.getElementById('rw-memo')?.value?.trim() || '';
                if (memo) {
                    record.ropeway = { type: 'none', memo: memo };
                } else {
                    delete record.ropeway;
                }
            }
        }

        // ── Memo data ──
        const memoEl = document.getElementById(`sf-memo-${store}`);
        const memo = memoEl?.value?.trim() || '';
        if (memo) record.memo = memo;
        else delete record.memo;

        savedCount++;
        totalAllSales += totalSales;
    });

    // §0: 売上0は正常なデータ入力。確認不要。
    if (savedCount === 0) return; // フォーム未入力時のみスキップ

    // mp_data localStorage caching removed — always fetch fresh from server
    try {
        renderCommand(); // Refresh UI

        // ── GAS Cloud Sync — Store-Specific Sheets Architecture ──
        // channels obj → Code.gs STORE_SHEETS ヘッダー順の flat values 配列に変換して保存
        const stat = document.getElementById('sf-status');

        if (typeof GAS_BRIDGE === 'undefined' || !GAS_BRIDGE.getUrl()) {
            // ❌ GAS未接続 — ユーザーに明確に警告
            if (stat) {
                stat.textContent = '❌ GAS未接続！データはクラウドに保存されません。⑤SETTINGSでGAS URLを設定してください。';
                stat.style.color = 'var(--red)';
            }
            alert('⚠️ GAS Backend が接続されていません。\n入力データはページをリロードすると消えます。\n⑤ SETTINGS でGAS URLを設定してください。');
            return;
        }

        // ── GAS接続中 — 保存中メッセージ ──
        if (stat) {
            stat.textContent = `⏳ ${savedCount}店舗をGASに保存中...`;
            stat.style.color = 'var(--gold)';
        }

        const STORE_TO_SHEET = {
            'JW': 'MOIWA_JW', 'GA': 'TVTOWER_GA', 'BG': 'TVTOWER_BG',
            'NP': 'OKURAYAMA_NP', 'Ce': 'OKURAYAMA_Ce', 'RP': 'OKURAYAMA_RP',
            'BQ': 'AKARENGA_BQ', 'RYB': 'AKARENGA_RYB'
        };

        // channels → values 配列変換 (STORE_SHEETS ヘッダー順に完全準拠)
        function channelsToGASValues(store, ch, date, memo, ropeway) {
            const g = (sec, key) => (ch[sec] && ch[sec][key]) || 0;
            const m = memo || '';
            const rw = ropeway ? JSON.stringify(ropeway) : '';
            switch (store) {
                case 'JW':
                    return [date,
                        g('LUNCH', 'food'), g('LUNCH', 'drink'), g('LUNCH', 'count'),
                        g('DINNER', 'food'), g('DINNER', 'drink'), g('DINNER', 'count'),
                        g('TAKEOUT', 'food'), g('TAKEOUT', 'drink'),
                        g('席料', 'sales'), g('南京錠', 'sales'), g('花束', 'sales'),
                        0, 0, m, rw
                    ];
                case 'GA':
                    return [date,
                        g('LUNCH', 'food'), g('LUNCH', 'drink'), g('LUNCH', 'count'),
                        g('DINNER', 'food'), g('DINNER', 'drink'), g('DINNER', 'count'),
                        g('3CH', 'food'), g('3CH', 'drink'), g('3CH', 'count'),
                        g('BANQUET', 'food'), g('BANQUET', 'drink'), g('BANQUET', 'count'),
                        g('室料', 'sales'), g('展望台', 'sales'),
                        0, 0, m
                    ];
                case 'BG':
                    return [date,
                        g('ALL', 'food'), g('ALL', 'drink'), g('ALL', 'tent'), g('ALL', 'count'),
                        g('ALL', 'goods'), 0, m
                    ];
                case 'NP':
                    return [date,
                        g('LUNCH', 'food'), g('LUNCH', 'drink'), g('LUNCH', 'count'),
                        g('DINNER', 'food'), g('DINNER', 'drink'), g('DINNER', 'count'),
                        g('EVENT', 'room') || 0, g('EVENT', 'flower') || 0,
                        g('EVENT', 'food'), g('EVENT', 'drink'), g('EVENT', 'count'),
                        0, 0, m
                    ];
                case 'Ce':
                case 'RP':
                    return [date,
                        g('CAFE', 'food'), g('CAFE', 'drink'), g('CAFE', 'count'),
                        g('GOODS', 'sales') || 0, 0, m
                    ];
                case 'BQ':
                    return [date,
                        g('LUNCH', 'food'), g('LUNCH', 'drink'), g('LUNCH', 'count'),
                        g('AT', 'food'), g('AT', 'drink'), g('AT', 'count'),
                        g('DINNER', 'food'), g('DINNER', 'drink'), g('DINNER', 'count'),
                        g('席料', 'sales'),
                        0, 0, m
                    ];
                case 'RYB':
                    return [date,
                        g('ALL', 'food'), g('ALL', 'drink'), g('ALL', 'count'),
                        0, 0, m
                    ];
                default:
                    return null;
            }
        }

        const gasPromises = [];
        storeBlocks.forEach(block => {
            const store = block.dataset.store;
            const r = DATA.stores[store]?.find(r => r.date === date);
            if (!r || !r.has_data) return;

            const sheetName = STORE_TO_SHEET[store];
            if (!sheetName) return;

            const values = channelsToGASValues(store, r.channels || {}, date, r.memo || '', r.ropeway || null);
            if (!values) return;

            const payload = {
                action: 'save',
                sheet: sheetName,
                date: date,
                values: values,
                user: 'DASHBOARD'
            };
            // トークン認証を追加
            if (typeof GAS_BRIDGE !== 'undefined' && GAS_BRIDGE.addToken) {
                GAS_BRIDGE.addToken(payload);
            }

            gasPromises.push(
                fetch(GAS_BRIDGE.getUrl(), {
                    method: 'POST',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(payload)
                }).then(r => r.json()).then(d => ({ store, status: d.status, action: d.action }))
                    .catch(e => ({ store, status: 'error', message: e.message }))
            );
        });

        if (gasPromises.length > 0) {
            // ── GAS完了を待ってから結果を表示（await） ──
            const results = await Promise.all(gasPromises);
            const okCount = results.filter(r => r.status === 'ok').length;
            const errCount = results.filter(r => r.status !== 'ok').length;
            const errStores = results.filter(r => r.status !== 'ok').map(r => `${r.store}: ${r.message || 'unknown error'}`);
            console.log(`[GAS] Sync: ${okCount} ok, ${errCount} errors`, results);

            if (errCount > 0) {
                // ❌ エラー — 赤色メッセージ + alert
                if (stat) {
                    stat.textContent = `❌ ${errCount}店舗の保存に失敗！ (${okCount}店舗は成功) — ${date}`;
                    stat.style.color = 'var(--red)';
                }
                alert(`⚠️ GAS保存エラー:\n${errStores.join('\n')}\n\n成功: ${okCount}店舗\n失敗: ${errCount}店舗\n\nもう一度保存してください。`);
            } else {
                // ✅ 全店舗成功 — 緑色メッセージ
                if (stat) {
                    stat.textContent = `✅ ${okCount}店舗 GAS保存完了 ☁️ ${date} (拠点合計: ¥${totalAllSales.toLocaleString()})`;
                    stat.style.color = 'var(--green)';
                    setTimeout(() => stat.textContent = '', 15000);
                }
            }

            // ── メモのGAS永続化 ──
            const memoPromises = [];
            storeBlocks.forEach(block => {
                const store = block.dataset.store;
                const r = DATA.stores[store]?.find(r => r.date === date);
                const memo = r?.memo || '';
                const memoPayload = {
                    action: 'saveMemo',
                    date: date,
                    store: store,
                    memo: memo,
                    user: 'DASHBOARD'
                };
                if (typeof GAS_BRIDGE !== 'undefined' && GAS_BRIDGE.addToken) {
                    GAS_BRIDGE.addToken(memoPayload);
                }
                memoPromises.push(
                    fetch(GAS_BRIDGE.getUrl(), {
                        method: 'POST',
                        redirect: 'follow',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify(memoPayload)
                    }).then(r => r.json()).catch(e => ({ status: 'error', message: e.message }))
                );
            });
            if (memoPromises.length > 0) {
                Promise.all(memoPromises).then(results => {
                    const saved = results.filter(r => r.status === 'ok' && r.action !== 'skipped').length;
                    if (saved > 0) console.log(`[GAS] Memo saved: ${saved} stores`);
                });
            }
        } else {
            if (stat) {
                stat.textContent = `⚠️ GAS保存対象の店舗がありません — ${date}`;
                stat.style.color = 'var(--gold)';
            }
        }
    } catch (e) {
        const stat = document.getElementById('sf-status');
        if (stat) {
            stat.textContent = `❌ 保存エラー: ${e.message}`;
            stat.style.color = 'var(--red)';
        }
        alert('❌ 保存に失敗しました: ' + e.message);
    }
}

// Keep backward compatibility
function saveSalesEntry() { saveAllSalesEntries(); }
function loadSalesEntry() {
    renderCommand(); // Re-render with current data
}

// ── CSV Export: 予測データ出力 ──
function exportForecastCSV() {
    const data = window._forecastExportData;
    if (!data) { alert('先に③ FORECAST CHART を表示してください'); return; }

    const { allStoreResults, storeIds, baseName } = data;
    const taxLabel = displayTaxExc ? '税抜' : '税込';

    // Header
    const headers = ['日付', '店舗', '曜日', '節気', 'KF①', 'KF②', 'KF③', 'MP', '予測売上(' + taxLabel + ')', '実績売上(' + taxLabel + ')', '達成率'];
    const rows = [headers.join(',')];

    // Data rows
    storeIds.forEach(sid => {
        const results = allStoreResults[sid];
        const storeName = getStoreName(sid);
        results.forEach(r => {
            const predTax = txv(r.predicted_sales);
            const actTax = r.is_actual ? txv(r.actual_sales) : 0;
            const ratio = actTax > 0 && predTax > 0 ? (actTax / predTax * 100).toFixed(1) + '%' : '';
            rows.push([
                r.date,
                sid + ' ' + storeName,
                r.weekday,
                r.sekki,
                r.kf1.toFixed(2),
                r.kf2.toFixed(2),
                r.kf3.toFixed(2),
                r.mp_point.toFixed(2),
                predTax,
                actTax || '',
                ratio
            ].join(','));
        });
    });

    // BOM + CSV content for Excel compatibility
    const bom = '\uFEFF';
    const csvContent = bom + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const monthStr = selectedDate.slice(0, 7);
    a.href = url;
    a.download = 'MP_Forecast_' + baseName + '_' + monthStr + '_' + taxLabel + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ── Async OnHand Fetcher (TableCheck Integration) ──
async function fetchAndRenderOnhand(targetDate) {
    const container = document.getElementById('bg-onhand-container');
    const badge = document.getElementById('bg-onhand-status');
    if (!container) return;

    if (typeof GAS_BRIDGE === 'undefined' || !GAS_BRIDGE.getUrl()) {
        badge.innerHTML = 'GAS未接続';
        container.innerHTML = `<div style="text-align:center;padding:30px;opacity:0.6;">API未接続です。<br>設定画面からGASのURLを登録してください。</div>`;
        return;
    }

    const onhandData = await GAS_BRIDGE.getOnhandData(targetDate);

    if (!onhandData || !onhandData.totalPax) {
        // データがない、またはエラーの時
        badge.innerHTML = '未接続 / データなし';
        badge.style.background = 'rgba(255,255,255,0.05)';
        badge.style.color = 'var(--text-dim)';
        container.innerHTML = `
            <div style="text-align:center;padding:30px;opacity:0.6;">
                <div style="font-size:32px;margin-bottom:8px;">💤</div>
                <div>本日のリアルタイム予約データはありません</div>
            </div>`;
        return;
    }

    // データが取れた場合の描画
    badge.innerHTML = '🟢 TableCheck 連携中';
    badge.style.background = 'rgba(74, 222, 128, 0.15)';
    badge.style.color = '#4ade80';

    const totalPax = onhandData.totalPax || 0;
    const groups = onhandData.groups || 0;
    const estSales = Math.round((totalPax * 4000) / 1000); // 1人あたり4000円仮定(千円単位)

    // タイムライン描画用
    const hours = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
    let timelineHtml = hours.map(h => {
        const c = onhandData.timeline && onhandData.timeline[h] ? onhandData.timeline[h] : 0;
        const pct = Math.min(100, Math.round((c / 50) * 100)); // MAX50名を最大に想定
        const color = pct > 80 ? '#ef4444' : pct > 40 ? '#f97316' : '#4ade80';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                    <div style="font-size:10px;color:var(--text-sub);margin-bottom:4px;font-weight:600;">${c}</div>
                    <div style="width:100%;max-width:24px;background:rgba(255,255,255,0.05);height:60px;position:relative;border-radius:3px;overflow:hidden;">
                        <div style="position:absolute;bottom:0;width:100%;height:${Math.max(2, pct)}%;background:${color};transition:height 0.5s ease;"></div>
                    </div>
                    <div style="font-size:9px;color:var(--text-dim);margin-top:4px;">${h}</div>
                </div>`;
    }).join('');

    container.innerHTML = `
        <div style="width:100%;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;border:1px solid rgba(212,168,67,0.3);">
                    <div style="font-size:11px;color:var(--text-dim);">現在の総予約数</div>
                    <div style="font-size:28px;font-weight:800;color:var(--gold);">${totalPax}<span style="font-size:14px;color:var(--text-dim);">名</span></div>
                    <div style="font-size:10px;color:var(--green);margin-top:4px;">※API自動収集</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">予約組数</div>
                    <div style="font-size:24px;font-weight:800;color:var(--text-main);">${groups}<span style="font-size:14px;color:var(--text-dim);">組</span></div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">推計オンハンド売上</div>
                    <div style="font-size:24px;font-weight:800;color:var(--text-main);">¥${estSales}K</div>
                </div>
                <div style="background:var(--surface);padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-dim);">フリー残席目安</div>
                    <div style="font-size:24px;font-weight:800;color:var(--text-dim);">-<span style="font-size:14px;color:var(--text-dim);">%</span></div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">※未算定</div>
                </div>
            </div>

            <!-- 予約タイムライン -->
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">時間帯別 予約人数</div>
            <div style="display:flex;gap:4px;align-items:flex-end;height:100px;background:rgba(255,255,255,0.02);padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                ${timelineHtml}
            </div>
            
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                <button class="btn btn-gold" style="font-size:10px;padding:6px 12px;" onclick="window.open('https://www.tablecheck.com/', '_blank')">
                    TableCheck 詳細を開く ↗️
                </button>
            </div>
        </div>
    `;
}
