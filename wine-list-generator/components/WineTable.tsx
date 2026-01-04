'use client';

import React from 'react';
import { WineItem, WineCategory } from '@/lib/types';
import { Trash2, Plus, Wine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface WineTableProps {
    items: WineItem[];
    onUpdate: (items: WineItem[]) => void;
}

export function WineTable({ items, onUpdate }: WineTableProps) {
    const handleChange = (id: string, field: keyof WineItem, value: any) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onUpdate(newItems);
    };

    const handleDelete = (id: string) => {
        onUpdate(items.filter(item => item.id !== id));
    };

    const handleAdd = () => {
        const newItem: WineItem = {
            id: Math.random().toString(36).substring(2, 9),
            nameJP: '',
            nameOriginal: '',
            vintage: '',
            country: '',
            region: '',
            producer: '',
            capacity: '750ml',
            quantity: 1,
            price: 0,
            taxType: 'tax_excluded',
            category: 'Red'
        };
        onUpdate([...items, newItem]);
    };

    return (
        <div className="space-y-6">
            <div className="glass rounded-2xl overflow-hidden border border-white/20 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-serif tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">Wine Name</th>
                                <th className="px-6 py-4 font-medium w-24">Vintage</th>
                                <th className="px-6 py-4 font-medium w-40">Origin</th>
                                <th className="px-6 py-4 font-medium w-40">Producer</th>
                                <th className="px-6 py-4 font-medium w-28">Type</th>
                                <th className="px-6 py-4 font-medium w-32">Cost (¥)</th>
                                <th className="px-6 py-4 font-medium w-32">Sell (¥)</th>
                                <th className="px-6 py-4 font-medium w-32">Link</th>
                                <th className="px-6 py-4 font-medium w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {items.map((item, index) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white/30 dark:bg-gray-900/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="px-6 py-4 space-y-2">
                                        <input
                                            type="text"
                                            value={item.nameJP}
                                            onChange={(e) => handleChange(item.id, 'nameJP', e.target.value)}
                                            placeholder="日本語名"
                                            className="glass-input w-full p-2 rounded-lg text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                        />
                                        <input
                                            type="text"
                                            value={item.nameOriginal}
                                            onChange={(e) => handleChange(item.id, 'nameOriginal', e.target.value)}
                                            placeholder="Original Name"
                                            className="glass-input w-full p-2 rounded-lg text-xs font-serif text-gray-600 dark:text-gray-300 placeholder-gray-400 italic"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <input
                                            type="text"
                                            value={item.vintage}
                                            onChange={(e) => handleChange(item.id, 'vintage', e.target.value)}
                                            className="glass-input w-full p-2 rounded-lg text-center font-mono text-sm"
                                            placeholder="NV"
                                        />
                                    </td>
                                    <td className="px-6 py-4 space-y-2 align-top">
                                        <input
                                            type="text"
                                            value={item.country}
                                            onChange={(e) => handleChange(item.id, 'country', e.target.value)}
                                            placeholder="Country"
                                            className="glass-input w-full p-2 rounded-lg text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={item.region}
                                            onChange={(e) => handleChange(item.id, 'region', e.target.value)}
                                            placeholder="Region"
                                            className="glass-input w-full p-2 rounded-lg text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <input
                                            type="text"
                                            value={item.producer}
                                            onChange={(e) => handleChange(item.id, 'producer', e.target.value)}
                                            className="glass-input w-full p-2 rounded-lg text-sm"
                                            placeholder="Producer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="relative">
                                            <Wine className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                                            <select
                                                value={item.category}
                                                onChange={(e) => handleChange(item.id, 'category', e.target.value)}
                                                className="glass-input w-full pl-8 p-2 rounded-lg text-sm appearance-none cursor-pointer"
                                            >
                                                <option value="Red">Red</option>
                                                <option value="White">White</option>
                                                <option value="Sparkling">Sparkling</option>
                                                <option value="Rose">Rose</option>
                                                <option value="Sweet">Sweet</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleChange(item.id, 'price', parseInt(e.target.value) || 0)}
                                            className="glass-input w-full p-2 rounded-lg text-right font-mono text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <input
                                            type="number"
                                            value={item.sellingPrice || ''}
                                            onChange={(e) => handleChange(item.id, 'sellingPrice', parseInt(e.target.value) || 0)}
                                            placeholder="Auto"
                                            className="glass-input w-full p-2 rounded-lg text-right font-mono text-sm border-blue-200 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <input
                                            type="text"
                                            value={item.link || ''}
                                            onChange={(e) => handleChange(item.id, 'link', e.target.value)}
                                            placeholder="URL"
                                            className="glass-input w-full p-2 rounded-lg text-xs text-blue-500 underline placeholder-gray-400"
                                        />
                                    </td>
                                    <td className="px-6 py-4 align-top text-center">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAdd}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-gold-400 hover:text-gold-600 hover:bg-gold-50/50 dark:hover:bg-gold-900/10 transition-all flex items-center justify-center gap-2 font-medium"
            >
                <Plus className="w-5 h-5" />
                <span>Add New Wine</span>
            </motion.button>
        </div>
    );
}
