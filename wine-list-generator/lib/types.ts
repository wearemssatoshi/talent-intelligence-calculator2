export type WineCategory = 'Red' | 'White' | 'Sparkling' | 'Rose' | 'Sweet' | 'Other';

export interface WineItem {
    id: string;
    nameJP: string;
    nameOriginal: string;
    vintage: string;
    country: string;
    region: string; // e.g. Bordeaux, Toscana
    subRegion?: string; // e.g. Medoc
    village?: string; // e.g. Pauillac
    vineyard?: string;
    producer: string;
    capacity: string; // e.g. 750ml
    quantity: number; // System Stock
    price: number; // Cost Price (Tax excluded preferred)
    sellingPrice?: number; // Manual Selling Price (Override)
    link?: string; // URL for details
    taxType: 'tax_excluded' | 'tax_included';
    totalPrice?: number;
    classification?: string; // AOC, DOCG, Grand Cru
    productCode?: string;
    category: WineCategory;

    // Inventory Fields
    inventoryCount?: number; // Actual Stock from physical count
    lastUpdated?: string; // Timestamp
}

export interface OcrResult {
    text: string;
    confidence: number;
}
