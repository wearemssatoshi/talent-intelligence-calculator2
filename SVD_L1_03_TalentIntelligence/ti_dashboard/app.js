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

// ── Skill Labels（Config-Driven: GASから上書き可能）──
let SKILL_LABELS = {
    P: {
        p1: '自己成長/学習意欲', p2: '協調性/チームワーク', p3: 'ストレス耐性/柔軟性',
        p4: '当事者意識/責任感', p5: '共感力/傾聴力', p6: 'SVD理念への共鳴'
    },
    S: {
        s1: 'トータルスキル', s2: '専門スキル（料理知識）', s3: '専門スキル（ドリンク知識 ※ワイン除く）',
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

// ── Skill Rubrics (Config-Driven: GASから上書き可能) ──
let SKILL_RUBRICS = {
    P: {
        p1: '新しい知識やスキルを自発的に学び、実際の業務やサービス向上に活かそうとする姿勢があるか。',
        p2: '他のスタッフと円滑にコミュニケーションを取り、情報共有や業務のフォローアップを適切に行っているか。',
        p3: '繁忙時やクレーム等の予測せぬトラブルに対して、感情をコントロールし冷静かつ柔軟に対応できているか。',
        p4: '自身の役割を深く理解し、店舗の目標達成や課題解決に対して他人事ではなく「自分事」として取り組んでいるか。',
        p5: 'お客様や仲間の状況・感情を察知し、相手の立場に立った寄り添いのある発言や行動ができているか。',
        p6: 'SVDのブランドコンセプト（ここだけの美味しさ/エンターテインメント）を深く理解し、日々の行動で体現しているか。'
    },
    S: {
        s1: '接客の基本動作（挨拶・笑顔・身だしなみ・トーン）が極めて高い水準で備わっているか。',
        s2: '提供する料理の食材、調理法、コンセプトを正確に理解し、お客様の興味を惹きつける説明ができるか。',
        s3: 'ビールやカクテル、ソフトドリンク等の特性を理解し、正確な知識のもと最適な状態・タイミングで提供できるか。',
        s4: 'ワインの専門知識を持ち、料理とのペアリングやお客様の好みに合わせた最適な提案ができるか。',
        s5: '一人ひとりのお客様の属性や利用シーン（記念日や接待など）に合わせた、個別化されたサービスが提供できるか。',
        s6: 'POS操作、TIダッシュボード、インカム連携、予約管理システムなど、店舗のIT・メカニックツールを正確に操作できるか。'
    },
    E: {
        e1: 'レストラン・飲食業界における豊富な実務経験と、そこから培われた高度な暗黙知を有しているか。',
        e2: 'SVD（各店舗）での在籍経験を通じ、店舗独自のルールやオペレーションの歴史・背景を深く理解しているか。',
        e3: 'ソムリエ、調理師などの国家資格・専門資格を保有し、それを現場のパフォーマンス向上に直結させているか。',
        e4: 'PCスキル、言語能力（インバウンド対応）、事務能力など、フロア以外の場所でも組織に貢献できる汎用的スキルがあるか。',
        e5: '役職者（責任者・キャプテン等）としての経験を持ち、権限と責任を伴う判断を適切に行うことができるか。',
        e6: '月間MVPや売上目標達成、大会での表彰など、社内外で客観的に評価される実績を残しているか。'
    },
    M: {
        m1: 'F/Lコスト（原価・人件費）や売上目標の進捗を正確に把握し、利益最大化に向けた日々の管理ができているか。',
        m2: 'スタッフのモチベーションを高め、適材適所の配置と計画的な人材育成により強いチームを構築できているか。',
        m3: '営業中のフロア全体を見渡し、ボトルネックの解消や人員の再配置など、的確な指示でスムーズな店舗運営を実現しているか。',
        m4: '現状の課題を分析し、新しい企画や業務改善の仕組みを自ら立案・実行して組織を良い方向へ導いているか。',
        m5: '自身の行動で範を示し、周囲の尊敬を集めながら、チーム全体をひとつの目標に向かって力強く牽引しているか。',
        m6: 'リピーターの獲得や地域のインフルエンス向上など、SVDの「ブランド価値」を高め、新たな顧客・ファンを創造しているか。'
    }
};

// ── Category Display Names (Config-Driven) ──
let CAT_NAMES = { P: 'パーソル力', S: 'サービススキル', E: '経験・資格', M: 'マネジメントスキル' };

// ── Store Colors & Short Names (Config-Driven) ──
let STORE_COLORS = {
    JW: '#b8965c', NP: '#8aab7a', BQ: '#a990c0', GA: '#7ea3b8',
    BG: '#6ab5b0', RYB: '#c49060', Ce: '#a090b0', RP: '#c0808a',
    CL: '#e0a050', POP: '#b0c860',
    RSV: '#708090'
};

// ── SVD 18 Attributes (Config-Driven) ──
let SVD_TYPES = {
    "Balance":     { name: "Balance",     nameJp: "バランス",       desc: "汎用・適応",   color: '#b8995c' },
    "Flare":       { name: "Flare",       nameJp: "フレア",         desc: "情熱・突破",   color: '#b87a6a' },
    "Flow":        { name: "Flow",        nameJp: "フロー",         desc: "柔軟・浸透",   color: '#c49a60' },
    "Bloom":       { name: "Bloom",       nameJp: "ブルーム",       desc: "育成・調和",   color: '#8aab7a' },
    "Spark":       { name: "Spark",       nameJp: "スパーク",       desc: "閃き・革新",   color: '#c08a6a' },
    "Crystal":     { name: "Crystal",     nameJp: "クリスタル",     desc: "緻密・冷静",   color: '#7ea3b8' },
    "Striker":     { name: "Striker",     nameJp: "ストライカー",   desc: "実直・技術",   color: '#a090b0' },
    "Rogue":       { name: "Rogue",       nameJp: "ローグ",         desc: "改革・本質",   color: '#9a80a0' },
    "Ground":      { name: "Ground",      nameJp: "グラウンド",     desc: "安定・土台",   color: '#7a9a78' },
    "Wing":        { name: "Wing",        nameJp: "ウィング",       desc: "自由・俯瞰",   color: '#7898a8' },
    "Seraph":      { name: "Seraph",      nameJp: "セラフ",         desc: "洞察・予知",   color: '#6889a8' },
    "Craft":       { name: "Craft",       nameJp: "クラフト",       desc: "改善・適応",   color: '#8a9a7a' },
    "Solid":       { name: "Solid",       nameJp: "ソリッド",       desc: "信念・伝統",   color: '#6a8a6a' },
    "Shade":       { name: "Shade",       nameJp: "シェード",       desc: "献身・黒子",   color: '#7a8a8a' },
    "Emperor":     { name: "Emperor",     nameJp: "エンペラー",     desc: "統率・圧倒",   color: '#a07858' },
    "Night Shift": { name: "Night Shift", nameJp: "ナイトシフト",   desc: "危機・実利",   color: '#8a7898' },
    "Iron":        { name: "Iron",        nameJp: "アイアン",       desc: "鉄壁・規律",   color: '#7a8a7a' },
    "Bliss":       { name: "Bliss",       nameJp: "ブリス",         desc: "愛嬌・浄化",   color: '#c4a570' }
};

// ── Synergy Data (Config-Driven) ──
// BEST ×1.10 | BETTER ×1.05 | CAUTION ×0.90 | WARNING ×0.80
let SYNERGY_DATA = {
    "Balance":     { best: ["Flare", "Emperor"],       better: ["Ground", "Bloom"],                caution: [],                            warning: [] },
    "Flare":       { best: ["Flow", "Ground"],         better: ["Balance", "Spark"],               caution: ["Flare"],                     warning: [] },
    "Flow":        { best: ["Flare", "Spark"],         better: ["Bloom", "Wing"],                  caution: ["Solid"],                     warning: [] },
    "Bloom":       { best: ["Flare", "Ground"],        better: ["Shade", "Bliss"],                 caution: ["Rogue"],                     warning: ["Night Shift"] },
    "Spark":       { best: ["Flow", "Wing"],           better: ["Crystal", "Rogue"],               caution: ["Ground"],                    warning: [] },
    "Crystal":     { best: ["Flare", "Striker"],       better: ["Seraph", "Iron"],                 caution: ["Spark"],                     warning: [] },
    "Striker":     { best: ["Seraph", "Bloom"],        better: ["Crystal", "Iron"],                caution: ["Wing"],                      warning: [] },
    "Rogue":       { best: ["Seraph", "Ground"],       better: ["Spark", "Night Shift"],           caution: ["Bloom"],                     warning: ["Bliss"] },
    "Ground":      { best: ["Spark", "Flare"],         better: ["Balance", "Solid"],               caution: ["Flow"],                      warning: ["Wing"] },
    "Wing":        { best: ["Spark", "Ground"],        better: ["Flow", "Seraph"],                 caution: ["Striker"],                   warning: ["Iron"] },
    "Seraph":      { best: ["Striker", "Rogue"],       better: ["Wing", "Crystal"],                caution: ["Craft"],                     warning: ["Night Shift"] },
    "Craft":       { best: ["Bloom", "Iron"],          better: ["Ground", "Solid"],                caution: ["Flare"],                     warning: ["Wing"] },
    "Solid":       { best: ["Striker", "Ground"],      better: ["Iron", "Craft"],                  caution: ["Flow"],                      warning: ["Spark"] },
    "Shade":       { best: ["Emperor", "Seraph"],      better: ["Bloom", "Ground"],                caution: ["Night Shift"],               warning: [] },
    "Emperor":     { best: ["Bliss", "Shade"],         better: ["Balance", "Ground"],              caution: ["Crystal"],                   warning: ["Bliss"] },
    "Night Shift": { best: ["Rogue", "Striker"],       better: ["Crystal", "Iron"],                caution: ["Bloom"],                     warning: ["Bliss"] },
    "Iron":        { best: ["Crystal", "Striker"],     better: ["Solid", "Ground"],                caution: ["Flare"],                     warning: ["Rogue"] },
    "Bliss":       { best: ["Emperor", "Iron"],        better: ["Bloom", "Shade"],                 caution: ["Rogue"],                     warning: ["Night Shift"] }
};

// ── Synergy Multiplier Constants (Config-Driven) ──
let SYNERGY_MULTIPLIERS = {
    best:    1.10,
    better:  1.05,
    caution: 0.90,
    warning: 0.80
};

/**
 * calcTeamSynergy — 4ティア倍率方式
 * マイナスを先にかけてから、プラスをかける
 * @returns {{ multiplier, breakdown, pairDetails }}
 */
function calcTeamSynergy(typedMembers) {
    const pairDetails = { best: [], better: [], caution: [], warning: [] };
    let bestCount = 0, betterCount = 0, cautionCount = 0, warningCount = 0;

    for (let i = 0; i < typedMembers.length; i++) {
        for (let j = i + 1; j < typedMembers.length; j++) {
            const a = typedMembers[i], b = typedMembers[j];
            const aType = a.type, bType = b.type;
            const pairLabel = `${a.name}×${b.name}`;

            // Check bidirectional — use highest tier match found
            let tierFound = null;
            if (SYNERGY_DATA[aType]?.best?.includes(bType) || SYNERGY_DATA[bType]?.best?.includes(aType)) {
                tierFound = 'best';
            } else if (SYNERGY_DATA[aType]?.better?.includes(bType) || SYNERGY_DATA[bType]?.better?.includes(aType)) {
                tierFound = 'better';
            }

            let negativeTier = null;
            if (SYNERGY_DATA[aType]?.warning?.includes(bType) || SYNERGY_DATA[bType]?.warning?.includes(aType)) {
                negativeTier = 'warning';
            } else if (SYNERGY_DATA[aType]?.caution?.includes(bType) || SYNERGY_DATA[bType]?.caution?.includes(aType)) {
                negativeTier = 'caution';
            }

            if (tierFound === 'best') { bestCount++; pairDetails.best.push(pairLabel); }
            else if (tierFound === 'better') { betterCount++; pairDetails.better.push(pairLabel); }
            if (negativeTier === 'warning') { warningCount++; pairDetails.warning.push(pairLabel); }
            else if (negativeTier === 'caution') { cautionCount++; pairDetails.caution.push(pairLabel); }
        }
    }

    // マイナスを先にかけてからプラスをかける
    let multiplier = 1.0;
    for (let w = 0; w < warningCount; w++) multiplier *= SYNERGY_MULTIPLIERS.warning;
    for (let c = 0; c < cautionCount; c++) multiplier *= SYNERGY_MULTIPLIERS.caution;
    for (let b = 0; b < betterCount; b++) multiplier *= SYNERGY_MULTIPLIERS.better;
    for (let s = 0; s < bestCount; s++)   multiplier *= SYNERGY_MULTIPLIERS.best;

    return {
        multiplier,
        breakdown: { bestCount, betterCount, cautionCount, warningCount },
        pairDetails
    };
}

// ── MGR Score Toggle State ──
let showMgrScores = false;

function getAttributeBadgeHtml(typeStr) {
    if (!typeStr) return '';
    const info = SVD_TYPES[typeStr];
    if (!info) return '';
    return `<span class="card-attribute-badge" style="--attr-color:${info.color};" title="${info.nameJp}: ${info.desc}">${info.name}</span>
            <span class="card-attribute-desc">${info.desc}</span>`;
}

function getSynergyHtml(typeStr, context) {
    if (!typeStr || !SYNERGY_DATA[typeStr]) return '';
    const info = SVD_TYPES[typeStr];
    const syn = SYNERGY_DATA[typeStr];
    const bestHtml = syn.best.map(t => {
        const ti = SVD_TYPES[t];
        return ti ? `<span class="synergy-chip synergy-chip--best">${ti.name}</span>` : '';
    }).join('');
    const cautionHtml = syn.caution.map(t => {
        const ti = SVD_TYPES[t];
        return ti ? `<span class="synergy-chip synergy-chip--caution">${ti.name}</span>` : '';
    }).join('');

    // Find teammates with matching synergy
    let teammateHtml = '';
    if (context && context.teammates) {
        const bestMatches = context.teammates.filter(m => m.type && syn.best.includes(m.type));
        const cautionMatches = context.teammates.filter(m => m.type && syn.caution.includes(m.type));
        if (bestMatches.length > 0) {
            teammateHtml += `<div class="synergy-teammates"><span class="synergy-teammates-label">★ 好相性の同僚:</span> ${bestMatches.map(m => `<span class="synergy-teammate-name synergy-teammate--best">${m.name} (${SVD_TYPES[m.type]?.name || m.type})</span>`).join('')}</div>`;
        }
        if (cautionMatches.length > 0) {
            teammateHtml += `<div class="synergy-teammates"><span class="synergy-teammates-label">⚠ 注意の同僚:</span> ${cautionMatches.map(m => `<span class="synergy-teammate-name synergy-teammate--caution">${m.name} (${SVD_TYPES[m.type]?.name || m.type})</span>`).join('')}</div>`;
        }
    }

    return `
        <div class="modal-synergy-section">
            <div class="modal-synergy-header">ATTRIBUTE & SYNERGY</div>
            <div class="modal-synergy-type">
                <span class="modal-synergy-badge" style="background:${info.color};">${info.name}</span>
                <span class="modal-synergy-desc">${info.nameJp} — ${info.desc}</span>
            </div>
            <div class="modal-synergy-matches">
                <div class="modal-synergy-row">
                    <span class="modal-synergy-label modal-synergy-label--best">★ ベストマッチ</span>
                    <div class="modal-synergy-chips">${bestHtml || '<span class="synergy-chip synergy-chip--none">—</span>'}</div>
                </div>
                <div class="modal-synergy-row">
                    <span class="modal-synergy-label modal-synergy-label--caution">⚠ 注意</span>
                    <div class="modal-synergy-chips">${cautionHtml || '<span class="synergy-chip synergy-chip--none">—</span>'}</div>
                </div>
            </div>
            ${teammateHtml}
        </div>
    `;
}

// RESERVE カテゴリー名
const RESERVE_NAME = 'RESERVE — BACK OFFICE & STANDBY';

function shortName(aff) {
    const map = {
        'THE JEWELS': 'JW', 'NOUVELLE POUSSE OKURAYAMA': 'NP',
        'THE GARDEN SAPPORO HOKKAIDO GRILLE': 'GA',
        'LA BRIQUE SAPPORO Akarenga Terrace': 'BQ', 'Rusutsu Yotei Buta by BQ': 'RYB',
        'Sapporo TV Tower BEER GARDEN': 'BG', 'OKURAYAMA S\u00e9l\u00e9ste': 'Ce',
        'Repos': 'RP', 'POP UP': 'POP',
        [RESERVE_NAME]: 'RSV',
        'RESERVE': 'RSV'
    };
    // Exact match first, then partial match for RESERVE variants
    if (map[aff]) return map[aff];
    if (aff && aff.toUpperCase().includes('RESERVE')) return 'RSV';
    return (aff || '').substring(0, 4);
}

// ── Brigade Hierarchy (Config-Driven) ──
let BRIGADE_MAP = {
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
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initSkillSliders();
    TI_BRIDGE.renderSettingsPanel('gasSettingsCard');
    updateConnectionBadge();

    // Auto-connect if URL exists
    if (TI_BRIDGE.getUrl()) {
        // Config-Driven: マスターデータをGASから取得して上書き
        try {
            const cfgRes = await TI_BRIDGE.loadConfig();
            if (cfgRes && cfgRes.result === 'success' && cfgRes.config) {
                const c = cfgRes.config;
                if (c.SKILL_LABELS)        SKILL_LABELS = c.SKILL_LABELS;
                if (c.SKILL_RUBRICS)        SKILL_RUBRICS = c.SKILL_RUBRICS;
                if (c.CAT_NAMES)            CAT_NAMES = c.CAT_NAMES;
                if (c.STORE_COLORS)         STORE_COLORS = c.STORE_COLORS;
                if (c.SVD_TYPES)            SVD_TYPES = c.SVD_TYPES;
                if (c.SYNERGY_DATA)         SYNERGY_DATA = c.SYNERGY_DATA;
                if (c.SYNERGY_MULTIPLIERS)  SYNERGY_MULTIPLIERS = c.SYNERGY_MULTIPLIERS;
                if (c.BRIGADE_MAP)          BRIGADE_MAP = c.BRIGADE_MAP;
                if (c.ATTRIBUTE_DESC)       window.__ATTRIBUTE_DESC = c.ATTRIBUTE_DESC;
                if (c.CAREER_CATEGORIES)    window.__CAREER_CATEGORIES = c.CAREER_CATEGORIES;
                console.log('✅ Config-Driven: マスターデータをGASから取得しました');
            }
        } catch (e) {
            console.warn('⚠️ Config読み込みスキップ（フォールバック使用）:', e);
        }
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
            // Lazy render for ⑥, ⑦, ⑧, ⑨
            if (tab === 'attributes') renderAttributeTab();
            if (tab === 'synergy') renderSynergyTab();
            if (tab === 'ai') renderAIAnalysisTab();
            if (tab === 'career') renderCareerTab();
        });
    });
}

// ═══════════════════════════════════════════════════════════
// ⑥ ATTRIBUTE TAB — 18属性の傾向
// ═══════════════════════════════════════════════════════════
function renderAttributeTab() {
    const grid = document.getElementById('attributeGrid');
    if (!grid) return;
    
    // 各属性のメンバーをカウント
    const typeCounts = {};
    if (window.__staffData) {
        window.__staffData.forEach(s => {
            if (s.type && s.status !== 'archived') {
                if (!typeCounts[s.type]) typeCounts[s.type] = [];
                typeCounts[s.type].push(s);
            }
        });
    }
    
    // 属性解説: Config-Driven（GAS TI_Configから取得、フォールバック付き）
    const ATTR_DETAIL_FALLBACK = {
        "Balance":     { emoji: '⚖️', summary: '全方位バランス型', detail: '特定の強みに偏らず、どの場面でも安定したパフォーマンスを発揮する。チームの潤滑油として機能し、欠員時のバックアップにも対応できる汎用性が武器。' },
        "Flare":       { emoji: '🔥', summary: '情熱で突破する炎', detail: '圧倒的な熱量とエネルギーで周囲を巻き込み、停滞した状況を打破する力を持つ。モチベーターとしてチームの士気を高める存在。' },
        "Flow":        { emoji: '🌊', summary: '柔軟に浸透する水', detail: '状況の変化に素早く適応し、自然体で周囲に溶け込む。固定概念にとらわれず、新しいやり方を柔軟に取り入れられるタイプ。' },
        "Bloom":       { emoji: '🌸', summary: '育成と調和の花', detail: '後輩や新人の成長を促し、チーム全体の調和を大切にする。温かさと包容力で安心感のある環境を作り出す。' },
        "Spark":       { emoji: '⚡', summary: '閃きと革新の雷', detail: '既存のやり方に疑問を投げかけ、斬新なアイデアで革新を起こす。クリエイティブな発想力と実行力を兼ね備える。' },
        "Crystal":     { emoji: '💎', summary: '緻密で冷静な結晶', detail: '感情に左右されず、論理的・客観的に状況を分析できる。データに基づいた判断と精密な仕事ぶりが特徴。' },
        "Striker":     { emoji: '🎯', summary: '実直な技術者', detail: '自分の技術に真摯に向き合い、コツコツと磨き上げる職人気質。確実な仕事で信頼を積み重ねるタイプ。' },
        "Rogue":       { emoji: '🗡️', summary: '改革者の刃', detail: '本質を見抜く鋭い洞察力で、組織の課題に切り込む。既存の常識に挑戦し、必要な変革を恐れない。' },
        "Ground":      { emoji: '🏔️', summary: '不動の土台', detail: 'どんな状況でも揺るがない安定感でチームを支える。信頼性が高く、周囲が安心して頼れる存在。' },
        "Wing":        { emoji: '🦅', summary: '自由に俯瞰する翼', detail: '高い視点から全体を見渡し、チームや組織の方向性を見定める。自由な発想と広い視野が強み。' },
        "Seraph":      { emoji: '👁️', summary: '先を見通す眼', detail: 'トレンドや変化の兆しをいち早く察知し、未来を予見する能力に長ける。戦略的思考でチームを導く。' },
        "Craft":       { emoji: '🛠️', summary: 'カイゼンの匠', detail: '日々の業務の中から改善点を見つけ出し、少しずつ確実に良くしていく。PDCAサイクルの実践者。' },
        "Solid":       { emoji: '🪨', summary: '信念を貫く岩', detail: '確立された方法や伝統を重んじ、ブレない軸を持つ。一貫性のある行動でチームに安心感を与える。' },
        "Shade":       { emoji: '🌑', summary: '影で支える黒子', detail: '表舞台には立たないが、裏方として献身的にチームを支える。縁の下の力持ちとして欠かせない存在。' },
        "Emperor":     { emoji: '👑', summary: '圧倒的統率力', detail: '強いリーダーシップでチームを率い、明確なビジョンを示す。決断力と実行力で組織を前進させる。' },
        "Night Shift": { emoji: '🌙', summary: '危機対応の夜番', detail: 'トラブルや緊急事態に冷静に対処し、実利的な解決策を見出す。プレッシャー下でこそ真価を発揮する。' },
        "Iron":        { emoji: '🛡️', summary: '鉄壁の規律', detail: 'ルールと規律を徹底的に守り、組織の秩序を維持する。品質基準やオペレーションの番人。' },
        "Bliss":       { emoji: '😊', summary: '場を明るくする太陽', detail: '愛嬌と明るさで職場の雰囲気を浄化する。自然体のコミュニケーション力でゲストにもチームにも笑顔をもたらす。' }
    };
    const descriptions = window.__ATTRIBUTE_DESC || {};
    
    grid.innerHTML = Object.entries(SVD_TYPES).map(([key, info]) => {
        const members = typeCounts[key] || [];
        const fb = ATTR_DETAIL_FALLBACK[key] || {};
        const d = descriptions[key] || { emoji: fb.emoji || '🔹', summary: fb.summary || info.desc || '', detail: fb.detail || '' };
        const synergy = SYNERGY_DATA[key] || {};
        
        // ベストマッチ & 注意ペア
        const bestChips = (synergy.best || []).map(b => {
            const bInfo = SVD_TYPES[b];
            return bInfo ? `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(76,175,80,0.15);color:#4caf50;font-weight:600;">★ ${bInfo.nameJp}</span>` : '';
        }).join(' ');
        const cautionChips = (synergy.caution || []).map(c => {
            const cInfo = SVD_TYPES[c];
            return cInfo ? `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(244,67,54,0.12);color:#f44336;font-weight:600;">⚠ ${cInfo.nameJp}</span>` : '';
        }).join(' ');
        
        const memberChips = members.map(m =>
            `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:var(--bg-dark);color:var(--text-main);">${m.name}</span>`
        ).join(' ');
        
        return `<div class="card" style="border-left:3px solid ${info.color};">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:22px;">${d.emoji}</span>
                <div>
                    <span style="font-size:1.1rem;font-weight:700;color:${info.color};">${info.nameJp}</span>
                    <span style="font-size:0.8rem;color:var(--text-dim);margin-left:4px;">${key}</span>
                    <div style="font-size:0.75rem;color:${info.color};font-weight:600;letter-spacing:0.5px;">${d.summary}</div>
                </div>
                <span style="margin-left:auto;font-size:0.85rem;font-weight:700;color:var(--text-sub);">${members.length}名</span>
            </div>
            <p style="font-size:0.82rem;color:var(--text-sub);margin:0 0 10px 0;line-height:1.5;">${d.detail}</p>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;">
                ${bestChips}${cautionChips ? ' ' + cautionChips : ''}
            </div>
            ${members.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;padding-top:6px;border-top:1px solid var(--border-light);">${memberChips}</div>` : '<div style="font-size:0.8rem;color:var(--text-muted);font-style:italic;padding-top:6px;border-top:1px solid var(--border-light);">該当スタッフなし</div>'}
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// ⑦ SYNERGY TAB — 相性解説 + チームポイント
// ═══════════════════════════════════════════════════════════
function renderSynergyTab() {
    renderSynergyMatrix();
    renderTeamChemistry();
}

function renderSynergyMatrix() {
    const container = document.getElementById('synergyMatrix');
    if (!container) return;
    
    const types = Object.keys(SYNERGY_DATA);
    
    let html = '<div class="card"><h3>相性マトリクス — 4ティア倍率方式</h3>';
    html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">';
    
    // Header
    html += '<tr><th style="padding:4px;border:1px solid var(--border-light);background:var(--bg-dark);"></th>';
    types.forEach(t => {
        const info = SVD_TYPES[t];
        html += `<th style="padding:4px;border:1px solid var(--border-light);background:var(--bg-dark);color:${info?.color || 'inherit'};writing-mode:vertical-rl;font-size:9px;">${t}</th>`;
    });
    html += '</tr>';
    
    // Rows — 4-tier color coding
    types.forEach(rowType => {
        const info = SVD_TYPES[rowType];
        const synergy = SYNERGY_DATA[rowType] || {};
        html += `<tr><td style="padding:4px;border:1px solid var(--border-light);background:var(--bg-dark);color:${info?.color || 'inherit'};font-weight:600;font-size:9px;white-space:nowrap;">${rowType}</td>`;
        
        types.forEach(colType => {
            let bg = 'transparent', symbol = '';
            if (rowType === colType) {
                bg = 'var(--bg-dark)'; symbol = '—';
            } else if (synergy.best?.includes(colType)) {
                bg = 'rgba(212,175,55,0.20)'; symbol = '★★';
            } else if (synergy.better?.includes(colType)) {
                bg = 'rgba(76,175,80,0.15)'; symbol = '★';
            } else if (synergy.warning?.includes(colType)) {
                bg = 'rgba(244,67,54,0.18)'; symbol = '⚠⚠';
            } else if (synergy.caution?.includes(colType)) {
                bg = 'rgba(255,152,0,0.12)'; symbol = '⚠';
            }
            html += `<td style="padding:4px;border:1px solid var(--border-light);background:${bg};font-size:10px;">${symbol}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</table></div>';
    html += `<div style="margin-top:8px;font-size:0.8rem;color:var(--text-sub);display:flex;gap:12px;flex-wrap:wrap;">
        <span>★★ BEST <span style="color:var(--gold);font-weight:700;">×1.10</span></span>
        <span>★ BETTER <span style="color:var(--green);font-weight:700;">×1.05</span></span>
        <span>⚠ 注意 <span style="color:var(--orange);font-weight:700;">×0.90</span></span>
        <span>⚠⚠ 警告 <span style="color:var(--red);font-weight:700;">×0.80</span></span>
        <span style="color:var(--text-dim);font-style:italic;">※マイナス→プラスの順に適用</span>
    </div>`;
    html += '</div>';
    
    // 全ペアの解説 — 4-tier
    html += '<div class="card" style="margin-top:1rem;"><h3>全ペア相性一覧</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">';
    
    types.forEach(t => {
        const synergy = SYNERGY_DATA[t];
        const info = SVD_TYPES[t];
        if (!synergy) return;
        
        let pairs = '';
        if (synergy.best?.length > 0) {
            pairs += synergy.best.map(b => {
                const bInfo = SVD_TYPES[b];
                return `<span class="synergy-tier-chip synergy-tier--best">★★ ${bInfo?.name || b}</span>`;
            }).join(' ');
        }
        if (synergy.better?.length > 0) {
            pairs += ' ' + synergy.better.map(b => {
                const bInfo = SVD_TYPES[b];
                return `<span class="synergy-tier-chip synergy-tier--better">★ ${bInfo?.name || b}</span>`;
            }).join(' ');
        }
        if (synergy.caution?.length > 0) {
            pairs += ' ' + synergy.caution.map(c => {
                const cInfo = SVD_TYPES[c];
                return `<span class="synergy-tier-chip synergy-tier--caution">⚠ ${cInfo?.name || c}</span>`;
            }).join(' ');
        }
        if (synergy.warning?.length > 0) {
            pairs += ' ' + synergy.warning.map(w => {
                const wInfo = SVD_TYPES[w];
                return `<span class="synergy-tier-chip synergy-tier--warning">⚠⚠ ${wInfo?.name || w}</span>`;
            }).join(' ');
        }
        
        html += `<div style="padding:6px;border-left:3px solid ${info?.color || '#888'};background:var(--bg-card);border-radius:4px;">
            <span style="font-weight:600;color:${info?.color || 'inherit'};font-size:0.85rem;">${info?.name || t}</span>
            <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px;">${pairs}</div>
        </div>`;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
}

function renderTeamChemistry() {
    const container = document.getElementById('teamChemistry');
    if (!container || !window.__staffData) return;
    
    // チームごとにグループ化
    const teams = {};
    window.__staffData.forEach(s => {
        if (s.status === 'archived' || !s.affiliation) return;
        if (!teams[s.affiliation]) teams[s.affiliation] = { short: s.affiliation, members: [] };
        teams[s.affiliation].members.push(s);
    });
    
    let html = '<div class="card"><h3>TEAM CHEMISTRY — 倍率方式シナジースコア</h3>';
    html += `<p style="font-size:0.82rem;color:var(--text-sub);margin-bottom:12px;">各チームの属性分布とシナジー倍率。
        <span style="color:var(--gold);font-weight:600;">★★BEST ×1.10</span>&nbsp;
        <span style="color:var(--green);font-weight:600;">★BETTER ×1.05</span>&nbsp;
        <span style="color:var(--orange);font-weight:600;">⚠注意 ×0.90</span>&nbsp;
        <span style="color:var(--red);font-weight:600;">⚠⚠警告 ×0.80</span>&nbsp;
        <span style="color:var(--text-dim);">(マイナス→プラス順適用)</span></p>`;
    
    const storeOrder = Object.keys(STORE_COLORS);
    const sortedTeams = Object.values(teams).sort((a, b) => {
        const ia = storeOrder.indexOf(a.short);
        const ib = storeOrder.indexOf(b.short);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    
    sortedTeams.forEach(team => {
        const color = STORE_COLORS[team.short] || 'var(--text-sub)';
        const typedMembers = team.members.filter(m => m.type);
        
        if (typedMembers.length === 0) {
            html += `<div style="padding:8px;margin-bottom:8px;border-left:3px solid ${color};border-radius:4px;background:var(--bg-card);">
                <span style="font-weight:700;color:${color};">${team.short}</span>
                <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">属性データなし</span>
            </div>`;
            return;
        }
        
        // ── 4ティア倍率計算 ──
        const synergy = calcTeamSynergy(typedMembers);
        const { multiplier, breakdown, pairDetails } = synergy;
        const totalCP = team.members.reduce((s, m) => s + (Number(m.combatPower) || 0), 0);
        const adjustedCP = totalCP * multiplier;
        
        const multColor = multiplier >= 1.0 ? 'var(--green)' : 'var(--red)';
        const multStr = multiplier >= 1.0 ? `×${multiplier.toFixed(3)}` : `×${multiplier.toFixed(3)}`;
        
        // 属性構成
        const typeCounts = {};
        typedMembers.forEach(m => { typeCounts[m.type] = (typeCounts[m.type] || 0) + 1; });
        const typeChips = Object.entries(typeCounts).map(([t, c]) => {
            const info = SVD_TYPES[t];
            if (!info) return '';
            return `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${info.color}22;color:${info.color};font-weight:600;">${info.name}${c > 1 ? ' ×'+c : ''}</span>`;
        }).join(' ');
        
        // ── ペア詳細（4ティア）──
        const tierHtmls = [
            { key: 'best', label: '★★ BEST', color: '#c8a45e', data: pairDetails.best },
            { key: 'better', label: '★ BETTER', color: '#4caf50', data: pairDetails.better },
            { key: 'caution', label: '⚠ CAUTION', color: '#ff9800', data: pairDetails.caution },
            { key: 'warning', label: '⚠⚠ WARNING', color: '#f44336', data: pairDetails.warning }
        ].filter(t => t.data.length > 0).map(t =>
            `<div style="margin-top:3px;"><span style="font-size:10px;color:${t.color};font-weight:600;">${t.label}:</span> <span style="font-size:10px;color:var(--text-sub);">${t.data.join(', ')}</span></div>`
        ).join('');
        
        // Breakdown badge
        const bdParts = [];
        if (breakdown.bestCount > 0) bdParts.push(`<span style="color:var(--gold);">★★${breakdown.bestCount}</span>`);
        if (breakdown.betterCount > 0) bdParts.push(`<span style="color:var(--green);">★${breakdown.betterCount}</span>`);
        if (breakdown.cautionCount > 0) bdParts.push(`<span style="color:var(--orange);">⚠${breakdown.cautionCount}</span>`);
        if (breakdown.warningCount > 0) bdParts.push(`<span style="color:var(--red);">⚠⚠${breakdown.warningCount}</span>`);
        const breakdownHtml = bdParts.length > 0 ? `<span style="font-size:9px;margin-left:4px;">${bdParts.join(' ')}</span>` : '';
        
        html += `<div style="padding:10px;margin-bottom:8px;border-left:3px solid ${color};border-radius:4px;background:var(--bg-card);">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:700;color:${color};font-size:1rem;">${team.short}</span>
                <span style="font-size:0.8rem;color:var(--text-dim);">${typedMembers.length}/${team.members.length}名</span>
                <div style="margin-left:auto;text-align:right;">
                    <div style="font-size:1.1rem;font-weight:800;color:${multColor};">${multStr}${breakdownHtml}</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">CP: ${totalCP.toFixed(0)} → <span style="font-weight:700;color:${multColor};">${adjustedCP.toFixed(0)}</span></div>
                </div>
            </div>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${typeChips}</div>
            ${tierHtmls}
        </div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
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
        window.__staffData = data.staff;  // ⑥⑦タブ用グローバル参照
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
                        s._latestScores = latest.scores;
                    }
                    // 最新のSelf評価
                    if (selfEvals.length > 0) {
                        const latest = selfEvals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                        s._selfScore = Number(latest.totalScore) || 0;
                        if (!s._latestScores) s._latestScores = latest.scores;
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
        if (typeof currentRosterView !== 'undefined' && currentRosterView === 'map') {
            renderSkillMap(staffList);
        } else {
            renderStaffGrid(staffList);
        }
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

    // ── 1. 全既知店舗を初期化（0人でも常時表示）──
    const ALL_STORES = {
        'THE JEWELS': 'JW',
        'NOUVELLE POUSSE OKURAYAMA': 'NP',
        'THE GARDEN SAPPORO HOKKAIDO GRILLE': 'GA',
        'LA BRIQUE SAPPORO Akarenga Terrace': 'BQ',
        'Rusutsu Yotei Buta by BQ': 'RYB',
        'Sapporo TV Tower BEER GARDEN': 'BG',
        'OKURAYAMA S\u00e9l\u00e9ste': 'Ce',
        'Repos': 'RP',
        'POP UP': 'POP'
    };
    const teams = {};
    Object.entries(ALL_STORES).forEach(([name, short]) => {
        teams[short] = { name, short, members: [] };
    });
    teams['RSV'] = { name: RESERVE_NAME, short: 'RSV', members: [] };

    // スタッフを振り分け
    staff.forEach(s => {
        const aff = s.affiliation || RESERVE_NAME;
        const key = shortName(aff);
        if (!teams[key]) teams[key] = { name: aff, short: key, members: [] };
        teams[key].members.push(s);
    });

    // ── ソート: 人がいるセクションを上、空を下、RSVは常に最下部 ──
    const sortedKeys = Object.keys(teams).sort((a, b) => {
        if (a === 'RSV') return 1;
        if (b === 'RSV') return -1;
        const ma = teams[a].members.length;
        const mb = teams[b].members.length;
        if (ma === 0 && mb > 0) return 1;
        if (mb === 0 && ma > 0) return -1;
        return mb - ma; // 人数降順
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

        const attrInfo = s.type ? SVD_TYPES[s.type] : null;
        const attrBorderColor = attrInfo ? attrInfo.color : 'transparent';
        const attrBgStyle = attrInfo ? `border-top: 3px solid ${attrInfo.color}; background: linear-gradient(180deg, ${attrInfo.color}08 0%, transparent 40%);` : '';

        return `
        <div class="staff-card" data-staff-id="${s.staffId}"
             onclick="if(!isDragging) openStaffModal('${s.staffId}')"
             draggable="true" ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)"
             style="${attrBgStyle}">
            <div class="card-cp-rect" style="${showMgrScores ? '' : 'display:none;'}">
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
                    ${s.photoUrl ? `<img src="${fixPhotoUrl(s.photoUrl)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='';">
                    <span class="avatar-initial" style="display:none;">${(s.name || '?')[0]}</span>` : `<span class="avatar-initial">${(s.name || '?')[0]}</span>`}
                    <div class="avatar-upload-overlay">📷</div>
                </div>
                <div class="card-name">${s.name || '—'}</div>
                ${getAttributeBadgeHtml(s.type)}
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
                ${affSinceDisplay ? `<div class="card-info-row"><span class="card-info-key">配属</span><span class="card-info-val card-info-val--date" style="cursor:pointer;" onclick="event.stopPropagation(); editAffiliationDate('${s.staffId}', this)" title="クリックして変更">${affSinceDisplay}〜</span></div>` : ''}
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

    // ── 2. チームごとにセクション生成（sortedKeys順）──
    grid.innerHTML = sortedKeys.map(key => {
        const team = teams[key];
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

        // シナジー倍率計算（TOTAL HBSに反映 — 4ティア倍率方式）
        const typedMembers = team.members.filter(m => m.type);
        const teamSynergy = calcTeamSynergy(typedMembers);
        const adjustedTotal = totalCP * teamSynergy.multiplier;
        const multDisplay = teamSynergy.multiplier !== 1.0;
        const multColor = teamSynergy.multiplier >= 1.0 ? 'var(--green)' : 'var(--red)';
        const synergyBadge = multDisplay
            ? `<span style="font-size:0.65rem;font-weight:600;color:${multColor};margin-left:2px;">(×${teamSynergy.multiplier.toFixed(2)})</span>` : '';
        const { bestCount: bestPairs, cautionCount: cautionPairs, betterCount, warningCount } = teamSynergy.breakdown;

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
                        <span class="team-stat-value" style="color:${color};">${adjustedTotal.toFixed(0)}${synergyBadge}</span>
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
                    ${(() => {
                        // Team synergy summary — 4-tier badges
                        if (typedMembers.length === 0) return '';
                        
                        const typeCounts = {};
                        typedMembers.forEach(m => {
                            typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
                        });
                        
                        const typeChips = Object.entries(typeCounts).map(([t, c]) => {
                            const info = SVD_TYPES[t];
                            if (!info) return '';
                            return `<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${info.color}22;color:${info.color};font-weight:600;white-space:nowrap;">${info.name}${c > 1 ? ' ×'+c : ''}</span>`;
                        }).join(' ');
                        
                        const bdParts = [];
                        if (bestPairs > 0) bdParts.push(`<span style="color:var(--gold);">★★${bestPairs}</span>`);
                        if (betterCount > 0) bdParts.push(`<span style="color:var(--green);">★${betterCount}</span>`);
                        if (cautionPairs > 0) bdParts.push(`<span style="color:var(--orange);">⚠${cautionPairs}</span>`);
                        if (warningCount > 0) bdParts.push(`<span style="color:var(--red);">⚠⚠${warningCount}</span>`);
                        const synBadge = bdParts.length > 0 ? `<span style="font-size:9px;margin-left:4px;">${bdParts.join(' ')}</span>` : '';
                        
                        return `<div class="team-synergy-summary" style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:4px;">${typeChips}${synBadge}</div>`;
                    })()}
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


// ── View Toggles ──
let currentRosterView = 'card';
window.toggleRosterView = function(view) {
    currentRosterView = view;
    document.getElementById('btnViewCard').classList.toggle('active', view === 'card');
    document.getElementById('btnViewMap').classList.toggle('active', view === 'map');
    document.getElementById('staffGrid').style.display = view === 'card' ? '' : 'none';
    document.getElementById('skillMapGrid').style.display = view === 'map' ? '' : 'none';
    applyFilters();
};

window.toggleMgrScores = function() {
    showMgrScores = !showMgrScores;
    const btn = document.getElementById('btnMgrToggle');
    if (btn) btn.classList.toggle('active', showMgrScores);
    applyFilters();
};

function renderSkillMap(list) {
    const grid = document.getElementById('skillMapGrid');
    if (!list || list.length === 0) {
        grid.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">対象データがありません</div>';
        return;
    }

    const P_KEYS = ['p1','p2','p3','p4','p5','p6'];
    const S_KEYS = ['s1','s2','s3','s4','s5','s6'];
    const E_KEYS = ['e1','e2','e3','e4','e5','e6'];
    const M_KEYS = ['m1','m2','m3','m4','m5','m6'];
    
    // Sort by Total CP desc
    const sorted = [...list].sort((a,b) => (Number(b.combatPower)||0) - (Number(a.combatPower)||0));

    let html = '<table class="skill-map-table">';
    // Header Row
    html += '<thead><tr>';
    html += '<th>Staff Name</th>';
    html += '<th>Total</th>';
    html += '<th class="cat-header-P">P</th>'; P_KEYS.forEach(k => html += `<th title="${SKILL_LABELS.P[k]}">${k}</th>`);
    html += '<th class="cat-header-S">S</th>'; S_KEYS.forEach(k => html += `<th title="${SKILL_LABELS.S[k]}">${k}</th>`);
    html += '<th class="cat-header-E">E</th>'; E_KEYS.forEach(k => html += `<th title="${SKILL_LABELS.E[k]}">${k}</th>`);
    html += '<th class="cat-header-M">M</th>'; M_KEYS.forEach(k => html += `<th title="${SKILL_LABELS.M[k]}">${k}</th>`);
    html += '</tr></thead><tbody>';

    // Body Rows
    const bgScale = val => {
        if (!val || val === 0) return 'transparent';
        const v = Number(val);
        if (v >= 8) return 'rgba(107,154,120,0.3)';
        if (v >= 6) return 'rgba(107,154,120,0.15)';
        if (v >= 3) return 'rgba(200,164,94,0.1)';
        return 'transparent';
    };

    sorted.forEach(s => {
        const cp = Number(s.combatPower)||0;
        let cScores = {P:0,S:0,E:0,M:0};
        try { cScores = typeof s.categoryScores==='string'?JSON.parse(s.categoryScores):s.categoryScores; } catch(e){}
        let scores = {}; // need detailed scores. currently staffList master might not have them natively in list unless fetched by history.
        // Try to get them from _latestScores (will add this later during load)
        if (s._latestScores) scores = s._latestScores;

        const cell = (k) => {
            const val = scores[k];
            if (!val) return `<td class="sm-empty">-</td>`;
            return `<td style="background:${bgScale(val)}">${Number(val).toFixed(1)}</td>`;
        };

        html += `<tr>`;
        html += `<td style="white-space:nowrap;font-weight:600;"><span style="font-size:0.7rem;color:var(--text-muted);margin-right:4px;">${s.affiliation||''}</span>${s.name||''}</td>`;
        html += `<td><strong>${cp.toFixed(1)}</strong></td>`;
        html += `<td style="font-weight:bold;color:#6b9a78;">${Number(cScores.P||0).toFixed(1)}</td>`;
        P_KEYS.forEach(k => html += cell(k));
        html += `<td style="font-weight:bold;color:#6889a8;">${Number(cScores.S||0).toFixed(1)}</td>`;
        S_KEYS.forEach(k => html += cell(k));
        html += `<td style="font-weight:bold;color:#9a7eb8;">${Number(cScores.E||0).toFixed(1)}</td>`;
        E_KEYS.forEach(k => html += cell(k));
        html += `<td style="font-weight:bold;color:#a08058;">${Number(cScores.M||0).toFixed(1)}</td>`;
        M_KEYS.forEach(k => html += cell(k));
        html += `</tr>`;
    });

    html += '</tbody></table>';
    grid.innerHTML = html;
}

// ── Affiliation Date Editing ──
window.editAffiliationDate = function(staffId, el) {
    const currentText = el.textContent.replace('〜', '').trim();
    // try parse Japanese date "2026年3月1日" -> "2026-03-01"
    let dStr = '';
    const m = currentText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if(m) {
        dStr = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    } else {
        dStr = new Date().toISOString().slice(0,10);
    }
    
    el.innerHTML = `<input type="date" class="inline-date-input" value="${dStr}" onblur="saveAffiliationDate('${staffId}', this.value)" onchange="saveAffiliationDate('${staffId}', this.value)">`;
    el.onclick = null; // disable click
    setTimeout(() => { const input = el.querySelector('input'); if(input) input.focus(); }, 50);
};

window.saveAffiliationDate = function(staffId, dateStr) {
    if(!dateStr) return;
    try {
        const storedStr = localStorage.getItem('ti_affiliation_history');
        let records = storedStr ? JSON.parse(storedStr) : {};
        if (!records[staffId]) records[staffId] = [];
        // update the latest record or create one
        let latest = null;
        if(records[staffId].length > 0) {
            latest = records[staffId][records[staffId].length - 1];
            latest.from = dateStr;
        } else {
            const staff = staffList.find(s=>s.staffId===staffId);
            records[staffId].push({
                affiliation: staff.affiliation || 'Unknown',
                role: staff.hierarchyRole || 'Unknown',
                from: dateStr
            });
        }
        localStorage.setItem('ti_affiliation_history', JSON.stringify(records));
        renderStaffGrid(staffList); // Re-render to show updated string
        TI_BRIDGE.showToast('配属日を更新しました');
    } catch(e) {
        console.error('Date update error', e);
    }
};

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
    if (typeof currentRosterView !== 'undefined' && currentRosterView === 'map') {
        renderSkillMap(filtered);
    } else {
        renderStaffGrid(filtered);
    }
}

// ═══════════════════════════════════════════════════════════
// DRAG & DROP — Human Resource Simulator
// ═══════════════════════════════════════════════════════════
let draggedStaffId = null;

// ── D&D Click Guard ──
// Prevent onclick from firing after a drag operation
let isDragging = false;
let dragStartPos = null;

function handleDragStart(e) {
    isDragging = true;
    // カード全体からドラッグ開始 — e.target が子要素の場合も確実に .staff-card を取得
    const card = e.target.closest('.staff-card');
    draggedStaffId = card ? card.dataset.staffId : null;
    if (!draggedStaffId) {
        isDragging = false;
        return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedStaffId);
    // micro-delay to let browser snapshot card before opacity change
    setTimeout(() => { if (card) card.classList.add('staff-card--dragging'); }, 0);
    // Show all drop zones — collapsed セクションも一時的に展開
    document.querySelectorAll('.team-section.collapsed').forEach(sec => {
        sec.classList.add('drag-temp-expand');
        sec.classList.remove('collapsed');
    });
    document.querySelectorAll('.team-members').forEach(z => z.classList.add('drop-zone--ready'));
}

function handleDragEnd(e) {
    const card = e.target.closest('.staff-card');
    if (card) card.classList.remove('staff-card--dragging');
    document.querySelectorAll('.team-members').forEach(z => {
        z.classList.remove('drop-zone--ready', 'drop-zone--over');
    });
    // ドラッグ中に一時展開したセクションを元に戻す
    document.querySelectorAll('.team-section.drag-temp-expand').forEach(sec => {
        sec.classList.add('collapsed');
        sec.classList.remove('drag-temp-expand');
    });
    // Reset drag state after a short delay to prevent click from firing
    setTimeout(() => { isDragging = false; }, 100);
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
        { key: '', label: ' 自動に戻す' }
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

// ── Photo URL fix (uc?id= → thumbnail?id=) ──
function fixPhotoUrl(url) {
    if (!url) return '';
    // Convert deprecated uc?id= format to thumbnail format
    const ucMatch = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
    if (ucMatch) return 'https://drive.google.com/thumbnail?id=' + ucMatch[1] + '&sz=w512';
    return url;
}

// ── Photo Upload (Base64直接保存 — MINDFULパターン) ──
function triggerPhotoUpload(staffId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            TI_BRIDGE.showToast('ファイルサイズは5MB以下にしてください');
            return;
        }
        TI_BRIDGE.showToast('写真をリサイズ中...');
        try {
            const dataUri = await resizeImage(file, 200, 200, 0.7);
            TI_BRIDGE.showToast('写真をアップロード中...');
            const res = await TI_BRIDGE.uploadPhoto(staffId, dataUri);
            if (res.result === 'success') {
                const staff = staffList.find(s => s.staffId === staffId);
                if (staff) staff.photoUrl = dataUri; // ローカルもBase64で保持
                renderStaffGrid(staffList);
                TI_BRIDGE.showToast('写真をアップロードしました ✅');
            } else {
                TI_BRIDGE.showToast('アップロードエラー: ' + (res.error || 'Unknown'));
            }
        } catch (err) {
            TI_BRIDGE.showToast('アップロードエラー: ' + err.message);
        }
    };
    input.click();
}

// Canvas resize helper (JPEG圧縮 → data URI)
function resizeImage(file, maxW, maxH, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            // Crop to square (center crop)
            const min = Math.min(w, h);
            const sx = (w - min) / 2, sy = (h - min) / 2;
            canvas.width = maxW;
            canvas.height = maxH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, min, min, 0, 0, maxW, maxH);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('画像の読み込みに失敗'));
        img.src = URL.createObjectURL(file);
    });
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
                // Backend returned error but keep the local move
                TI_BRIDGE.showToast(`⚠️ ${staff.name}: サーバー保存失敗 (${res.error || '不明'}). ローカルでは移動済み — ページ更新で反映確認してください`, 5000);
                console.warn('D&D save failed:', res);
            }
        })
        .catch(err => {
            // Network error — keep the local move, don't revert silently
            console.error('D&D save error:', err);
            TI_BRIDGE.showToast(`⚠️ ${staff.name}: 通信エラー — ローカルでは移動済み. GAS接続を確認してください`, 5000);
            // Do NOT revert automatically — the user sees the move and can retry manually
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

    const avatarHtml = staff.photoUrl 
        ? `<img src="${fixPhotoUrl(staff.photoUrl)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid rgba(160,120,64,0.3);flex-shrink:0;">`
        : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(145deg,rgba(160,120,64,0.15),rgba(200,164,94,0.05));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--gold);border:3px solid rgba(160,120,64,0.15);flex-shrink:0;">${(staff.name || '?')[0]}</div>`;
    title.innerHTML = `<div style="display:flex;align-items:center;gap:12px;">${avatarHtml}<span>${staff.name} (${staff.staffId})</span></div>`;
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);">読み込み中...</div>';
    modal.classList.remove('hidden');

    try {
        const history = await TI_BRIDGE.loadHistory(staffId);
        const cp = Number(staff.combatPower) || 0;
        let catScores = {};
        try { catScores = typeof staff.categoryScores === 'string' ? JSON.parse(staff.categoryScores) : staff.categoryScores || {}; } catch (e) { }

        body.innerHTML = `
            <div class="modal-info-grid">
                <div class="info-row"><span class="info-label">所属</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
                        ${(() => {
                            const ALL_LOCS = [
                                { short: 'JW', full: 'THE JEWELS' },
                                { short: 'NP', full: 'NOUVELLE POUSSE OKURAYAMA' },
                                { short: 'GA', full: 'THE GARDEN SAPPORO HOKKAIDO GRILLE' },
                                { short: 'BQ', full: 'LA BRIQUE SAPPORO Akarenga Terrace' },
                                { short: 'RYB', full: 'Rusutsu Yotei Buta by BQ' },
                                { short: 'BG', full: 'Sapporo TV Tower BEER GARDEN' },
                                { short: 'Ce', full: 'OKURAYAMA S\u00e9l\u00e9ste' },
                                { short: 'RP', full: 'Repos' },
                                { short: 'POP', full: 'POP UP' },
                                { short: 'RSV', full: RESERVE_NAME }
                            ];
                            return ALL_LOCS.map(loc => {
                                const isActive = shortName(staff.affiliation) === loc.short;
                                const color = STORE_COLORS[loc.short] || 'var(--text-sub)';
                                return `<button onclick="changeAffiliation('${staffId}','${loc.full.replace(/'/g, "\\'")}','${loc.short}',this)" style="padding:3px 10px;border-radius:14px;font-size:11px;font-weight:${isActive ? '700' : '500'};cursor:pointer;border:2px solid ${isActive ? color : 'rgba(160,120,64,0.15)'};background:${isActive ? color + '22' : 'transparent'};color:${isActive ? color : 'var(--text-dim)'};transition:all 0.2s;letter-spacing:0.5px;" title="${loc.full}">${loc.short}</button>`;
                            }).join('');
                        })()}
                    </div>
                </div>
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

            ${(() => {
                const attrType = staff.type || staff.typeSelf || '';
                const teammates = staffList.filter(m => m.staffId !== staff.staffId && m.affiliation === staff.affiliation);
                return getSynergyHtml(attrType, { teammates });
            })()}

            <div>
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
                    scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: '#8a8278', backdropColor: 'transparent' }, grid: { color: 'rgba(200, 190, 175, 0.3)' }, pointLabels: { color: '#5a5248', font: { size: 11, family: "'Outfit', sans-serif" } } } },
                    plugins: {
                        legend: {
                            display: datasets.length > 1,
                            labels: { color: '#5a5248', font: { size: 11, family: "'Outfit', sans-serif" }, usePointStyle: true }
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

// ── Modal: 所属変更 (Location Chips) ──
async function changeAffiliation(staffId, newAffFull, newAffShort, btnEl) {
    const staff = staffList.find(s => s.staffId === staffId);
    if (!staff) return;

    const oldAffiliation = staff.affiliation;
    const oldShort = shortName(oldAffiliation);
    if (oldShort === newAffShort) return; // 同じ所属 — 何もしない

    // ローカル即時反映
    staff.affiliation = newAffFull;
    recordAffiliationChange(staffId, oldAffiliation, newAffFull);

    // チップUIを即時更新（全ボタンをリセットしてアクティブを切替）
    if (btnEl && btnEl.parentElement) {
        const siblings = btnEl.parentElement.querySelectorAll('button');
        siblings.forEach(b => {
            b.style.fontWeight = '500';
            b.style.background = 'transparent';
            b.style.borderColor = 'rgba(160,120,64,0.15)';
            b.style.color = 'var(--text-dim)';
        });
        const color = STORE_COLORS[newAffShort] || 'var(--text-sub)';
        btnEl.style.fontWeight = '700';
        btnEl.style.background = color + '22';
        btnEl.style.borderColor = color;
        btnEl.style.color = color;
    }

    renderStaffGrid(staffList);
    TI_BRIDGE.showToast(`🔄 ${staff.name} → ${newAffShort} に移動中...`);

    // バックエンドに保存
    try {
        const res = await TI_BRIDGE.updateProfile(staffId, { affiliation: newAffFull });
        if (res.result === 'success') {
            TI_BRIDGE.showToast(`✅ ${staff.name} → ${newAffShort} 保存完了`);
        } else {
            TI_BRIDGE.showToast(`⚠️ ${staff.name}: サーバー保存失敗 — ローカルでは移動済み`, 5000);
        }
    } catch (err) {
        TI_BRIDGE.showToast(`⚠️ ${staff.name}: 通信エラー — ローカルでは移動済み`, 5000);
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
// Tab Avatar Helper
// ═══════════════════════════════════════════════════════════
function updateTabAvatar(containerId, staff) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!staff) { el.style.display = 'none'; el.innerHTML = ''; return; }
    const src = staff.photoUrl ? fixPhotoUrl(staff.photoUrl) : '';
    el.style.display = '';
    el.innerHTML = src
        ? `<img src="${src}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(160,120,64,0.25);flex-shrink:0;" onerror="this.outerHTML='<div style=\'width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,rgba(160,120,64,0.15),rgba(200,164,94,0.05));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--gold);border:2px solid rgba(160,120,64,0.15);flex-shrink:0;\'>${(staff.name||'?')[0]}</div>'">`
        : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,rgba(160,120,64,0.15),rgba(200,164,94,0.05));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--gold);border:2px solid rgba(160,120,64,0.15);flex-shrink:0;">${(staff.name||'?')[0]}</div>`;
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
        const staff = show ? staffList.find(s => s.staffId === sel.value) : null;
        // Avatar
        updateTabAvatar('assessAvatar', staff);
        document.getElementById('skillCard').style.display = show ? '' : 'none';
        document.getElementById('radarCard').style.display = show ? '' : 'none';
        document.getElementById('assessGrid').style.display = show ? '' : 'none';
        document.getElementById('adviceCard').style.display = 'none';
        // Calculator link
        const calcLink = document.getElementById('assessCalcLink');
        if (calcLink) {
            calcLink.style.display = show ? '' : 'none';
            if (show) {
                const staff = staffList.find(s => s.staffId === sel.value);
                calcLink.href = '../TalentIntelligence_Calculator_v8.0.html' + (staff ? '?name=' + encodeURIComponent(staff.name) : '');
            }
        }
        if (show) {
            renderSelfReferenceChart(sel.value);
        } else {
            renderSelfReferenceChart(null);
        }
    });
}

    // Load self-reference chart function above

let assessRefRadarChart = null;
let cachedAssessHistory = [];
let currentRefType = 'Self';

function switchRefType(type) {
    currentRefType = type;
    document.getElementById('refSelf').classList.toggle('active', type === 'Self');
    document.getElementById('refMgr').classList.toggle('active', type === 'Manager');
    if (cachedAssessHistory.length === 0) return;
    // Find record of this type from cache
    let ref = cachedAssessHistory.find(e => e.evalType === type);
    if (!ref) {
        const content = document.getElementById('assessRefContent');
        content.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;padding:1rem;">${type} の評価データがありません。</div>`;
        return;
    }
    displayRefData(ref, type === 'Self' ? 'Self (自己評価)' : 'Manager (MGR評価)');
}

function displayRefData(latestRef, refType) {
    const content = document.getElementById('assessRefContent');
    const chartWrap = document.querySelector('.radar-wrap-small');

    content.innerHTML = `
        <div style="font-size:0.85rem; margin-top:8px;">
            <p style="margin:4px 0;"><strong>参照:</strong> <span style="color:${latestRef.evalType==='Self'?'#6889a8':'#a08058'};">${refType}</span></p>
            <p style="margin:4px 0;"><strong>日付:</strong> ${new Date(latestRef.timestamp).toLocaleDateString()}</p>
            <p style="margin:4px 0;"><strong>Total CP:</strong> ${latestRef.totalScore}</p>
        </div>
    `;

    chartWrap.style.display = '';

    const ctx = document.getElementById('assessRefRadar');
    const calcAvg = (scores, prefix) => {
        let sum = 0, count = 0;
        for(let i=1; i<=6; i++) {
            const v = Number(scores[prefix+i]);
            if(!isNaN(v)) { sum+=v; count++; }
        }
        return count > 0 ? sum/count : 0;
    };
    const rData = [
        calcAvg(latestRef.scores, 'p'),
        calcAvg(latestRef.scores, 's'),
        calcAvg(latestRef.scores, 'e'),
        calcAvg(latestRef.scores, 'm')
    ];

    if (assessRefRadarChart) assessRefRadarChart.destroy();
    assessRefRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [CAT_NAMES.P, CAT_NAMES.S, CAT_NAMES.E, CAT_NAMES.M],
            datasets: [{
                label: refType,
                data: rData,
                backgroundColor: latestRef.evalType === 'Self' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(200, 164, 94, 0.15)',
                borderColor: latestRef.evalType === 'Self' ? '#6889a8' : '#a08058',
                borderWidth: 2,
                pointBackgroundColor: latestRef.evalType === 'Self' ? '#6889a8' : '#a08058',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false }, pointLabels: { font: { size: 10, family: "Outfit, sans-serif" } } } },
            plugins: { legend: { display: false } }
        }
    });

    // Set skill values from this ref
    const rawScores = latestRef.scores;
    Object.keys(rawScores).forEach(k => {
        const v = rawScores[k];
        if(v !== '' && v !== null && v !== undefined) skillScores[k] = parseFloat(v) || 0;
    });
    updateSkillDisplay();
}

async function renderSelfReferenceChart(staffId, preferredType) {
    const content = document.getElementById('assessRefContent');
    const chartWrap = document.querySelector('.radar-wrap-small');
    if (!staffId) {
        content.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.85rem;">自己評価データが読み込まれます<br>（未提出の場合は過去のManager評価）</div>';
        if (assessRefRadarChart) { assessRefRadarChart.destroy(); assessRefRadarChart = null; }
        return;
    }

    content.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;">履歴取得中...</div>';
    
    try {
        const h = await TI_BRIDGE.loadHistory(staffId);
        if (h.result !== 'success' || h.history.length === 0) {
            content.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem;padding:1rem;">過去の評価データがありません。<br>今回が最初の評価になります。</div>';
            resetSkillScores();
            if (assessRefRadarChart) { assessRefRadarChart.destroy(); assessRefRadarChart = null; }
            chartWrap.style.display = 'none';
            return;
        }

        const sorted = h.history.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        cachedAssessHistory = sorted;
        const refPref = preferredType || currentRefType || 'Self';
        let latestRef = sorted.find(e => e.evalType === refPref);
        let refType = refPref === 'Self' ? 'Self (自己評価)' : 'Manager (MGR評価)';
        if (!latestRef) {
            const fallback = refPref === 'Self' ? 'Manager' : 'Self';
            latestRef = sorted.find(e => e.evalType === fallback || (!e.evalType && fallback === 'Manager'));
            refType = fallback === 'Self' ? 'Self (自己評価)' : 'Manager (MGR評価)';
        }

        if (!latestRef) {
            content.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem;padding:1rem;">利用可能な参照データがありません。</div>';
            resetSkillScores();
            if (assessRefRadarChart) { assessRefRadarChart.destroy(); assessRefRadarChart = null; }
            chartWrap.style.display = 'none';
            return;
        }

        displayRefData(latestRef, refType);

    } catch (e) {
        content.innerHTML = '<div style="color:var(--red);font-size:0.85rem;">データ取得エラー</div>';
        console.error(e);
        resetSkillScores();
    }
}
// ── LV Guide (exact original text from Calculator v8.0) ──
const SKILL_LV_GUIDE = {
    p1: ['指示された業務を覚えることに集中している','自身の業務範囲内で、分からないことを自ら質問できる','自身のスキルアップのために、マニュアルを読み返したり、先輩の技術を観察したりしている','上位者から与えられた課題やフィードバックに対し、素直に受け止め、改善しようと努力している','自身の業務範囲外の知識やスキル（例: 他部門の業務、業界のトレンド）にも興味を持ち、情報収集している','自身の弱みを克服するため、または強みを伸ばすために、具体的な目標を設定し、学習計画を立てて実行している（例: 書籍購入、セミナー参加）','習得した知識やスキルを、自身の業務改善やチームへの貢献に活かしている','チームや店舗の目標達成に必要な新しい知識やスキルを特定し、チーム全体の学習を促進する活動（例: 勉強会の企画）を主導できる','業界の枠を超えた幅広い分野から学び、SVDの既存のやり方にとらわれない新しいアイデアや視点をもたらすことができる','常に自己変革を続け、その姿勢が周囲の模範となっている。組織全体の「学習する文化」を醸成し、牽引している'],
    p2: ['自身の業務を滞りなく行い、チームに迷惑をかけないように努めている','チームメンバーからの依頼に対し、快く協力できる','チーム内のコミュニケーションを円滑にするため、積極的に挨拶や声かけを行っている','自身の意見を伝えつつ、チームの決定には従い、協力して業務を遂行できる','チーム内の課題や目標に対し、自身の役割を理解し、積極的に貢献しようと努めている','チームメンバーの強みや弱みを理解し、互いに補完し合えるような関係性を築ける','チーム内の意見の対立や衝突があった際に、中立的な立場で調整し、建設的な解決に導ける','チームの目標達成のために、部門や役割の垣根を越えて他チームと連携し、協力体制を構築できる','チーム全体のパフォーマンスを最大化するため、メンバーのモチベーション向上や、新しいチームワークの仕組みを提案・実行できる','SVD全体の組織目標達成のため、複数のチームや部門を横断するプロジェクトを主導し、全社的な協調体制を構築・推進できる'],
    p3: ['予期せぬ出来事やプレッシャーを感じると、業務に集中しづらくなることがある','プレッシャーを感じつつも、指示された業務は最後まで遂行できる','業務の優先順位が変更された際、戸惑いつつも対応できる','繁忙時や予期せぬトラブルが発生した際も、冷静さを保ち、自身の業務を遂行できる','業務内容や役割の変更に対し、前向きに受け入れ、適応しようと努力できる','ストレスを感じた際に、自身の感情をコントロールし、適切な対処法（例: 休憩、相談）を見つけられる','チームメンバーがストレスを感じている状況を察知し、サポートや声かけができる','複数の困難な状況や変化が同時に発生しても、冷静に状況を分析し、優先順位を付けて対応できる','組織全体の大きな変革や困難なプロジェクトにおいて、その変化を前向きに捉え、チームを鼓舞し、適応を促せる','どのような逆境や未曾有の事態においても、常に冷静沈着で、変化を成長の機会と捉え、組織全体を力強く牽引できる'],
    p4: ['指示された業務を、決められた手順通りに遂行する','自身の業務において、ミスなく完了させる責任感を持っている','自身の業務範囲で発生した問題に対し、他責にせず、自身の問題として捉えることができる','自身の業務を「作業」としてではなく、「目的」を理解した上で遂行できる','自身の役割や業務が、チームや店舗全体の目標にどう貢献するかを理解し、行動している','担当業務の範囲を超えて、店舗全体の課題や問題点を「自分ごと」として捉え、改善策を提案できる','チームやプロジェクトのリーダーとして、その成果に対して全責任を負う覚悟を持っている','チームや店舗で発生した失敗やクレームに対し、自らが矢面に立ち、責任者として対応できる','店舗や事業の成功を自身の成功と捉え、その達成のためにあらゆる困難を引き受け、最後までやり遂げる','SVD全体の成功と発展を自身の使命と捉え、いかなる役割や立場であっても、組織全体の課題を「自分ごと」として解決に導く'],
    p5: ['相手の話を遮らずに聞くことができる','相手の表情や声のトーンから、感情を読み取ろうと努めている','相手の話の内容を理解し、適切に相槌を打つことができる','相手の言葉の裏にある意図や感情を推測し、共感的な返答ができる','顧客や同僚の抱える問題に対し、相手の立場に立って考え、寄り添うことができる','相手が本当に伝えたいこと（ニーズ、不満、期待）を、言葉だけでなく非言語情報からも深く理解できる','チーム内の意見の対立や顧客のクレームに対し、双方の感情や背景を深く理解し、共感を示しながら解決の糸口を見つけられる','顧客や同僚の潜在的なニーズや、まだ言語化されていない感情を察知し、先回りして行動できる','異なる文化や価値観を持つ人々に対しても、深い共感と理解を示し、信頼関係を構築できる','SVDの顧客や従業員、パートナー企業など、あらゆるステークホルダーの感情やニーズを深く理解し、それらをSVDのサービスや戦略に反映させることで、組織全体の共感力を高める'],
    p6: ['SVDの理念や行動指針について、説明を聞いたことがある','SVDのブランドコンセプト「ここだけの美味しさ。ここだけのエンターテインメント。」を理解し、説明できる','自身の業務において、SVDの理念を意識して行動しようと努めている','自身の行動や判断が、SVDのブランドイメージにどう影響するかを考えている','SVDの理念やビジョンを自身の言葉で語り、後輩に伝えることができる','SVDの理念を体現するような、新しいサービスや改善案を自ら提案できる','チームや店舗の目標を、SVDの理念と結びつけて設定し、メンバーの共感を呼ぶことができる','SVDの理念に反するような事象や慣習を発見した際に、それを改善するための具体的な行動を起こせる','SVDの理念やブランド価値を、社外のパートナーや顧客に対しても魅力的に伝え、ファンを増やすことができる','SVDの理念そのものを時代に合わせて発展させ、組織の未来を創り出す。SVDの「生きる理念」そのものである'],
    s1: ['指示された業務を、指導を受けながら遂行できる（研修生レベル）','基本的な業務（配膳、バッシング等）を、監督下で一人で遂行できる','小規模な担当範囲（1〜2テーブル）を、一人で責任を持って担当できる','担当範囲の顧客の基本的なニーズを先読みし、プロアクティブに動ける','標準的な担当範囲（3〜4テーブル）を、効率的かつ安定して管理できる','繁忙時や広範囲のセクションでも、冷静に優先順位を判断し、高い品質を維持できる','後輩スタッフへの実地指導（OJT）を行い、チーム全体のサービス品質向上に貢献できる','フロアリーダーとして、予期せぬトラブルやクレームにも一次対応し、解決に導ける','サービス全体の流れを俯瞰し、フロア全体のオペレーションを円滑に管理・指揮できる','既存のサービスフローの課題を発見し、改善策を提案・実行することで、店舗全体の顧客体験を革新できる'],
    s2: ['料理名を正確に覚えている','主な食材が何かを答えることができる','簡単な調理法（焼く、煮るなど）を説明できる','食材の産地や特徴、こだわりのポイントを説明できる','一般的なアレルギーに関する質問に、正確に回答・確認ができる','料理の風味、食感、味わいの構成を、自身の言葉で表現豊かに説明できる','顧客の好みや状況（量、気分、予算）をヒアリングし、最適な料理を提案できる','シェフの料理哲学や、コース全体のストーリーを理解し、顧客に伝えることができる','専門知識を持つ顧客と、調理技術や食材について対等に会話ができる','顧客からのフィードバックを的確に収集・分析し、キッチンに建設的な意見としてフィードバックできる'],
    s3: ['ドリンクメニューの品目を覚えている','標準的なソフトドリンク、ビール、スピリッツの注文を正確に受けられる','簡単なミックスドリンク（ハイボール等）を作成できる','提供しているビールやスピリッツの種類と、その特徴を説明できる','料理に合わせたノンアルコールドリンクのペアリングを提案できる','定番カクテル（ジントニック、モスコミュール等）をレシピ通りに作成できる','プレミアムスピリッツの背景（蒸留所、製法）を語り、その価値を伝えることができる','顧客の好みに合わせて、メニューにないカスタムカクテルを作成・提案できる','バーの在庫管理に関わり、新しいドリンクメニューの導入を提案できる','店舗のコンセプトを体現する、シグネチャーカクテルを開発できる'],
    s4: ['赤・白・泡の基本的な違いを理解している','指示通りにワインの抜栓・提供ができる','主要なブドウ品種（カベルネ、シャルドネ等）の特徴を簡単に説明できる','グラスワインリストの各ワインの味わいや特徴を説明できる','顧客の簡単な好み（重い、軽い等）に応じて、ボトルワインを数種類提案できる','主要なワイン産地（仏、伊、米等）の特色を理解し、説明できる','デキャンタージュや、古酒の取り扱いを適切に行うことができる','コース料理全体を通して、ワインペアリングを自信を持って提案できる','ワインセラーの一部管理を任され、仕入れや在庫管理に関与する','ソムリエとして、ワインリスト全体の構築、ペアリングコースの開発、仕入れ戦略の策定を担う'],
    s5: ['笑顔で挨拶し、基本的な接客用語を正しく使える','顧客からの簡単な依頼（水、おしぼり等）に、丁寧かつ迅速に対応できる','顧客の名前を覚え、自然な形で会話に取り入れることができる','顧客との会話の中で、相手の興味や背景を察し、適切な話題を提供できる','顧客のニーズを先回りして察知し、言われる前にサービスを提供できる','軽微なクレームや要望に対し、冷静かつ共感的に対応し、顧客の不満を解消できる','顧客との間に信頼関係を築き、再来店に繋がる「ファン」を作ることができる','VIPや特別な配慮が必要な顧客に対し、常に落ち着いて、期待を超えるサービスを提供できる','重大なクレームや予期せぬ事態に対し、機転を利かせた対応で、逆に顧客の感動を呼ぶ経験を創出できる','店舗のブランドアンバサダーとして、自身の立ち居振る舞いそのもので、店の格を体現できる'],
    s6: ['POSシステムの基本的な画面構成を理解している','正確に注文を入力し、会計処理（現金、クレジット）を一人で行える','割引、分割会計、注文取消しなど、特殊な会計処理をマニュアルを見ずに対応できる','予約システムの基本操作（新規予約、変更、キャンセル）を正確に行える','POSやプリンターの軽微なトラブル（ロール紙交換、再起動等）を自己解決できる','POSから日次・月次の基本的な売上レポートを出力し、内容を理解できる','新人スタッフに対し、POSや予約システムの操作方法を分かりやすく指導できる','予約システムのテーブル管理機能を使い、最適な配席や在庫管理を行える','システムから得られるデータを分析し、オペレーション上の課題や改善点を指摘できる','外部業者と連携し、システムの導入やアップデート、カスタマイズを主導できる'],
    e1: ['業界経験1年未満','業界経験1年','業界経験2年','業界経験3年','業界経験5年','業界経験7年','業界経験10年','業界経験15年','業界経験20年','業界経験25年以上'],
    e2: ['在籍1年未満','在籍1年','在籍2年','在籍3年。SVDの理念や文化を深く理解している','在籍5年。または、2つ以上のSVD店舗での勤務経験がある','在籍7年。または、異なる業態のSVDブランドでの勤務経験がある','在籍10年。SVDの歴史や各店舗の背景を理解し、自身の言葉で語ることができる','新規開店やリニューアルプロジェクトの立ち上げメンバーとしての経験がある','複数店舗の運営に横断的に関わった経験がある（例: エリアマネジャー、ブランドマネジャー）','SVDの経営層として、全社の意思決定に関与した経験がある'],
    e3: ['専門資格なし','専門分野に関する基礎的な知識を習得中','専門分野に関する基礎的な資格を1つ保有（例: ワイン検定ブロンズクラス）','専門分野に関する基礎的な資格を複数保有。または、中級資格を1つ保有（例: ワイン検定シルバークラス）','ホテル・レストラン・サービス技能士2級、J.S.A. ワインエキスパート、利き酒師など、主要な専門資格を1つ保有','バーテンダー呼称技能認定、調理師免許、製菓衛生師など、より業務に直結する主要な専門資格を保有','複数の主要な専門資格を保有。または、ホテル・レストラン・サービス技能士1級を保有。','J.S.A. ソムリエ呼称資格を保有','J.S.A. ソムリエ・エクセレンス（旧シニアソムリエ）の資格を保有。または、国内の主要なコンクールでの表彰など、それに準ずる実績がある','国際的な専門資格（例: WSET Level 3以上）を保有。または、国内外のコンクールで顕著な実績がある'],
    e4: ['基本的なPC操作ができる','文書作成ソフトや表計算ソフトの基本的な操作ができる','TableCheckの基本操作（予約入力、顧客情報確認）ができる','Illustratorの基本操作ができ、簡単なメニューやPOPの作成・修正ができる','表計算ソフトの高度な機能を用いて、業務効率化に繋がるデータ分析や管理表を作成できる','TableCheckの応用操作（テーブル管理、在庫設定、顧客メモの活用）ができる','Illustratorの応用操作ができ、新規メニューブックのデザインや、後輩への指導ができる','TableCheckの管理者として、店舗の設定変更やスタッフへの指導ができる','動画編集ツールを用いて、SNS投稿用や社内研修用のショート動画を作成・編集できる','社内の業務システム全体の課題を特定し、外部業者と連携して要件定義や改善を主導できる'],
    e5: ['役職経験なし','特定の業務リーダーの経験がある','シフトリーダーやセクションリーダーの経験がある','キャプテンまたはアシスタントマネジャーとして、上位者の補佐やチーム管理の経験がある','マネジャーまたは副支配人として、特定部門や小規模店舗の責任者経験がある','支配人として、一つの店舗全体の運営責任者としての経験がある','エリア支配人として、複数店舗を統括した経験がある','上級エリア支配人またはブランドマネジャーとして、より広域なエリアやブランド全体の運営戦略を担った経験がある','統括支配人として、複数のエリアやブランドを横断する大規模な戦略や組織運営を担った経験がある','総支配人（GM）として、SVDの運営チームの中核を担い、事業全体を推進した経験がある'],
    e6: ['特筆すべき実績や表彰なし','チーム内での小さな貢献が認められた経験がある','店舗内での表彰（例: 月間MVP）を受けた経験がある','顧客からの感謝状や、SNSでの高評価など、外部からの具体的な評価を得た経験がある','SVDグループ内での表彰（例: 年間優秀社員賞）を受けた経験がある','業務改善プロジェクトを主導し、具体的な成果を出した経験がある','業界団体主催のコンクールやイベントで入賞・入選した経験がある','SVDのブランド価値向上に大きく貢献するプロジェクトを主導し、顕著な実績を上げた経験がある','国内外の主要なコンクールで上位入賞、または社外で広く認知されるような高い評価を獲得した経験がある','業界最高峰の目標達成に向けて、常に具体的な計画と情熱を持ち、チームを牽引している'],
    m1: ['店舗の基本的な営業数値に関心を持っている','自身の行動がコストにどう影響するかを意識して業務にあたる','日報や基本的なレポートを読み、前日・前週との数値の差異を説明できる','担当カテゴリーの原価計算ができ、原価率を理解している','FLコストの概念を理解し、日々のオペレーションにおいて、その最適化を意識した行動が取れる','月次PLの主要項目を理解し、自店舗の数値を他店舗や予算と比較して説明できる','PLの数値変動から、店舗が抱える経営上の課題を特定し、具体的な改善アクションを複数提案できる','競合や市場の動向、過去のデータを基に、月単位での売上・利益の着地予測を立て、その達成に向けた具体的な計画を策定できる','投資対効果（ROI）の観点から、新規設備投資や大規模な販促企画の妥当性を評価・判断し、事業計画を策定できる','複数店舗やブランド全体の財務データを横断的に分析し、SVD全体の経営戦略に対し、財務的観点から提言・貢献できる'],
    m2: ['チームの一員として、他のスタッフと協力的に業務を遂行できる','新人や後輩に対し、自身の担当業務について手本を見せ、基本的な手順を教えることができる','チーム内の良好な雰囲気作りに貢献し、ポジティブな声がけや挨拶を率先して行える','後輩の小さな成長や変化に気づき、具体的に褒めたり、悩みに寄り添ったりすることができる','担当範囲において、後輩へのタスクの割り振りや、簡単なOJTを計画・実行できる','スタッフ一人ひとりの特性を理解し、個々に合わせた指導や動機付けができる','チームの目標を設定し、メンバーの役割を明確にし、目標達成に向けてチームを一つにまとめることができる','スタッフのキャリアプランについて相談に乗り、成長の機会を設計・提供できる。チーム内の対立を仲裁し、解決に導く','店舗の理念やビジョンに基づいた採用計画を策定し、将来のリーダー候補を発掘・育成する仕組みを構築・運用できる','SVD全体の組織文化を醸成する。ブランドや店舗の垣根を越えた人材の交流・育成や、次世代の経営幹部候補を育成するサクセッションプランを設計・実行する'],
    m3: ['サービスの一連の流れを学ぶ。指示された持ち場の準備や片付けを正確に行える。','担当セクションの基本的な維持管理を、シェフ・ド・ランの指示のもとで遂行できる。','シェフ・ド・ランを完全に補助し、料理やドリンクの提供、バッシングを迅速かつ静かに行える。','小規模なセクションの責任者として、簡単なオーダーテイクや料理説明ができる。','標準的なセクションの責任者として、オーダーテイクから会計までの一連のサービスを一人で完結できる。','コミ・ド・ランを効果的に指導・管理しながら、自身のセクションで高いサービス品質と効率を両立できる。','ダイニングの特定エリアを統括し、複数のシェフ・ド・ランの動きを監督・調整する。','メートル・ド・テルを補佐する副責任者として、ダイニング運営の中核を担う。','ダイニング全体の最高責任者として、全サービスの指揮、スタッフの採用・教育、顧客満足度の管理に責任を持つ。','レストラン全体の総支配人として、サービス・キッチンと連携し、店舗全体の経営に責任を持つ。'],
    m4: ['問題を発見し、5W1Hを用いて正確に状況を報告できる','発生した問題に対し、根本原因分析の初歩的な手法を用いて、直接的な原因を特定できる','自身の担当業務やチームのタスクにおいて、特定された課題に対し、PDCAサイクルを適用し、改善策を立案・実行できる','繰り返し発生する問題に対し、特性要因図を用いて、考えられる原因を構造的に洗い出せる','担当セクションや特定サービスに対し、SWOT分析を行い、具体的な改善アクションプランを立案できる','3C分析を用いて競合や市場の状況を分析し、4P/4Cの観点から具体的な販促企画やマーケティングプランを立案・提案できる','店舗の中期計画策定において、PEST分析やファイブフォース分析を用い、外部環境を評価し、戦略に反映させることができる','ビジネスモデルキャンバスを用いて、新規事業や大規模な店舗改善の計画を策定する。OKRを設定し、店舗全体の戦略実行を管理する','ブルー・オーシャン戦略などの思考フレームに基づき、既存の競争を抜け出す革新的な事業コンセプトやサービスを立案する。','SVD全体の経営課題に対し、複数の事業部門を横断する複雑な問題を構造化し、持続的な企業価値向上に繋がる全社戦略を策定・提言する'],
    m5: ['チームの目標や指示を理解し、自身の役割を果たすことで貢献できる','チームの規範やルールを遵守し、他のメンバーに良い影響を与える行動ができる','自身の意見やアイデアを建設的に発信し、チームの議論に貢献できる','チーム内の課題やメンバーの困り事を察知し、積極的にサポートや提案ができる','チームの目標達成に向けて、メンバーを巻き込み、協調性を生み出すことができる','困難な状況や変化の局面において、自身の役割を明確にし、チームを鼓舞し、前向きな行動を促せる','店舗のビジョンや目標を明確に言語化し、メンバーに浸透させることで、自律的な行動を引き出せる','チームの多様性を尊重し、異なる意見や価値観を統合しながら、より良い意思決定を導き出せる','自身の行動や言動を通じて、SVDの理念や文化を体現し、店舗内外のステークホルダーから信頼と尊敬を集めることができる','SVD全体の未来を構想し、そのビジョンを内外に発信することで、組織全体を牽引し、業界に新たな価値を創造できる'],
    m6: ['店舗のブランドコンセプトやターゲット顧客を理解し、自身の言葉で説明できる','店舗のSNSアカウントで、ブランドイメージに沿った基本的な情報発信ができる','お客様の声を収集し、ポジティブ/ネガティブな意見を要約してチームに共有できる','店舗の販促物のデザインや文言について、ブランドコンセプトに基づいた改善案を提案できる','小規模なイベントやキャンペーンの企画から実行、結果報告までを担当できる','プレスリリースのドラフト作成や、メディア向け資料の準備ができる。地域のメディアやインフルエンサーとの関係を構築する','CRMツール等を活用して顧客データを分析し、リピート率向上のための施策を立案・実行できる','店舗の年間マーケティングプランと予算を策定し、実行を管理し、施策の効果測定（ROI）までを責任を持って行うことができる','異業種コラボレーションや大型タイアップ企画など、ブランドの認知度を飛躍的に高めるための戦略的なPR・マーケティング活動を主導する','SVD全体のブランド戦略を策定する。SVDを業界や社会における一つの「文化」として確立させるための活動を牽引する']
};

function initSkillSliders() {
    const container = document.getElementById('skillSliders');
    if (!container) return;

    // Category tab switching
    document.querySelectorAll('.cat-btn[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn[data-cat]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.skill-group').forEach(g => g.classList.remove('active'));
            const el = document.getElementById('skills-' + btn.dataset.cat);
            if (el) el.classList.add('active');
        });
    });

    // Create read-only skill display
    let html = '';
    ['P', 'S', 'E', 'M'].forEach(cat => {
        html += `<div class="skill-group ${cat === 'P' ? 'active' : ''}" id="skills-${cat}">`;
        Object.entries(SKILL_LABELS[cat]).forEach(([key, label]) => {
            skillScores[key] = 0;
            const rubric = SKILL_RUBRICS[cat][key];
            html += `
            <div class="skill-row" style="flex-direction: column; align-items: stretch; gap: 0.3rem; padding: 0.8rem 1rem; border-bottom: 1px solid var(--border-light);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="skill-label" style="font-weight: 600; font-size: 0.9rem; flex: 1;">${label}</span>
                    <span class="skill-value" id="val-${key}" style="font-weight: 700; font-size: 1.1rem; min-width: 2.5rem; text-align: right; color: var(--gold);">—</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                    <div id="bar-${key}" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); border-radius: 3px; transition: width 0.4s ease;"></div>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-dim); line-height: 1.4; padding-left: 0.5rem; border-left: 3px solid var(--gold-dark); margin-top: 0.2rem;">
                    ${rubric}
                </div>
                <details style="margin-top: 0.15rem;">
                    <summary style="cursor: pointer; font-size: 0.72rem; color: var(--text-muted); user-select: none;">▶ LV1〜10 目安</summary>
                    <div id="lv-${key}" style="font-size: 0.7rem; color: var(--text-dim); padding: 0.3rem 0 0 0.5rem; line-height: 1.7;"></div>
                </details>
            </div>`;
        });
        html += '</div>';
    });
    container.innerHTML = html;
}

function resetSkillScores() {
    Object.keys(skillScores).forEach(k => {
        skillScores[k] = 0;
        const val = document.getElementById('val-' + k);
        const bar = document.getElementById('bar-' + k);
        if (val) val.textContent = '—';
        if (bar) bar.style.width = '0%';
    });
    updateTotalScore();
    updateRadarChart();
}

function updateSkillDisplay() {
    Object.keys(skillScores).forEach(k => {
        const v = skillScores[k];
        const val = document.getElementById('val-' + k);
        const bar = document.getElementById('bar-' + k);
        if (val) val.textContent = v > 0 ? Number(v).toFixed(0) : '—';
        if (bar) bar.style.width = v > 0 ? (v * 10) + '%' : '0%';
        // Highlight current LV in accordion
        const lvContainer = document.getElementById('lv-' + k);
        if (lvContainer && SKILL_LV_GUIDE[k]) {
            let lvHtml = '';
            SKILL_LV_GUIDE[k].forEach((desc, idx) => {
                const lv = idx + 1;
                const isCurrent = Math.round(v) === lv;
                lvHtml += `<div style="padding: 2px 4px; ${isCurrent ? 'background: rgba(212,175,55,0.15); border-radius: 3px; color: var(--gold); font-weight: 600;' : ''}">LV${lv}: ${desc}</div>`;
            });
            lvContainer.innerHTML = lvHtml;
        }
    });
    updateTotalScore();
    updateRadarChart();
}

function updateTotalScore() {
    // Calculator公式: (P平均 × S平均) + (E平均 × M平均)
    const avg = (prefix) => {
        let sum = 0;
        for (let i = 1; i <= 6; i++) sum += (skillScores[prefix + i] || 0);
        return sum / 6;
    };
    const pAvg = avg('p'), sAvg = avg('s'), eAvg = avg('e'), mAvg = avg('m');
    const total = (pAvg * sAvg) + (eAvg * mAvg);
    document.getElementById('totalScore').textContent = total.toFixed(2);
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
                    pointLabels: { color: '#5a5248', font: { size: 12, family: "'Outfit', sans-serif" } }
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
// ③ GROWTH (Point-in-Time Comparison)
// ═══════════════════════════════════════════════════════════
let currentGrowthHistory = [];

function populateGrowthSelects() {
    const sel = document.getElementById('growthStaff1');
    if (!sel) return;
    sel.innerHTML = '<option value="">対象スタッフを選択...</option>';
    staffList.forEach(s => {
        sel.innerHTML += `<option value="${s.staffId}">${s.name}</option>`;
    });
    sel.addEventListener('change', () => onGrowthStaffSelected(sel.value));
}

async function onGrowthStaffSelected(staffId) {
    const selA = document.getElementById('growthHistoryA');
    const selB = document.getElementById('growthHistoryB');
    const btn = document.getElementById('btnGrowthAnalyze');
    const staff = staffId ? staffList.find(s => s.staffId === staffId) : null;
    updateTabAvatar('growthAvatar', staff);
    
    selA.innerHTML = '<option value="">比較元 (From) を選択</option>';
    selB.innerHTML = '<option value="">比較先 (To) を選択</option>';
    selA.disabled = true;
    selB.disabled = true;
    btn.disabled = true;
    currentGrowthHistory = [];

    if (!staffId) {
        const calcLink = document.getElementById('growthCalcLink');
        if (calcLink) calcLink.style.display = 'none';
        return;
    }
    // Calculator link
    const growthCalcLink = document.getElementById('growthCalcLink');
    if (growthCalcLink) {
        growthCalcLink.style.display = '';
        const staff = staffList.find(s => s.staffId === staffId);
        growthCalcLink.href = '../TalentIntelligence_Calculator_v8.0.html' + (staff ? '?name=' + encodeURIComponent(staff.name) : '');
    }

    try {
        selA.innerHTML = '<option value="">読込中...</option>';
        const h = await TI_BRIDGE.loadHistory(staffId);
        if (h.result === 'success' && h.history.length > 0) {
            currentGrowthHistory = h.history.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
            
            selA.innerHTML = '<option value="">比較元 (From) を選択</option>';
            selB.innerHTML = '<option value="">比較先 (To) を選択</option>';
            
            currentGrowthHistory.forEach((record, index) => {
                const dateStr = new Date(record.timestamp).toLocaleDateString('ja-JP');
                const typeStr = record.evalType || 'Manager';
                // index points to the currentGrowthHistory array element
                selA.innerHTML += `<option value="${index}">${dateStr} - ${typeStr} (CP:${record.totalScore})</option>`;
                selB.innerHTML += `<option value="${index}">${dateStr} - ${typeStr} (CP:${record.totalScore})</option>`;
            });
            
            selA.disabled = false;
            selB.disabled = false;
            btn.disabled = false;
        } else {
            selA.innerHTML = '<option value="">履歴がありません</option>';
        }
    } catch (e) {
        selA.innerHTML = '<option value="">エラー発生</option>';
        console.error(e);
    }
}

function renderGrowthDiff() {
    const idxA = document.getElementById('growthHistoryA').value;
    const idxB = document.getElementById('growthHistoryB').value;
    const tableDiv = document.getElementById('growthDiffTable');
    
    if (idxA === '' || idxB === '') {
        TI_BRIDGE.showToast('比較する2つの履歴を選択してください');
        return;
    }
    
    const recA = currentGrowthHistory[idxA];
    const recB = currentGrowthHistory[idxB];
    
    // 1. Radar Chart
    const ctx = document.getElementById('growthChart');
    const calcAvg = (scores, prefix) => {
        let sum = 0, count = 0;
        for(let i=1; i<=6; i++) {
            const v = Number(scores[prefix+i]);
            if(!isNaN(v)) { sum+=v; count++; }
        }
        return count > 0 ? sum/count : 0;
    };
    
    const rDataA = [calcAvg(recA.scores, 'p'), calcAvg(recA.scores, 's'), calcAvg(recA.scores, 'e'), calcAvg(recA.scores, 'm')];
    const rDataB = [calcAvg(recB.scores, 'p'), calcAvg(recB.scores, 's'), calcAvg(recB.scores, 'e'), calcAvg(recB.scores, 'm')];
    
    if (growthChart) growthChart.destroy();
    growthChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [CAT_NAMES.P, CAT_NAMES.S, CAT_NAMES.E, CAT_NAMES.M],
            datasets: [
                {
                    label: `From: ${new Date(recA.timestamp).toLocaleDateString('ja-JP')} (${recA.evalType||'Manager'})`,
                    data: rDataA,
                    backgroundColor: 'rgba(160, 120, 64, 0.1)',
                    borderColor: 'rgba(160, 120, 64, 0.5)',
                    borderDash: [5, 5],
                    borderWidth: 2, pointRadius: 3
                },
                {
                    label: `To: ${new Date(recB.timestamp).toLocaleDateString('ja-JP')} (${recB.evalType||'Manager'})`,
                    data: rDataB,
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    borderColor: '#6889a8',
                    borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#6889a8'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, backdropColor: 'transparent', font: { size: 10, family: "Outfit, sans-serif" } }, pointLabels: { font: { size: 11, family: "Outfit, sans-serif" } } } },
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: "Outfit, sans-serif" }, usePointStyle: true } } }
        }
    });

    // 2. Diff Table (24 Skills)
    let html = `<table style="width:100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">`;
    html += `<tr style="border-bottom: 2px solid var(--border); color: var(--text-sub);">
                <th style="padding: 8px;">Skill</th>
                <th style="padding: 8px; width: 60px;">From</th>
                <th style="padding: 8px; width: 60px;">To</th>
                <th style="padding: 8px; width: 60px;">Gap</th>
             </tr>`;
             
    ['P', 'S', 'E', 'M'].forEach(cat => {
        html += `<tr style="background: rgba(160,120,64,0.05);"><td colspan="4" style="padding: 6px 8px; font-weight: bold; color: var(--gold); border-bottom: 1px solid var(--border-light);">${CAT_NAMES[cat]}</td></tr>`;
        Object.entries(SKILL_LABELS[cat]).forEach(([key, label]) => {
            const valA = Number(recA.scores[key]) || 0;
            const valB = Number(recB.scores[key]) || 0;
            const diff = Math.round((valB - valA) * 100) / 100;
            let diffColor = 'var(--text-dim)';
            let diffSign = (diff > 0) ? '+' : '';
            if (diff > 0) diffColor = 'var(--blue)';
            if (diff < 0) diffColor = 'var(--red)';
            const rubric = SKILL_RUBRICS[cat][key];
            
            html += `<tr style="border-bottom: 1px solid rgba(200, 190, 175, 0.15);">
                        <td style="padding: 6px 8px;">
                            <div style="font-weight: 600;">${label}</div>
                            <div style="font-size: 0.75rem; color: var(--text-dim); line-height: 1.3; margin-top: 2px;">${rubric}</div>
                            ${SKILL_LV_GUIDE[key] ? `<details style="margin-top: 4px;">
                                <summary style="cursor: pointer; font-size: 0.7rem; color: var(--text-muted); user-select: none;">▶ LV1〜10 目安</summary>
                                <div style="font-size: 0.68rem; color: var(--text-dim); padding: 3px 0 0 6px; line-height: 1.7;">
                                    ${SKILL_LV_GUIDE[key].map((desc, idx) => {
                                        const lv = idx + 1;
                                        const isFrom = Math.round(valA) === lv;
                                        const isTo = Math.round(valB) === lv;
                                        let style = '';
                                        if (isTo) style = 'background: rgba(212,175,55,0.15); color: var(--gold); font-weight: 600; border-radius: 3px;';
                                        else if (isFrom) style = 'background: rgba(160,120,64,0.1); color: #c0a060; border-radius: 3px;';
                                        return `<div style="padding: 2px 4px; ${style}">LV${lv}: ${desc}${isFrom ? ' ◀ From' : ''}${isTo ? ' ◀ To' : ''}</div>`;
                                    }).join('')}
                                </div>
                            </details>` : ''}
                        </td>
                        <td style="padding: 6px 8px; font-family: monospace; vertical-align: top;">${valA.toFixed(2)}</td>
                        <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; vertical-align: top;">${valB.toFixed(2)}</td>
                        <td style="padding: 6px 8px; font-family: monospace; color: ${diffColor}; font-weight: bold; vertical-align: top;">${diffSign}${diff.toFixed(2)}</td>
                     </tr>`;
        });
    });
    html += `</table>`;
    
    // GAP summary
    const cpDiff = Math.round((Number(recB.totalScore) - Number(recA.totalScore)) * 100) / 100;
    const cpColor = cpDiff > 0 ? 'var(--blue)' : (cpDiff < 0 ? 'var(--red)' : 'var(--text-dim)');
    html += `<div style="margin-top: 1rem; padding: 1rem; background: var(--surface-2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight:bold; font-size: 1rem;">GAP</span>
                <span style="font-family: monospace; font-size: 1.2rem; font-weight: bold; color: ${cpColor};">${cpDiff > 0 ? '+' : ''}${cpDiff.toFixed(2)}</span>
             </div>`;
             
    tableDiv.innerHTML = html;
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
                    <span style="margin-left:12px;font-family:'Outfit', sans-serif;font-size:12px;color:var(--text-dim);">
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
                                    <span style="margin-left:auto;font-family:'Outfit', sans-serif;font-size:12px;color:var(--text-dim);">CP ${s.cp}</span>
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
    if (!btn) return;
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
        await new Promise(r => setTimeout(r, 200));

        const canvas = await html2canvas(modalContent, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f0ebe0',
            logging: false,
            windowWidth: modalContent.scrollWidth,
            windowHeight: modalContent.scrollHeight,
            onclone: (doc) => {
                const clonedModal = doc.querySelector('.modal-content');
                if (!clonedModal) return;

                clonedModal.style.background = '#f0ebe0';
                clonedModal.style.boxShadow = 'none';

                // ── CORS対策: 外部画像（Google Drive等）をイニシャルに差し替え ──
                clonedModal.querySelectorAll('img').forEach(img => {
                    const src = img.src || '';
                    if (src.includes('googleusercontent.com') || src.includes('drive.google.com') || src.startsWith('http')) {
                        // 画像を非表示、隣のイニシャル文字を表示
                        img.style.display = 'none';
                        const next = img.nextElementSibling;
                        if (next && next.classList.contains('avatar-initial')) {
                            next.style.display = '';
                        }
                    }
                });

                // Force all cards/sections to have opaque backgrounds
                clonedModal.querySelectorAll('.card, .modal-info-grid > div, .modal-cat-score, [class*="modal-"]').forEach(el => {
                    const bg = getComputedStyle(el).backgroundColor;
                    if (bg && bg.includes('rgba')) {
                        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
                        if (match) {
                            const [, r, g, b, a] = match;
                            const alpha = a ? parseFloat(a) : 1;
                            const bgR = 240, bgG = 235, bgB = 224;
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
        TI_BRIDGE.showToast(`❌ PDF生成失敗: ${e.message}`);
        setTimeout(() => { btn.textContent = originalText; }, 3000);
    } finally {
        btn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════
// ⑧ AI ANALYSIS — Gemini Intelligence Engine
// ═══════════════════════════════════════════════════════════

// ── Gemini API Helper ──
async function callGeminiAPI(prompt) {
    const apiKey = localStorage.getItem('ti_gemini_api_key');
    if (!apiKey) throw new Error('NO_KEY');
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API Error ${res.status}`);
    }
    
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(空の応答)';
}

// ── Build analysis prompt ──
function buildGeminiPrompt(staff) {
    // Aggregate team data
    const teams = {};
    staff.forEach(s => {
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { short, members: [], totalCP: 0, catTotals: { P: 0, S: 0, E: 0, M: 0 }, count: 0, typed: 0, types: {} };
        teams[short].members.push(s);
        teams[short].totalCP += Number(s.combatPower) || 0;
        teams[short].count++;
        if (s.type) {
            teams[short].typed++;
            teams[short].types[s.type] = (teams[short].types[s.type] || 0) + 1;
        }
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw) {
                teams[short].catTotals.P += Number(raw.P) || 0;
                teams[short].catTotals.S += Number(raw.S) || 0;
                teams[short].catTotals.E += Number(raw.E) || 0;
                teams[short].catTotals.M += Number(raw.M) || 0;
            }
        } catch (e) {}
    });

    // Synergy data per team
    const teamSynergies = {};
    Object.values(teams).forEach(t => {
        const typedMembers = t.members.filter(m => m.type);
        if (typedMembers.length >= 2) {
            teamSynergies[t.short] = calcTeamSynergy(typedMembers);
        }
    });

    const teamSummary = Object.values(teams).map(t => {
        const avgCP = t.count > 0 ? (t.totalCP / t.count).toFixed(1) : '0';
        const avgP = t.count > 0 ? (t.catTotals.P / t.count).toFixed(1) : '0';
        const avgS = t.count > 0 ? (t.catTotals.S / t.count).toFixed(1) : '0';
        const avgE = t.count > 0 ? (t.catTotals.E / t.count).toFixed(1) : '0';
        const avgM = t.count > 0 ? (t.catTotals.M / t.count).toFixed(1) : '0';
        const syn = teamSynergies[t.short];
        const synStr = syn ? `倍率=${syn.multiplier.toFixed(3)},BEST=${syn.breakdown.bestCount},BETTER=${syn.breakdown.betterCount},CAUTION=${syn.breakdown.cautionCount},WARNING=${syn.breakdown.warningCount}` : '未算出';
        return `${t.short}: ${t.count}名, 平均CP=${avgCP}, P=${avgP}/S=${avgS}/E=${avgE}/M=${avgM}, 属性カバー=${t.typed}/${t.count}, 属性分布=${JSON.stringify(t.types)}, シナジー(${synStr})`;
    }).join('\n');

    // Top/Bottom individuals
    const evaluated = staff.filter(s => Number(s.combatPower) > 0).sort((a, b) => Number(b.combatPower) - Number(a.combatPower));
    const top5 = evaluated.slice(0, 5).map(s => `${s.name}(${shortName(s.affiliation)}) CP=${s.combatPower} 属性=${s.type||'未設定'}`).join(', ');
    const bottom5 = evaluated.slice(-5).map(s => `${s.name}(${shortName(s.affiliation)}) CP=${s.combatPower}`).join(', ');

    return `あなたはSVD（SAPPORO VIEWTIFUL DINING）の「AI参謀」です。
SVDは札幌で4つの高級レストラン（JW=The Jewels, NP=ヌーベルプース大倉山, GA=ザ ガーデン サッポロ, BQ=ラ・ブリック）を運営し、「アジアベストレストラン TOP100」入りを目指しています。

以下の人材データを分析し、経営者向けの戦略レポートを作成してください。

## 組織データ
- 総スタッフ: ${staff.length}名
- 評価済み: ${evaluated.length}名

## チーム別データ
${teamSummary}

## 上位5名
${top5}

## 下位5名（育成対象）
${bottom5}

## 属性シナジーシステム
BESTペア=×1.10倍, BETTERペア=×1.05倍, CAUTIONペア=×0.90倍, WARNINGペア=×0.80倍
計算方式: マイナス倍率（CAUTION/WARNING）を先に適用→プラス倍率（BEST/BETTER）を後に適用

## レポート要件
以下の6セクションで出力してください（マークダウン不要、プレーンテキストで）。各セクションは【】で囲んでください。

【組織の健康度】2-3行で組織全体の強み・弱みを要約

【チーム別診断】各チームの特徴と改善ポイントを簡潔に（各チーム1-2行）

【最重要アクション TOP3】今すぐ取るべき具体的なアクション3つ（具体的な人名やチーム名を含めること）

【シナジー戦略】シナジー倍率を最大化するための具体的な配置提案（可能であれば）

【育成優先リスト】特に育成効果が高いスタッフと、その理由・推奨育成方法

【30日後の目標】30日以内に達成すべき具体的KPIを3つ提案

簡潔に、しかし具体的に。一般論は不要、SVDのデータに基づいた分析のみ。`;
}

// ── Render Gemini Report ──
function renderGeminiReport(text) {
    const sections = text.split(/【(.+?)】/).filter(s => s.trim());
    let html = '';
    for (let i = 0; i < sections.length; i += 2) {
        const title = sections[i];
        const body = (sections[i + 1] || '').trim();
        html += `<div class="gemini-section">
            <div class="gemini-section-title">【${title}】</div>
            <div class="gemini-section-body">${body.replace(/\n/g, '<br>')}</div>
        </div>`;
    }
    return html || `<div class="gemini-section"><div class="gemini-section-body">${text.replace(/\n/g, '<br>')}</div></div>`;
}

function renderAIAnalysisTab() {
    const container = document.getElementById('aiAnalysisContent');
    if (!container) return;
    
    if (!window.__staffData || window.__staffData.length === 0) {
        container.innerHTML = `<div class="ai-empty-state">
            <div style="font-size:48px;opacity:0.3;"></div>
            <div style="font-size:1rem;color:var(--text-dim);margin-top:8px;">GASを接続してデータを読み込んでください</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">① ROSTERタブでデータを読み込み後、AI分析が自動生成されます</div>
        </div>`;
        return;
    }

    const staff = window.__staffData.filter(s => s.status !== 'archived');
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const hasApiKey = !!localStorage.getItem('ti_gemini_api_key');

    let html = `<div class="ai-report-header">
        <div class="ai-report-badge">AI INTELLIGENCE ENGINE</div>
        <div class="ai-report-timestamp">Generated: ${timestamp}</div>
    </div>`;

    // ── Gemini AI Report Section ──
    html += `<div class="ai-module ai-module--gemini">
        <div class="ai-module-header" style="background:linear-gradient(135deg,rgba(160,120,64,0.12),rgba(200,164,94,0.06));">
            
            <span class="ai-module-title">AI COUNSELOR REPORT</span>
            <span class="ai-module-desc">Gemini 2.5 Flash × SVD Organization Data</span>
        </div>
        <div class="ai-module-body">
            ${hasApiKey
                ? `<div id="geminiReportArea">
                    <button class="btn gemini-generate-btn" onclick="generateGeminiReport()">
                        AI参謀レポートを生成
                    </button>
                    <div style="font-size:0.75rem;color:var(--text-dim);margin-top:8px;text-align:center;">
                        Gemini 2.5 Flash（無料枠）がSVDデータを分析し、戦略レポートを生成します
                    </div>
                </div>`
                : `<div class="gemini-setup-prompt">
                    <div style="font-size:32px;opacity:0.5;margin-bottom:8px;"></div>
                    <div style="font-weight:600;color:var(--text-sub);margin-bottom:6px;">Gemini API Key を設定してください</div>
                    <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;">
                        <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--gold);">Google AI Studio</a> 
                        で無料のAPIキーを取得
                    </div>
                    <div style="display:flex;gap:8px;max-width:400px;margin:0 auto;">
                        <input type="password" id="geminiKeyInput" placeholder="AIza..." 
                               style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-family:'Outfit',sans-serif;font-size:12px;background:var(--surface-2);color:var(--text);">
                        <button class="btn" onclick="saveGeminiKey()" style="padding:8px 16px;">保存</button>
                    </div>
                </div>`
            }
        </div>
    </div>`;

    // ── Rule-based modules (always shown) ──
    html += renderAI_TeamPowerIndex(staff);
    html += renderAI_SkillGapRadar(staff);
    html += renderAI_GrowthPotential(staff);
    html += renderAI_SynergyOptimizer(staff);
    html += renderAI_RiskAlerts(staff);
    html += renderAI_ExecutiveSummary(staff);

    container.innerHTML = html;
    
    // Render charts after DOM update
    setTimeout(() => {
        renderAI_TeamRadarCharts(staff);
    }, 100);
}

// ── Gemini Key Management ──
function saveGeminiKey() {
    const input = document.getElementById('geminiKeyInput');
    if (!input || !input.value.trim()) return;
    localStorage.setItem('ti_gemini_api_key', input.value.trim());
    renderAIAnalysisTab(); // Re-render with key
}

// ── Generate Gemini Report ──
async function generateGeminiReport() {
    const area = document.getElementById('geminiReportArea');
    if (!area) return;
    
    area.innerHTML = `<div style="text-align:center;padding:24px;">
        <div class="gemini-loading-spinner"></div>
        <div style="font-size:0.85rem;color:var(--gold);margin-top:12px;font-weight:600;">AI参謀が分析中...</div>
        <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">Gemini 2.5 Flash × SVD Organization Data</div>
    </div>`;

    try {
        const staff = window.__staffData.filter(s => s.status !== 'archived');
        const prompt = buildGeminiPrompt(staff);
        const response = await callGeminiAPI(prompt);
        
        area.innerHTML = `<div class="gemini-report-output">
            <div class="gemini-report-header-bar">
                <span>AI COUNSELOR REPORT</span>
                <button class="btn" onclick="generateGeminiReport()" style="padding:4px 12px;font-size:10px;"> 再生成</button>
            </div>
            ${renderGeminiReport(response)}
        </div>`;
    } catch (e) {
        let errorMsg = 'API呼び出しに失敗しました';
        if (e.message === 'NO_KEY') {
            errorMsg = 'APIキーが設定されていません。⑤設定タブで設定してください。';
        } else if (e.message.includes('API_KEY_INVALID')) {
            errorMsg = 'APIキーが無効です。正しいキーを再設定してください。';
            localStorage.removeItem('ti_gemini_api_key');
        }
        area.innerHTML = `<div style="text-align:center;padding:24px;">
            <div style="font-size:32px;opacity:0.5;">▲</div>
            <div style="color:var(--red);margin-top:8px;font-weight:600;">${errorMsg}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">${e.message !== 'NO_KEY' ? e.message : ''}</div>
            <button class="btn" onclick="generateGeminiReport()" style="margin-top:12px;">再試行</button>
        </div>`;
    }
}

// ── Module 1: TEAM POWER INDEX ──
function renderAI_TeamPowerIndex(staff) {
    const teams = {};
    staff.forEach(s => {
        if (!s.affiliation) return;
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { name: s.affiliation, short, members: [], totalCP: 0 };
        teams[short].members.push(s);
        teams[short].totalCP += Number(s.combatPower) || 0;
    });

    const ranked = Object.values(teams).map(t => {
        const typedMembers = t.members.filter(m => m.type);
        const synergy = calcTeamSynergy(typedMembers);
        const adjustedCP = t.totalCP * synergy.multiplier;
        const avgCP = t.members.length > 0 ? t.totalCP / t.members.length : 0;
        return { ...t, synergy, adjustedCP, avgCP };
    }).sort((a, b) => b.adjustedCP - a.adjustedCP);

    let html = `<div class="ai-module">
        <div class="ai-module-header">
            
            <span class="ai-module-title">TEAM POWER INDEX</span>
            <span class="ai-module-desc">シナジー倍率適用後のチーム総合力ランキング</span>
        </div>
        <div class="ai-module-body">`;

    ranked.forEach((t, idx) => {
        const color = STORE_COLORS[t.short] || 'var(--text-sub)';
        const medal = idx === 0 ? '01' : idx === 1 ? '02' : idx === 2 ? '03' : `#${idx + 1}`;
        const multColor = t.synergy.multiplier >= 1.0 ? 'var(--green)' : 'var(--red)';
        const barPct = ranked[0].adjustedCP > 0 ? (t.adjustedCP / ranked[0].adjustedCP * 100) : 0;

        html += `<div class="ai-rank-row">
            <div class="ai-rank-medal">${medal}</div>
            <div class="ai-rank-info">
                <div class="ai-rank-name" style="color:${color};">${t.short}</div>
                <div class="ai-rank-sub">${t.members.length}名 ┃ AVG ${t.avgCP.toFixed(1)}</div>
            </div>
            <div class="ai-rank-bar-wrap"><div class="ai-rank-bar" style="width:${barPct}%;background:${color};"></div></div>
            <div class="ai-rank-score">
                <div style="font-weight:800;font-size:1.1rem;">${t.adjustedCP.toFixed(0)}</div>
                <div style="font-size:0.7rem;color:${multColor};">×${t.synergy.multiplier.toFixed(3)}</div>
            </div>
        </div>`;
    });

    html += `<div class="ai-team-radar-charts" id="aiTeamRadarCharts"></div>`;
    html += '</div></div>';
    return html;
}

// ── Module 2: SKILL GAP RADAR ──
function renderAI_SkillGapRadar(staff) {
    const teams = {};
    staff.forEach(s => {
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { short, catTotals: { P: 0, S: 0, E: 0, M: 0 }, count: 0 };
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw) {
                teams[short].catTotals.P += Number(raw.P) || 0;
                teams[short].catTotals.S += Number(raw.S) || 0;
                teams[short].catTotals.E += Number(raw.E) || 0;
                teams[short].catTotals.M += Number(raw.M) || 0;
            }
        } catch (e) {}
        teams[short].count++;
    });

    let html = `<div class="ai-module">
        <div class="ai-module-header">
            
            <span class="ai-module-title">SKILL GAP HEATMAP</span>
            <span class="ai-module-desc">チーム別 P/S/E/M 弱点マッピング</span>
        </div>
        <div class="ai-module-body">
        <table class="ai-heatmap-table">
            <thead><tr><th>Team</th><th>P パーソル</th><th>S サービス</th><th>E 経験</th><th>M 管理</th><th>弱点</th></tr></thead>
            <tbody>`;

    Object.values(teams).forEach(t => {
        const avg = {
            P: t.count > 0 ? t.catTotals.P / t.count : 0,
            S: t.count > 0 ? t.catTotals.S / t.count : 0,
            E: t.count > 0 ? t.catTotals.E / t.count : 0,
            M: t.count > 0 ? t.catTotals.M / t.count : 0
        };
        const color = STORE_COLORS[t.short] || 'var(--text-sub)';
        const entries = Object.entries(avg).sort((a, b) => a[1] - b[1]);
        const weakest = entries[0];
        const heatColor = (v) => {
            if (v >= 6) return 'rgba(107,154,120,0.25)';
            if (v >= 4) return 'rgba(212,175,55,0.15)';
            if (v >= 2) return 'rgba(255,152,0,0.15)';
            return 'rgba(244,67,54,0.15)';
        };

        html += `<tr>
            <td style="font-weight:700;color:${color};">${t.short}</td>
            ${['P','S','E','M'].map(k => `<td style="background:${heatColor(avg[k])};font-family:monospace;font-weight:600;">${avg[k].toFixed(1)}</td>`).join('')}
            <td><span class="ai-weakness-badge">${CAT_NAMES[weakest[0]]} (${weakest[1].toFixed(1)})</span></td>
        </tr>`;
    });

    html += '</tbody></table></div></div>';
    return html;
}

// ── Module 3: GROWTH POTENTIAL TOP10 ──
function renderAI_GrowthPotential(staff) {
    // Growth potential = gap between current score and max possible (200)
    const candidates = staff.map(s => {
        const cp = Number(s.combatPower) || 0;
        const potential = 200 - cp;
        const potentialPct = (potential / 200 * 100);
        let catScores = { P: 0, S: 0, E: 0, M: 0 };
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw) catScores = { P: Number(raw.P) || 0, S: Number(raw.S) || 0, E: Number(raw.E) || 0, M: Number(raw.M) || 0 };
        } catch (e) {}
        const entries = Object.entries(catScores).sort((a, b) => a[1] - b[1]);
        const weakest = entries[0];
        const strongest = entries[entries.length - 1];
        const growth_score = potential * (1 + (strongest[1] - weakest[1]) / 10); // High balance gap = high potential
        return { ...s, cp, potential, potentialPct, weakest, strongest, growth_score, catScores };
    }).filter(s => s.cp > 0)
      .sort((a, b) => b.growth_score - a.growth_score)
      .slice(0, 10);

    let html = `<div class="ai-module">
        <div class="ai-module-header">
            
            <span class="ai-module-title">GROWTH POTENTIAL — TOP 10</span>
            <span class="ai-module-desc">成長ポテンシャルの高いスタッフ (CP + カテゴリギャップ)</span>
        </div>
        <div class="ai-module-body">`;

    candidates.forEach((s, idx) => {
        const color = STORE_COLORS[shortName(s.affiliation)] || 'var(--text-sub)';
        html += `<div class="ai-growth-row">
            <div class="ai-growth-rank">${idx + 1}</div>
            <div class="ai-growth-info">
                <div style="font-weight:700;">${s.name}</div>
                <div style="font-size:0.75rem;color:${color};">${shortName(s.affiliation)} ┃ CP ${s.cp.toFixed(1)}</div>
            </div>
            <div class="ai-growth-detail">
                <div style="font-size:0.75rem;color:var(--green);">✦ ${CAT_NAMES[s.strongest[0]]} ${s.strongest[1].toFixed(1)}</div>
                <div style="font-size:0.75rem;color:var(--orange);">↑ ${CAT_NAMES[s.weakest[0]]} ${s.weakest[1].toFixed(1)}</div>
            </div>
            <div class="ai-growth-bar-wrap">
                <div class="ai-growth-bar" style="width:${Math.min(s.growth_score / 3, 100)}%;"></div>
            </div>
        </div>`;
    });

    html += '</div></div>';
    return html;
}

// ── Module 4: SYNERGY OPTIMIZER ──
function renderAI_SynergyOptimizer(staff) {
    // Find top beneficial transfers
    const teams = {};
    staff.forEach(s => {
        if (!s.affiliation || !s.type) return;
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { short, members: [] };
        teams[short].members.push(s);
    });

    const suggestions = [];
    const teamKeys = Object.keys(teams);

    // For each staff with type, simulate moving to another team
    staff.filter(s => s.type && s.affiliation).forEach(s => {
        const fromShort = shortName(s.affiliation);
        const fromTeam = teams[fromShort];
        if (!fromTeam || fromTeam.members.length <= 1) return;

        teamKeys.forEach(toKey => {
            if (toKey === fromShort) return;
            const toTeam = teams[toKey];
            if (!toTeam) return;

            // Current synergy
            const currentFrom = calcTeamSynergy(fromTeam.members.filter(m => m.type));
            const currentTo = calcTeamSynergy(toTeam.members.filter(m => m.type));

            // After transfer
            const newFromMembers = fromTeam.members.filter(m => m.staffId !== s.staffId && m.type);
            const newToMembers = [...toTeam.members.filter(m => m.type), s];
            const newFrom = calcTeamSynergy(newFromMembers);
            const newTo = calcTeamSynergy(newToMembers);

            const currentTotal = currentFrom.multiplier + currentTo.multiplier;
            const newTotal = newFrom.multiplier + newTo.multiplier;
            const gain = newTotal - currentTotal;

            if (gain > 0.02) {
                suggestions.push({
                    staff: s,
                    from: fromShort,
                    to: toKey,
                    gain,
                    fromMultBefore: currentFrom.multiplier,
                    fromMultAfter: newFrom.multiplier,
                    toMultBefore: currentTo.multiplier,
                    toMultAfter: newTo.multiplier
                });
            }
        });
    });

    suggestions.sort((a, b) => b.gain - a.gain);
    const top = suggestions.slice(0, 5);

    let html = `<div class="ai-module">
        <div class="ai-module-header">
            
            <span class="ai-module-title">SYNERGY OPTIMIZER</span>
            <span class="ai-module-desc">配置転換シミュレーション — シナジー倍率が改善する移動候補</span>
        </div>
        <div class="ai-module-body">`;

    if (top.length === 0) {
        html += '<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:0.85rem;">現在の配置は最適化されています。大幅な改善候補はありません。 </div>';
    } else {
        top.forEach((s, idx) => {
            const fromColor = STORE_COLORS[s.from] || 'var(--text-sub)';
            const toColor = STORE_COLORS[s.to] || 'var(--text-sub)';
            const typeInfo = SVD_TYPES[s.staff.type];
            html += `<div class="ai-optimize-row">
                <div class="ai-optimize-rank">${idx + 1}</div>
                <div class="ai-optimize-main">
                    <div style="font-weight:700;">${s.staff.name} <span class="card-attribute-badge" style="--attr-color:${typeInfo?.color || '#888'};font-size:9px;">${s.staff.type}</span></div>
                    <div style="font-size:0.8rem;display:flex;gap:8px;align-items:center;margin-top:4px;">
                        <span style="color:${fromColor};font-weight:600;">${s.from}</span>
                        <span style="color:var(--text-dim);">→</span>
                        <span style="color:${toColor};font-weight:600;">${s.to}</span>
                    </div>
                </div>
                <div class="ai-optimize-detail">
                    <div style="font-size:0.7rem;color:var(--text-dim);">
                        ${s.from}: ×${s.fromMultBefore.toFixed(3)} → ×${s.fromMultAfter.toFixed(3)}<br>
                        ${s.to}: ×${s.toMultBefore.toFixed(3)} → ×${s.toMultAfter.toFixed(3)}
                    </div>
                </div>
                <div class="ai-optimize-gain">+${(s.gain).toFixed(3)}</div>
            </div>`;
        });
    }

    html += '</div></div>';
    return html;
}

// ── Module 5: RISK ALERTS ──
function renderAI_RiskAlerts(staff) {
    const alerts = [];
    
    // 1. Teams with no typed members
    const teams = {};
    staff.forEach(s => {
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { short, total: 0, typed: 0, members: [] };
        teams[short].total++;
        teams[short].members.push(s);
        if (s.type) teams[short].typed++;
    });

    Object.values(teams).forEach(t => {
        if (t.typed === 0 && t.total > 0) {
            alerts.push({ severity: 'critical', icon: '●', msg: `${t.short}: 属性データが未設定（${t.total}名）`, area: '属性' });
        }
        if (t.typed > 0 && t.typed < t.total * 0.5) {
            alerts.push({ severity: 'warning', icon: '●', msg: `${t.short}: 属性カバー率 ${((t.typed/t.total)*100).toFixed(0)}%（${t.typed}/${t.total}名）`, area: '属性' });
        }
    });

    // 2. Attribute concentration risk
    Object.values(teams).forEach(t => {
        const typedMembers = t.members.filter(m => m.type);
        if (typedMembers.length < 3) return;
        const typeCounts = {};
        typedMembers.forEach(m => { typeCounts[m.type] = (typeCounts[m.type] || 0) + 1; });
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (count >= 3) {
                alerts.push({ severity: 'warning', icon: '●', msg: `${t.short}: ${SVD_TYPES[type]?.nameJp || type}が${count}名集中 — 多様性リスク`, area: 'バランス' });
            }
        });
    });

    // 3. No evaluation data
    const noEvalCount = staff.filter(s => !Number(s.combatPower)).length;
    if (noEvalCount > 0) {
        alerts.push({ severity: 'info', icon: '●', msg: `${noEvalCount}名が未評価（CP=0）`, area: '評価' });
    }

    // 4. P/S/E/M extreme imbalance
    staff.forEach(s => {
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (!raw) return;
            const scores = [Number(raw.P)||0, Number(raw.S)||0, Number(raw.E)||0, Number(raw.M)||0];
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            if (max - min > 5 && max > 0) {
                alerts.push({ severity: 'info', icon: '◆', msg: `${s.name}: カテゴリ間格差 ${(max-min).toFixed(1)}pt — 育成フォーカス推奨`, area: 'スキル' });
            }
        } catch (e) {}
    });

    // 5. Warning-tier synergy count
    Object.values(teams).forEach(t => {
        const typedMembers = t.members.filter(m => m.type);
        if (typedMembers.length < 2) return;
        const synergy = calcTeamSynergy(typedMembers);
        if (synergy.breakdown.warningCount >= 2) {
            alerts.push({ severity: 'critical', icon: '▲', msg: `${t.short}: 警告シナジー${synergy.breakdown.warningCount}組 — チーム摩擦リスク高`, area: 'シナジー' });
        }
    });

    alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    let html = `<div class="ai-module">
        <div class="ai-module-header">
            
            <span class="ai-module-title">RISK ALERTS</span>
            <span class="ai-module-desc">自動検出された組織リスクと改善ポイント</span>
        </div>
        <div class="ai-module-body">`;

    if (alerts.length === 0) {
        html += '<div style="padding:16px;text-align:center;color:var(--green);font-size:0.9rem;">✅ リスクアラートはありません — 組織状態は良好です</div>';
    } else {
        alerts.slice(0, 12).forEach(a => {
            const bgClass = a.severity === 'critical' ? 'ai-alert--critical' : a.severity === 'warning' ? 'ai-alert--warning' : 'ai-alert--info';
            html += `<div class="ai-alert-row ${bgClass}">
                <span class="ai-alert-icon">${a.icon}</span>
                <span class="ai-alert-area">${a.area}</span>
                <span class="ai-alert-msg">${a.msg}</span>
            </div>`;
        });
        if (alerts.length > 12) {
            html += `<div style="padding:8px;text-align:center;color:var(--text-dim);font-size:0.8rem;">他 ${alerts.length - 12} 件のアラート</div>`;
        }
    }

    html += '</div></div>';
    return html;
}

// ── Module 6: EXECUTIVE SUMMARY ──
function renderAI_ExecutiveSummary(staff) {
    const totalStaff = staff.length;
    const evaluatedStaff = staff.filter(s => Number(s.combatPower) > 0).length;
    const avgCP = evaluatedStaff > 0 ? staff.reduce((s, m) => s + (Number(m.combatPower) || 0), 0) / evaluatedStaff : 0;
    const typedStaff = staff.filter(s => s.type).length;
    const typeCoverage = totalStaff > 0 ? (typedStaff / totalStaff * 100) : 0;

    // Category averages
    let catTotals = { P: 0, S: 0, E: 0, M: 0 };
    let catCount = 0;
    staff.forEach(s => {
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw && (Number(raw.P) || Number(raw.S) || Number(raw.E) || Number(raw.M))) {
                catTotals.P += Number(raw.P) || 0;
                catTotals.S += Number(raw.S) || 0;
                catTotals.E += Number(raw.E) || 0;
                catTotals.M += Number(raw.M) || 0;
                catCount++;
            }
        } catch (e) {}
    });
    const catAvg = {
        P: catCount > 0 ? catTotals.P / catCount : 0,
        S: catCount > 0 ? catTotals.S / catCount : 0,
        E: catCount > 0 ? catTotals.E / catCount : 0,
        M: catCount > 0 ? catTotals.M / catCount : 0
    };
    const catEntries = Object.entries(catAvg).sort((a, b) => b[1] - a[1]);
    const strongest = catEntries[0];
    const weakest = catEntries[catEntries.length - 1];

    // Unique types
    const typeSet = new Set(staff.filter(s => s.type).map(s => s.type));

    // Brigade distribution
    const brigadeCount = {};
    staff.forEach(s => {
        const b = getBrigadeInfo(s);
        brigadeCount[b.level] = (brigadeCount[b.level] || 0) + 1;
    });

    let html = `<div class="ai-module ai-module--executive">
        <div class="ai-module-header">
            
            <span class="ai-module-title">EXECUTIVE SUMMARY</span>
            <span class="ai-module-desc">経営報告向け — 組織の全体像</span>
        </div>
        <div class="ai-module-body">
            <div class="ai-exec-grid">
                <div class="ai-exec-kpi">
                    <div class="ai-exec-kpi-value">${totalStaff}</div>
                    <div class="ai-exec-kpi-label">総スタッフ数</div>
                </div>
                <div class="ai-exec-kpi">
                    <div class="ai-exec-kpi-value">${evaluatedStaff}<span class="ai-exec-kpi-sub">/${totalStaff}</span></div>
                    <div class="ai-exec-kpi-label">評価完了</div>
                </div>
                <div class="ai-exec-kpi">
                    <div class="ai-exec-kpi-value" style="color:var(--gold);">${avgCP.toFixed(1)}</div>
                    <div class="ai-exec-kpi-label">AVG Combat Power</div>
                </div>
                <div class="ai-exec-kpi">
                    <div class="ai-exec-kpi-value">${typeCoverage.toFixed(0)}%</div>
                    <div class="ai-exec-kpi-label">属性カバー率</div>
                </div>
                <div class="ai-exec-kpi">
                    <div class="ai-exec-kpi-value">${typeSet.size}/18</div>
                    <div class="ai-exec-kpi-label">属性多様性</div>
                </div>
            </div>
            
            <div class="ai-exec-insight">
                <h4>AI INSIGHT</h4>
                <ul>
                    <li>組織全体の<strong style="color:var(--green);">最強カテゴリ</strong>は <strong>${CAT_NAMES[strongest[0]]}</strong>（AVG ${strongest[1].toFixed(1)}）</li>
                    <li><strong style="color:var(--orange);">成長課題</strong>は <strong>${CAT_NAMES[weakest[0]]}</strong>（AVG ${weakest[1].toFixed(1)}）— 研修優先度を上げることを推奨</li>
                    <li>属性カバー率 ${typeCoverage.toFixed(0)}% — ${typeCoverage < 80 ? '<span style="color:var(--orange);">未設定スタッフの属性診断を推奨</span>' : '<span style="color:var(--green);">良好</span>'}</li>
                    <li>活用属性数 ${typeSet.size}/18 — ${typeSet.size < 10 ? '<span style="color:var(--orange);">属性の偏りあり。多様な採用を検討</span>' : '<span style="color:var(--green);">多様性は良好</span>'}</li>
                </ul>
            </div>

            <div class="ai-exec-brigade">
                <h4>階級分布</h4>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${Object.entries(brigadeCount).sort().map(([level, count]) => 
                        `<div class="ai-brigade-chip"><span style="color:var(--gold);font-weight:700;">${level}</span> <span>${count}名</span></div>`
                    ).join('')}
                </div>
            </div>
        </div>
    </div>`;
    return html;
}

// ── AI Team Radar Charts ──
function renderAI_TeamRadarCharts(staff) {
    const container = document.getElementById('aiTeamRadarCharts');
    if (!container) return;

    const teams = {};
    staff.forEach(s => {
        const short = shortName(s.affiliation);
        if (!teams[short]) teams[short] = { short, catTotals: { P: 0, S: 0, E: 0, M: 0 }, count: 0 };
        try {
            const raw = typeof s.categoryScores === 'string' ? JSON.parse(s.categoryScores) : s.categoryScores;
            if (raw) {
                teams[short].catTotals.P += Number(raw.P) || 0;
                teams[short].catTotals.S += Number(raw.S) || 0;
                teams[short].catTotals.E += Number(raw.E) || 0;
                teams[short].catTotals.M += Number(raw.M) || 0;
            }
        } catch (e) {}
        teams[short].count++;
    });

    const teamList = Object.values(teams).filter(t => t.count > 0);
    if (teamList.length === 0) return;

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:12px;">';
    teamList.forEach(t => {
        const id = `ai-radar-${t.short}`;
        const color = STORE_COLORS[t.short] || '#888';
        html += `<div style="text-align:center;">
            <div style="font-weight:700;font-size:0.8rem;color:${color};margin-bottom:4px;">${t.short}</div>
            <div style="height:160px;"><canvas id="${id}"></canvas></div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    // Render each mini radar
    teamList.forEach(t => {
        const ctx = document.getElementById(`ai-radar-${t.short}`);
        if (!ctx) return;
        const color = STORE_COLORS[t.short] || '#888';
        const data = [
            t.count > 0 ? t.catTotals.P / t.count : 0,
            t.count > 0 ? t.catTotals.S / t.count : 0,
            t.count > 0 ? t.catTotals.E / t.count : 0,
            t.count > 0 ? t.catTotals.M / t.count : 0
        ];
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['P', 'S', 'E', 'M'],
                datasets: [{ data, backgroundColor: color + '22', borderColor: color, borderWidth: 2, pointRadius: 3, pointBackgroundColor: color }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { r: { min: 0, max: 10, ticks: { display: false }, pointLabels: { font: { size: 10, family: "Outfit, sans-serif" } } } },
                plugins: { legend: { display: false } }
            }
        });
    });
}


// ═══════════════════════════════════════════════════════════
// ⑨ CAREER TIMELINE
// ═══════════════════════════════════════════════════════════
let careerTabInitialized = false;

function renderCareerTab() {
    const sel = document.getElementById('careerStaff');
    if (!sel) return;

    // ドロップダウンは毎回更新（staffListが後からロードされるケース対応）
    const sorted = [...(window.__staffData || staffList)].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
    const currentVal = sel.value; // 選択中の値を保持
    sel.innerHTML = '<option value="">スタッフを選択...</option>';
    sorted.forEach(s => {
        if (s.status === 'archived') return;
        const opt = document.createElement('option');
        opt.value = s.staffId;
        opt.textContent = `${s.name} (${shortName(s.affiliation)})`;
        sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal; // 選択復元

    // イベントリスナーは一度だけ登録
    if (!careerTabInitialized) {
        careerTabInitialized = true;
        sel.addEventListener('change', () => {
            const sid = sel.value;
            document.getElementById('btnAddCareer').style.display = sid ? '' : 'none';
            hideCareerForm();
            if (sid) loadCareerTimeline(sid);
            else document.getElementById('careerTimeline').innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);font-size:0.9rem;">スタッフを選択すると、キャリアタイムラインが表示されます</div>';
        });
    }
}

async function loadCareerTimeline(staffId) {
    const container = document.getElementById('careerTimeline');
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-dim);">読み込み中...</div>';

    const cats = window.__CAREER_CATEGORIES || {
        join: { emoji: '🏢', label: '入社', color: '#43A047' },
        transfer: { emoji: '🔀', label: '配属/異動', color: '#039BE5' },
        promotion: { emoji: '📋', label: '昇格/役職変更', color: '#B8995C' },
        cert: { emoji: '🏅', label: '資格取得', color: '#8E24AA' },
        achievement: { emoji: '🏆', label: '成果/表彰', color: '#E53935' },
        memo: { emoji: '📝', label: 'メモ/その他', color: '#455A64' }
    };

    // Fetch career events + TI history in parallel
    let careerEvents = [];
    let tiHistory = [];
    try {
        const [cRes, hRes] = await Promise.all([
            TI_BRIDGE.loadCareer(staffId),
            TI_BRIDGE.loadHistory(staffId)
        ]);
        if (cRes && cRes.result === 'success') careerEvents = cRes.events || [];
        if (hRes && hRes.result === 'success') tiHistory = hRes.history || [];
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#f44336;">データ取得エラー: ' + e.message + '</div>';
        return;
    }

    // Merge into unified timeline
    const timeline = [];
    careerEvents.forEach(ev => {
        timeline.push({
            date: ev.eventDate || ev.timestamp,
            type: 'career',
            category: ev.category,
            title: ev.title,
            detail: ev.detail,
            location: ev.location,
            rowIndex: ev.rowIndex,
            catInfo: cats[ev.category] || cats.memo
        });
    });
    tiHistory.forEach(h => {
        const catScores = {};
        ['P', 'S', 'E', 'M'].forEach(cat => {
            const keys = Object.keys(SKILL_LABELS[cat] || {});
            const vals = keys.map(k => Number(h.scores?.[k] || 0));
            catScores[cat] = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '0.0';
        });
        timeline.push({
            date: h.timestamp,
            type: 'evaluation',
            title: `TI評価 ${h.totalScore || 0}pt`,
            detail: `(${h.evalType || 'N/A'}) P:${catScores.P} S:${catScores.S} E:${catScores.E} M:${catScores.M}`,
            evaluator: h.evaluator,
            memo: h.memo
        });
    });

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (timeline.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);font-size:0.9rem;">キャリアイベントがまだ登録されていません</div>';
        return;
    }

    // Render timeline
    let html = '<div class="timeline-wrapper">';
    timeline.forEach((item, idx) => {
        const d = new Date(item.date);
        const dateStr = isNaN(d.getTime()) ? '日付不明' : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        const isCareer = item.type === 'career';
        const dotClass = isCareer ? 'timeline-dot-career' : 'timeline-dot-eval';
        const catColor = isCareer ? (item.catInfo?.color || '#455A64') : '#b8965c';
        const emoji = isCareer ? (item.catInfo?.emoji || '📝') : '📊';
        const catLabel = isCareer ? (item.catInfo?.label || 'メモ') : 'TI評価';

        html += `<div class="timeline-item ${isCareer ? '' : 'timeline-item-eval'}">
            <div class="timeline-dot ${dotClass}" style="border-color:${catColor};"></div>
            <div class="timeline-content">
                <div class="timeline-date">${dateStr}</div>
                <div class="timeline-header">
                    <span class="timeline-emoji">${emoji}</span>
                    <span class="timeline-cat" style="color:${catColor};">${catLabel}</span>
                    <span class="timeline-title">${item.title || ''}</span>
                </div>
                ${item.detail ? `<div class="timeline-detail">${item.detail}</div>` : ''}
                ${item.memo ? `<div class="timeline-memo">📎 ${item.memo}</div>` : ''}
                ${isCareer ? `<div class="timeline-actions">
                    <button class="btn-sm" onclick="editCareerEvent(${item.rowIndex}, '${(item.category || '').replace(/'/g, "\\'")}', '${(item.title || '').replace(/'/g, "\\'")}', '${(item.detail || '').replace(/'/g, "\\'")}', '${item.date}')">✏️</button>
                    <button class="btn-sm btn-danger" onclick="deleteCareerEvent(${item.rowIndex})">🗑️</button>
                </div>` : ''}
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function showCareerForm(editRow, category, title, detail, eventDate) {
    const card = document.getElementById('careerFormCard');
    card.style.display = '';
    document.getElementById('careerFormTitle').textContent = editRow ? 'キャリアイベント編集' : 'キャリアイベント追加';
    document.getElementById('careerEditRow').value = editRow || '';
    document.getElementById('careerCategory').value = category || 'join';
    document.getElementById('careerTitle').value = title || '';
    document.getElementById('careerDetail').value = detail || '';
    document.getElementById('careerDate').value = eventDate ? eventDate.substring(0, 10) : new Date().toISOString().substring(0, 10);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideCareerForm() {
    document.getElementById('careerFormCard').style.display = 'none';
    document.getElementById('careerEditRow').value = '';
    document.getElementById('careerTitle').value = '';
    document.getElementById('careerDetail').value = '';
}

function editCareerEvent(rowIndex, category, title, detail, eventDate) {
    showCareerForm(rowIndex, category, title, detail, eventDate);
}

async function saveCareerEvent() {
    const staffId = document.getElementById('careerStaff').value;
    if (!staffId) { TI_BRIDGE.showToast('スタッフを選択してください'); return; }

    const editRow = document.getElementById('careerEditRow').value;
    const eventData = {
        category: document.getElementById('careerCategory').value,
        title: document.getElementById('careerTitle').value,
        detail: document.getElementById('careerDetail').value,
        eventDate: document.getElementById('careerDate').value
    };

    if (!eventData.title) { TI_BRIDGE.showToast('タイトルを入力してください'); return; }

    document.getElementById('btnSaveCareer').disabled = true;
    try {
        let res;
        if (editRow) {
            res = await TI_BRIDGE.updateCareerEvent(staffId, parseInt(editRow, 10), eventData);
        } else {
            res = await TI_BRIDGE.addCareerEvent(staffId, eventData);
        }
        if (res && res.result === 'success') {
            TI_BRIDGE.showToast(editRow ? 'イベントを更新しました' : 'イベントを追加しました');
            hideCareerForm();
            loadCareerTimeline(staffId);
        } else {
            TI_BRIDGE.showToast('エラー: ' + (res?.error || '不明なエラー'));
        }
    } catch (e) {
        TI_BRIDGE.showToast('通信エラー: ' + e.message);
    } finally {
        document.getElementById('btnSaveCareer').disabled = false;
    }
}

async function deleteCareerEvent(rowIndex) {
    if (!confirm('このイベントを削除しますか？')) return;
    const staffId = document.getElementById('careerStaff').value;
    if (!staffId) return;

    try {
        const res = await TI_BRIDGE.deleteCareerEvent(staffId, rowIndex);
        if (res && res.result === 'success') {
            TI_BRIDGE.showToast('イベントを削除しました');
            loadCareerTimeline(staffId);
        } else {
            TI_BRIDGE.showToast('エラー: ' + (res?.error || '不明なエラー'));
        }
    } catch (e) {
        TI_BRIDGE.showToast('通信エラー: ' + e.message);
    }
}
