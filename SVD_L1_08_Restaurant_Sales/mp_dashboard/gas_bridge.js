// ═══════════════════════════════════════════════════════════════
// MOMENTUM PEAKS — GAS Integration Layer (gas_bridge.js)
// Phase 2: Backend Connectivity
// ═══════════════════════════════════════════════════════════════
// このファイルをindex.htmlに追加: <script src="gas_bridge.js"></script>
// app.js の前に読み込むこと
// ═══════════════════════════════════════════════════════════════

const GAS_BRIDGE = (() => {
    // ── State ──
    let GAS_URL = localStorage.getItem('mp_gas_url') || '';
    let isOnline = false;
    let lastSyncTime = null;

    // ── SVD API Token Authentication ──
    const SVD_API_TOKEN = 'a6b93874301b54dac9a37afc89d04f56'; // ← デプロイ時に設定。空文字ならトークンなし（段階的導入）
    function tokenParam() { return SVD_API_TOKEN ? `&token=${encodeURIComponent(SVD_API_TOKEN)}` : ''; }
    function addToken(payload) { if (SVD_API_TOKEN) payload.token = SVD_API_TOKEN; return payload; }

    // ── Configuration ──
    function setUrl(url) {
        GAS_URL = url.trim();
        localStorage.setItem('mp_gas_url', GAS_URL);
        console.log('[GAS] URL set:', GAS_URL);
    }

    function getUrl() { return GAS_URL; }
    function getStatus() { return isOnline; }

    // ── Ping / Connection Test ──
    async function ping() {
        if (!GAS_URL) return { status: 'error', message: 'GAS URL not set' };
        try {
            const resp = await fetch(`${GAS_URL}?action=ping`, { redirect: 'follow' });
            const data = await resp.json();
            isOnline = data.status === 'ok';
            updateStatusBadge();
            return data;
        } catch (e) {
            isOnline = false;
            updateStatusBadge();
            return { status: 'error', message: e.message };
        }
    }

    // ── GET: Load All Data ──
    async function loadAll() {
        if (!GAS_URL) return null;
        try {
            const resp = await fetch(`${GAS_URL}?action=loadAll${tokenParam()}`, { redirect: 'follow' });
            const data = await resp.json();
            if (data.status === 'ok') {
                isOnline = true;
                lastSyncTime = new Date().toISOString();
                updateStatusBadge();
                // Cache in localStorage for offline fallback
                localStorage.setItem('mp_gas_cache', JSON.stringify(data));
                localStorage.setItem('mp_gas_cache_time', lastSyncTime);
                return data;
            }
            return null;
        } catch (e) {
            isOnline = false;
            updateStatusBadge();
            console.warn('[GAS] loadAll failed, falling back to cache:', e.message);
            return getCachedData();
        }
    }

    // ── GET: Load All OnHand Data ──
    async function loadOnHand() {
        if (!GAS_URL) return null;
        try {
            const resp = await fetch(`${GAS_URL}?action=loadOnHand${tokenParam()}`, { redirect: 'follow' });
            const data = await resp.json();
            if (data.status === 'ok') return data;
            return null;
        } catch (e) {
            console.warn('[GAS] loadOnHand failed:', e.message);
            return null;
        }
    }

    // ── GET: Load by Date ──
    async function loadDate(dateStr) {
        if (!GAS_URL) return null;
        try {
            const resp = await fetch(`${GAS_URL}?action=loadDate&date=${dateStr}${tokenParam()}`, { redirect: 'follow' });
            return await resp.json();
        } catch (e) {
            console.warn('[GAS] loadDate failed:', e.message);
            return null;
        }
    }

    // ── GET: Load Range ──
    async function loadRange(from, to, storeId) {
        if (!GAS_URL) return null;
        try {
            let url = `${GAS_URL}?action=loadRange&from=${from}&to=${to}${tokenParam()}`;
            if (storeId) url += `&store=${storeId}`;
            const resp = await fetch(url, { redirect: 'follow' });
            return await resp.json();
        } catch (e) {
            console.warn('[GAS] loadRange failed:', e.message);
            return null;
        }
    }

    // ── POST: Save Single Entry ──
    async function save(date, storeId, actualSales, actualCount, channels, user) {
        if (!GAS_URL) {
            console.warn('[GAS] No URL, saving to localStorage only');
            return saveLocal(date, storeId, { actual_sales: actualSales, actual_count: actualCount, channels });
        }

        // Save to localStorage first (optimistic)
        saveLocal(date, storeId, { actual_sales: actualSales, actual_count: actualCount, channels });

        try {
            const payload = addToken({
                action: 'save',
                date,
                store_id: storeId,
                actual_sales: actualSales,
                actual_count: actualCount,
                channels: channels || {},
                user: user || 'DASHBOARD'
            });

            const resp = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain' }, // GAS CORS workaround
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'ok') {
                isOnline = true;
                updateStatusBadge();
                showToast(`✅ ${storeId} ${date} saved to cloud`);
            }
            return data;
        } catch (e) {
            isOnline = false;
            updateStatusBadge();
            // Queue for later sync
            queueForSync({ date, store_id: storeId, actual_sales: actualSales, actual_count: actualCount, channels, user });
            showToast(`📱 ${storeId} saved locally (will sync later)`);
            return { status: 'queued', message: 'Saved locally, will sync when online' };
        }
    }

    // ── POST: Bulk Save (Base-level) ──
    async function bulkSave(date, entries, user) {
        if (!GAS_URL) return { status: 'error', message: 'GAS URL not set' };

        try {
            const payload = addToken({
                action: 'bulkSave',
                date,
                entries,
                user: user || 'DASHBOARD'
            });

            const resp = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'ok') {
                showToast(`✅ ${entries.length} stores saved to cloud`);
            }
            return data;
        } catch (e) {
            showToast(`❌ Bulk save failed: ${e.message}`);
            return { status: 'error', message: e.message };
        }
    }

    // ── Offline Queue ──
    function queueForSync(entry) {
        const queue = JSON.parse(localStorage.getItem('mp_sync_queue') || '[]');
        queue.push({ ...entry, queued_at: new Date().toISOString() });
        localStorage.setItem('mp_sync_queue', JSON.stringify(queue));
    }

    async function processQueue() {
        const queue = JSON.parse(localStorage.getItem('mp_sync_queue') || '[]');
        if (queue.length === 0) return { synced: 0 };

        let synced = 0;
        const remaining = [];

        for (const entry of queue) {
            try {
                const result = await save(entry.date, entry.store_id, entry.actual_sales, entry.actual_count, entry.channels, entry.user);
                if (result.status === 'ok') {
                    synced++;
                } else {
                    remaining.push(entry);
                }
            } catch (e) {
                remaining.push(entry);
            }
        }

        localStorage.setItem('mp_sync_queue', JSON.stringify(remaining));
        if (synced > 0) showToast(`🔄 Synced ${synced} queued entries`);
        return { synced, remaining: remaining.length };
    }

    // ── Local Storage Helpers ──
    function saveLocal(date, storeId, data) {
        const key = `mp_local_${date}_${storeId}`;
        localStorage.setItem(key, JSON.stringify({ ...data, saved_at: new Date().toISOString() }));
    }

    function loadLocal(date, storeId) {
        const key = `mp_local_${date}_${storeId}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }

    function getCachedData() {
        const raw = localStorage.getItem('mp_gas_cache');
        return raw ? JSON.parse(raw) : null;
    }

    // ── UI Helpers ──
    function updateStatusBadge() {
        const badge = document.getElementById('gas-status-badge');
        if (!badge) return;
        if (!GAS_URL) {
            badge.innerHTML = '⚪ 未接続';
            badge.className = 'gas-badge gas-badge-off';
        } else if (isOnline) {
            badge.innerHTML = '🟢 接続中';
            badge.className = 'gas-badge gas-badge-on';
        } else {
            badge.innerHTML = '🔴 オフライン';
            badge.className = 'gas-badge gas-badge-offline';
        }
    }

    function showToast(msg) {
        // Use existing toast system if available
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
            return;
        }
        // Fallback
        const el = document.createElement('div');
        el.className = 'gas-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.classList.add('show'), 10);
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
    }

    // ── GAS Settings Panel ──
    function renderSettingsPanel() {
        return `
      <div class="gas-settings-panel" id="gasSettingsPanel">
        <h3>⚙️ GAS Backend 設定</h3>
        <div class="gas-settings-row">
          <label>GAS Deploy URL:</label>
          <input type="text" id="gasUrlInput" value="${GAS_URL}" placeholder="https://script.google.com/macros/s/XXXX/exec" />
        </div>
        <div class="gas-settings-row">
          <button onclick="GAS_BRIDGE.testConnection()" class="gas-btn">🔌 接続テスト</button>
          <button onclick="GAS_BRIDGE.saveSettings()" class="gas-btn gas-btn-primary">💾 保存</button>
          <button onclick="GAS_BRIDGE.syncNow()" class="gas-btn">🔄 手動同期</button>
        </div>
        <div id="gasTestResult" class="gas-test-result"></div>
        <div class="gas-settings-info">
          <span id="gas-status-badge" class="gas-badge gas-badge-off">⚪ 未接続</span>
          <span id="gasQueueCount"></span>
        </div>
      </div>
    `;
    }

    async function testConnection() {
        const el = document.getElementById('gasTestResult');
        if (el) el.innerHTML = '⏳ Testing...';
        const result = await ping();
        if (el) {
            if (result.status === 'ok') {
                el.innerHTML = `✅ Connected! (${result.timestamp})`;
                el.style.color = '#4caf50';
            } else {
                el.innerHTML = `❌ ${result.message}`;
                el.style.color = '#f44336';
            }
        }
    }

    function saveSettings() {
        const input = document.getElementById('gasUrlInput');
        if (input) {
            setUrl(input.value);
            showToast('💾 GAS URL saved');
            testConnection();
        }
    }

    async function syncNow() {
        showToast('🔄 Syncing...');
        const result = await processQueue();
        showToast(`✅ Sync complete: ${result.synced} synced, ${result.remaining} pending`);
    }

    // ── Init ──
    function init() {
        if (GAS_URL) {
            ping().then(() => {
                // Auto-process queue on startup
                const queue = JSON.parse(localStorage.getItem('mp_sync_queue') || '[]');
                if (queue.length > 0 && isOnline) processQueue();
            });
        }
        updateStatusBadge();
    }

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── Public API ──
    return {
        setUrl, getUrl, getStatus, ping,
        loadAll, loadDate, loadRange, loadOnHand,
        save, bulkSave, processQueue,
        loadLocal, saveLocal, getCachedData,
        renderSettingsPanel, testConnection, saveSettings, syncNow,
        updateStatusBadge, showToast
    };
})();
