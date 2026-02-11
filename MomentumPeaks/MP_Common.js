/**
 * ============================================================
 * MOMENTUM PEAKS — 共通モジュール (MP_Common.js)
 * ============================================================
 * SVD-OS | SAPPORO VIEWTIFUL DINING
 * 
 * 4拠点共通のMP計算エンジン、定指数データ、API通信ロジック
 * ============================================================
 */

// ========== GAS API URL ==========
// ★デプロイ後にここにURLを設定★
const MP_API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

// ========== 曜日指数マップ ==========
// 日=4, 月=2, 火=2, 水=2, 木=3, 金=4, 土=5
const DAY_INDEX_MAP = [4, 2, 2, 2, 3, 4, 5]; // 0=日, 1=月, ... 6=土
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// ========== 天気オプション ==========
const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪'];

// ========== 4拠点の定指数データ (Excelから抽出) ==========
const BASE_INDICES = {
    MOIWAYAMA: {
        id: 'MOIWAYAMA',
        name: '藻岩山',
        visitorSource: 'もいわ山ケーブルカー輸送人員',
        uniqueFeature: 'nightView', // 夜景ポイント
        channels: [
            { id: 'JW', name: 'THE JEWELS', segments: ['LUNCH', 'DINNER'] },
            { id: 'JW_TO', name: 'JW TakeOut', segments: ['ALL'] }
        ],
        monthly: {
            4: { seasonal: 1, weekday: 3.27, visitor: 3.89, total: 2.72, events_pos: '春・GW', events_neg: '運休' },
            5: { seasonal: 4, weekday: 3.48, visitor: 5.00, total: 4.16, events_pos: '春・GW・もいわ山の日', events_neg: 'GW明け反動' },
            6: { seasonal: 4, weekday: 3.07, visitor: 3.52, total: 3.53, events_pos: '初夏・新緑・気温上昇', events_neg: '' },
            7: { seasonal: 5, weekday: 3.23, visitor: 5.00, total: 4.41, events_pos: '夏・ビアガーデン・花火大会', events_neg: '' },
            8: { seasonal: 5, weekday: 3.42, visitor: 5.00, total: 4.47, events_pos: '夏休み・北海道マラソン', events_neg: '' },
            9: { seasonal: 4, weekday: 3.43, visitor: 4.48, total: 3.97, events_pos: 'オータムフェスト', events_neg: '' },
            10: { seasonal: 4, weekday: 3.29, visitor: 3.90, total: 3.73, events_pos: '秋・紅葉', events_neg: '' },
            11: { seasonal: 3, weekday: 3.37, visitor: 3.52, total: 3.30, events_pos: 'ホワイトイルミネーション', events_neg: '端境期' },
            12: { seasonal: 5, weekday: 3.53, visitor: 5.00, total: 4.51, events_pos: 'クリスマス・イルミネーション', events_neg: '冬の出控え' },
            1: { seasonal: 2, weekday: 3.20, visitor: 2.53, total: 2.58, events_pos: 'お正月', events_neg: '正月明け反動・冬の出控え' },
            2: { seasonal: 3, weekday: 3.36, visitor: 4.37, total: 3.57, events_pos: '雪まつり', events_neg: '冬の出控え' },
            3: { seasonal: 3, weekday: 3.03, visitor: 3.50, total: 3.18, events_pos: '春・雪解け', events_neg: '' }
        }
    },
    OKURAYAMA: {
        id: 'OKURAYAMA',
        name: '大倉山',
        visitorSource: '大倉山来場者数',
        uniqueFeature: null,
        channels: [
            { id: 'NP', name: 'NOUVELLE POUSSE OKURAYAMA', segments: ['LUNCH', 'DINNER'] },
            { id: 'CE', name: 'CELESTÉ', segments: ['ALL'] },
            { id: 'RP', name: 'PEPOS', segments: ['ALL'] }
        ],
        monthly: {
            4: { seasonal: 1, weekday: 3.27, visitor: 1.70, total: 1.99, events_pos: '春・GW', events_neg: '運休' },
            5: { seasonal: 3, weekday: 3.48, visitor: 3.09, total: 3.19, events_pos: '春・GW・飛ぶ日', events_neg: 'GW明け反動' },
            6: { seasonal: 4, weekday: 3.07, visitor: 2.48, total: 3.18, events_pos: '初夏・新緑', events_neg: '' },
            7: { seasonal: 5, weekday: 3.23, visitor: 3.89, total: 4.04, events_pos: '夏・ジャンプ大会', events_neg: '' },
            8: { seasonal: 5, weekday: 3.42, visitor: 3.93, total: 4.12, events_pos: '夏休み', events_neg: '' },
            9: { seasonal: 5, weekday: 3.43, visitor: 3.64, total: 4.02, events_pos: 'オータムフェスト', events_neg: '' },
            10: { seasonal: 5, weekday: 3.29, visitor: 4.29, total: 4.19, events_pos: '秋・紅葉', events_neg: '' },
            11: { seasonal: 3, weekday: 3.37, visitor: 2.90, total: 3.09, events_pos: 'ホワイトイルミネーション', events_neg: '端境期' },
            12: { seasonal: 3, weekday: 3.53, visitor: 2.73, total: 3.09, events_pos: 'クリスマス', events_neg: '冬の出控え' },
            1: { seasonal: 3, weekday: 3.20, visitor: 3.91, total: 3.37, events_pos: 'お正月・ジャンプ大会', events_neg: '冬の出控え' },
            2: { seasonal: 5, weekday: 3.36, visitor: 5.00, total: 4.45, events_pos: '雪まつり・ジャンプ大会', events_neg: '冬の出控え' },
            3: { seasonal: 4, weekday: 3.03, visitor: 3.92, total: 3.65, events_pos: '春・雪解け', events_neg: '' }
        }
    },
    TV_TOWER: {
        id: 'TV_TOWER',
        name: 'さっぽろテレビ塔',
        visitorSource: 'テレビ塔展望台入場者数',
        uniqueFeature: 'beerGarden', // ビアガーデン時間帯別
        channels: [
            { id: 'GA', name: 'THE GARDEN SAPPORO', segments: ['LUNCH', 'DINNER'] },
            { id: 'GA_WINE', name: 'GA WINEBAR', segments: ['NIGHT'] },
            { id: 'GA_BQ', name: 'GA BANQUET', segments: ['EVENT'] },
            { id: 'BG', name: 'BEER GARDEN', segments: ['SUMMER'] }
        ],
        monthly: {
            4: { seasonal: 2, weekday: 3.27, visitor: 2.59, total: 2.62, events_pos: '春・GW', events_neg: '' },
            5: { seasonal: 4, weekday: 3.48, visitor: 3.19, total: 3.56, events_pos: '春・GW', events_neg: 'GW明け反動' },
            6: { seasonal: 4, weekday: 3.07, visitor: 3.67, total: 3.58, events_pos: '初夏・ライラック・よさこい', events_neg: '' },
            7: { seasonal: 5, weekday: 3.23, visitor: 5.00, total: 4.41, events_pos: '夏・ビアガーデン・花火', events_neg: '' },
            8: { seasonal: 5, weekday: 3.42, visitor: 5.00, total: 4.47, events_pos: '夏休み・マラソン・すすきの祭り', events_neg: '' },
            9: { seasonal: 4, weekday: 3.43, visitor: 4.58, total: 4.01, events_pos: 'オータムフェスト', events_neg: '' },
            10: { seasonal: 4, weekday: 3.29, visitor: 4.29, total: 3.86, events_pos: '秋・紅葉', events_neg: '' },
            11: { seasonal: 3, weekday: 3.37, visitor: 3.90, total: 3.42, events_pos: 'ホワイトイルミネーション', events_neg: '端境期' },
            12: { seasonal: 5, weekday: 3.53, visitor: 5.00, total: 4.51, events_pos: 'クリスマス・イルミネーション', events_neg: '冬の出控え' },
            1: { seasonal: 3, weekday: 3.20, visitor: 3.91, total: 3.37, events_pos: 'お正月', events_neg: '正月明け反動・冬の出控え' },
            2: { seasonal: 5, weekday: 3.36, visitor: 5.00, total: 4.45, events_pos: '雪まつり', events_neg: '冬の出控え' },
            3: { seasonal: 4, weekday: 3.03, visitor: 4.93, total: 3.99, events_pos: '春・雪解け', events_neg: '' }
        }
    },
    AKARENGA: {
        id: 'AKARENGA',
        name: '赤れんがテラス',
        visitorSource: '赤れんが（理論整理中）',
        uniqueFeature: null,
        channels: [
            { id: 'BQ', name: 'LA BRIQUE SAPPORO', segments: ['LUNCH', 'DINNER'] },
            { id: 'RYB', name: 'ルスツ羊蹄ぶた', segments: ['LUNCH', 'DINNER'] }
        ],
        // 赤れんがはテレビ塔と同一データ（Excel記載通り、理論整理中）
        monthly: {
            4: { seasonal: 2, weekday: 3.27, visitor: 2.59, total: 2.62, events_pos: '春・GW', events_neg: '' },
            5: { seasonal: 4, weekday: 3.48, visitor: 3.19, total: 3.56, events_pos: '春・GW', events_neg: 'GW明け反動' },
            6: { seasonal: 4, weekday: 3.07, visitor: 3.67, total: 3.58, events_pos: '初夏・ライラック・よさこい', events_neg: '' },
            7: { seasonal: 5, weekday: 3.23, visitor: 5.00, total: 4.41, events_pos: '夏・ビアガーデン', events_neg: '' },
            8: { seasonal: 5, weekday: 3.42, visitor: 5.00, total: 4.47, events_pos: '夏休み', events_neg: '' },
            9: { seasonal: 4, weekday: 3.43, visitor: 4.58, total: 4.01, events_pos: 'オータムフェスト', events_neg: '' },
            10: { seasonal: 4, weekday: 3.29, visitor: 4.29, total: 3.86, events_pos: '秋・紅葉', events_neg: '' },
            11: { seasonal: 3, weekday: 3.37, visitor: 3.90, total: 3.42, events_pos: 'ホワイトイルミネーション', events_neg: '端境期' },
            12: { seasonal: 5, weekday: 3.53, visitor: 5.00, total: 4.51, events_pos: 'クリスマス・イルミネーション', events_neg: '冬の出控え' },
            1: { seasonal: 3, weekday: 3.20, visitor: 3.91, total: 3.37, events_pos: 'お正月', events_neg: '正月明け反動' },
            2: { seasonal: 5, weekday: 3.36, visitor: 5.00, total: 4.45, events_pos: '雪まつり', events_neg: '冬の出控え' },
            3: { seasonal: 4, weekday: 3.03, visitor: 4.93, total: 3.99, events_pos: '春・雪解け', events_neg: '' }
        }
    }
};


// ========== MP 計算エンジン ==========

/**
 * 指定日のMP Daily Scoreを計算
 * @param {string} baseId - 拠点ID (MOIWAYAMA, OKURAYAMA, TV_TOWER, AKARENGA)
 * @param {string} dateStr - 日付 (YYYY-MM-DD)
 * @returns {object} MP計算結果
 */
function calculateMP(baseId, dateStr) {
    const base = BASE_INDICES[baseId];
    if (!base) return null;

    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay(); // 0=日, 1=月 ... 6=土
    const dayIndex = DAY_INDEX_MAP[dayOfWeek];
    const dayLabel = DAY_LABELS[dayOfWeek];

    const monthData = base.monthly[month];
    if (!monthData) return null;

    // KF1: 拠点定指数 = (①季節 + ②曜日 + ③来場者) / 3
    const seasonalIndex = monthData.seasonal;
    const weekdayIndex = dayIndex; // 当日の曜日指数
    const visitorIndex = monthData.visitor;

    const kf1 = (seasonalIndex + weekdayIndex + visitorIndex) / 3;

    return {
        date: dateStr,
        dayOfWeek: dayLabel,
        dayIndex: dayIndex,
        month: month,
        baseId: baseId,
        baseName: base.name,
        // 3要素
        seasonalIndex: seasonalIndex,
        weekdayIndex: weekdayIndex,
        visitorIndex: visitorIndex,
        monthlyWeekdayAvg: monthData.weekday,
        // 拠点定指数
        kf1: Math.round(kf1 * 100) / 100,
        totalMonthly: monthData.total,
        // イベント情報
        events_pos: monthData.events_pos,
        events_neg: monthData.events_neg,
        // レベル判定
        level: getMPLevel(kf1),
        levelLabel: getMPLevelLabel(kf1)
    };
}

/**
 * MPレベル判定
 */
function getMPLevel(score) {
    if (score >= 4.0) return 5;
    if (score >= 3.5) return 4;
    if (score >= 3.0) return 3;
    if (score >= 2.5) return 2;
    return 1;
}

function getMPLevelLabel(score) {
    if (score >= 4.0) return '🔥 PEAK — 刈り取り戦';
    if (score >= 3.5) return '📈 HIGH — 攻めの日';
    if (score >= 3.0) return '⚡ MID — バランス勝負';
    if (score >= 2.5) return '🌱 LOW — 創造戦';
    return '❄️ CALM — 種まきの日';
}

/**
 * MP スコアのカラー取得
 */
function getMPColor(score) {
    if (score >= 4.0) return '#ff6b35';
    if (score >= 3.5) return '#d4af37';
    if (score >= 3.0) return '#4a90d9';
    if (score >= 2.5) return '#4ade80';
    return '#a0a0b0';
}

/**
 * 年度計算 (4月始まり)
 */
function getFiscalYear(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fy = month >= 4 ? year : year - 1;
    return 'R' + (fy - 2018);
}

/**
 * セグメント表示名
 */
function getSegmentLabel(seg) {
    const labels = {
        'LUNCH': 'ランチ',
        'DINNER': 'ディナー',
        'ALL': '終日',
        'NIGHT': 'ナイト',
        'EVENT': '宴会',
        'SUMMER': 'ビアガーデン'
    };
    return labels[seg] || seg;
}

// ========== API通信 ==========

/**
 * GASにデータを送信
 */
async function submitToGAS(data) {
    if (MP_API_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
        console.log('📊 [デモモード] 送信データ:', JSON.stringify(data, null, 2));
        return { success: true, demo: true };
    }

    try {
        const response = await fetch(MP_API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.toString() };
    }
}

// ========== UI ヘルパー ==========

/**
 * MP結果をHTML表示用に生成
 */
function renderMPResult(mpResult) {
    if (!mpResult) return '';

    const color = getMPColor(mpResult.kf1);

    return `
        <div class="mp-result" style="border-left: 4px solid ${color};">
            <div class="mp-score-row">
                <div class="mp-score-main">
                    <span class="mp-score-value" style="color: ${color};">${mpResult.kf1.toFixed(2)}</span>
                    <span class="mp-score-max">/ 5.00</span>
                </div>
                <div class="mp-level-badge" style="background: ${color}20; color: ${color};">
                    ${mpResult.levelLabel}
                </div>
            </div>
            <div class="mp-breakdown">
                <div class="mp-factor">
                    <span class="mp-factor-label">①季節</span>
                    <span class="mp-factor-value">${mpResult.seasonalIndex}</span>
                </div>
                <div class="mp-factor-op">+</div>
                <div class="mp-factor">
                    <span class="mp-factor-label">②曜日(${mpResult.dayOfWeek})</span>
                    <span class="mp-factor-value">${mpResult.weekdayIndex}</span>
                </div>
                <div class="mp-factor-op">+</div>
                <div class="mp-factor">
                    <span class="mp-factor-label">③来場者</span>
                    <span class="mp-factor-value">${mpResult.visitorIndex.toFixed(1)}</span>
                </div>
                <div class="mp-factor-op">÷ 3</div>
            </div>
            ${mpResult.events_pos ? `<div class="mp-events"><span class="mp-event-pos">📈 ${mpResult.events_pos}</span></div>` : ''}
            ${mpResult.events_neg ? `<div class="mp-events"><span class="mp-event-neg">📉 ${mpResult.events_neg}</span></div>` : ''}
        </div>
    `;
}

/**
 * チャンネル入力フォームHTMLを生成（通常版）
 */
function renderChannelInputs(channel) {
    let html = '';
    channel.segments.forEach(seg => {
        const segLabel = getSegmentLabel(seg);
        html += `
            <div class="segment-entry" data-channel="${channel.id}" data-segment="${seg}">
                <h4>${segLabel}</h4>
                <div class="grid-2">
                    <div class="form-group">
                        <label>売上（円）</label>
                        <input type="number" class="sales-input" placeholder="0" inputmode="numeric">
                    </div>
                    <div class="form-group">
                        <label>客数（人）</label>
                        <input type="number" class="visitors-input" placeholder="0" inputmode="numeric">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>天気</label>
                        <select class="weather-input">
                            ${WEATHER_OPTIONS.map(w => `<option value="${w}">${w}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>気温（℃）</label>
                        <input type="number" class="temp-input" placeholder="20" inputmode="decimal">
                    </div>
                </div>
            </div>
        `;
    });
    return html;
}

/**
 * ビアガーデン専用入力フォームHTMLを生成
 */
function renderBeerGardenInputs(channel) {
    return `
        <div class="segment-entry" data-channel="${channel.id}" data-segment="SUMMER" data-is-beergarden="true">
            <h4>🍺 ビアガーデン</h4>
            <div class="grid-2">
                <div class="form-group">
                    <label>売上（円）</label>
                    <input type="number" class="sales-input" placeholder="0" inputmode="numeric">
                </div>
                <div class="form-group">
                    <label>客数（人）</label>
                    <input type="number" class="visitors-input" placeholder="0" inputmode="numeric">
                </div>
            </div>
            <div class="bg-timeblock" style="background: rgba(74,144,217,0.08);">
                <label class="bg-time-label">⏰ 12:00</label>
                <div class="grid-2">
                    <div class="form-group">
                        <label>天気</label>
                        <select class="weather-12">
                            ${WEATHER_OPTIONS.map(w => `<option value="${w}">${w}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>気温（℃）</label>
                        <input type="number" class="temp-12" placeholder="25" inputmode="decimal">
                    </div>
                </div>
            </div>
            <div class="bg-timeblock" style="background: rgba(74,144,217,0.12);">
                <label class="bg-time-label">⏰ 15:00</label>
                <div class="grid-2">
                    <div class="form-group">
                        <label>天気</label>
                        <select class="weather-15">
                            ${WEATHER_OPTIONS.map(w => `<option value="${w}">${w}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>気温（℃）</label>
                        <input type="number" class="temp-15" placeholder="28" inputmode="decimal">
                    </div>
                </div>
            </div>
            <div class="bg-timeblock" style="background: rgba(74,144,217,0.16);">
                <label class="bg-time-label">⏰ 18:00</label>
                <div class="grid-2">
                    <div class="form-group">
                        <label>天気</label>
                        <select class="weather-18">
                            ${WEATHER_OPTIONS.map(w => `<option value="${w}">${w}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>気温（℃）</label>
                        <input type="number" class="temp-18" placeholder="24" inputmode="decimal">
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 全セグメントからデータを収集
 */
function collectFormData(baseId, dateStr) {
    const base = BASE_INDICES[baseId];
    if (!base) return null;

    const mpResult = calculateMP(baseId, dateStr);

    const data = {
        date: dateStr,
        baseId: baseId,
        baseName: base.name,
        baseVisitors: parseInt(document.getElementById('baseVisitors')?.value) || 0,
        mpScore: mpResult ? mpResult.kf1 : null,
        mpLevel: mpResult ? mpResult.levelLabel : null,
        fiscalYear: getFiscalYear(dateStr),
        entries: []
    };

    // 藻岩山: 夜景ポイント
    if (base.uniqueFeature === 'nightView') {
        data.nightViewPoints = parseInt(document.getElementById('nightViewPoints')?.value) || 0;
    }

    // 各セグメントからデータを収集
    document.querySelectorAll('.segment-entry').forEach(entry => {
        const channelId = entry.dataset.channel;
        const segment = entry.dataset.segment;
        const channel = base.channels.find(c => c.id === channelId);
        const isBeerGarden = entry.dataset.isBeergarden === 'true';

        if (isBeerGarden) {
            data.entries.push({
                channelId,
                channelName: channel ? channel.name : channelId,
                segment,
                sales: parseInt(entry.querySelector('.sales-input')?.value) || 0,
                visitors: parseInt(entry.querySelector('.visitors-input')?.value) || 0,
                isBeerGarden: true,
                weather12: entry.querySelector('.weather-12')?.value || '',
                temp12: parseInt(entry.querySelector('.temp-12')?.value) || null,
                weather15: entry.querySelector('.weather-15')?.value || '',
                temp15: parseInt(entry.querySelector('.temp-15')?.value) || null,
                weather18: entry.querySelector('.weather-18')?.value || '',
                temp18: parseInt(entry.querySelector('.temp-18')?.value) || null
            });
        } else {
            data.entries.push({
                channelId,
                channelName: channel ? channel.name : channelId,
                segment,
                sales: parseInt(entry.querySelector('.sales-input')?.value) || 0,
                visitors: parseInt(entry.querySelector('.visitors-input')?.value) || 0,
                weather: entry.querySelector('.weather-input')?.value || '',
                temperature: parseInt(entry.querySelector('.temp-input')?.value) || null
            });
        }
    });

    return data;
}
