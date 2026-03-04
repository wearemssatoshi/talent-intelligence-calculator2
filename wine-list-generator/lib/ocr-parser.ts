import Tesseract from 'tesseract.js';
import { WineItem } from './types';
import { generateId } from './utils';
import {
    detectGrapeVarieties,
    detectAppellations,
    normalizeNotation,
    inferCategory,
} from './wine-knowledge';

/**
 * OCR納品書処理 — ソムリエスキル統合版
 * 
 * 1. Tesseract.js 4言語 OCR (日/英/仏/伊)
 * 2. wine-knowledge.ts による自動補正:
 *    - 品種自動判定 (80+品種)
 *    - 産地/アペラシオン自動分類 (60+産地)
 *    - 表記正規化 (アクセント記号修正等)
 *    - カテゴリ自動推定 (赤/白/泡/ロゼ/甘口)
 */
export async function processInvoice(
    imageFile: File,
    onProgress: (progress: number) => void
): Promise<WineItem[]> {
    const worker = await Tesseract.createWorker('jpn+eng+fra+ita', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                onProgress(m.progress * 100);
            }
        }
    });

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    return parseOcrText(text);
}

/**
 * OCRテキスト解析結果（1行分）の中間構造
 */
// ParsedLine型は将来のマルチパス解析で使用予定
// interface ParsedLine { ... }

// 国名キーワード（wine-knowledgeで検出できない場合のフォールバック）
const COUNTRY_KEYWORDS = [
    { name: 'France', keywords: ['France', 'フランス', '仏', 'Vin de France'] },
    { name: 'Italy', keywords: ['Italy', 'Italia', 'イタリア', '伊'] },
    { name: 'Spain', keywords: ['Spain', 'España', 'Espana', 'スペイン'] },
    { name: 'USA', keywords: ['USA', 'U.S.A', 'America', 'アメリカ', 'California'] },
    { name: 'Japan', keywords: ['Japan', '日本', '北海道', '山梨', '長野'] },
    { name: 'Germany', keywords: ['Germany', 'Deutschland', 'ドイツ'] },
    { name: 'Austria', keywords: ['Austria', 'Österreich', 'オーストリア'] },
    { name: 'Chile', keywords: ['Chile', 'チリ'] },
    { name: 'Argentina', keywords: ['Argentina', 'アルゼンチン'] },
    { name: 'Australia', keywords: ['Australia', 'オーストラリア'] },
    { name: 'New Zealand', keywords: ['New Zealand', 'ニュージーランド', 'NZ'] },
    { name: 'South Africa', keywords: ['South Africa', '南アフリカ'] },
    { name: 'Portugal', keywords: ['Portugal', 'ポルトガル'] },
];

// 格付けキーワード
const CLASSIFICATION_KEYWORDS = [
    // France
    { text: 'Grand Cru Classé', value: 'Grand Cru Classé' },
    { text: 'Grand Cru', value: 'Grand Cru' },
    { text: '1er Cru', value: 'Premier Cru' },
    { text: 'Premier Cru', value: 'Premier Cru' },
    { text: 'Cru Bourgeois', value: 'Cru Bourgeois' },
    // Italy
    { text: 'DOCG', value: 'DOCG' },
    { text: 'DOC', value: 'DOC' },
    { text: 'IGT', value: 'IGT' },
    { text: 'Riserva', value: 'Riserva' },
    { text: 'Superiore', value: 'Superiore' },
    { text: 'Classico', value: 'Classico' },
    // Spain
    { text: 'Gran Reserva', value: 'Gran Reserva' },
    { text: 'Reserva', value: 'Reserva' },
    { text: 'Crianza', value: 'Crianza' },
    // Germany
    { text: 'Trockenbeerenauslese', value: 'TBA' },
    { text: 'Beerenauslese', value: 'BA' },
    { text: 'Spätlese', value: 'Spätlese' },
    { text: 'Kabinett', value: 'Kabinett' },
    { text: 'Auslese', value: 'Auslese' },
];

/**
 * メインパーサー — ソムリエスキル統合版
 */
function parseOcrText(text: string): WineItem[] {
    // Step 1: 全体テキストの表記正規化
    const { corrected: normalizedFullText } = normalizeNotation(text);

    const lines = normalizedFullText.split('\n').filter(line => line.trim().length > 0);
    const items: WineItem[] = [];

    // Regex patterns
    const vintageRegex = /(19|20)\d{2}/;
    const priceRegex = /([¥￥]?\s*[\d,]+)/g;
    const capacityRegex = /(\d{3,4})\s*ml/i;
    const quantityRegex = /\b(\d{1,3})\s*(本|btl|Btl|x|X|cs|CS)?\b/;

    for (const line of lines) {
        // Skip headers, footers, and short lines
        if (line.length < 5) continue;
        if (line.match(/合計|小計|Subtotal|Total|Tax|消費税|Date|No\.|請求|御中|納品|伝票|備考/i)) continue;

        // === 1. Detect Price ===
        const priceMatches = [...line.matchAll(priceRegex)];
        let price = 0;
        let priceStr = '';

        // Find most likely unit price (first valid number > 100)
        for (const match of priceMatches) {
            const valStr = match[1].replace(/[¥￥,\s]/g, '');
            const val = parseInt(valStr, 10);
            if (!isNaN(val) && val > 100 && val < 10000000) {
                if (price === 0) {
                    price = val; // First price = likely unit price
                    priceStr = match[0];
                }
            }
        }
        if (price === 0) continue;

        // === 2. Detect Vintage ===
        const vintageMatch = line.match(vintageRegex);
        const vintage = vintageMatch ? vintageMatch[0] : '';

        // === 3. Detect Capacity ===
        const capacityMatch = line.match(capacityRegex);
        const capacity = capacityMatch ? `${capacityMatch[1]}ml` : '750ml';

        // === 4. Detect Quantity ===
        const tempLine = line.replace(priceStr, '').replace(vintage, '');
        let quantity = 1;
        const quantityMatch = tempLine.match(quantityRegex);
        if (quantityMatch) {
            const q = parseInt(quantityMatch[1], 10);
            if (!isNaN(q) && q > 0 && q < 500) {
                quantity = q;
            }
        }

        // === 5. ソムリエスキル統合 — 品種自動判定 ===
        const detectedGrapes = detectGrapeVarieties(line);

        // === 6. ソムリエスキル統合 — 産地/アペラシオン自動分類 ===
        const detectedAppellations = detectAppellations(line);

        // === 7. Country & Region (スキル + フォールバック) ===
        let country = '';
        let region = '';
        let subRegion = '';

        // First try: from detected appellations (most accurate)
        if (detectedAppellations.length > 0) {
            const primaryAOC = detectedAppellations[0];
            country = primaryAOC.country;
            region = primaryAOC.region;
            subRegion = primaryAOC.name;
        }

        // Fallback: keyword matching
        if (!country) {
            for (const c of COUNTRY_KEYWORDS) {
                if (c.keywords.some(k => line.includes(k))) {
                    country = c.name;
                    break;
                }
            }
        }

        // Infer country from grape origin if still empty
        if (!country && detectedGrapes.length > 0) {
            const grapeOrigin = detectedGrapes[0].origin;
            if (['Bordeaux', 'Bourgogne', 'Rhône', 'Loire', 'Alsace', 'Champagne', 'Beaujolais', 'Languedoc', 'Jura', 'Cahors', 'Jurançon', 'Madiran'].includes(grapeOrigin)) {
                country = 'France';
                region = grapeOrigin;
            } else if (['Piemonte', 'Toscana', 'Veneto', 'Sicilia', 'Campania', 'Puglia', 'Friuli', 'Sardegna', 'Umbria', 'Trentino', 'Marche', 'Abruzzo', 'Emilia-Romagna'].includes(grapeOrigin)) {
                country = 'Italy';
                region = grapeOrigin;
            }
        }

        // === 8. Classification (格付け) ===
        let classification = '';
        // From appellation data
        if (detectedAppellations.length > 0 && detectedAppellations[0].classification) {
            classification = detectedAppellations[0].classification;
        }
        // Override with specific classifications found in text
        for (const cls of CLASSIFICATION_KEYWORDS) {
            if (line.includes(cls.text)) {
                classification = cls.value;
                break; // Take the most specific (they're ordered by specificity)
            }
        }

        // === 9. ソムリエスキル統合 — 表記正規化 ===
        const { corrected: normalizedLine } = normalizeNotation(line);

        // === 10. Clean Name ===
        let nameJP = normalizedLine
            .replace(priceStr, '')
            .replace(vintage, '')
            .replace(capacity, '')
            .replace(/¥|￥/g, '')
            .replace(/\b\d{1,3}\s*(本|btl|Btl|x|X|cs|CS)\b/g, '')
            .trim();

        // Remove leading/trailing noise
        nameJP = nameJP.replace(/^[^a-zA-ZÀ-ÿ0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/, '');
        nameJP = nameJP.replace(/[\s,;]+$/, '');

        // Build original name from detected appellations/grapes for better display
        let nameOriginal = '';
        if (detectedAppellations.length > 0) {
            nameOriginal = detectedAppellations[0].name;
        }

        // === 11. ソムリエスキル統合 — カテゴリ自動推定 ===
        const category = inferCategory(detectedGrapes, line);

        // === Build WineItem ===
        items.push({
            id: generateId(),
            nameJP: nameJP || '（OCR解析中）',
            nameOriginal,
            vintage,
            country,
            region,
            subRegion,
            classification,
            producer: '',
            capacity,
            quantity,
            price,
            taxType: 'tax_excluded',
            category,
        });
    }

    return items;
}

/**
 * マルチライン納品書対応 — 複数行にまたがるワインエントリを統合
 * 納品書のフォーマットによっては、ワイン名と価格が別の行にあることがある
 */
export function mergeMultiLineEntries(items: WineItem[]): WineItem[] {
    // 価格が0のアイテムがあれば、名前を次のアイテムに結合
    const merged: WineItem[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.price === 0 && i + 1 < items.length) {
            // この行は名前のみ → 次の行と統合
            items[i + 1].nameJP = `${item.nameJP} ${items[i + 1].nameJP}`.trim();
            if (item.nameOriginal) {
                items[i + 1].nameOriginal = item.nameOriginal;
            }
        } else {
            merged.push(item);
        }
    }

    return merged;
}

/**
 * スキルによる一括ポストプロセッシング
 * 全アイテムに対してグレープ情報が未設定の場合、再度判定を試みる
 */
export function enrichWithKnowledge(items: WineItem[]): WineItem[] {
    return items.map(item => {
        const fullText = `${item.nameJP} ${item.nameOriginal} ${item.region} ${item.subRegion || ''}`;

        // Re-detect if country/region is empty
        if (!item.country || !item.region) {
            const aocs = detectAppellations(fullText);
            if (aocs.length > 0) {
                item.country = item.country || aocs[0].country;
                item.region = item.region || aocs[0].region;
                item.subRegion = item.subRegion || aocs[0].name;
                item.classification = item.classification || aocs[0].classification || '';
            }
        }

        // Normalize the display name
        const { corrected } = normalizeNotation(item.nameJP);
        item.nameJP = corrected;
        if (item.nameOriginal) {
            const { corrected: correctedOrig } = normalizeNotation(item.nameOriginal);
            item.nameOriginal = correctedOrig;
        }

        return item;
    });
}
