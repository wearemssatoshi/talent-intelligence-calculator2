'use client';

import React, { useState } from 'react';
import { useWine } from '@/context/WineContext';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';

export default function InventoryPage() {
    const { items, updateItem, commitInventory, resetInventoryCounts } = useWine();
    const [mode, setMode] = useState<'input' | 'preview'>('input');

    // Calculate Totals
    const totalSystemStock = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalActualStock = items.reduce((sum, item) => sum + (item.inventoryCount ?? item.quantity), 0);
    const totalVariance = totalActualStock - totalSystemStock;

    const totalSystemValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalActualValue = items.reduce((sum, item) => sum + ((item.inventoryCount ?? item.quantity) * item.price), 0);
    const valueVariance = totalActualValue - totalSystemValue;

    const handleCommit = () => {
        if (confirm('Are you sure you want to commit these inventory counts? This will update the system stock.')) {
            commitInventory();
            setMode('input');
            alert('Inventory updated successfully!');
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8 relative overflow-hidden bg-gray-50 dark:bg-gray-950">
            <div className="max-w-6xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-6">
                    <div className="space-y-2">
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-2">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Portal</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                                Inventory <span className="text-blue-600">Manager</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {mode === 'input' ? (
                            <button
                                onClick={() => setMode('preview')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Review & Commit
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setMode('input')}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all"
                                >
                                    Back to Input
                                </button>
                                <button
                                    onClick={handleCommit}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    Confirm Update
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-xl border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">System Stock</p>
                        <p className="text-2xl font-bold">{totalSystemStock} <span className="text-xs font-normal">btls</span></p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Actual Stock</p>
                        <p className="text-2xl font-bold">{totalActualStock} <span className="text-xs font-normal">btls</span></p>
                    </div>
                    <div className={cn("glass-card p-4 rounded-xl border-l-4", totalVariance < 0 ? "border-red-500" : "border-gray-300")}>
                        <p className="text-sm text-gray-500">Variance</p>
                        <p className={cn("text-2xl font-bold", totalVariance < 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>
                            {totalVariance > 0 ? '+' : ''}{totalVariance}
                        </p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border-l-4 border-gold-500">
                        <p className="text-sm text-gray-500">Total Asset Value</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalActualValue)}</p>
                        <p className={cn("text-xs", valueVariance < 0 ? "text-red-500" : "text-gray-400")}>
                            Diff: {formatCurrency(valueVariance)}
                        </p>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="glass rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold">
                            <tr>
                                <th className="px-6 py-4">Wine Name</th>
                                <th className="px-6 py-4 w-24">Vintage</th>
                                <th className="px-6 py-4 w-32 text-right">System</th>
                                <th className="px-6 py-4 w-40 text-center bg-blue-50 dark:bg-blue-900/20">Actual Count</th>
                                <th className="px-6 py-4 w-32 text-right">Diff</th>
                                <th className="px-6 py-4 w-32 text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item) => {
                                const actual = item.inventoryCount !== undefined ? item.inventoryCount : item.quantity;
                                const diff = actual - item.quantity;

                                return (
                                    <tr key={item.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.nameJP}</div>
                                            <div className="text-xs text-gray-500">{item.nameOriginal}</div>
                                        </td>
                                        <td className="px-6 py-4">{item.vintage}</td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-400">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 bg-blue-50/50 dark:bg-blue-900/10">
                                            {mode === 'input' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => updateItem(item.id, { inventoryCount: Math.max(0, actual - 1) })}
                                                        className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-blue-600 hover:bg-blue-50 font-bold text-lg"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={actual}
                                                        onChange={(e) => updateItem(item.id, { inventoryCount: Math.max(0, parseInt(e.target.value) || 0) })}
                                                        className="w-16 p-2 text-center font-bold text-xl rounded-lg border-2 border-blue-200 focus:border-blue-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => updateItem(item.id, { inventoryCount: actual + 1 })}
                                                        className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-blue-600 hover:bg-blue-50 font-bold text-lg"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center font-bold text-xl text-blue-600">
                                                    {actual}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "font-bold px-2 py-1 rounded",
                                                diff < 0 ? "bg-red-100 text-red-700" : diff > 0 ? "bg-green-100 text-green-700" : "text-gray-400"
                                            )}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-600">
                                            {formatCurrency(item.price)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
