/**
 * ═══════════════════════════════════════════════════════════
 * TI BRIDGE — Talent Intelligence Cartridge Interface
 * ═══════════════════════════════════════════════════════════
 * MPの gas_bridge.js と同じ設計パターン
 * GAS URL差し替えだけで別組織にも対応（カートリッジ方式）
 */
const TI_BRIDGE = (() => {
    const STORAGE_KEY = 'ti_gas_url';
    let gasUrl = localStorage.getItem(STORAGE_KEY) || '';
    let isOnline = false;
    let cachedConfig = null;

    // ── Fetch wrapper ──
    async function fetchGet(action, params = {}) {
        if (!gasUrl) throw new Error('GAS URL not set');
        const url = new URL(gasUrl);
        url.searchParams.set('action', action);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function fetchPost(action, data = {}) {
        if (!gasUrl) throw new Error('GAS URL not set');
        const formData = new URLSearchParams();
        formData.set('action', action);
        Object.entries(data).forEach(([k, v]) => {
            if (v !== undefined && v !== null) formData.set(k, String(v));
        });
        const res = await fetch(gasUrl, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    // JSON POST for large payloads (e.g. photo Base64)
    async function fetchPostJson(action, data = {}) {
        if (!gasUrl) throw new Error('GAS URL not set');
        const payload = { action, ...data };
        const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    return {
        // ── Config ──
        setUrl(url) {
            gasUrl = url.trim();
            localStorage.setItem(STORAGE_KEY, gasUrl);
            isOnline = false;
            cachedConfig = null;
        },
        getUrl() { return gasUrl; },
        getStatus() { return { url: gasUrl, online: isOnline, hasUrl: !!gasUrl }; },

        // ── Connection ──
        async ping() {
            try {
                const data = await fetchGet('config');
                isOnline = data.result === 'success';
                if (isOnline) cachedConfig = data.config;
                return { online: isOnline, version: data.version, config: data.config };
            } catch (e) {
                isOnline = false;
                return { online: false, error: e.message };
            }
        },

        // ── Read (doGet) ──
        async loadRoster() { return fetchGet('roster'); },
        async loadProfile(staffId) { return fetchGet('profile', { staffId }); },
        async loadHistory(staffId) { return fetchGet('history', { staffId }); },
        async getAdvice(scores) { return fetchGet('advice', scores); },
        async loadShiftData() { return fetchGet('shiftData'); },
        async loadConfig() {
            if (cachedConfig) return cachedConfig;
            const data = await fetchGet('config');
            if (data.result === 'success') cachedConfig = data.config;
            return data.config || {};
        },

        // ── Write (doPost) ──
        async createStaff(name, affiliation, options = {}) {
            return fetchPost('create', { name, affiliation, ...options });
        },
        async saveEvaluation(staffId, scores, evaluator, memo, evalType) {
            return fetchPost('save', { staffId, evaluator, memo, evalType, ...scores });
        },
        async updateProfile(staffId, updates) {
            return fetchPost('update', { staffId, ...updates });
        },
        async archiveStaff(staffId) {
            return fetchPost('archive', { staffId });
        },
        async uploadPhoto(staffId, base64Data) {
            return fetchPostJson('uploadPhoto', { staffId, photoData: base64Data });
        },
        async migrate(offset = 0, batchSize = 10) {
            return fetchPost('migrate', { offset, batchSize: String(batchSize) });
        },

        // ── Career Timeline ──
        async loadCareer(staffId) { return fetchGet('career', { staffId }); },
        async addCareerEvent(staffId, eventData) {
            return fetchPost('addCareerEvent', { staffId, ...eventData });
        },
        async updateCareerEvent(staffId, rowIndex, eventData) {
            return fetchPost('updateCareerEvent', { staffId, rowIndex: String(rowIndex), ...eventData });
        },
        async deleteCareerEvent(staffId, rowIndex) {
            return fetchPost('deleteCareerEvent', { staffId, rowIndex: String(rowIndex) });
        },

        // ── UI Helpers ──
        showToast(msg, duration = 3000) {
            let toast = document.getElementById('ti-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'ti-toast';
                toast.className = 'gas-toast';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), duration);
        },

        renderSettingsPanel(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const status = this.getStatus();
            container.innerHTML = `
                <div class="gas-settings-panel">
                    <h3>TI GAS CARTRIDGE SETTINGS</h3>
                    <div class="gas-settings-row">
                        <label>GAS Web App URL</label>
                        <input type="text" id="ti-gas-url-input" value="${status.url}" 
                               placeholder="https://script.google.com/macros/s/.../exec">
                        <button class="gas-btn gas-btn-primary" onclick="TI_BRIDGE.setUrl(document.getElementById('ti-gas-url-input').value); TI_BRIDGE.testConnection();">SAVE</button>
                        <button class="gas-btn" onclick="TI_BRIDGE.testConnection();">TEST</button>
                    </div>
                    <div id="ti-gas-test-result" class="gas-test-result"></div>
                    <div class="gas-settings-info">
                        <span class="gas-badge ${status.online ? 'gas-badge-on' : (status.hasUrl ? 'gas-badge-offline' : 'gas-badge-off')}">
                            ${status.online ? '● ONLINE' : (status.hasUrl ? '● OFFLINE' : '● NOT SET')}
                        </span>
                        <span style="font-size:11px;color:var(--text-dim);">TI Backend v3.0</span>
                    </div>
                </div>`;
        },

        async testConnection() {
            const resultEl = document.getElementById('ti-gas-test-result');
            if (resultEl) resultEl.innerHTML = '<span style="color:var(--text-dim);">接続テスト中...</span>';
            const res = await this.ping();
            if (resultEl) {
                resultEl.innerHTML = res.online
                    ? `<span style="color:var(--green);">✅ 接続成功 — v${res.version}</span>`
                    : `<span style="color:var(--red);">❌ 接続失敗: ${res.error || 'Unknown'}</span>`;
            }
            // Update badges everywhere
            const badge = document.getElementById('connectionBadge');
            if (badge) {
                badge.className = 'gas-badge ' + (res.online ? 'gas-badge-on' : 'gas-badge-offline');
                badge.textContent = res.online ? '● ONLINE' : '● OFFLINE';
            }
            this.renderSettingsPanel('gasSettingsCard');
            if (res.online) {
                this.showToast('GAS接続成功 ✅');
                if (typeof loadRoster === 'function') loadRoster();
            }
        }
    };
})();


/**
 * ═══════════════════════════════════════════════════════════
 * SHIFT ENGINE — Frontend Matching (GASに計算させない)
 * ═══════════════════════════════════════════════════════════
 */
const SHIFT_ENGINE = {
    generateProposal(demand, supply) {
        const proposal = [];
        const available = supply.filter(s => s.shiftReady === 'Y');
        const used = new Set();

        (demand.requiredPositions || []).forEach(req => {
            const candidates = available
                .filter(s => !used.has(s.staffId) && s.positions.includes(req.pos) && s.cp >= (req.minCP || 0))
                .sort((a, b) => b.cp - a.cp);

            const assigned = candidates.slice(0, req.count);
            assigned.forEach(s => used.add(s.staffId));

            proposal.push({
                position: req.pos,
                assigned,
                shortage: Math.max(0, req.count - assigned.length)
            });
        });

        const hasLeader = [...used].some(id => {
            const s = supply.find(x => x.staffId === id);
            return s && ['①', '②'].includes(s.hierarchy);
        });

        return { proposal, hasLeader, valid: hasLeader, totalAssigned: used.size };
    }
};
