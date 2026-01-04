'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WineItem } from '@/lib/types';

interface WineContextType {
    items: WineItem[];
    addItem: (item: WineItem) => void;
    addItems: (newItems: WineItem[]) => void;
    updateItem: (id: string, updates: Partial<WineItem>) => void;
    deleteItem: (id: string) => void;
    clearItems: () => void;
    replaceAll: (newItems: WineItem[]) => void;
    commitInventory: () => void; // Updates system stock to match inventory count
    resetInventoryCounts: () => void;
}

const WineContext = createContext<WineContextType | undefined>(undefined);

export function WineProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<WineItem[]>([]);

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('svd-wine-os-data');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load data', e);
            }
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('svd-wine-os-data', JSON.stringify(items));
    }, [items]);

    const addItem = (item: WineItem) => {
        setItems(prev => [...prev, item]);
    };

    const addItems = (newItems: WineItem[]) => {
        setItems(prev => [...prev, ...newItems]);
    };

    const updateItem = (id: string, updates: Partial<WineItem>) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    };

    const deleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const clearItems = () => {
        setItems([]);
    };

    const replaceAll = (newItems: WineItem[]) => {
        setItems(newItems);
    };

    const commitInventory = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            quantity: item.inventoryCount !== undefined ? item.inventoryCount : item.quantity,
            inventoryCount: undefined, // Reset count after commit
            lastUpdated: new Date().toISOString()
        })));
    };

    const resetInventoryCounts = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            inventoryCount: undefined
        })));
    };

    return (
        <WineContext.Provider value={{
            items,
            addItem,
            addItems,
            updateItem,
            deleteItem,
            clearItems,
            replaceAll,
            commitInventory,
            resetInventoryCounts
        }}>
            {children}
        </WineContext.Provider>
    );
}

export function useWine() {
    const context = useContext(WineContext);
    if (context === undefined) {
        throw new Error('useWine must be used within a WineProvider');
    }
    return context;
}
