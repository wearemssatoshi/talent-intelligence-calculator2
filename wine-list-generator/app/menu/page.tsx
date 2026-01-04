'use client';

import React, { useState } from 'react';
import { useWine } from '@/context/WineContext';
import { WineListPdf } from '@/components/WineListPdf';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Wine, FileText, RefreshCw, ArrowLeft, Search, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function MenuPage() {
    const { items } = useWine();
    const [markup, setMarkup] = useState(1.8);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter items
    const filteredItems = items.filter(item =>
        item.nameJP.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameOriginal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by Country -> Region
    const groupedItems = filteredItems.reduce((acc, item) => {
        const country = item.country || 'Other';
        const region = item.region || 'Other';
        if (!acc[country]) acc[country] = {};
        if (!acc[country][region]) acc[country][region] = [];
        acc[country][region].push(item);
        return acc;
    }, {} as Record<string, Record<string, typeof items>>);

    return (
        <main className="min-h-screen p-8 md:p-12 relative overflow-hidden">
            <div className="max-w-5xl mx-auto space-y-12 relative z-10">

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
                            <div className="p-2 bg-gold-500 rounded-lg shadow-lg shadow-gold-500/20">
                                <Wine className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                                Wine <span className="text-gradient-gold">List</span>
                            </h1>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search wines..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="glass-input pl-10 pr-4 py-2 rounded-full w-64"
                            />
                        </div>

                        <PDFDownloadLink
                            document={<WineListPdf items={items} markup={markup} />}
                            fileName="wine_list.pdf"
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-full shadow-lg transition-all"
                        >
                            {({ loading }) => (
                                <>
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                    {loading ? 'Generating...' : 'Download PDF'}
                                </>
                            )}
                        </PDFDownloadLink>
                    </div>
                </header>

                {/* Wine List Display */}
                <div className="space-y-12">
                    {Object.keys(groupedItems).sort().map(country => (
                        <motion.section
                            key={country}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white border-b-2 border-gold-400 inline-block pb-1">
                                {country}
                            </h2>

                            {Object.keys(groupedItems[country]).sort().map(region => (
                                <div key={region} className="space-y-4">
                                    <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300 pl-4 border-l-4 border-gray-200 dark:border-gray-700">
                                        {region}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groupedItems[country][region].map(item => {
                                            const price = item.sellingPrice
                                                ? item.sellingPrice
                                                : Math.ceil((item.price * markup) / 100) * 100;

                                            // Determine Link URL
                                            const linkUrl = item.link
                                                ? item.link
                                                : `https://www.google.com/search?q=${encodeURIComponent(`${item.producer} ${item.nameOriginal || item.nameJP} ${item.vintage}`)}`;

                                            return (
                                                <a
                                                    key={item.id}
                                                    href={linkUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="glass-card p-6 rounded-xl flex justify-between items-start group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden"
                                                >
                                                    {/* Hover Effect Highlight */}
                                                    <div className="absolute inset-0 bg-gold-400/0 group-hover:bg-gold-400/5 transition-colors duration-300" />

                                                    <div className="space-y-1 relative z-10 max-w-[70%]">
                                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-gold-600 transition-colors flex items-center gap-2">
                                                            {item.nameJP || '名称未設定'}
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-gold-500" />
                                                        </h4>
                                                        {item.nameOriginal && (
                                                            <p className="text-sm font-serif italic text-gray-500 dark:text-gray-400">
                                                                {item.nameOriginal}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-2">
                                                            {item.vintage && <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{item.vintage}</span>}
                                                            {item.producer && <span>{item.producer}</span>}
                                                            {item.classification && <span>{item.classification}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right relative z-10">
                                                        <p className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                                                            {formatCurrency(price)}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{item.capacity}</p>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </motion.section>
                    ))}
                </div>
            </div>
        </main>
    );
}
