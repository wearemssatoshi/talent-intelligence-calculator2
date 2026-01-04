import { GoogleGenerativeAI } from "@google/generative-ai";
import { WineItem, WineCategory } from "./types";
import { generateId } from "./utils";

export async function processInvoiceWithGemini(file: File, apiKey: string, onProgress: (progress: number) => void): Promise<WineItem[]> {
    try {
        onProgress(10);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Convert file to base64
        const base64Data = await fileToGenerativePart(file);
        onProgress(30);

        const prompt = `
    Analyze this wine invoice image and extract the following information for each wine item in a JSON format.
    Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.

    Fields to extract:
    - nameJP: Japanese name if available, otherwise English name.
    - nameOriginal: Original language name (English/French/Italian etc).
    - vintage: Year (e.g. 2018, NV).
    - country: Origin country (France, Italy, USA, etc).
    - region: Region (Bordeaux, Toscana, etc).
    - producer: Producer name.
    - capacity: Bottle size (e.g. 750ml).
    - quantity: Number of bottles (Look for "x6", "6本", or just a number in the quantity column).
    - price: Unit price (excluding tax).
    - category: Red, White, Sparkling, Rose, or Sweet (Infer from name/context).

    If a field is missing, use empty string or 0.
    `;

        onProgress(50);
        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        const text = response.text();
        onProgress(80);

        // Clean up JSON string (sometimes Gemini adds markdown)
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const rawItems = JSON.parse(jsonString);

        // Map to WineItem type
        const items: WineItem[] = rawItems.map((item: any) => ({
            id: generateId(),
            nameJP: item.nameJP || '',
            nameOriginal: item.nameOriginal || '',
            vintage: item.vintage ? String(item.vintage) : '',
            country: item.country || '',
            region: item.region || '',
            producer: item.producer || '',
            capacity: item.capacity || '750ml',
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            taxType: 'tax_excluded',
            category: validateCategory(item.category)
        }));

        onProgress(100);
        return items;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function validateCategory(cat: string): WineCategory {
    const valid: WineCategory[] = ['Red', 'White', 'Sparkling', 'Rose', 'Sweet'];
    const normalized = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    if (valid.includes(normalized as WineCategory)) {
        return normalized as WineCategory;
    }
    return 'Red'; // Default
}
