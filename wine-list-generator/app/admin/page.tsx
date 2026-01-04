'use client';

import React, { useState, useEffect } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { WineTable } from '@/components/WineTable';
import { processInvoice } from '@/lib/ocr-parser';
import { processInvoiceWithGemini } from '@/lib/gemini';
import { useWine } from '@/context/WineContext';
import { Download, FileText, Settings, Sparkles, Wine, ArrowLeft, Key, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function AdminPage() {
    const { items, addItems, updateItem, deleteItem, clearItems, replaceAll } = useWine();
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [apiKey, setApiKey] = useState('');
    const [useGemini, setUseGemini] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Load API Key from local storage
    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
            setUseGemini(true);
        }
    }, []);

    const handleSaveApiKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        if (key) setUseGemini(true);
    };

    const handleFileSelect = async (file: File) => {
        setIsProcessing(true);
        setProgress(0);
        try {
            let newItems;
            if (useGemini && apiKey) {
                newItems = await processInvoiceWithGemini(file, apiKey, (p) => setProgress(p));
            } else {
                newItems = await processInvoice(file, (p) => setProgress(p));
            }
            addItems(newItems);
        } catch (error) {
            console.error('OCR Error:', error);
            alert('読み取りに失敗しました。' + (useGemini ? 'APIキーを確認するか、別の画像を試してください。' : '別の画像を試してください。'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportCSV = () => {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const header = '日本語名,原語名,ヴィンテージ,原産国,原産地,生産者,容量ml,本数,単価税抜,格付け,品番,備考\n';
        const rows = items.map(item =>
            `"${item.nameJP}","${item.nameOriginal}","${item.vintage}","${item.country}","${item.region}","${item.producer}","${item.capacity}","${item.quantity}","${item.price}","${item.classification || ''}","${item.productCode || ''}","${item.category}"`
        ).join('\n');

        const blob = new Blob([bom, header, rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wine_list.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="min-h-screen p-8 md:p-12 relative overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-12 relative z-10">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-8">
                    <div className="space-y-2">
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gold-600 transition-colors mb-2">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Portal</span>
                        </Link>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="p-2 bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                                Operation <span className="text-gradient-gold">Center</span>
                            </h1>
                        </motion.div>
                        <p className="text-gray-500 dark:text-gray-400 font-light tracking-wide max-w-md">
                            Manage invoices, costs, and master data.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${useGemini && apiKey
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {useGemini && apiKey ? <BrainCircuit className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                            <span className="text-sm font-medium">
                                {useGemini && apiKey ? 'AI Vision Active' : 'Configure AI'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* AI Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="glass p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-8">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-blue-600" />
                                    Gemini AI Configuration
                                </h3>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Google Gemini API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => handleSaveApiKey(e.target.value)}
                                            placeholder="AIzaSy..."
                                            className="glass-input w-full p-3 rounded-xl font-mono text-sm"
                                        />
                                        <p className="text-xs text-gray-400">
                                            Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>. stored locally.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 pb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useGemini}
                                                onChange={(e) => setUseGemini(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable AI Vision</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-12">
                    <section>
                        <FileUploader
                            onFileSelect={handleFileSelect}
                            isProcessing={isProcessing}
                            progress={progress}
                        />
                        {useGemini && apiKey && (
                            <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-4 font-medium animate-pulse">
                                ✨ Powered by Gemini 1.5 Pro Vision
                            </p>
                        )}
                    </section>

                    {items.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-gray-900/50 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
                                <h2 className="text-2xl font-serif font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-gold-500" />
                                    Master Data <span className="text-sm font-sans font-normal text-gray-500 ml-2">({items.length} items)</span>
                                </h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={clearItems}
                                        className="px-6 py-2.5 text-sm font-medium text-red-600 bg-red-50/50 hover:bg-red-100/80 rounded-full transition-colors"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-full shadow-sm transition-all hover:shadow-md"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            <WineTable items={items} onUpdate={(updated) => {
                                replaceAll(updated);
                            }} />
                        </motion.section>
                    )}
                </div>
            </div>
        </main>
    );
}
