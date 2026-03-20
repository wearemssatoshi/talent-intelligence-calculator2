/**
 * ═══════════════════════════════════════════════════════════
 * TALENT INTELLIGENCE — Dashboard App
 * ═══════════════════════════════════════════════════════════
 */

// ── State ──
let staffList = [];
let currentTab = 'roster';
let skillScores = {};
let radarChart = null;
let growthChart = null;

// ── Skill Labels（GAS評価シート準拠）──
const SKILL_LABELS = {
    P: {
        p1: '自己成長/学習意欲', p2: '協調性/チームワーク', p3: 'ストレス耐性/柔軟性',
        p4: '当事者意識/責任感', p5: '共感力/傾聴力', p6: 'SVD理念への共鳴'
    },
    S: {
        s1: 'トータルスキル', s2: '専門スキル（料理知識）', s3: '専門スキル（ドリンク ※ワイン除く）',
        s4: '専門スキル（ワイン）', s5: '顧客対応力', s6: 'テクニカル対応力'
    },
    E: {
        e1: '業界経験年数', e2: 'SVD在籍経験', e3: '専門資格保有',
        e4: '汎用実務スキル', e5: '役職経験', e6: '実績/表彰'
    },
    M: {
        m1: '計数管理能力', m2: 'チームビルディング/育成力', m3: 'オペレーション管理能力',
        m4: '戦略立案/課題解決力', m5: 'リーダーシップ', m6: '顧客創造/ブランド構築力'
    }
};

// ── Category Display Names ──
const CAT_NAMES = { P: 'パーソナル力', S: 'サービススキル', E: '経験・資格', M: 'マネジメント' };

// ── Store Colors & Short Names (Module Level) ──
const STORE_COLORS = {
    JW: '#b8965c', NP: '#8aab7a', BQ: '#a990c0', GA: '#7ea3b8',
    BG: '#6ab5b0', RYB: '#c49060', Ce: '#a090b0', RP: '#c0808a',
    CL: '#e0a050', POP: '#b0c860'
};

function shortName(aff) {
    const map = {
        'THE JEWELS': 'JW', 'NOUVELLE POUSSE OKURAYAMA': 'NP',
        'THE GARDEN SAPPORO HOKKAIDO GRILLE': 'GA',
        'LA BRIQUE SAPPORO Akarenga Terrace': 'BQ', 'Rusutsu Yotei Buta by BQ': 'RYB',
        'Sapporo TV Tower BEER GARDEN': 'BG', 'OKURAYAMA CAFE': 'Ce',
        'Restaurant Project': 'RP', 'CL': 'CL', 'POP UP': 'POP'
    };
    return map[aff] || (aff || '').substring(0, 4);
}

// ── Brigade Hierarchy: jobTitle → Level Mapping ──
const BRIGADE_MAP = {
    'ゼネラルマネジャー・総支配人': { level: '①', fr: 'Directeur', en: 'Director' },
    'ディビジョン支配人':           { level: '①', fr: 'Directeur', en: 'Director' },
    'チーフマネジャー・支配人':     { level: '②', fr: "Maître d'hôtel", en: 'Manager' },
    'マネジャーまたは副支配人':     { level: '②', fr: "Maître d'hôtel", en: 'Manager' },
    'キャプテン':                   { level: '③', fr: 'Chef de Rang 1', en: 'Asst. Manager' },
    'アシスタントマネジャー':       { level: '③', fr: 'Chef de Rang 1', en: 'Asst. Manager' },
    'アシスタントキャプテン':       { level: '④', fr: 'Chef de Rang 2', en: 'Captain' },
    '一般':                         { level: '⑤', fr: 'Commis', en: 'Staff' }
};

function getBrigadeInfo(staff) {
    // hierarchyRoleが設定されていればそれを使う、なければjobTitleからマッピング
    if (staff.hierarchyRole && staff.hierarchyRole.trim()) {
        return { level: staff.hierarchyRole, fr: '', jobTitle: staff.jobTitle || '' };
    }
    const title = (staff.jobTitle || '').trim();
    const match = BRIGADE_MAP[title];
    if (match) {
        return { level: match.level, fr: match.fr, jobTitle: title };
    }
    return { level: '⑥', fr: '', jobTitle: title };
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSkillSliders();
    TI_BRIDGE.renderSettingsPanel('gasSettingsCard');
    updateConnectionBadge();

    // Auto-connect if URL exists
    if (TI_BRIDGE.getUrl()) {
        loadRoster();
    }
});

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById('p-' + tab).classList.add('active');
            currentTab = tab;
        });
    });
}

async function updateConnectionBadge() {
    const badge = document.getElementById('connectionBadge');
    const status = TI_BRIDGE.getStatus();
    if (status.online) {
        badge.className = 'gas-badge gas-badge-on';
        badge.textContent = '● ONLINE';
    } else if (status.hasUrl) {
        badge.className = 'gas-badge gas-badge-offline';
        badge.textContent = '● OFFLINE';
    } else {
        badge.className = 'gas-badge gas-badge-off';
        badge.textContent = '● NOT SET';
    }
}

// ═══════════════════════════════════════════════════════════
// ① ROSTER
// ═══════════════════════════════════════════════════════════
async function loadRoster() {
    try {
        const ping = await TI_BRIDGE.ping();
        updateConnectionBadge();
        if (!ping.online) {
            TI_BRIDGE.showToast('GAS接続失敗 ❌');
            return;
        }

        const data = await TI_BRIDGE.loadRoster();
        if (data.result !== 'success') throw new Error(data.error);

        staffList = data.staff;
        renderStaffGrid(staffList);
        populateFilters();
        populateAssessSelect();
        populateGrowthSelects();

        // Config-Driven: 拠点フィルタを動的生成
        const config = await TI_BRIDGE.loadConfig();
        if (config && config.LOCATIONS) {
            const filterEl = document.getElementById('filterAffiliation');
            filterEl.innerHTML = '<option value="">全拠点</option>';
            config.LOCATIONS.split(',').forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.trim();
                opt.textContent = loc.trim();
                filterEl.appendChild(opt);
            });
        }

        TI_BRIDGE.showToast(`${staffList.length}名のスタッフを読み込みました ✅`);

        // ── Manager/Self スコア分離（バックグラウンド） ──
        enrichWithEvalTypeScores();
    } catch (e) {
        console.error('loadRoster error:', e);
        TI_BRIDGE.showToast('エラー: ' + e.message);
    }
}

// ── Manager/Self を分離して staffList に追加 ──
async function enrichWithEvalTypeScores() {
    try {
        const promises = staffList.map(async (s) => {
            try {
                const h = await TI_BRIDGE.loadHistory(s.staffId);
                if (h.result === 'success' && h.history.length > 0) {
                    const managerEvals = h.history.filter(e => e.evalType === 'Manager');
                    const selfEvals = h.history.filter(e => e.evalType === 'Self');
                    // 最新のManager評価
                    if (managerEvals.length > 0) {
                        const latest = managerEvals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                        s._managerScore = Number(latest.totalScore) || 0;
                        s._managerCatScores = calcCatScoresFromHistory(latest.scores);
                    }
                    // 最新のSelf評価
                    if (selfEvals.length > 0) {
                        const latest = selfEvals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                        s._selfScore = Number(latest.totalScore) || 0;
                    }
                }
            } catch (err) {
                console.warn(`History fetch failed for ${s.staffId}:`, err);
            }
        });
        await Promise.all(promises);
        // Manager評価でstaffListのスコアを書き換え
        staffList.forEach(s => {
            if (s._managerScore != null) {
                s.combatPower = s._managerScore;
                if (s._managerCatScores) s.categoryScores = s._managerCatScores;
            }
        });
        renderStaffGrid(staffList);
        TI_BRIDGE.showToast('Manager評価を反映しました ✅');
    } catch (e) {
        console.warn('enrichWithEvalTypeScores failed:', e);
    }
}

function calcCatScoresFromHistory(scores) {
    if (!scores) return { P: 0, S: 0, E: 0, M: 0 };
    const avg = (prefix) => {
        let sum = 0, count = 0;
        for (let i = 1; i <= 6; i++) {
            const v = Number(scores[prefix + i]);
            if (!isNaN(v)) { sum += v; count++; }
        }
        return count > 0 ? +(sum / count).toFixed(2) : 0;
    };
    return { P: avg('p'), S: avg('s'), E: avg('e'), M: avg('m') };
}

function renderStaffGrid(staff) {
    const grid = document.getElementById('staffGrid');
    const countEl = document.getElementById('rosterCount');
    countEl.textContent = `${staff.length} Staff`;

    // Load saved growthFocus settings
    loadGrowFocus();

    if (staff.length === 0) {
        grid.innerHTML = `<div class="loading-placeholder">
            <div class="loading-icon" style="font-size:32px;opacity:0.3;">—</div>
            <div>該当するスタッフがいません</div>
        </div>`;
        return;
    }

    // ── 1. Staff を affiliation でグループ化 ──
    const teams = {};
    staff.forEach(s => {
        const key = shortName(s.affiliation);
        if (!teams[key]) teams[key] = { name: s.affiliation, short: key, members: [] };
        teams[key].members.push(s);
    });

    // ── ヘルパー: 個別スタッフカードHTML生成（既存ロジック維持） ──
    const buildStaffCard = (s) => {
        const mgrScore = Number(s._managerScore ?? s.combatPower) || 0;
        const selfScore = Number(s._selfScore) || 0;
        const hasManagerData = s._managerScore != null;
        const hasSelfData = s._selfScore != null;
        const mgrPct = Math.min((mgrScore / 200) * 100, 100);
        const mgrColor = mgrScore >= 80 ? 'var(--gold)' : mgrScore >= 50 ? 'var(--green)' : mgrScore >= 30 ? 'var(--blue)' : 'var(--text-dim)';

        let catScores = { P: 0, S: 0, E: 0, M: 0 };
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw) catScores = { P: Number(raw.P) || 0, S: Number(raw.S) || 0, E: Number(raw.E) || 0, M: Number(raw.M) || 0 };
        } catch (e) { }

        const catEntries = [
            { key: 'P', name: CAT_NAMES.P, score: catScores.P },
            { key: 'S', name: CAT_NAMES.S, score: catScores.S },
            { key: 'E', name: CAT_NAMES.E, score: catScores.E },
            { key: 'M', name: CAT_NAMES.M, score: catScores.M }
        ].sort((a, b) => b.score - a.score);
        const strongest = catEntries[0];
        const weakest = catEntries[catEntries.length - 1];

        const specialties = (s.specialtyRoles || '').split(',').filter(Boolean);
        const chipsHtml = specialties.map(r => {
            const emoji = { sommelier: 'So', barman: 'Ba', cuisinier: 'Cu', patissier: 'Pa', hotesse: 'Ho' };
            return `<span class="specialty-chip">${emoji[r.trim()] || ''} ${r.trim()}</span>`;
        }).join('');

        // 所属期間の取得
        const affHistory = getAffiliationHistory(s.staffId);
        const currentAff = affHistory.length > 0 ? affHistory[affHistory.length - 1] : null;
        const affSince = currentAff ? currentAff.from : '';
        const affSinceDisplay = affSince ? new Date(affSince).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

        return `
        <div class="staff-card" data-staff-id="${s.staffId}"
             onclick="openStaffModal('${s.staffId}')">
            <div class="card-drag-handle" draggable="true" title="ドラッグして配属変更"
                 ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)"
                 onclick="event.stopPropagation();">⠿</div>
            <div class="card-cp-rect">
                <svg viewBox="0 0 120 30" class="cp-rect-ring">
                    <rect x="1.5" y="1.5" width="117" height="27" rx="3" ry="3" fill="none" stroke="rgba(200,190,175,0.25)" stroke-width="2" />
                    <rect x="1.5" y="1.5" width="117" height="27" rx="3" ry="3" fill="none" stroke="${mgrColor}" stroke-width="2.5"
                          stroke-dasharray="${2*(117+27)}" stroke-dashoffset="${(2*(117+27)) - (mgrPct / 100) * (2*(117+27))}" stroke-linecap="round" />
                </svg>
                <div class="cp-rect-content">
                    <span class="cp-rect-label">MGR</span>
                    <span class="cp-rect-value" style="color:${mgrColor}">${mgrScore.toFixed(1)}</span>
                </div>
            </div>
            ${hasSelfData ? `<div class="card-self-badge">
                <span class="card-self-label">SELF</span>
                <span class="card-self-value">${selfScore.toFixed(1)}</span>
            </div>` : ''}
            <div class="card-identity">
                <div class="card-avatar" onclick="event.stopPropagation(); triggerPhotoUpload('${s.staffId}');">
                    ${s.photoUrl ? `<img src="${s.photoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : `<span class="avatar-initial">${(s.name || '?')[0]}</span>`}
                    <div class="avatar-upload-overlay">📷</div>
                </div>
                <div class="card-name">${s.name || '—'}</div>
                <div class="card-chips">
                    ${(() => {
                        const b = getBrigadeInfo(s);
                        return `<span class="card-chip card-chip--role">${b.level}${b.fr ? ' ' + b.fr : ''}</span>`;
                    })()}
                    ${chipsHtml}
                </div>
            </div>
            <div class="card-info-rows">
                <div class="card-info-row"><span class="card-info-key">所属</span><span class="card-info-val">${s.affiliation || '—'}</span></div>
                ${affSinceDisplay ? `<div class="card-info-row"><span class="card-info-key">配属</span><span class="card-info-val card-info-val--date">${affSinceDisplay}〜</span></div>` : ''}
                <div class="card-info-row"><span class="card-info-key">BEST</span><span class="card-info-val card-info-val--accent">${strongest.score > 0 ? `${strongest.name} ${strongest.score.toFixed(1)}` : '—'}</span></div>
                <div class="card-info-row card-info-row--editable" onclick="event.stopPropagation(); editGrowFocus('${s.staffId}', this);">
                    <span class="card-info-key">GROW</span>
                    <span class="card-info-val card-info-val--grow">${s._growthFocus
                        ? `${CAT_NAMES[s._growthFocus] || s._growthFocus} ✏️`
                        : (weakest.score > 0 && weakest.key !== strongest.key ? `${weakest.name} ${weakest.score.toFixed(1)}` : '—')
                    }</span>
                </div>
            </div>
            <div class="card-psem">
                ${['P','S','E','M'].map(k => {
                    const v = catScores[k]; const pct = Math.min((v/10)*100,100);
                    const c = {P:'#6b9a78',S:'#6889a8',E:'#9a7eb8',M:'#a08058'}[k];
                    return `<div class="card-psem-item"><span class="card-psem-key" style="color:${c}">${k}</span><div class="card-psem-bar"><div class="card-psem-fill" style="width:${pct}%;background:${c};"></div></div><span class="card-psem-val">${v.toFixed(1)}</span></div>`;
                }).join('')}
            </div>
        </div>`;
    };

    // ── 2. チームごとにセクション生成 ──
    // ソート: STORE_COLORS の定義順 (JW, NP, GA, BQ, ...) を優先
    const storeOrder = Object.keys(STORE_COLORS);
    const sortedTeams = Object.values(teams).sort((a, b) => {
        const ia = storeOrder.indexOf(a.short);
        const ib = storeOrder.indexOf(b.short);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    grid.innerHTML = sortedTeams.map(team => {
        const color = STORE_COLORS[team.short] || 'var(--text-sub)';
        const count = team.members.length;

        // チーム統計: 平均CP、P/S/E/M平均
        let totalCP = 0;
        const catTotals = { P: 0, S: 0, E: 0, M: 0 };
        team.members.forEach(m => {
            totalCP += Number(m.combatPower) || 0;
            try {
                const raw = typeof m.categoryScores === 'string' ? JSON.parse(m.categoryScores) : m.categoryScores;
                if (raw) {
                    catTotals.P += Number(raw.P) || 0;
                    catTotals.S += Number(raw.S) || 0;
                    catTotals.E += Number(raw.E) || 0;
                    catTotals.M += Number(raw.M) || 0;
                }
            } catch (e) { }
        });
        const avgCP = (totalCP / count).toFixed(1);
        const avgP = (catTotals.P / count).toFixed(1);
        const avgS = (catTotals.S / count).toFixed(1);
        const avgE = (catTotals.E / count).toFixed(1);
        const avgM = (catTotals.M / count).toFixed(1);

        // P/S/E/M ミニバーの高さ (0-10 → 0-100%)
        const barH = (val) => Math.min((Number(val) / 10) * 100, 100);

        // メンバーカード（Brigade順にソート: ①→⑥、同一レベル内はスコア降順）
        const LEVEL_ORDER = {'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6};
        const sortedMembers = [...team.members].sort((a, b) => {
            const la = LEVEL_ORDER[getBrigadeInfo(a).level] || 6;
            const lb = LEVEL_ORDER[getBrigadeInfo(b).level] || 6;
            if (la !== lb) return la - lb;
            return (Number(b.combatPower) || 0) - (Number(a.combatPower) || 0);
        });
        const cardsHtml = sortedMembers.map(s => buildStaffCard(s)).join('');

        return `
        <div class="team-section" style="border-left-color:${color};" data-team-short="${team.short}" data-team-name="${team.name || team.short}">
            <div class="team-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="team-header-info">
                    <div class="team-header-name">
                        <span class="team-code" style="color:${color};">${team.short}</span>
                        <span class="team-full-name">${team.name || team.short}</span>
                    </div>
                    <div class="team-stat">
                        <span class="team-stat-label">MEMBERS</span>
                        <span class="team-stat-value">${count}</span>
                    </div>
                    <div class="team-stat">
                        <span class="team-stat-label">TOTAL HBS</span>
                        <span class="team-stat-value" style="color:${color};">${totalCP.toFixed(0)}</span>
                    </div>
                    <div class="team-stat">
                        <span class="team-stat-label">AVG HBS</span>
                        <span class="team-stat-value">${avgCP}</span>
                    </div>
                    <div class="team-mini-radar">
                        <div class="team-bar-wrap" title="P: ${avgP}"><div class="team-bar-fill" style="height:${barH(avgP)}%;background:#6b9a78;"></div><span class="team-bar-key">P</span></div>
                        <div class="team-bar-wrap" title="S: ${avgS}"><div class="team-bar-fill" style="height:${barH(avgS)}%;background:#6889a8;"></div><span class="team-bar-key">S</span></div>
                        <div class="team-bar-wrap" title="E: ${avgE}"><div class="team-bar-fill" style="height:${barH(avgE)}%;background:#9a7eb8;"></div><span class="team-bar-key">E</span></div>
                        <div class="team-bar-wrap" title="M: ${avgM}"><div class="team-bar-fill" style="height:${barH(avgM)}%;background:#a08058;"></div><span class="team-bar-key">M</span></div>
                    </div>
                </div>
                <span class="team-toggle">▼</span>
            </div>
            <div class="team-members" data-team-short="${team.short}" data-team-name="${team.name || team.short}"
                 ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)"
                 ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                ${cardsHtml}
            </div>
        </div>`;
    }).join('');
}

function populateFilters() {
    // Search
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterAffiliation').addEventListener('change', applyFilters);
    document.getElementById('filterRole').addEventListener('change', applyFilters);
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const aff = document.getElementById('filterAffiliation').value;
    const role = document.getElementById('filterRole').value;

    const filtered = staffList.filter(s => {
        if (search && !(s.name || '').toLowerCase().includes(search)) return false;
        if (aff && s.affiliation !== aff) return false;
        if (role && !(s.hierarchyRole || '').includes(role)) return false;
        return true;
    });
    renderStaffGrid(filtered);
}

// ═══════════════════════════════════════════════════════════
// DRAG & DROP — Human Resource Simulator
// ═══════════════════════════════════════════════════════════
let draggedStaffId = null;

function handleDragStart(e) {
    // ドラッグハンドルからスタッフカードを特定
    const card = e.currentTarget.closest('.staff-card');
    draggedStaffId = card ? card.dataset.staffId : null;
    if (!draggedStaffId) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedStaffId);
    if (card) card.classList.add('staff-card--dragging');
    // Show all drop zones
    document.querySelectorAll('.team-members').forEach(z => z.classList.add('drop-zone--ready'));
}

function handleDragEnd(e) {
    const card = e.currentTarget.closest('.staff-card');
    if (card) card.classList.remove('staff-card--dragging');
    document.querySelectorAll('.team-members').forEach(z => {
        z.classList.remove('drop-zone--ready', 'drop-zone--over');
    });
    draggedStaffId = null;
}

// ── Editable GROW Focus ──
function editGrowFocus(staffId, rowEl) {
    // Remove existing menu
    document.querySelectorAll('.grow-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'grow-menu';
    const options = [
        { key: 'P', label: 'パーソナル力' },
        { key: 'S', label: 'サービススキル' },
        { key: 'E', label: '経験・資格' },
        { key: 'M', label: 'マネジメント' },
        { key: '', label: '🔄 自動に戻す' }
    ];

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'grow-menu-btn';
        btn.textContent = opt.key ? `${opt.key}: ${opt.label}` : opt.label;
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.remove();
            saveGrowFocus(staffId, opt.key);
        };
        menu.appendChild(btn);
    });

    rowEl.style.position = 'relative';
    rowEl.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 10);
}

function saveGrowFocus(staffId, catKey) {
    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    staff._growthFocus = catKey || null;

    // Save to localStorage for persistence across reloads
    const stored = JSON.parse(localStorage.getItem('ti_grow_focus') || '{}');
    if (catKey) {
        stored[staffId] = catKey;
    } else {
        delete stored[staffId];
    }
    localStorage.setItem('ti_grow_focus', JSON.stringify(stored));

    // Also persist to backend
    TI_BRIDGE.updateProfile(staffId, { growthFocus: catKey || '' })
        .then(res => {
            TI_BRIDGE.showToast(catKey
                ? `✅ ${staff.name} の成長課題 → ${CAT_NAMES[catKey]} に設定`
                : `✅ ${staff.name} の成長課題 → 自動に戻しました`);
        })
        .catch(err => console.warn('growthFocus save failed:', err));

    renderStaffGrid(staffList);
}

// Load saved growthFocus from localStorage on init
function loadGrowFocus() {
    const stored = JSON.parse(localStorage.getItem('ti_grow_focus') || '{}');
    staffList.forEach(s => {
        if (stored[s.staffId]) s._growthFocus = stored[s.staffId];
    });
}

// ── Photo Upload ──
function triggerPhotoUpload(staffId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            TI_BRIDGE.showToast('ファイルサイズは2MB以下にしてください');
            return;
        }
        TI_BRIDGE.showToast('写真をアップロード中...');
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result.split(',')[1];
                const res = await TI_BRIDGE.uploadPhoto(staffId, base64);
                if (res.result === 'success') {
                    // ローカルのstaffListを更新
                    const staff = staffList.find(s => s.staffId === staffId);
                    if (staff && res.photoUrl) staff.photoUrl = res.photoUrl;
                    renderStaffGrid(staffList);
                    TI_BRIDGE.showToast('写真をアップロードしました ✅');
                } else {
                    TI_BRIDGE.showToast('アップロードエラー: ' + (res.error || 'Unknown'));
                }
            } catch (err) {
                TI_BRIDGE.showToast('アップロードエラー: ' + err.message);
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-zone--over');
}

function handleDragLeave(e) {
    // Only remove if truly leaving the container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drop-zone--over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-zone--over');
    const staffId = e.dataTransfer.getData('text/plain');
    const targetTeamShort = e.currentTarget.dataset.teamShort;
    const targetTeamName = e.currentTarget.dataset.teamName;
    if (!staffId || !targetTeamShort) return;

    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    const oldAffiliation = staff.affiliation;
    const oldShort = shortName(oldAffiliation);
    if (oldShort === targetTeamShort) return; // Same team, no-op

    // Update affiliation locally
    staff.affiliation = targetTeamName;

    // Record affiliation history (localStorage)
    recordAffiliationChange(staffId, oldAffiliation, targetTeamName);

    // Re-render with updated data
    renderStaffGrid(staffList);

    TI_BRIDGE.showToast(`🔄 ${staff.name} → ${targetTeamShort} に移動中...`);

    // Persist to backend (GAS)
    TI_BRIDGE.updateProfile(staffId, { affiliation: targetTeamName })
        .then(res => {
            if (res.result === 'success') {
                TI_BRIDGE.showToast(`✅ ${staff.name} → ${targetTeamShort} 保存完了`);
            } else {
                TI_BRIDGE.showToast(`⚠️ 保存失敗: ${res.error || '不明なエラー'}`);
            }
        })
        .catch(err => {
            TI_BRIDGE.showToast(`❌ 保存エラー: ${err.message}`);
            // Revert on failure
            staff.affiliation = oldAffiliation;
            renderStaffGrid(staffList);
        });
}

// ── Affiliation History (localStorage) ──
function getAffiliationHistory(staffId) {
    const all = JSON.parse(localStorage.getItem('ti_affiliation_history') || '{}');
    return all[staffId] || [];
}

function recordAffiliationChange(staffId, fromStore, toStore) {
    const all = JSON.parse(localStorage.getItem('ti_affiliation_history') || '{}');
    if (!all[staffId]) all[staffId] = [];

    const now = new Date().toISOString().slice(0, 10);

    // Close previous entry
    const history = all[staffId];
    if (history.length > 0) {
        const last = history[history.length - 1];
        if (!last.to) last.to = now;
    }

    // Add new entry
    history.push({ from: now, to: null, store: toStore, previousStore: fromStore });
    all[staffId] = history;
    localStorage.setItem('ti_affiliation_history', JSON.stringify(all));
}


// ═══════════════════════════════════════════════════════════
// Staff Modal
// ═══════════════════════════════════════════════════════════
async function openStaffModal(staffId) {
    const modal = document.getElementById('staffModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    title.textContent = `${staff.name} (${staff.staffId})`;
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">読み込み中...</div>';
    modal.classList.remove('hidden');

    try {
        const history = await TI_BRIDGE.loadHistory(staffId);
        const cp = Number(staff.combatPower) || 0;
        let catScores = {};
        try { catScores = typeof staff.categoryScores === 'string' ? JSON.parse(staff.categoryScores) : staff.categoryScores || {}; } catch (e) { }

        body.innerHTML = `
            <div class="modal-info-grid">
                <div class="info-row"><span class="info-label">所属</span><span class="info-value">${staff.affiliation || '—'}</span></div>
                <div class="info-row"><span class="info-label">役職</span>
                    <select id="modalJobTitle" onchange="updateStaffField('${staffId}','jobTitle',this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;">
                        ${['一般','アシスタントキャプテン','キャプテン','アシスタントマネジャー','マネジャーまたは副支配人','チーフマネジャー・支配人','ディビジョン支配人','統括支配人','ゼネラルマネジャー・総支配人'].map(j =>
                            `<option value="${j}" ${staff.jobTitle === j ? 'selected' : ''}>${j}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="info-row"><span class="info-label">ロール</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${['sommelier','barman','cuisinier','patissier','hotesse'].map(r => {
                            const roles = (staff.specialtyRoles || '').split(',').map(x => x.trim()).filter(Boolean);
                            const active = roles.includes(r);
                            return `<button onclick="toggleRole('${staffId}','${r}',this)" style="padding:3px 8px;border-radius:12px;font-size:11px;cursor:pointer;border:1px solid ${active ? 'var(--gold)' : 'var(--border)'};background:${active ? 'var(--gold)' : 'transparent'};color:${active ? '#fff' : 'var(--text-dim)'};">${r}</button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="info-row"><span class="info-label">資格</span><span class="info-value">${staff.qualifications || '—'}</span></div>
                <div class="info-row"><span class="info-label">CP</span><span class="info-value" style="color:var(--gold);font-weight:800;font-size:16px;">${cp.toFixed(1)}</span></div>
                <div class="info-row"><span class="info-label">評価回数</span><span class="info-value">${staff.evalCount || 0}回</span></div>
            </div>

            <div class="modal-cat-scores">
                ${[{ k: 'P', name: CAT_NAMES.P, color: '#6b9a78' }, { k: 'S', name: CAT_NAMES.S, color: '#6889a8' }, { k: 'E', name: CAT_NAMES.E, color: '#9a7eb8' }, { k: 'M', name: CAT_NAMES.M, color: '#a08058' }].map(c => `
                    <div class="modal-cat-block">
                        <div class="modal-cat-score" style="color:${c.color};">${(catScores[c.k] || 0).toFixed(1)}</div>
                        <div class="modal-cat-label" style="color:${c.color};opacity:0.7;">${c.name}</div>
                    </div>
                `).join('')}
            </div>

            <div class="modal-radar-container">
                <canvas id="modalRadarChart"></canvas>
            </div>

            ${(() => {
                const latestEval = (history.result === 'success' && history.history.length > 0) ?
                    history.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;
                const scores = latestEval?.scores || {};
                if (!latestEval) return '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;opacity:0.7;">評価データなし — ASSESSタブで評価を実行してください</div>';

                const catMeta = [
                    { key: 'P', name: CAT_NAMES.P, color: '#6b9a78' },
                    { key: 'S', name: CAT_NAMES.S, color: '#6889a8' },
                    { key: 'E', name: CAT_NAMES.E, color: '#9a7eb8' },
                    { key: 'M', name: CAT_NAMES.M, color: '#a08058' }
                ];
                return `
                    <div class="modal-skill-section-title">SKILL DETAIL — 24 Attributes</div>
                    <div class="modal-skill-grid">
                        ${catMeta.map(cat => {
                    const items = Object.entries(SKILL_LABELS[cat.key]).map(([k, label]) => {
                        const val = Number(scores[k] || 0);
                        const pct = (val / 10) * 100;
                        return `<div class="modal-skill-item">
                                    <span class="modal-skill-label">${label}</span>
                                    <div class="modal-skill-bar-track">
                                        <div class="modal-skill-bar-fill" style="width:${pct}%;background:${cat.color};"></div>
                                    </div>
                                    <span class="modal-skill-val" style="color:${cat.color};">${val.toFixed(1)}</span>
                                </div>`;
                    }).join('');
                    return `<div class="modal-skill-category">
                                <div class="modal-skill-cat-header" style="color:${cat.color};">
                                    <span class="modal-skill-cat-dot" style="background:${cat.color};"></span>
                                    ${cat.name}
                                </div>
                                ${items}
                            </div>`;
                }).join('')}
                    </div>
                `;
            })()}

            ${history.result === 'success' && history.history.length > 0 ? `
                <div class="modal-history-title">EVALUATION HISTORY</div>
                <div class="modal-history-list">
                    ${history.history.map(h => `
                        <div class="modal-history-item">
                            <span class="modal-history-date">${new Date(h.timestamp).toLocaleDateString('ja-JP')}</span>
                            <span class="modal-history-score">${Number(h.totalScore || 0).toFixed(1)}</span>
                            <span class="modal-history-memo">${h.memo || ''}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '<div style="text-align:center;padding:28px;color:var(--text-muted);opacity:0.6;">評価履歴がありません</div>'}
        `;

        // Render Self vs Manager comparison radar
        setTimeout(() => {
            const ctx = document.getElementById('modalRadarChart');
            if (!ctx || !history.result || history.history.length === 0) return;

            // Split history by evalType
            const selfEval = history.history.find(h => h.evalType === 'Self');
            const mgrEval = history.history.find(h => h.evalType === 'Manager');

            const calcCatAvg = (scores) => {
                if (!scores) return [0, 0, 0, 0];
                const avg = (keys) => keys.reduce((s, k) => s + Number(scores[k] || 0), 0) / keys.length;
                return [
                    avg(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
                    avg(['s1', 's2', 's3', 's4', 's5', 's6']),
                    avg(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']),
                    avg(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'])
                ];
            };

            const datasets = [];
            if (selfEval) {
                datasets.push({
                    label: 'Self',
                    data: calcCatAvg(selfEval.scores),
                    backgroundColor: 'rgba(96, 165, 250, 0.15)',
                    borderColor: '#6889a8',
                    borderWidth: 2,
                    pointBackgroundColor: '#6889a8',
                    pointRadius: 5
                });
            }
            if (mgrEval) {
                datasets.push({
                    label: 'Manager',
                    data: calcCatAvg(mgrEval.scores),
                    backgroundColor: 'rgba(200, 164, 94, 0.15)',
                    borderColor: '#a08058',
                    borderWidth: 2,
                    pointBackgroundColor: '#a08058',
                    pointRadius: 5
                });
            }
            // Fallback: use catScores from master if no split data
            // NOTE: catScores from backend are already averages (0-10 scale), do NOT divide by 6
            if (datasets.length === 0 && catScores) {
                datasets.push({
                    label: 'Latest',
                    data: [Number(catScores.P) || 0, Number(catScores.S) || 0, Number(catScores.E) || 0, Number(catScores.M) || 0],
                    backgroundColor: 'rgba(200, 164, 94, 0.2)',
                    borderColor: '#a08058',
                    borderWidth: 2,
                    pointBackgroundColor: '#a08058',
                    pointRadius: 5
                });
            }

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: [CAT_NAMES.P, CAT_NAMES.S, CAT_NAMES.E, CAT_NAMES.M],
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: '#8a8278', backdropColor: 'transparent' }, grid: { color: 'rgba(200, 190, 175, 0.3)' }, pointLabels: { color: '#5a5248', font: { size: 11, family: "Menlo, Monaco, 'Courier New', monospace" } } } },
                    plugins: {
                        legend: {
                            display: datasets.length > 1,
                            labels: { color: '#5a5248', font: { size: 11, family: "Menlo, Monaco, 'Courier New', monospace" }, usePointStyle: true }
                        }
                    }
                }
            });
        }, 100);

    } catch (e) {
        body.innerHTML = `<div style="color:var(--red);">エラー: ${e.message}</div>`;
    }
}

function closeModal() {
    document.getElementById('staffModal').classList.add('hidden');
}

// ── Modal: フィールド更新 ──
async function updateStaffField(staffId, field, value) {
    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    staff[field] = value;
    const updates = {};
    updates[field] = value;

    try {
        await TI_BRIDGE.updateProfile(staffId, updates);
        TI_BRIDGE.showToast(`✅ ${staff.name} の${field}を更新しました`);
        renderStaffGrid(staffList);
    } catch (e) {
        TI_BRIDGE.showToast('❌ 更新に失敗しました');
    }
}

// ── Modal: ロールトグル ──
async function toggleRole(staffId, role, btnEl) {
    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    let roles = (staff.specialtyRoles || '').split(',').map(x => x.trim()).filter(Boolean);

    if (roles.includes(role)) {
        roles = roles.filter(r => r !== role);
        btnEl.style.background = 'transparent';
        btnEl.style.color = 'var(--text-dim)';
        btnEl.style.borderColor = 'var(--border)';
    } else {
        roles.push(role);
        btnEl.style.background = 'var(--gold)';
        btnEl.style.color = '#fff';
        btnEl.style.borderColor = 'var(--gold)';
    }

    staff.specialtyRoles = roles.join(',');

    try {
        await TI_BRIDGE.updateProfile(staffId, { specialtyRoles: staff.specialtyRoles });
        TI_BRIDGE.showToast(`✅ ${staff.name} のロールを更新しました`);
        renderStaffGrid(staffList);
    } catch (e) {
        TI_BRIDGE.showToast('❌ ロール更新に失敗しました');
    }
}

// ═══════════════════════════════════════════════════════════
// ② ASSESS
// ═══════════════════════════════════════════════════════════
function populateAssessSelect() {
    const sel = document.getElementById('assessStaff');
    sel.innerHTML = '<option value="">スタッフを選択...</option>';
    staffList.forEach(s => {
        sel.innerHTML += `<option value="${s.staffId}">${s.name} (${s.affiliation})</option>`;
    });
    sel.addEventListener('change', () => {
        const show = !!sel.value;
        document.getElementById('skillCard').style.display = show ? '' : 'none';
        document.getElementById('radarCard').style.display = show ? '' : 'none';
        document.getElementById('adviceCard').style.display = 'none';
        if (show) resetSkillScores();
    });
}

function initSkillSliders() {
    const container = document.getElementById('skillSliders');
    if (!container) return;

    // Category tab switching
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.skill-group').forEach(g => g.classList.remove('active'));
            document.getElementById('skills-' + btn.dataset.cat).classList.add('active');
        });
    });

    // Create sliders
    let html = '';
    ['P', 'S', 'E', 'M'].forEach(cat => {
        html += `<div class="skill-group ${cat === 'P' ? 'active' : ''}" id="skills-${cat}">`;
        Object.entries(SKILL_LABELS[cat]).forEach(([key, label]) => {
            skillScores[key] = 5.0;
            html += `
            <div class="skill-row">
                <span class="skill-label">${label}</span>
                <input type="range" class="skill-slider" min="1" max="10" value="5" 
                       id="slider-${key}" oninput="updateSkill('${key}', this.value)">
                <span class="skill-value" id="val-${key}">5.0</span>
            </div>`;
        });
        html += '</div>';
    });
    container.innerHTML = html;
}

function resetSkillScores() {
    Object.keys(skillScores).forEach(k => {
        skillScores[k] = 5;
        const slider = document.getElementById('slider-' + k);
        const val = document.getElementById('val-' + k);
        if (slider) slider.value = 5;
        if (val) val.textContent = '5.0';
    });
    updateTotalScore();
    updateRadarChart();
}

function updateSkill(key, value) {
    skillScores[key] = parseInt(value);
    document.getElementById('val-' + key).textContent = Number(value).toFixed(1);
    updateTotalScore();
    updateRadarChart();
}

function updateTotalScore() {
    const total = Object.values(skillScores).reduce((s, v) => s + v, 0);
    document.getElementById('totalScore').textContent = total;
}

function updateRadarChart() {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    const catAvg = (keys) => keys.reduce((s, k) => s + (skillScores[k] || 0), 0) / keys.length;
    const data = [
        catAvg(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
        catAvg(['s1', 's2', 's3', 's4', 's5', 's6']),
        catAvg(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']),
        catAvg(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'])
    ];

    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [CAT_NAMES.P, CAT_NAMES.S, CAT_NAMES.E, CAT_NAMES.M],
            datasets: [{
                data,
                backgroundColor: 'rgba(200, 164, 94, 0.15)',
                borderColor: '#a08058',
                borderWidth: 2,
                pointBackgroundColor: '#a08058',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0, max: 10,
                    ticks: { stepSize: 2, color: '#8a8278', backdropColor: 'transparent', font: { size: 10 } },
                    grid: { color: 'rgba(37, 37, 72, 0.5)' },
                    pointLabels: { color: '#5a5248', font: { size: 12, family: "Menlo, Monaco, 'Courier New', monospace" } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function saveAssessment() {
    const staffId = document.getElementById('assessStaff').value;
    const evaluator = document.getElementById('assessEvaluator').value;
    const memo = document.getElementById('assessMemo').value;
    const evalType = document.getElementById('assessType').value;

    if (!staffId) { TI_BRIDGE.showToast('スタッフを選択してください'); return; }
    if (!evaluator) { TI_BRIDGE.showToast('評価者名を入力してください'); return; }

    try {
        const res = await TI_BRIDGE.saveEvaluation(staffId, skillScores, evaluator, memo, evalType);
        if (res.result !== 'success') throw new Error(res.error);

        // Show advice
        if (res.advice) {
            document.getElementById('adviceCard').style.display = '';
            document.getElementById('adviceContent').innerHTML = `
                <div class="advice-box">
                    <h4>${res.advice.overallAdvice}</h4>
                    <div class="advice-text">
                        <p><strong>STRONGEST:</strong> ${res.advice.strongest.nameJp} (${res.advice.strongest.score.toFixed(1)})</p>
                        <p>${res.advice.strongest.tip}</p>
                        <p style="margin-top:12px;"><strong>GROWTH FOCUS:</strong> ${res.advice.growthFocus.nameJp} (${res.advice.growthFocus.score.toFixed(1)})</p>
                        <p>${res.advice.growthFocus.tip}</p>
                    </div>
                </div>`;
        }

        TI_BRIDGE.showToast(`評価データを保存しました ✅ CP: ${res.totalScore}`);
        loadRoster(); // Refresh roster
    } catch (e) {
        TI_BRIDGE.showToast('保存エラー: ' + e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// ③ GROWTH
// ═══════════════════════════════════════════════════════════
function populateGrowthSelects() {
    ['growthStaff1', 'growthStaff2'].forEach(id => {
        const sel = document.getElementById(id);
        const placeholder = id === 'growthStaff1' ? 'スタッフ1' : 'スタッフ2 (任意)';
        sel.innerHTML = `<option value="">${placeholder}</option>`;
        staffList.forEach(s => {
            sel.innerHTML += `<option value="${s.staffId}">${s.name}</option>`;
        });
    });
}

// ── Growth chart helper: calc category avg from individual scores ──
function calcGrowthCatAvg(scores, prefix) {
    if (!scores) return 0;
    const keys = [1, 2, 3, 4, 5, 6].map(n => prefix + n);
    const vals = keys.map(k => Number(scores[k] || 0));
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

async function loadGrowthChart() {
    const id1 = document.getElementById('growthStaff1').value;
    const id2 = document.getElementById('growthStaff2').value;
    if (!id1) { TI_BRIDGE.showToast('スタッフ1を選択してください'); return; }

    try {
        const h1 = await TI_BRIDGE.loadHistory(id1);
        const datasets = [];
        const labels = [];
        const staff1 = staffList.find(s => s.staffId === id1);
        const name1 = staff1?.name || id1;

        if (h1.result === 'success' && h1.history.length > 0) {
            const sorted1 = h1.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            sorted1.forEach(h => labels.push(new Date(h.timestamp).toLocaleDateString('ja-JP')));

            // Total Score line (dashed, left Y-axis)
            datasets.push({
                label: `${name1} — Total`,
                data: sorted1.map(h => Number(h.totalScore) || 0),
                borderColor: 'rgba(200, 164, 94, 0.5)',
                backgroundColor: 'rgba(200, 164, 94, 0.05)',
                borderWidth: 2, borderDash: [6, 3],
                pointRadius: 4, pointBackgroundColor: '#a08058',
                tension: 0.3, fill: true,
                yAxisID: 'yTotal'
            });

            // Category breakdown lines (right Y-axis)
            const catMeta = [
                { prefix: 'p', label: 'P (' + CAT_NAMES.P + ')', color: '#6b9a78' },
                { prefix: 's', label: 'S (' + CAT_NAMES.S + ')', color: '#6889a8' },
                { prefix: 'e', label: 'E (' + CAT_NAMES.E + ')', color: '#9a7eb8' },
                { prefix: 'm', label: 'M (' + CAT_NAMES.M + ')', color: '#a08058' }
            ];
            catMeta.forEach(cat => {
                datasets.push({
                    label: `${name1} — ${cat.label}`,
                    data: sorted1.map(h => calcGrowthCatAvg(h.scores, cat.prefix)),
                    borderColor: cat.color,
                    backgroundColor: cat.color,
                    borderWidth: 2, pointRadius: 3,
                    pointBackgroundColor: cat.color,
                    tension: 0.3, fill: false,
                    yAxisID: 'yCat'
                });
            });
        }

        // Staff 2 comparison (total score only)
        if (id2) {
            const h2 = await TI_BRIDGE.loadHistory(id2);
            if (h2.result === 'success' && h2.history.length > 0) {
                const sorted2 = h2.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const staff2 = staffList.find(s => s.staffId === id2);
                datasets.push({
                    label: `${staff2?.name || id2} — Total`,
                    data: sorted2.map(h => Number(h.totalScore) || 0),
                    borderColor: 'rgba(96, 165, 250, 0.5)',
                    backgroundColor: 'rgba(96, 165, 250, 0.05)',
                    borderWidth: 2, borderDash: [6, 3],
                    pointRadius: 4, pointBackgroundColor: '#6889a8',
                    tension: 0.3, fill: true,
                    yAxisID: 'yTotal'
                });
            }
        }

        if (growthChart) growthChart.destroy();
        growthChart = new Chart(document.getElementById('growthChart'), {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    yCat: {
                        type: 'linear', position: 'left', min: 0, max: 10,
                        title: { display: true, text: 'Category Avg (0-10)', color: '#8a8278', font: { size: 10, family: "Menlo, Monaco, 'Courier New', monospace" } },
                        grid: { color: 'rgba(200, 190, 175, 0.2)' },
                        ticks: { stepSize: 2, color: '#8a8278', font: { family: "Menlo, Monaco, 'Courier New', monospace" } }
                    },
                    yTotal: {
                        type: 'linear', position: 'right', min: 0, max: 240,
                        title: { display: true, text: 'Total (0-240)', color: '#8a8278', font: { size: 10, family: "Menlo, Monaco, 'Courier New', monospace" } },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#8a8278', font: { family: "Menlo, Monaco, 'Courier New', monospace" } }
                    },
                    x: { grid: { display: false }, ticks: { color: '#8a8278', font: { size: 10 } } }
                },
                plugins: {
                    legend: { labels: { color: '#5a5248', font: { family: "Menlo, Monaco, 'Courier New', monospace", size: 11 }, usePointStyle: true } }
                }
            }
        });
    } catch (e) {
        TI_BRIDGE.showToast('履歴取得エラー: ' + e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// ④ SHIFT LINK
// ═══════════════════════════════════════════════════════════
async function generateShiftProposal() {
    const container = document.getElementById('shiftProposal');

    try {
        const supplyData = await TI_BRIDGE.loadShiftData();
        if (supplyData.result !== 'success') throw new Error(supplyData.error);

        // Demo demand (MPとの実接続時はMP APIから取得)
        const demand = {
            date: document.getElementById('shiftDate').value || new Date().toISOString().slice(0, 10),
            store: document.getElementById('shiftStore').value,
            requiredPositions: [
                { pos: 'Kitchen', minCP: 30, count: 2 },
                { pos: 'Hall', minCP: 20, count: 3 },
                { pos: 'Bar', minCP: 30, count: 1 }
            ]
        };

        const result = SHIFT_ENGINE.generateProposal(demand, supplyData.supply);

        container.innerHTML = `
            <div class="card" style="margin-top:16px;">
                <h3>SHIFT PROPOSAL — ${demand.store} / ${demand.date}</h3>
                <div style="margin-bottom:12px;">
                    <span class="${result.valid ? 'shift-valid' : 'shift-invalid'}">
                        ${result.valid ? 'VALID — リーダー配置済み' : 'INVALID — リーダー不足'}
                    </span>
                    <span style="margin-left:12px;font-family:Menlo, Monaco, 'Courier New';font-size:12px;color:var(--text-dim);">
                        配置: ${result.totalAssigned}名
                    </span>
                </div>
                <div class="shift-result-grid">
                    ${result.proposal.map(p => `
                        <div class="shift-position-card">
                            <h4>${p.position}</h4>
                            ${p.assigned.map(s => `
                                <div class="shift-assigned">
                                    <span style="color:var(--gold);">${s.hierarchy}</span>
                                    <span>${s.name}</span>
                                    <span style="margin-left:auto;font-family:Menlo, Monaco, 'Courier New';font-size:12px;color:var(--text-dim);">CP ${s.cp}</span>
                                </div>
                            `).join('')}
                            ${p.shortage > 0 ? `<div class="shift-shortage">不足: ${p.shortage}名 → Timee で補完</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="card" style="margin-top:16px;"><div style="color:var(--red);">エラー: ${e.message}</div></div>`;
    }
}

// ═══════════════════════════════════════════════════════════
// PDF Export — Modal → A4 PDF via html2canvas + jsPDF
// ═══════════════════════════════════════════════════════════
async function exportModalPDF() {
    const btn = document.querySelector('.btn--pdf');
    const originalText = btn.textContent;
    btn.textContent = '生成中...';
    btn.disabled = true;

    try {
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modalBody');
        const title = document.getElementById('modalTitle').textContent;

        // Temporarily hide buttons & expand modal for capture
        const headerActions = document.querySelector('.modal-header-actions');
        const overlay = document.getElementById('staffModal');
        headerActions.style.display = 'none';
        modalContent.style.maxHeight = 'none';
        modalContent.style.overflow = 'visible';
        modalBody.style.maxHeight = 'none';
        modalBody.style.overflow = 'visible';

        // Kill the overlay backdrop so it doesn't bleed through
        overlay.style.background = 'transparent';
        overlay.style.backdropFilter = 'none';
        overlay.style.webkitBackdropFilter = 'none';

        // Force 100% opaque solid background on modal itself
        modalContent.style.background = '#f0ebe0';
        modalContent.style.boxShadow = 'none';

        // Force solid opaque backgrounds for crisp PDF capture
        modalContent.classList.add('pdf-capture-mode');

        // Wait a tick for styles to apply 
        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(modalContent, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#f0ebe0',
            logging: false,
            windowWidth: modalContent.scrollWidth,
            windowHeight: modalContent.scrollHeight,
            onclone: (doc) => {
                // Force solid colors in cloned document
                const clonedModal = doc.querySelector('.modal-content');
                if (clonedModal) {
                    clonedModal.style.background = '#f0ebe0';
                    clonedModal.style.boxShadow = 'none';
                    // Force all cards/sections to have opaque backgrounds
                    clonedModal.querySelectorAll('.card, .modal-info-grid > div, .modal-cat-score, [class*="modal-"]').forEach(el => {
                        const bg = getComputedStyle(el).backgroundColor;
                        if (bg && bg.includes('rgba')) {
                            // Convert rgba to solid by blending with background
                            const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
                            if (match) {
                                const [, r, g, b, a] = match;
                                const alpha = a ? parseFloat(a) : 1;
                                const bgR = 240, bgG = 235, bgB = 224; // #f0ebe0
                                const sr = Math.round(parseInt(r) * alpha + bgR * (1 - alpha));
                                const sg = Math.round(parseInt(g) * alpha + bgG * (1 - alpha));
                                const sb = Math.round(parseInt(b) * alpha + bgB * (1 - alpha));
                                el.style.backgroundColor = `rgb(${sr}, ${sg}, ${sb})`;
                            }
                        }
                    });
                    // Force text colors to be strong
                    clonedModal.querySelectorAll('*').forEach(el => {
                        const color = getComputedStyle(el).color;
                        if (color && color.includes('rgba')) {
                            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
                            if (match) {
                                const [, r, g, b, a] = match;
                                const alpha = a ? parseFloat(a) : 1;
                                if (alpha < 0.6) {
                                    el.style.color = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha + 0.3, 1)})`;
                                }
                            }
                        }
                    });
                }
            }
        });

        // Restore modal styles
        modalContent.classList.remove('pdf-capture-mode');
        overlay.style.background = '';
        overlay.style.backdropFilter = '';
        overlay.style.webkitBackdropFilter = '';
        modalContent.style.background = '';
        modalContent.style.boxShadow = '';
        headerActions.style.display = '';
        modalContent.style.maxHeight = '';
        modalContent.style.overflow = '';
        modalBody.style.maxHeight = '';
        modalBody.style.overflow = '';

        const { jsPDF } = window.jspdf;

        // A4: 210mm x 297mm
        const pdfW = 210;
        const pdfH = 297;
        const margin = 8;
        const usableW = pdfW - margin * 2;

        const imgW = canvas.width;
        const imgH = canvas.height;
        const ratio = usableW / imgW;
        const scaledH = imgH * ratio;

        // Multi-page if content exceeds A4 height
        const usableH = pdfH - margin * 2;
        const totalPages = Math.ceil(scaledH / usableH);
        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            const srcY = (page * usableH) / ratio;
            const srcH = Math.min(usableH / ratio, imgH - srcY);
            const destH = srcH * ratio;

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgW;
            pageCanvas.height = srcH;
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

            const pageImg = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImg, 'PNG', margin, margin, usableW, destH);
        }

        // File name: staffName_YYYYMMDD.pdf
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const safeName = title.replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '_').replace(/_+/g, '_');
        pdf.save(`TI_${safeName}_${dateStr}.pdf`);

        btn.textContent = '完了 ✓';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    } catch (e) {
        console.error('PDF export error:', e);
        btn.textContent = 'エラー';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    } finally {
        btn.disabled = false;
    }
}
