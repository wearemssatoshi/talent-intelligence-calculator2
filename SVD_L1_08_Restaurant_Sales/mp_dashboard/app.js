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
let displayTaxExc = true;  // true=税抜表示, false=税込表示

// ── Tax Display Helper ──
function txv(v) { return displayTaxExc ? Math.round(v / 1.1) : Math.round(v); }
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

// ── Sekki Engine (client-side for forecast) ──
const SEKKI_BOUNDARIES = {
    2023: [[1, 5], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 24], [11, 8], [11, 22], [12, 7], [12, 22]],
    2024: [[1, 6], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 19], [5, 5], [5, 20], [6, 5], [6, 21], [7, 6], [7, 22], [8, 7], [8, 22], [9, 7], [9, 22], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]],
    2025: [[1, 5], [1, 20], [2, 3], [2, 18], [3, 5], [3, 20], [4, 4], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
    2026: [[1, 5], [1, 20], [2, 4], [2, 18], [3, 5], [3, 20], [4, 5], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
};
const SEKKI_NAMES = ['小寒', '大寒', '立春', '雨水', '啓蟄', '春分', '清明', '穀雨', '立夏', '小満', '芒種', '夏至', '小暑', '大暑', '立秋', '処暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_IDX = { '日': 4, '月': 2, '火': 2, '水': 2, '木': 3, '金': 4, '土': 5 };

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
function fmt$(v) { return v ? '¥' + v.toLocaleString() : '—'; }
function fmtK$(v) { return v >= 1000000 ? '¥' + (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? '¥' + Math.round(v / 1000) + 'K' : '¥' + v; }
function mpColor(v) {
    if (v >= 4.5) return '#ef4444';
    if (v >= 4.0) return '#f97316';
    if (v >= 3.5) return '#eab308';
    if (v >= 3.0) return '#4ade80';
    if (v >= 2.5) return '#60a5fa';
    if (v >= 2.0) return '#a78bfa';
    return '#6b7280';
}
function seasonClass(s) { return 'season-' + (s || '').split(' ')[0]; }
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function rankBadge(rank, size) {
    const sz = size || 'normal'; // 'normal' | 'small'
    const bg = sekkiWeatherColor(rank);
    const fs = sz === 'small' ? '9px' : '11px';
    const pad = sz === 'small' ? '2px 6px' : '3px 8px';
    return `<span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:${fs};font-weight:700;letter-spacing:1px;padding:${pad};border-radius:3px;background:${bg};color:#fff">24LV/${ordinal(rank)}</span>`;
}
// MPスコアベースのバッジ（日別レベル色）
function mpBadge(mpPoint, size) {
    const sz = size || 'normal';
    const level = mpScoreLevel(mpPoint);
    const bg = mpScoreColor(mpPoint);
    const fs = sz === 'small' ? '9px' : '11px';
    const pad = sz === 'small' ? '2px 6px' : '3px 8px';
    return `<span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:${fs};font-weight:700;letter-spacing:1px;padding:${pad};border-radius:3px;background:${bg};color:#fff">MP ${mpPoint.toFixed(2)}</span>`;
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

// ── Forecast Engine (同節気×同曜日マッチング) ──

/**
 * forecastForDate — 過去同節気×同曜日の実績平均から予測を算出
 * @param {string} storeId - 店舗ID (e.g. 'JW')
 * @param {string} dateStr - 予測対象日 (e.g. '2026-03-15')
 * @returns {Object} { predicted_sales, predicted_count, channels, matches, matchCount, sekki, weekday }
 */
function forecastForDate(storeId, dateStr) {
    const records = DATA.stores[storeId] || [];
    const targetSekki = getSekki(dateStr);
    const targetWeekday = WEEKDAY_JA[new Date(dateStr).getDay()];

    // 過去同節気×同曜日、actual_sales > 0 のレコードを抽出
    const matches = records.filter(r =>
        r.sekki === targetSekki &&
        r.weekday === targetWeekday &&
        r.actual_sales > 0 &&
        r.date < dateStr // 未来データは除外
    );

    if (matches.length === 0) {
        return {
            predicted_sales: 0,
            predicted_count: 0,
            channels: {},
            matches: [],
            matchCount: 0,
            sekki: targetSekki,
            weekday: targetWeekday
        };
    }

    // 均等平均
    const totalSales = matches.reduce((s, r) => s + r.actual_sales, 0);
    const totalCount = matches.reduce((s, r) => s + r.actual_count, 0);
    const n = matches.length;

    // チャネル別予測（各チャネルの平均を個別に計算 — F/B含む）
    const channelAgg = {};
    matches.forEach(r => {
        if (!r.channels) return;
        Object.entries(r.channels).forEach(([ch, data]) => {
            if (!channelAgg[ch]) channelAgg[ch] = { sales: 0, count: 0, food: 0, drink: 0, n: 0 };
            channelAgg[ch].sales += data.sales || 0;
            channelAgg[ch].count += data.count || 0;
            channelAgg[ch].food += data.food || 0;
            channelAgg[ch].drink += data.drink || 0;
            channelAgg[ch].n++;
        });
    });
    const channels = {};
    Object.entries(channelAgg).forEach(([ch, data]) => {
        channels[ch] = {
            sales: Math.round(data.sales / data.n),
            count: Math.round(data.count / data.n),
            food: Math.round(data.food / data.n),
            drink: Math.round(data.drink / data.n)
        };
    });

    // ── 席料: 直近3ヶ月の日営業日平均（トレンド反映） ──
    const seatFeeChannels = ['席料'];
    seatFeeChannels.forEach(sfCh => {
        if (channels[sfCh]) {
            // 直近90日間の実績から日平均を算出
            const cutoff = new Date(dateStr);
            cutoff.setDate(cutoff.getDate() - 90);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            let sfTotal = 0, sfDays = 0;
            records.forEach(r => {
                if (r.date >= cutoffStr && r.date < dateStr && r.channels && r.channels[sfCh]) {
                    const val = r.channels[sfCh].sales || 0;
                    if (val > 0) {
                        sfTotal += val;
                        sfDays++;
                    }
                }
            });
            if (sfDays > 0) {
                channels[sfCh].sales = Math.round(sfTotal / sfDays);
            }
        }
    });

    return {
        predicted_sales: Math.round(totalSales / n),
        predicted_count: Math.round(totalCount / n),
        channels,
        matches: matches.map(r => ({
            date: r.date,
            weekday: r.weekday,
            sekki: r.sekki,
            sales: r.actual_sales,
            count: r.actual_count,
            channels: r.channels
        })),
        matchCount: n,
        sekki: targetSekki,
        weekday: targetWeekday
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

    // Load default data
    document.getElementById('btn-load-default').addEventListener('click', loadDefaultJSON);

    // Save / Clear localStorage
    document.getElementById('btn-save-local').addEventListener('click', () => {
        alert('ℹ️ データは常にサーバーから最新を読み込みます');
    });
    document.getElementById('btn-clear-local').addEventListener('click', () => {
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

function loadDefaultJSON() {
    // Step 1: Always load mp_data.json as base (contains config, meta, MP scores)
    fetch('mp_data.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => {
            if (!r.ok) throw new Error('mp_data.json not found');
            return r.json();
        })
        .then(baseData => {
            DATA = baseData;
            // Step 2: If GAS is configured, overlay live actuals from Spreadsheet
            if (typeof GAS_BRIDGE !== 'undefined' && GAS_BRIDGE.getUrl()) {
                mergeGASData(baseData);
            } else {
                onDataLoaded();
            }
        })
        .catch(err => {
            console.warn('Default JSON load failed:', err);
            updateImportStatus('main', null);
        });
}

async function mergeGASData(baseData) {
    try {
        console.log('[GAS] Loading live actuals from Spreadsheet...');
        const gasResult = await GAS_BRIDGE.loadAll();
        if (gasResult && gasResult.stores) {
            let mergedCount = 0;
            // Merge GAS actuals into base data
            for (const [storeId, gasRecords] of Object.entries(gasResult.stores)) {
                if (!baseData.stores[storeId]) continue;
                const baseRecords = baseData.stores[storeId];
                const baseMap = {};
                baseRecords.forEach((r, idx) => { baseMap[r.date] = idx; });

                gasRecords.forEach(gasRec => {
                    const idx = baseMap[gasRec.date];
                    if (idx !== undefined) {
                        // Overlay GAS actuals onto base record (preserve MP scores)
                        const base = baseRecords[idx];
                        if (gasRec.actual_sales) base.actual_sales = gasRec.actual_sales;
                        if (gasRec.actual_count) base.actual_count = gasRec.actual_count;
                        if (gasRec.channels) base.channels = gasRec.channels;
                        if (gasRec.labor) base.labor = gasRec.labor;
                        if (gasRec.ropeway) base.ropeway = gasRec.ropeway;
                        mergedCount++;
                    } else {
                        // New day from GAS not in base — add it
                        baseRecords.push(gasRec);
                        mergedCount++;
                    }
                });
            }
            console.log(`[GAS] ✅ Merged ${mergedCount} records from Spreadsheet`);
            GAS_BRIDGE.showToast(`☁️ ${mergedCount}件のライブデータを同期`);
        }
    } catch (e) {
        console.warn('[GAS] Live merge failed, using local JSON only:', e);
    }
    onDataLoaded();
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
        case 'import': break;
        case 'staffing': renderStaffing(); break;
        case 'report': initReportTab(); break;
    }
}

// ═══════════════════════════════════════
// ── Base Filter helpers ──
function getStoresForBase(baseId) {
    if (!DATA || baseId === 'ALL') return DATA.meta.stores;
    const base = DATA.config.bases.find(b => b.id === baseId);
    return base ? base.stores.map(s => s.id) : DATA.meta.stores;
}

function renderBaseFilter() {
    const bases = DATA.config.bases;
    let html = `<button class="base-btn ${selectedBase === 'ALL' ? 'active' : ''}" onclick="setBase('ALL')">ALL — SVD統合</button>`;
    bases.forEach(b => {
        const storeCount = b.stores.length;
        html += `<button class="base-btn ${selectedBase === b.id ? 'active' : ''}" onclick="setBase('${b.id}')">${b.name}（${storeCount}店）</button>`;
    });
    document.getElementById('base-filter').innerHTML = html;
}

function setBase(baseId) {
    selectedBase = baseId;
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

// ① COMMAND CENTER
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
        const isActive = d && d.actual_sales > 0;

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
            if (rec && rec.actual_sales > 0) {
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
            ? (totalActual > 0
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
            const pct = totalActual > 0 ? (totalActual / todayForecast * 100) : 0;
            forecastRow = `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:6px;">
                    <span style="color:#60a5fa;font-size:12px;">MP予測</span>
                    <span class="mono" style="color:#60a5fa;font-size:14px;">${fmt$(fcDisp)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:0 0 8px;">
                    <span style="color:#888;font-size:12px;">達成率</span>
                    <span class="mono ${pct >= 100 ? 'text-green' : pct > 0 ? 'text-red' : ''}" style="font-size:14px;">${pct > 0 ? pct.toFixed(1) + '%' : '—'}</span>
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
            ${chRows || '<div style="color:#555;font-size:12px;">—</div>'}
        </div>`;
    }

    // If today has no actual data, overlay forecast into the todayData for display
    if (todayData.total === 0 && totalForecast > 0) {
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
                ${buildColumn('本日', '📍', todayData, y1Data.total, true, 'today')}
                ${buildColumn('前年同日', '📅', y1Data, todayData.total, false, 'y1')}
                ${buildColumn('前々年同日', '📆', y2Data, todayData.total, false, 'y2')}
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
                ${d ? `<div class="mp-meter">${meterBars(d.mp_point)}</div>
                <div class="mp-value mono">${d.mp_point.toFixed(2)}</div>
                <div class="mp-season">${mpBadge(d.mp_point, 'small')}</div>` : ''}
                <div class="store-sales mono">${isActive ? fmt$(actualDisp2) : '休業'} <span style="font-size:0.7em">(${txLabel()})</span></div>
                <div class="store-forecast" style="font-size:11px;color:var(--text-dim);">
                    予測(${txLabel()}): ${fcSales > 0 ? fmt$(fcDisp2) : '—'}
                    ${fcSales > 0 && isActive ? ` (${storePct.toFixed(0)}%)` : ''}
                </div>
            </div>
            ${rationaleHtml}
        </div>`;
    }).join('');

    // --- Sales Registration Form ---
    renderSalesForm(filteredStores, dateStr);

    // Monthly Summary
    renderMonthlySummary();
}

// ── Store Form Configuration ──
const STORE_FORMS = {
    'JW': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: 'TAKEOUT', type: 'section', title: '📦 TAKEOUT', fields: ['count', 'food', 'drink'] },
        {
            id: 'MISC', type: 'group', title: '📋 その他', items: [
                { ch: '席料', label: '席料' }, { ch: '南京錠', label: '南京錠' }, { ch: '花束', label: '花束' },
                { ch: 'wolt', label: 'Wolt' }, { ch: 'uber', label: 'Uber' }, { ch: 'カレー', label: 'カレー' }
            ]
        },
        { id: 'SP', type: 'section', title: '⚡ 内特需案件 (SP)', fields: ['count', 'sales'] },
        { id: 'LABOR', type: 'labor', title: '👥 人時生産性', fields: ['service', 'kitchen', 'backoffice'] }
    ],
    'GA': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'DINNER', type: 'section', title: '🌙 DINNER', fields: ['count', 'food', 'drink'] },
        { id: 'BANQUET', type: 'section', title: '🎉 宴会 / バンケット', fields: ['count', 'food', 'drink'] },
        { id: 'WINEBAR', type: 'simple', title: '🍷 WINE BAR', field: 'sales' },
        {
            id: 'MISC', type: 'group', title: '📋 施設・その他', items: [
                { ch: '室料', label: '室料' }, { ch: '展望台', label: '展望台チケット' },
                { ch: '席料', label: '席料' }, { ch: '花束', label: '花束' },
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
                { ch: '席料', label: '席料' }, { ch: '物販', label: '物販' }
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
                { ch: '席料', label: '席料' }, { ch: '花束', label: '花束' },
                { ch: 'wolt', label: 'Wolt' }, { ch: 'uber', label: 'Uber' }
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
        return `<button class="btn ${active}" onclick="selectedBase='${b.id}'; renderCommand();">${b.name}</button>`;
    }).join('');

    let formHtml = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${baseTabs}</div>
            <div class="control-group" style="margin-left:auto;">
                <label>入力日</label>
                <input type="date" id="sf-date" value="${dateStr}" onchange="selectedDate=this.value; renderCommand();">
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

        formHtml += `
            </div>
        </div>`;
    });

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
            <div class="text-dim" style="font-size:10px;align-self:center;">※拠点内全店舗の売上を一括でJSON保存</div>
        </div>
    `;

    document.getElementById('sales-form').innerHTML = formHtml;
    updateTaxDisplay();
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
        if (storeTotal) storeTotal.textContent = storeExc > 0 ? fmt$(storeExc) : '—';

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
    if (el) el.textContent = val > 0 ? fmt$(val) : '—';
}



function renderMonthlySummary() {
    const ym = selectedDate.slice(0, 7); // e.g. "2025-09"
    const prevYm = (() => {
        const [y, m] = ym.split('-').map(Number);
        return `${y - 1}-${String(m).padStart(2, '0')}`;
    })();

    let currentMonth = { sales: 0, count: 0, days: 0 };
    let prevMonth = { sales: 0, count: 0, days: 0 };

    const filteredStores = getStoresForBase(selectedBase);
    const actualDates = new Set(); // Track which dates have actual data

    filteredStores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            const rm = r.date.slice(0, 7);
            if (rm === ym && r.actual_sales > 0) {
                currentMonth.sales += r.actual_sales;
                currentMonth.count += r.actual_count;
                currentMonth.days++;
                actualDates.add(r.date);
            } else if (rm === prevYm && r.actual_sales > 0) {
                prevMonth.sales += r.actual_sales;
                prevMonth.count += r.actual_count;
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

    // ── Always tax-exclusive ──
    const curExc = Math.round(currentMonth.sales / 1.1);
    const prevExc = Math.round(prevMonth.sales / 1.1);
    const fcstExc = Math.round(forecastTotal / 1.1);
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

            // KF Breakdown compact
            const layerLabel = rec.layers_used === 5 ? '5層(特別日)' : '4層';
            html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                <div class="kf-card"><div class="kf-name">KF① 拠点定指数</div><div class="kf-val">${rec.kf1.toFixed(2)}</div><div class="kf-sub">月=${rec.monthly_idx} 曜=${rec.weekday_idx} 節=${rec.sekki_idx} 週=${rec.weekly_idx} 日=${rec.daily_idx || '—'} [${layerLabel}]</div></div>
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

    // Build available year-month list from all stores
    const allMonths = new Set();
    Object.values(DATA.stores).forEach(records => {
        records.forEach(r => {
            if (r.actual_sales > 0) allMonths.add(r.date.slice(0, 7));
        });
    });
    const sortedMonths = [...allMonths].sort();
    const latestMonth = sortedMonths[sortedMonths.length - 1] || new Date().toISOString().slice(0, 7);

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
                    <select id="rpt-base" onchange="refreshReport()" style="font-size:13px;padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ccc;">
                        <option value="ALL">ALL — SVD統合</option>
                        ${baseOptions}
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

    window._rptMode = 'month';
    refreshReport();
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

    // Determine stores from rpt-base selector
    const rptBase = document.getElementById('rpt-base')?.value || 'ALL';
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
    const tl = txLabel();

    // Aggregate data per store and per channel
    const storeAgg = {};
    const channelGlobal = {};
    let totalSales = 0, totalCount = 0, activeDays = 0;
    const dailyTotals = {};

    storeIds.forEach(sid => {
        const records = (DATA.stores[sid] || []).filter(r =>
            r.date >= from && r.date <= to && r.actual_sales > 0
        );

        const agg = { sales: 0, count: 0, days: records.length, channels: {} };
        records.forEach(r => {
            agg.sales += r.actual_sales;
            agg.count += r.actual_count;
            totalSales += r.actual_sales;
            totalCount += r.actual_count;

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
            r.date >= yoyFromStr && r.date <= yoyToStr && r.actual_sales > 0
        ).forEach(r => { yoySales += r.actual_sales; yoyCount += r.actual_count; });
    });

    const yoyPct = yoySales > 0 ? (totalSales / yoySales * 100) : 0;
    const yoyCountPct = yoyCount > 0 ? (totalCount / yoyCount * 100) : 0;
    const avgDaily = activeDays > 0 ? Math.round(totalSales / activeDays) : 0;
    const avgPerCustomer = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

    // ── Build Report HTML ──
    let html = '';

    // Summary Cards
    html += `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
            <div class="svd-stat" style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:10px;padding:14px;">
                <div class="stat-value mono text-gold" style="font-size:22px;">${fmt$(txv(totalSales))}</div>
                <div class="stat-label">期間売上合計(${tl})</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${totalCount.toLocaleString()}名</div>
                <div class="stat-label">来客数合計</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${fmt$(txv(avgPerCustomer))}</div>
                <div class="stat-label">平均客単価(${tl})</div>
            </div>
            <div class="svd-stat" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">
                <div class="stat-value mono" style="font-size:22px;">${fmt$(txv(avgDaily))}</div>
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
        const avg = a.count > 0 ? Math.round(a.sales / a.count) : 0;
        const dayAvg = a.days > 0 ? Math.round(a.sales / a.days) : 0;

        // Store YoY
        let syoySales = 0;
        (DATA.stores[sid] || []).filter(r =>
            r.date >= yoyFromStr && r.date <= yoyToStr && r.actual_sales > 0
        ).forEach(r => { syoySales += r.actual_sales; });
        const syoyPct = syoySales > 0 ? (a.sales / syoySales * 100) : 0;

        html += `<tr>
            <td><strong>${sid}</strong> <span style="color:var(--text-dim);font-size:11px;">${getStoreName(sid)}</span></td>
            <td class="num mono">${fmt$(txv(a.sales))}</td>
            <td class="num mono">${pct.toFixed(1)}%</td>
            <td class="num mono">${a.count.toLocaleString()}</td>
            <td class="num mono">${fmt$(txv(avg))}</td>
            <td class="num mono">${a.days}</td>
            <td class="num mono">${fmt$(txv(dayAvg))}</td>
            <td class="num mono ${syoyPct >= 100 ? 'text-green' : syoyPct > 0 ? 'text-red' : ''}">${syoyPct > 0 ? syoyPct.toFixed(1) + '%' : '—'}</td>
        </tr>`;
    });

    html += `<tr style="border-top:2px solid var(--gold);font-weight:700;">
        <td>合計</td>
        <td class="num mono text-gold">${fmt$(txv(totalSales))}</td>
        <td class="num">100%</td>
        <td class="num mono">${totalCount.toLocaleString()}</td>
        <td class="num mono">${fmt$(txv(avgPerCustomer))}</td>
        <td class="num mono">${activeDays}</td>
        <td class="num mono">${fmt$(txv(avgDaily))}</td>
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
            r.date >= from && r.date <= to && r.actual_sales > 0
        ).forEach(r => {
            const m = r.date.slice(0, 7);
            if (!monthlyAgg[m]) monthlyAgg[m] = { sales: 0, count: 0, days: new Set() };
            monthlyAgg[m].sales += r.actual_sales;
            monthlyAgg[m].count += r.actual_count;
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
            const avg = d.count > 0 ? Math.round(d.sales / d.count) : 0;
            const dayAvg = days > 0 ? Math.round(d.sales / days) : 0;
            html += `<tr>
                <td><strong>${m}</strong></td>
                <td class="num mono">${fmt$(txv(d.sales))}</td>
                <td class="num mono">${d.count.toLocaleString()}</td>
                <td class="num mono">${fmt$(txv(avg))}</td>
                <td class="num mono">${days}</td>
                <td class="num mono">${fmt$(txv(dayAvg))}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
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

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
function sekkiWeatherColor(rank) {
    const palette = [
        '#dc2626', '#e03a1e', '#e54e16', '#ea620e',
        '#ef7606', '#f08c14', '#f0a222', '#e8b830',
        '#d4c73e', '#b8d44c', '#8ccc5a', '#60c468',
        '#45b87a', '#3aac8c', '#36a09e', '#3294b0',
        '#2e88c2', '#2a7cd4', '#266de6', '#2255d4',
        '#2244b8', '#22339c', '#1e2280', '#1a1164',
    ];
    const idx = Math.max(0, Math.min(23, rank - 1));
    return palette[idx];
}

// 日別MPスコア → 24段階レベル（1=最繁忙, 24=最閑散）
const MP_MIN = 1.2, MP_MAX = 5.0;
function mpScoreLevel(mpPoint) {
    const t = (mpPoint - MP_MIN) / (MP_MAX - MP_MIN); // 0..1
    const clamped = Math.max(0, Math.min(1, t));
    // Higher score = more busy = lower level number (1st)
    return Math.max(1, Math.min(24, 25 - Math.ceil(clamped * 24)));
}

// 日別MPスコア → ヒートマップカラー（24段階パレット）
function mpScoreColor(mpPoint) {
    const level = mpScoreLevel(mpPoint);
    return sekkiWeatherColor(level);
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
            const active = x.actual_sales > 0;
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
        const monthAvgSales = {};
        storeData.forEach(r => {
            if (r.actual_sales <= 0) return;
            const m = parseInt(r.date.slice(5, 7));
            if (!monthAvgSales[m]) monthAvgSales[m] = [];
            monthAvgSales[m].push(r.actual_sales);
        });

        const results = [];
        dates.forEach(dateStr => {
            const dd = new Date(dateStr);
            const weekdayIdx = WEEKDAY_IDX[WEEKDAY_JA[dd.getDay()]] || 2;
            const sekkiName = getSekki(dateStr);
            const sekkiData = sekki[sekkiName] || { rank: 12, season: 'FLOW', pt: 3.0 };
            const month = dd.getMonth() + 1;

            const existingRec = storeData.find(r => r.date === dateStr);
            let kf1, kf2, kf3;
            if (existingRec) {
                kf1 = existingRec.kf1; kf2 = existingRec.kf2; kf3 = existingRec.kf3;
            } else {
                const sameMonth = storeData.filter(r => parseInt(r.date.slice(5, 7)) === month && r.actual_sales > 0);
                const avgKf1 = sameMonth.length ? sameMonth.reduce((s, r) => s + r.kf1, 0) / sameMonth.length : 3.0;
                const avgKf2 = sameMonth.length ? sameMonth.reduce((s, r) => s + r.kf2, 0) / sameMonth.length : 2.5;
                const avgKf3 = sameMonth.length ? sameMonth.reduce((s, r) => s + r.kf3, 0) / sameMonth.length : 2.5;
                kf1 = Math.max(1, Math.min(5, Math.round((avgKf1 + (weekdayIdx - 3) * 0.3) * 100) / 100));
                kf2 = avgKf2; kf3 = avgKf3;
            }
            const mp = Math.round((kf1 + kf2 + kf3) / 3 * 100) / 100;
            const monthSales = monthAvgSales[month] || [0];
            const avgDaily = monthSales.reduce((a, b) => a + b, 0) / monthSales.length;
            const predicted = Math.round(avgDaily * (mp / 3.0));

            results.push({
                date: dateStr, weekday: WEEKDAY_JA[dd.getDay()], sekki: sekkiName,
                rank: sekkiData.rank, kf1, kf2, kf3, mp_point: mp,
                predicted_sales: predicted,
                is_actual: !!existingRec && existingRec.actual_sales > 0,
                actual_sales: existingRec ? existingRec.actual_sales : 0,
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
    html += `<div class="card mt-16" style="text-align:center;padding:16px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--gold);letter-spacing:2px;">${base.name} — FORECAST SUMMARY</div>
        <div style="display:flex;justify-content:center;gap:32px;margin-top:12px;">
            <div><div class="label">予測合計</div><div class="mono fw-900" style="font-size:28px;color:var(--blue);">${fmt$(totalPredicted)}</div></div>
            <div><div class="label">実績合計</div><div class="mono fw-900" style="font-size:28px;color:var(--green);">${fmt$(totalActual)}</div></div>
            <div><div class="label">期間</div><div class="mono" style="font-size:16px;color:var(--text-dim);">${dates.length}日間</div></div>
        </div>
    </div>`;

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
                <span style="color:var(--text-dim);">予測: <strong style="color:${color};">${fmt$(storePredTotal)}</strong></span>
                <span style="color:var(--text-dim);">実績: <strong style="color:var(--green);">${fmt$(storeActTotal)}</strong></span>
            </div>
            <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
            <table class="data-table"><thead><tr>
                <th>DATE</th><th>曜日</th><th>節気</th><th>RANK</th>
                <th class="num">KF①</th><th class="num">KF②</th><th class="num">KF③</th>
                <th class="num">MP</th><th class="num">予測売上</th><th class="num">実績売上</th>
            </tr></thead><tbody>`;

        results.forEach(r => {
            html += `<tr style="${!r.is_actual ? 'opacity:0.7' : ''}">
                <td>${r.date}</td><td>${r.weekday}</td><td>${r.sekki}</td>
                <td>${mpBadge(r.mp_point, 'small')}</td>
                <td class="num">${r.kf1.toFixed(2)}</td><td class="num">${r.kf2.toFixed(2)}</td><td class="num">${r.kf3.toFixed(2)}</td>
                <td class="num" style="color:var(--gold);font-weight:700">${r.mp_point.toFixed(2)}</td>
                <td class="num" style="color:var(--blue)">${fmt$(r.predicted_sales)}</td>
                <td class="num" style="color:var(--green)">${r.actual_sales > 0 ? fmt$(r.actual_sales) : '—'}</td>
            </tr>`;
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
            const vals = (DATA.stores[sid] || []).filter(r => r.season === s && r.actual_sales > 0).map(r => r.mp_point);
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
            if (parseInt(r.date.slice(5, 7)) !== targetMonth || r.actual_sales <= 0) return;
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
        const active = (DATA.stores[sid] || []).filter(r => r.actual_sales > 0);
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
            html += `< div class="year-card" ><h4>${sid}</h4><p style="color:var(--text-dim)">データなし</p></div > `;
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
                    `< div class="year-stat" ><span class="yl">${r.segment}</span><span class="yv mono">H:${r.hall_count} K:${r.kitchen_count}</span></div > `
                ).join('');
            }
        }

        if (!staffDetail) {
            // Default estimation
            const baseStaff = sid === 'Ce' || sid === 'RP' ? 2 : sid === 'BG' ? 8 : 4;
            const est = Math.round(baseStaff * mult);
            staffDetail = `< div class="year-stat" ><span class="yl">推定人員</span><span class="yv mono">${est}名</span></div >
    <div class="year-stat"><span class="yl">倍率</span><span class="yv mono">×${mult}</span></div>`;
        }

        html += `< div class="year-card" >
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
function saveAllSalesEntries() {
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
                    if (valInc > 0) {
                        channels[item.ch] = { sales: valInc };
                        totalSales += valInc;
                    }
                });
            }
        });

        // Only save if there's data
        if (totalSales === 0 && totalCount === 0) return;

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

        savedCount++;
        totalAllSales += totalSales;
    });

    if (savedCount === 0) {
        if (!confirm('全店舗の売上が0です。保存しますか？')) return;
    }

    // mp_data localStorage caching removed — always fetch fresh from server
    try {
        renderCommand(); // Refresh UI

        // ── GAS Cloud Sync (background) ──
        if (typeof GAS_BRIDGE !== 'undefined' && GAS_BRIDGE.getUrl()) {
            const entries = [];
            storeBlocks.forEach(block => {
                const store = block.dataset.store;
                const r = DATA.stores[store]?.find(r => r.date === date);
                if (r && (r.actual_sales > 0 || r.actual_count > 0)) {
                    entries.push({
                        store_id: store,
                        actual_sales: r.actual_sales,
                        actual_count: r.actual_count,
                        channels: r.channels,
                        labor: r.labor || null,
                        ropeway: r.ropeway || null
                    });
                }
            });
            if (entries.length > 0) {
                GAS_BRIDGE.bulkSave(date, entries, 'DASHBOARD').catch(e => console.warn('[GAS] sync error:', e));
            }
        }

        const stat = document.getElementById('sf-status');
        if (stat) {
            stat.textContent = `✅ ${savedCount}店舗保存完了 ${date} (拠点合計: ¥${totalAllSales.toLocaleString()})`;
            stat.style.color = 'var(--green)';
            setTimeout(() => stat.textContent = '', 4000);
        }
    } catch (e) {
        alert('Storage Save Failed: ' + e.message);
    }
}

// Keep backward compatibility
function saveSalesEntry() { saveAllSalesEntries(); }
function loadSalesEntry() {
    renderCommand(); // Re-render with current data
}
