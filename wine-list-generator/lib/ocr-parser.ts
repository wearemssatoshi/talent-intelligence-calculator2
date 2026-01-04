import Tesseract from 'tesseract.js';
import { WineItem, WineCategory } from './types';
import { generateId } from './utils';

export async function processInvoice(imageFile: File, onProgress: (progress: number) => void): Promise<WineItem[]> {
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

function parseOcrText(text: string): WineItem[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: WineItem[] = [];

    // Heuristics
    const vintageRegex = /(19|20)\d{2}/;
    // Price: Look for numbers with commas or Yen symbol, but ensure it's not a date or phone number
    // We look for the largest number in the line usually, or one ending in 00
    const priceRegex = /([¥￥]?\s*[\d,]+)/g;
    const capacityRegex = /(\d{3,4})\s*ml/i;
    // Quantity: Look for small integers (1-120), possibly with 'x' or '本'
    const quantityRegex = /\b(\d{1,3})\s*(本|btl|Btl|x|X)?\b/;

    // Keywords for detection
    const countries = [
        { name: 'France', keywords: ['France', 'フランス', '仏'] },
        { name: 'Italy', keywords: ['Italy', 'Italia', 'イタリア', '伊'] },
        { name: 'Spain', keywords: ['Spain', 'Espana', 'スペイン'] },
        { name: 'USA', keywords: ['USA', 'America', 'アメリカ'] },
        { name: 'Japan', keywords: ['Japan', '日本'] },
        { name: 'Germany', keywords: ['Germany', 'ドイツ'] },
        { name: 'Chile', keywords: ['Chile', 'チリ'] },
        { name: 'Australia', keywords: ['Australia', 'オーストラリア'] },
    ];

    const regions = [
        { name: 'Bordeaux', keywords: ['Bordeaux', 'ボルドー'] },
        { name: 'Bourgogne', keywords: ['Bourgogne', 'Burgundy', 'ブルゴーニュ'] },
        { name: 'Champagne', keywords: ['Champagne', 'シャンパーニュ'] },
        { name: 'Toscana', keywords: ['Toscana', 'Tuscany', 'トスカーナ'] },
        { name: 'Piemonte', keywords: ['Piemonte', 'Piedmont', 'ピエモンテ'] },
        { name: 'Napa', keywords: ['Napa', 'ナパ'] },
    ];

    for (const line of lines) {
        // Skip lines that are likely headers or footers
        if (line.length < 5) continue;
        if (line.match(/合計|Subtotal|Tax|消費税|Date|No\./i)) continue;

        // 1. Detect Price (Candidates)
        const priceMatches = [...line.matchAll(priceRegex)];
        let price = 0;
        let priceStr = '';

        // Find the most likely price (usually the largest number > 100)
        for (const match of priceMatches) {
            const valStr = match[1].replace(/[¥￥,\s]/g, '');
            const val = parseInt(valStr, 10);
            if (!isNaN(val) && val > 100 && val < 10000000) { // Reasonable price range
                // If we have multiple candidates, usually the line total is the last one, unit price is earlier.
                // Or sometimes unit price is the only one.
                // Let's take the largest one for now as "Total" or "Unit"? 
                // Usually we want Unit Price. If there are two numbers, e.g. "5,000  10,000", 5000 is unit.
                // But OCR might merge them.
                // Let's assume the LAST detected price-like number is the Total, and the one before is Unit?
                // Or simply: if we find a price, use it.
                price = val;
                priceStr = match[0]; // Keep original string to remove later
                // If we find a valid price, we stop? No, maybe there's a better one.
                // Let's keep the last valid one found in the line? 
                // Actually, usually Unit Price comes before Total Price. 
                // But let's stick to "Found a price > 100".
            }
        }
        if (price === 0) continue; // No price found, skip line

        // 2. Detect Vintage
        const vintageMatch = line.match(vintageRegex);
        const vintage = vintageMatch ? vintageMatch[0] : '';

        // 3. Detect Capacity
        const capacityMatch = line.match(capacityRegex);
        const capacity = capacityMatch ? `${capacityMatch[1]}ml` : '750ml';

        // 4. Detect Quantity
        // Remove Price and Vintage from line to avoid false positives
        let tempLine = line.replace(priceStr, '').replace(vintage, '');

        let quantity = 1;
        const quantityMatch = tempLine.match(quantityRegex);
        if (quantityMatch) {
            const q = parseInt(quantityMatch[1], 10);
            if (!isNaN(q) && q > 0 && q < 120) {
                quantity = q;
            }
        }

        // 5. Detect Country & Region
        let country = '';
        let region = '';

        for (const c of countries) {
            if (c.keywords.some(k => line.includes(k))) {
                country = c.name;
                break;
            }
        }

        for (const r of regions) {
            if (r.keywords.some(k => line.includes(k))) {
                region = r.name;
                if (!country) {
                    if (['Bordeaux', 'Bourgogne', 'Champagne'].includes(r.name)) country = 'France';
                    if (['Toscana', 'Piemonte'].includes(r.name)) country = 'Italy';
                    if (['Napa'].includes(r.name)) country = 'USA';
                }
                break;
            }
        }

        // 6. Clean Name
        let nameJP = line
            .replace(priceStr, '')
            .replace(vintage, '')
            .replace(capacity, '')
            .replace(quantity.toString(), '') // Remove quantity if found
            .replace(/¥|￥/g, '')
            .trim();

        // Remove leading/trailing special chars often found in OCR
        nameJP = nameJP.replace(/^[^a-zA-Z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/, '');

        // Guess Category
        let category: WineCategory = 'Red';
        if (line.match(/Blanc|White|白/i)) category = 'White';
        if (line.match(/Sparkling|Champagne|Cava|Prosecco|泡/i)) category = 'Sparkling';
        if (line.match(/Rose|Rosé|ロゼ/i)) category = 'Rose';
        if (line.match(/Sweet|Doux|甘口/i)) category = 'Sweet';

        items.push({
            id: generateId(),
            nameJP: nameJP,
            nameOriginal: '',
            vintage,
            country,
            region,
            producer: '',
            capacity,
            quantity,
            price,
            taxType: 'tax_excluded',
            category
        });
    }

    return items;
}
