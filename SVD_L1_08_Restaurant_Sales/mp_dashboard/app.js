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

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('selDate').value = today;
    selectedDate = today;

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

    // Store selector (Deep Dive)
    document.getElementById('selStore').addEventListener('change', e => {
        selectedStore = e.target.value;
        renderDive();
    });

    // Import
    setupImport();

    // Forecast
    document.getElementById('fcRun').addEventListener('click', runForecast);

    // Staffing date sync
    document.getElementById('stDate').addEventListener('change', e => { renderStaffing(); });

    // Load default data
    document.getElementById('btn-load-default').addEventListener('click', loadDefaultJSON);

    // Save / Clear localStorage
    document.getElementById('btn-save-local').addEventListener('click', () => {
        if (DATA) {
            try {
                localStorage.setItem('mp_data', JSON.stringify(DATA));
                alert('✅ ローカルストレージに保存しました');
            } catch (e) {
                alert('❌ 保存失敗: ' + e.message);
            }
        }
    });
    document.getElementById('btn-clear-local').addEventListener('click', () => {
        localStorage.removeItem('mp_data');
        localStorage.removeItem('mp_reserves');
        localStorage.removeItem('mp_staffing');
        alert('🗑 キャッシュをクリアしました');
    });

    // Try loading from localStorage first
    const cached = localStorage.getItem('mp_data');
    if (cached) {
        try {
            DATA = JSON.parse(cached);
            onDataLoaded();
        } catch (e) {
            loadDefaultJSON();
        }
    } else {
        loadDefaultJSON();
    }
});

function loadDefaultJSON() {
    fetch('mp_data.json')
        .then(r => {
            if (!r.ok) throw new Error('mp_data.json not found');
            return r.json();
        })
        .then(data => {
            DATA = data;
            onDataLoaded();
        })
        .catch(err => {
            console.warn('Default JSON load failed:', err);
            updateImportStatus('main', null);
        });
}

function onDataLoaded() {
    updateImportStatus('main', DATA);
    populateStoreSelectors();
    renderCurrentTab();
}

function populateStoreSelectors() {
    const stores = DATA.meta.stores;
    const opts = stores.map(s => `<option value="${s}">${s} — ${getStoreName(s)}</option>`).join('');
    document.getElementById('selStore').innerHTML = opts;
    document.getElementById('fcStore').innerHTML = opts;
    selectedStore = stores[0];
}

function renderCurrentTab() {
    if (!DATA) return;
    switch (currentTab) {
        case 'command': renderCommand(); break;
        case 'dive': renderDive(); break;
        case 'forecast': break; // Manual trigger
        case 'compare': renderCompare(); break;
        case 'import': break;
        case 'staffing': renderStaffing(); break;
    }
}

// ═══════════════════════════════════════
// ① COMMAND CENTER
// ═══════════════════════════════════════
function renderCommand() {
    const stores = DATA.meta.stores;
    const dateStr = selectedDate;

    let totalSales = 0, totalCount = 0, mpSum = 0, activeStores = 0;
    const storeCards = [];

    stores.forEach(sid => {
        const d = (DATA.stores[sid] || []).find(r => r.date === dateStr);
        if (d) {
            const isActive = d.actual_sales > 0;
            storeCards.push({ sid, d, isActive });
            if (isActive) {
                totalSales += d.actual_sales;
                totalCount += d.actual_count;
                mpSum += d.mp_point;
                activeStores++;
            }
        } else {
            storeCards.push({ sid, d: null, isActive: false });
        }
    });

    const avgMP = activeStores ? (mpSum / activeStores) : 0;
    const sample = storeCards.find(c => c.d);
    const sekki = sample ? sample.d.sekki : '—';
    const season = sample ? sample.d.season : '—';
    const weekday = sample ? sample.d.weekday : '—';

    // SVD Summary
    document.getElementById('svd-summary').innerHTML = `
        <div class="svd-stat">
            <div class="stat-value mono">${fmtK$(totalSales)}</div>
            <div class="stat-label">SVD TOTAL SALES</div>
        </div>
        <div class="svd-stat">
            <div class="stat-value mono">${avgMP.toFixed(2)}</div>
            <div class="stat-label">AVG MP POINT</div>
        </div>
        <div class="svd-stat">
            <div class="stat-value mono">${totalCount}</div>
            <div class="stat-label">TOTAL GUESTS</div>
        </div>
        <div class="svd-stat">
            <div class="stat-value"><span class="season-badge ${seasonClass(season)}">${season}</span></div>
            <div class="stat-label">${sekki} / ${weekday}曜日</div>
        </div>
    `;

    // Store Cards
    document.getElementById('store-grid').innerHTML = storeCards.map(({ sid, d, isActive }) => {
        if (!d) return `<div class="store-card inactive"><div class="store-name">${sid}</div><div class="store-base">${getBaseName(sid)}</div><div class="mp-value mono">—</div></div>`;
        return `<div class="store-card ${isActive ? '' : 'inactive'}" onclick="jumpToStore('${sid}')">
            <div class="store-name">${sid}</div>
            <div class="store-base">${getBaseName(sid)} — ${getStoreName(sid)}</div>
            <div class="mp-meter">${meterBars(d.mp_point)}</div>
            <div class="mp-value mono">${d.mp_point.toFixed(2)}</div>
            <div class="mp-season"><span class="season-badge ${seasonClass(d.season)}">${d.season}</span></div>
            <div class="store-sales mono">${isActive ? fmtK$(d.actual_sales) : '休業'}</div>
        </div>`;
    }).join('');

    // Monthly Summary
    renderMonthlySummary();
}

function renderMonthlySummary() {
    const ym = selectedDate.slice(0, 7); // e.g. "2025-09"
    const prevYm = (() => {
        const [y, m] = ym.split('-').map(Number);
        return `${y - 1}-${String(m).padStart(2, '0')}`;
    })();

    let currentMonth = { sales: 0, count: 0, days: 0 };
    let prevMonth = { sales: 0, count: 0, days: 0 };

    DATA.meta.stores.forEach(sid => {
        (DATA.stores[sid] || []).forEach(r => {
            const rm = r.date.slice(0, 7);
            if (rm === ym && r.actual_sales > 0) {
                currentMonth.sales += r.actual_sales;
                currentMonth.count += r.actual_count;
                currentMonth.days++;
            } else if (rm === prevYm && r.actual_sales > 0) {
                prevMonth.sales += r.actual_sales;
                prevMonth.count += r.actual_count;
                prevMonth.days++;
            }
        });
    });

    const ratio = prevMonth.sales > 0 ? (currentMonth.sales / prevMonth.sales * 100) : 0;

    document.getElementById('monthly-summary').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="svd-stat">
                <div class="stat-value mono text-gold">${fmtK$(currentMonth.sales)}</div>
                <div class="stat-label">月累計売上</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono">${fmtK$(prevMonth.sales)}</div>
                <div class="stat-label">前年同月</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono ${ratio >= 100 ? 'text-green' : 'text-red'}">${ratio.toFixed(1)}%</div>
                <div class="stat-label">前年比</div>
            </div>
            <div class="svd-stat">
                <div class="stat-value mono">${currentMonth.days}日</div>
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
                dailySales.current[day] = (dailySales.current[day] || 0) + r.actual_sales;
            } else if (rm === prevYm) {
                dailySales.prev[day] = (dailySales.prev[day] || 0) + r.actual_sales;
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
                y: { ticks: { color: '#4a4a68', callback: v => fmtK$(v) }, grid: { color: '#252548' } }
            }
        }
    });
}

function jumpToStore(sid) {
    selectedStore = sid;
    document.getElementById('selStore').value = sid;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="dive"]').classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('p-dive').classList.add('active');
    currentTab = 'dive';
    renderDive();
}

// ═══════════════════════════════════════
// ② STORE DEEP DIVE
// ═══════════════════════════════════════
function renderDive() {
    const sid = selectedStore;
    const storeData = DATA.stores[sid] || [];
    const rec = storeData.find(r => r.date === selectedDate);

    // Hero
    if (rec) {
        document.getElementById('dive-hero').innerHTML = `
            <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
                <div style="text-align:center;min-width:180px;">
                    <div class="label">MP POINT</div>
                    <div class="mono fw-900" style="font-size:56px;color:var(--gold);line-height:1;">${rec.mp_point.toFixed(2)}</div>
                    <div class="mt-16"><span class="season-badge ${seasonClass(rec.season)}">${rec.season}</span></div>
                    <div style="margin-top:8px;font-size:12px;color:var(--text-dim);">${rec.sekki}（${rec.season.split(' ')[0]}） | ${rec.weekday}曜日</div>
                    <div style="font-size:11px;color:var(--text-muted);">${rec.date}</div>
                </div>
                <div style="flex:1;min-width:200px;">
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                        <div class="svd-stat"><div class="stat-value mono text-gold">${fmt$(rec.actual_sales)}</div><div class="stat-label">売上</div></div>
                        <div class="svd-stat"><div class="stat-value mono">${rec.actual_count}名</div><div class="stat-label">来客数</div></div>
                        <div class="svd-stat"><div class="stat-value mono">${rec.actual_count > 0 ? fmt$(Math.round(rec.actual_sales / rec.actual_count)) : '—'}</div><div class="stat-label">客単価</div></div>
                        <div class="svd-stat"><div class="stat-value mono">${getBaseName(sid)}</div><div class="stat-label">拠点</div></div>
                    </div>
                </div>
            </div>
        `;
    } else {
        document.getElementById('dive-hero').innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-dim);">${sid} — ${selectedDate} のデータなし</div>`;
    }

    // KF Breakdown
    if (rec) {
        const layerLabel = rec.layers_used === 5 ? '5層(特別日)' : '4層';
        document.getElementById('dive-kf').innerHTML = [
            { name: 'KF① 拠点定指数', val: rec.kf1, sub: `月=${rec.monthly_idx} 曜=${rec.weekday_idx} 節=${rec.sekki_idx} 週=${rec.weekly_idx} 日=${rec.daily_idx || '—'} [${layerLabel}]` },
            { name: 'KF② 売上FACTOR', val: rec.kf2, sub: '過去実績 min-max正規化' },
            { name: 'KF③ 来客FACTOR', val: rec.kf3, sub: '過去実績 min-max正規化' },
        ].map(k => `
            <div class="kf-card">
                <div class="kf-name">${k.name}</div>
                <div class="kf-val">${k.val.toFixed(2)}</div>
                <div class="kf-sub">${k.sub}</div>
            </div>
        `).join('');
    }

    // Channels
    if (rec && rec.channels) {
        const chEntries = Object.entries(rec.channels);
        const totalChSales = chEntries.reduce((s, [, v]) => s + v.sales, 0);
        const thead = document.querySelector('#dive-ch-table thead');
        const tbody = document.querySelector('#dive-ch-table tbody');
        thead.innerHTML = '<tr><th>チャネル</th><th class="num">売上</th><th class="num">客数</th><th class="num">構成比</th></tr>';
        tbody.innerHTML = chEntries.map(([ch, v]) => {
            const pct = totalChSales > 0 ? (v.sales / totalChSales * 100) : 0;
            return `<tr><td>${ch}</td><td class="num">${fmt$(v.sales)}</td><td class="num">${v.count || '—'}</td><td class="num">${pct.toFixed(1)}%</td></tr>`;
        }).join('');

        // Channel chart
        const colors = ['#c8a45e', '#60a5fa', '#a78bfa', '#4ade80', '#f97316', '#ef4444', '#eab308', '#ec4899', '#14b8a6', '#8b5cf6', '#f59e0b', '#6366f1'];
        destroyChart('channels');
        charts.channels = new Chart(document.getElementById('chart-channels'), {
            type: 'doughnut',
            data: {
                labels: chEntries.map(([ch]) => ch),
                datasets: [{ data: chEntries.map(([, v]) => v.sales), backgroundColor: colors.slice(0, chEntries.length), borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#a0a0b8', font: { size: 10, family: 'JetBrains Mono' } } } }
            }
        });
    }

    // MP Trend (last 90 days)
    const idx = storeData.findIndex(r => r.date === selectedDate);
    const start = Math.max(0, idx - 89);
    const trendSlice = storeData.slice(start, idx + 1);

    destroyChart('mpTrend');
    charts.mpTrend = new Chart(document.getElementById('chart-mp-trend'), {
        type: 'line',
        data: {
            labels: trendSlice.map(r => r.date.slice(5)),
            datasets: [{
                label: 'MP Point',
                data: trendSlice.map(r => r.actual_sales > 0 ? r.mp_point : null),
                borderColor: '#c8a45e', borderWidth: 1.5, tension: 0.3, pointRadius: 0, spanGaps: true,
                fill: { target: 'origin', above: 'rgba(200,164,94,0.05)' }
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#4a4a68', font: { size: 9 }, maxTicksLimit: 15 }, grid: { display: false } },
                y: { min: 1, max: 5, ticks: { color: '#4a4a68' }, grid: { color: '#252548' } }
            }
        }
    });

    // Heatmap
    renderHeatmap(sid, storeData);

    // Data Table
    renderDataTable(sid, storeData);
}

// 節気rank(1=TOP → 24=OFF)から天気配色を返す（暖色=忙しい, 寒色=閑散）
function sekkiWeatherColor(rank) {
    // 24段階: rank 1=最も暖色(赤) → rank 24=最も寒色(深青)
    const palette = [
        '#dc2626', '#e03a1e', '#e54e16', '#ea620e',  // 1-4:  赤→橙 (TOP)
        '#ef7606', '#f08c14', '#f0a222', '#e8b830',  // 5-8:  橙→黄 (HIGH)
        '#d4c73e', '#b8d44c', '#8ccc5a', '#60c468',  // 9-12: 黄→緑 (FLOW上)
        '#45b87a', '#3aac8c', '#36a09e', '#3294b0',  // 13-16: 緑→青緑 (FLOW下)
        '#2e88c2', '#2a7cd4', '#266de6', '#2255d4',  // 17-20: 青 (LOW)
        '#2244b8', '#22339c', '#1e2280', '#1a1164',  // 21-24: 深青 (OFF)
    ];
    const idx = Math.max(0, Math.min(23, rank - 1));
    return palette[idx];
}

function renderHeatmap(sid, storeData) {
    const container = document.getElementById('dive-heatmap');
    const yr = selectedDate.slice(0, 4);
    const yd = storeData.filter(r => r.date.startsWith(yr));
    if (!yd.length) { container.innerHTML = '<p style="color:var(--text-dim);padding:16px">No data</p>'; return; }

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
            const bg = active ? sekkiWeatherColor(x.rank) : '#1a1a2e';
            html += `<div class="hm-cell" style="background:${bg}" title="${x.date} ${x.weekday}\n${x.sekki}（${x.season.split(' ')[0]}）\nMP: ${x.mp_point.toFixed(2)}\n${active ? '¥' + x.actual_sales.toLocaleString() : '休業'}">${day}</div>`;
        });
        html += '</div></div>';
    });
    html += '</div>';
    // 凡例: 天気グラデーション（暖色→寒色で24段階を6サンプルで表現）
    html += '<div style="display:flex;gap:4px;margin-top:12px;align-items:center;font-size:10px;color:var(--text-dim)">';
    html += '<span>TOP</span>';
    [1, 4, 8, 12, 16, 20, 24].forEach(r => {
        html += `<div style="width:18px;height:12px;background:${sekkiWeatherColor(r)};border-radius:2px" title="Rank ${r}"></div>`;
    });
    html += '<span>OFF</span></div>';
    container.innerHTML = html;
}

function renderDataTable(sid, storeData) {
    const idx = storeData.findIndex(r => r.date === selectedDate);
    const s = Math.max(0, idx - 30);
    const slice = storeData.slice(s, s + 60);

    const chNames = new Set();
    slice.forEach(r => { if (r.channels) Object.keys(r.channels).forEach(c => chNames.add(c)); });
    const chArr = [...chNames];

    document.getElementById('dive-dt-th').innerHTML =
        ['日付', '曜日', '節気', 'SEASON', 'MP', 'KF①', 'KF②', 'KF③'].map(c => `<th class="num">${c}</th>`).join('') +
        chArr.map(c => `<th class="num">${c}</th>`).join('') +
        '<th class="num">売上合計</th>';

    document.getElementById('dive-dt-tb').innerHTML = slice.map(r => {
        const isCur = r.date === selectedDate;
        const chVals = chArr.map(ch => {
            const s = (r.channels && r.channels[ch] && r.channels[ch].sales) || 0;
            return `<td class="num">${s ? fmt$(s) : '—'}</td>`;
        }).join('');
        return `<tr class="${isCur ? 'current' : ''}">
            <td>${r.date}</td><td>${r.weekday}</td><td>${r.sekki}</td>
            <td><span class="season-badge ${seasonClass(r.season)}" style="font-size:9px;padding:2px 6px">${r.season.split(' ')[0]}</span></td>
            <td class="num" style="color:var(--gold);font-weight:700">${r.mp_point.toFixed(2)}</td>
            <td class="num">${r.kf1.toFixed(2)}</td><td class="num">${r.kf2.toFixed(2)}</td><td class="num">${r.kf3.toFixed(2)}</td>
            ${chVals}
            <td class="num" style="color:var(--gold);font-weight:700">${r.actual_sales ? fmt$(r.actual_sales) : '—'}</td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════
// ③ FORECAST
// ═══════════════════════════════════════
function runForecast() {
    const sid = document.getElementById('fcStore').value;
    const from = document.getElementById('fcFrom').value;
    const to = document.getElementById('fcTo').value;
    if (!from || !to) { alert('期間を指定してください'); return; }

    const storeData = DATA.stores[sid] || [];
    // Compute historical monthly averages for KF2/KF3 estimation
    const monthAvgSales = {}, monthAvgCount = {};
    storeData.forEach(r => {
        if (r.actual_sales <= 0) return;
        const m = parseInt(r.date.slice(5, 7));
        if (!monthAvgSales[m]) { monthAvgSales[m] = []; monthAvgCount[m] = []; }
        monthAvgSales[m].push(r.actual_sales);
        monthAvgCount[m].push(r.actual_count);
    });

    const baseId = getBaseId(sid);
    const baseIndices = DATA.config.bases.find(b => b.id === baseId);
    const sekki = DATA.config.sekki_levels || {};

    // Generate forecast records
    const results = [];
    let d = new Date(from);
    const end = new Date(to);

    while (d <= end) {
        const dateStr = d.toISOString().slice(0, 10);
        const weekdayIdx = WEEKDAY_IDX[WEEKDAY_JA[d.getDay()]] || 2;
        const sekkiName = getSekki(dateStr);
        const sekkiData = sekki[sekkiName] || { rank: 12, season: 'FLOW', pt: 3.0 };
        const month = d.getMonth() + 1;

        // KF1: seasonal + weekday + visitor (use existing data's pattern)
        const existingRec = storeData.find(r => r.date === dateStr);
        let kf1, kf2, kf3;

        if (existingRec) {
            kf1 = existingRec.kf1;
            kf2 = existingRec.kf2;
            kf3 = existingRec.kf3;
        } else {
            // Estimate from historical
            const sameMonthRecs = storeData.filter(r => parseInt(r.date.slice(5, 7)) === month && r.actual_sales > 0);
            const avgKf1 = sameMonthRecs.length ? sameMonthRecs.reduce((s, r) => s + r.kf1, 0) / sameMonthRecs.length : 3.0;
            const avgKf2 = sameMonthRecs.length ? sameMonthRecs.reduce((s, r) => s + r.kf2, 0) / sameMonthRecs.length : 2.5;
            const avgKf3 = sameMonthRecs.length ? sameMonthRecs.reduce((s, r) => s + r.kf3, 0) / sameMonthRecs.length : 2.5;

            // Adjust KF1 for weekday
            kf1 = Math.round((avgKf1 + (weekdayIdx - 3) * 0.3) * 100) / 100;
            kf1 = Math.max(1, Math.min(5, kf1));
            kf2 = avgKf2;
            kf3 = avgKf3;
        }

        const mp = Math.round((kf1 + kf2 + kf3) / 3 * 100) / 100;

        // Predicted sales from monthly average * MP multiplier
        const monthSales = monthAvgSales[month] || [0];
        const avgDailySales = monthSales.reduce((a, b) => a + b, 0) / monthSales.length;
        const mpMultiplier = mp / 3.0; // normalize around 3.0 = 1.0x
        const predictedSales = Math.round(avgDailySales * mpMultiplier);

        results.push({
            date: dateStr,
            weekday: WEEKDAY_JA[d.getDay()],
            sekki: sekkiName,
            season: sekkiData.season,
            rank: sekkiData.rank,
            kf1, kf2, kf3,
            mp_point: mp,
            predicted_sales: predictedSales,
            is_actual: !!existingRec && existingRec.actual_sales > 0,
            actual_sales: existingRec ? existingRec.actual_sales : 0,
        });

        d.setDate(d.getDate() + 1);
    }

    // Render forecast chart
    destroyChart('forecast');
    charts.forecast = new Chart(document.getElementById('chart-forecast'), {
        type: 'line',
        data: {
            labels: results.map(r => r.date.slice(5)),
            datasets: [
                {
                    label: '予測MP',
                    data: results.map(r => r.mp_point),
                    borderColor: '#c8a45e', borderWidth: 2, tension: 0.3, pointRadius: 1, yAxisID: 'y',
                },
                {
                    label: '実績MP',
                    data: results.map(r => r.is_actual ? r.mp_point : null),
                    borderColor: '#4ade80', borderWidth: 1.5, tension: 0.3, pointRadius: 2, yAxisID: 'y', spanGaps: false,
                },
                {
                    label: '予測売上',
                    data: results.map(r => r.predicted_sales),
                    borderColor: '#60a5fa', borderWidth: 1, borderDash: [4, 4], tension: 0.3, pointRadius: 0, yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6a6a8a', font: { size: 10, family: 'JetBrains Mono' } } } },
            scales: {
                x: { ticks: { color: '#4a4a68', font: { size: 9 }, maxTicksLimit: 20 }, grid: { display: false } },
                y: { position: 'left', min: 1, max: 5, ticks: { color: '#c8a45e' }, grid: { color: '#252548' }, title: { display: true, text: 'MP', color: '#c8a45e' } },
                y1: { position: 'right', ticks: { color: '#60a5fa', callback: v => fmtK$(v) }, grid: { display: false }, title: { display: true, text: '売上', color: '#60a5fa' } },
            }
        }
    });

    // Forecast table
    document.getElementById('fc-tb').innerHTML = results.map(r => `
        <tr class="${r.is_actual ? '' : ''}" style="${!r.is_actual ? 'opacity:0.7' : ''}">
            <td>${r.date}</td><td>${r.weekday}</td><td>${r.sekki}</td>
            <td><span class="season-badge ${seasonClass(r.season)}" style="font-size:9px;padding:2px 6px">${r.season.split(' ')[0]}</span></td>
            <td class="num">${r.kf1.toFixed(2)}</td><td class="num">${r.kf2.toFixed(2)}</td><td class="num">${r.kf3.toFixed(2)}</td>
            <td class="num" style="color:var(--gold);font-weight:700">${r.mp_point.toFixed(2)}</td>
            <td class="num" style="color:var(--blue)">${fmt$(r.predicted_sales)}</td>
        </tr>
    `).join('');
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
            labels: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
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
            const key = `${y}-${sid}`;
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
            <div class="year-card">
                <h4>${sid} — ${v.year}年 ${targetMonth}月</h4>
                <div class="year-stat"><span class="yl">売上合計</span><span class="yv text-gold mono">${fmtK$(v.sales)}</span></div>
                <div class="year-stat"><span class="yl">来客合計</span><span class="yv mono">${v.count}名</span></div>
                <div class="year-stat"><span class="yl">営業日数</span><span class="yv mono">${v.days}日</span></div>
                <div class="year-stat"><span class="yl">平均MP</span><span class="yv text-gold mono">${(v.mpSum / v.days).toFixed(2)}</span></div>
            </div>
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
        `<div class="year-stat"><span class="yl">#${i + 1} ${r.sid}</span><span class="yv mono text-blue">${r.avgKf2.toFixed(2)}</span></div>`
    ).join('');

    document.getElementById('rank-kf3').innerHTML = kf3Sorted.map((r, i) =>
        `<div class="year-stat"><span class="yl">#${i + 1} ${r.sid}</span><span class="yv mono text-green">${r.avgKf3.toFixed(2)}</span></div>`
    ).join('');
}

// ═══════════════════════════════════════
// ⑤ DATA IMPORT
// ═══════════════════════════════════════
function setupImport() {
    ['main', 'reserve', 'staff'].forEach(type => {
        const dz = document.getElementById(`dz-${type}`);
        const fi = document.getElementById(`fi-${type}`);

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
    if (!data) {
        el.className = 'import-status empty';
        el.innerHTML = '⚪ 未ロード';
        return;
    }
    el.className = 'import-status loaded';
    if (type === 'main') {
        el.innerHTML = `✅ v${data.meta.version} | ${data.meta.stores.length}店舗 | ${data.meta.total_records.toLocaleString()}レコード | ${data.meta.generated.slice(0, 16)}`;
    } else if (type === 'reserve') {
        el.innerHTML = `✅ ${data.length}件の予約データ`;
    } else if (type === 'staff') {
        el.innerHTML = `✅ ${data.length}件の人員定義`;
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
            <div class="year-stat"><span class="yl">SEASON</span><span class="yv"><span class="season-badge ${seasonClass(rec.season)}" style="font-size:9px">${rec.season.split(' ')[0]}</span></span></div>
            <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
            ${staffDetail}
        </div>`;
    });

    html += '</div>';
    grid.innerHTML = html;

    // Show ENTER placeholder
    placeholder.classList.remove('hidden');
}
