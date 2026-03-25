/* ═══════════════════════════════════════════════════
   MOMENTUM PEAKS — Main Orchestrator (app.js)
   ═══════════════════════════════════════════════════
   Loads: config.js → forecast.js → gas_bridge.js → data.js → ui.js → app.js
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
