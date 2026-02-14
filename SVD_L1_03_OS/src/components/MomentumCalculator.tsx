"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ArrowRight, TrendingUp, Users, Calendar, MapPin, AlertCircle, BarChart3, Calculator, Download, Loader2, Sparkles, Zap } from 'lucide-react';
import momentumBenchmarks from '../data/momentumBenchmarks.json';
import AnnualMomentumChart from './AnnualMomentumChart';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Facility = 'okurayama' | 'tv_tower' | 'moiwa';

const BASE_TARGETS: Record<Facility, { revenue: number, customers: number }> = {
    okurayama: { revenue: 800000, customers: 120 },
    tv_tower: { revenue: 600000, customers: 100 },
    moiwa: { revenue: 1000000, customers: 150 }
};

interface MomentumData {
    date: string;
    facility: Facility;
    macro: {
        seasonalIndex: number;
        dayOfWeekIndex: number;
        visitorIndex: number;
    };
    micro: {
        revenue: number;
        revenueBenchmark: number;
        customers: number;
        customersBenchmark: number;
    };
}

const MomentumCalculator: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [isManualMode, setIsManualMode] = useState(false);
    const [viewMode, setViewMode] = useState<'daily' | 'annual'>('daily');
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Initial State
    const [data, setData] = useState<MomentumData>({
        date: today,
        facility: 'okurayama',
        macro: { seasonalIndex: 3, dayOfWeekIndex: 3, visitorIndex: 3 },
        micro: { revenue: 0, revenueBenchmark: 100000, customers: 0, customersBenchmark: 50 },
    });

    const [result, setResult] = useState<{
        macroScore: number;
        microScore: number;
        totalScore: number;
        revenueIndex: number;
        customerIndex: number;
        benchmarkScore: number | null;
    } | null>(null);

    // Auto-Load Benchmark (Excel Logic)
    useEffect(() => {
        if (isManualMode) return;
        const facilityData = momentumBenchmarks[data.facility as keyof typeof momentumBenchmarks];
        // @ts-ignore
        const dateScore = facilityData ? facilityData[data.date] : null;

        if (dateScore !== null && dateScore !== undefined) {
            setData(prev => ({
                ...prev,
                macro: { seasonalIndex: dateScore, dayOfWeekIndex: dateScore, visitorIndex: dateScore }
            }));
        }
    }, [data.date, data.facility, isManualMode]);

    // Unified Calculation Logic with loop prevention
    useEffect(() => {
        const macroScore = (data.macro.seasonalIndex + data.macro.dayOfWeekIndex + data.macro.visitorIndex) / 3;

        // Calculate dynamic benchmarks
        const base = BASE_TARGETS[data.facility];
        const ratio = macroScore / 5.0;
        const derivedRevBenchmark = Math.round(base.revenue * ratio);
        const derivedCustBenchmark = Math.round(base.customers * ratio);

        // Update benchmark state only if changed
        if (data.micro.revenueBenchmark !== derivedRevBenchmark || data.micro.customersBenchmark !== derivedCustBenchmark) {
            setData(prev => ({
                ...prev,
                micro: {
                    ...prev.micro,
                    revenueBenchmark: derivedRevBenchmark,
                    customersBenchmark: derivedCustBenchmark
                }
            }));
            return;
        }

        const revenueIndex = calculateIndex(data.micro.revenue, data.micro.revenueBenchmark);
        const customerIndex = calculateIndex(data.micro.customers, data.micro.customersBenchmark);

        const microScore = (revenueIndex + customerIndex) / 2;
        const totalScore = (macroScore + revenueIndex + customerIndex) / 3;

        const facilityData = momentumBenchmarks[data.facility as keyof typeof momentumBenchmarks];
        // @ts-ignore
        const benchmarkScore = facilityData ? facilityData[data.date] : null;

        setResult({ macroScore, microScore, totalScore, revenueIndex, customerIndex, benchmarkScore });
    }, [data, isManualMode]);

    const calculateIndex = (actual: number, benchmark: number): number => {
        if (benchmark === 0) return 3;
        const rate = actual / benchmark;
        if (rate >= 1.2) return 5;
        if (rate >= 1.1) return 4;
        if (rate >= 0.9) return 3;
        if (rate >= 0.8) return 2;
        return 1;
    };

    const handleMacroChange = (field: keyof typeof data.macro, value: number) => {
        if (!isManualMode) return;
        setData(prev => ({ ...prev, macro: { ...prev.macro, [field]: value } }));
    };

    const handleMicroChange = (field: keyof typeof data.micro, value: number) => {
        setData(prev => ({ ...prev, micro: { ...prev.micro, [field]: value } }));
    };

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;
        setIsExporting(true);

        try {
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                backgroundColor: '#020617', // Match background color
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`MomentumPeaks_${data.facility}_${data.date}.pdf`);

        } catch (error) {
            console.error('Export failed:', error);
            alert('PDF Export Failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Visual Helpers
    const getGradient = (score: number) => {
        if (score >= 4.5) return "from-rose-400 via-red-500 to-rose-600";
        if (score >= 3.5) return "from-amber-300 via-orange-400 to-amber-500";
        if (score >= 2.5) return "from-blue-300 via-indigo-400 to-purple-500";
        return "from-slate-400 to-slate-600";
    };

    // Animation Helpers (Breathing Data)
    const getAnimationDuration = (score: number) => {
        if (score >= 4.0) return 3; // Fast, energetic
        if (score >= 2.5) return 8; // Normal
        return 20; // Slow, stagnant
    };

    const getAnimationScale = (score: number) => {
        if (score >= 4.0) return [1, 1.3, 1]; // Big pulse
        return [1, 1.05, 1]; // Subtle pulse
    };

    // Determine mood for background
    const currentMood = result?.totalScore || 3;
    const isCrisis = currentMood < 2.5;

    return (
        <div ref={dashboardRef} className={`max-w-7xl mx-auto p-4 md:p-8 font-sans min-h-screen transition-colors duration-1000 ${isCrisis ? 'bg-[#0f172a]' : 'bg-[#020617]'}`}>

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6"
            >
                <div className="relative">
                    {/* Shimmer Effect Background */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent shimmer-bg rounded-xl pointer-events-none" />

                    <div className="flex items-center gap-3 mb-2">
                        <motion.div
                            className={`h-[2px] w-16 transition-colors duration-500 ${isCrisis ? 'bg-slate-600' : 'bg-gradient-to-r from-blue-400 to-purple-400'}`}
                            animate={{ scaleX: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="flex items-center gap-2">
                            <Sparkles className={`w-4 h-4 ${isCrisis ? 'text-slate-500' : 'text-blue-300'} animate-pulse`} />
                            <span className={`tracking-[0.3em] text-xs font-medium uppercase glow-text transition-colors duration-500 ${isCrisis ? 'text-slate-400' : 'text-blue-300'}`}>Analysis Core</span>
                        </div>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-lg">
                        Daily Momentum
                        <span className="block text-sm font-serif italic text-slate-500 mt-2 tracking-wider font-light shimmer-bg">日次モメンタム予測</span>
                    </h2>
                </div>

                <div className="flex gap-4 p-1 glass-panel rounded-xl items-center" data-html2canvas-ignore>

                    {/* View Toggle */}
                    <div className="flex bg-slate-900/50 rounded-lg p-1 mr-4 border border-white/5">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-md transition-all ${viewMode === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Calculator className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">Calculator</span>
                            </div>
                            <span className="text-[9px] opacity-70 scale-90 font-serif">計算機</span>
                        </button>
                        <button
                            onClick={() => setViewMode('annual')}
                            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-md transition-all ${viewMode === 'annual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">Analytics</span>
                            </div>
                            <span className="text-[9px] opacity-70 scale-90 font-serif">年間分析</span>
                        </button>
                    </div>

                    <div className="relative group hidden md:block">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input
                            type="date"
                            value={data.date}
                            onChange={(e) => setData({ ...data, date: e.target.value })}
                            className="bg-slate-900/50 border border-transparent rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all font-mono hover:bg-slate-800/30"
                        />
                    </div>
                    <div className="relative group w-48 hidden md:block">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
                        <select
                            value={data.facility}
                            onChange={(e) => setData({ ...data, facility: e.target.value as Facility })}
                            className="w-full bg-slate-900/50 border border-transparent rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 appearance-none cursor-pointer hover:bg-slate-800/30 transition-all font-serif"
                        >
                            <option value="okurayama">NOUVELLE POUSSE (大倉山)</option>
                            <option value="tv_tower">THE GARDEN (テレビ塔)</option>
                            <option value="moiwa">THE JEWELS (藻岩山)</option>
                        </select>
                    </div>

                    {/* PDF Export Button */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex flex-col items-center justify-center px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isExporting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Download className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-medium">EXPORT</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {viewMode === 'daily' ? (
                    <motion.div
                        key="daily"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative"
                    >

                        {/* Background Ambient Glow (Breathing) */}
                        <motion.div
                            className={`absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br ${getGradient(currentMood)} blur-[120px] -z-10`}
                            animate={{
                                opacity: isCrisis ? 0.05 : 0.3,
                                scale: isCrisis ? 1 : [1, 1.1, 1],
                            }}
                            transition={{
                                duration: getAnimationDuration(currentMood),
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        />

                        {/* Left Column: Controls */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-7 space-y-8"
                        >
                            {/* Facility Select (Mobile Only) */}
                            <div className="md:hidden" data-html2canvas-ignore>
                                <select
                                    value={data.facility}
                                    onChange={(e) => setData({ ...data, facility: e.target.value as Facility })}
                                    className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 font-serif"
                                >
                                    <option value="okurayama">NOUVELLE POUSSE</option>
                                    <option value="tv_tower">THE GARDEN</option>
                                    <option value="moiwa">THE JEWELS</option>
                                </select>
                            </div>

                            {/* Macro Factors */}
                            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-50"></div>

                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-serif italic text-white flex items-center gap-3">
                                        <TrendingUp className="w-5 h-5 text-blue-400" />
                                        <div>
                                            Macro Indicators
                                            <span className="block text-[10px] text-slate-400 mt-1 font-serif tracking-in-expand">マクロ指標分析</span>
                                        </div>
                                    </h3>

                                    <button
                                        onClick={() => setIsManualMode(!isManualMode)}
                                        data-html2canvas-ignore
                                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all ${isManualMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="w-3 h-3" />
                                            <span className="text-xs font-medium">{isManualMode ? 'MANUAL' : 'AUTO SYNC'}</span>
                                        </div>
                                    </button>
                                </div>

                                {!isManualMode && result?.benchmarkScore && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mb-6 p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <p className="text-xs text-blue-200 leading-relaxed font-medium">
                                                Synced with Annual Budget Logic
                                            </p>
                                            <p className="text-[10px] text-blue-400/70 font-serif mt-0.5">
                                                年間予算ロジック同期中
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-8">
                                    {[
                                        { key: 'seasonalIndex', label: 'Seasonal Index', jp: '季節指数', sub: 'Event & Seasonality Factor' },
                                        { key: 'dayOfWeekIndex', label: 'Day of Week', jp: '曜日指数', sub: 'Calendar Potential' },
                                        { key: 'visitorIndex', label: 'Visitor Index', jp: '来場指数', sub: 'Inbound & Traffic Forecast' }
                                    ].map((item, idx) => (
                                        <div key={item.key} className={`relative ${!isManualMode ? 'opacity-80 grayscale-[0.3]' : ''} transition-all duration-300`}>
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-200 tracking-wide flex items-baseline gap-2">
                                                        {item.label}
                                                        <span className="text-[10px] text-slate-500 font-serif tracking-wider">{item.jp}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-light mt-0.5">{item.sub}</div>
                                                </div>
                                                <div className="text-3xl font-serif text-white tabular-nums">
                                                    {data.macro[item.key as keyof typeof data.macro].toFixed(1)}
                                                </div>
                                            </div>

                                            {/* Custom Range Slider with Glow */}
                                            <div className="h-3 w-full bg-slate-800/80 rounded-full relative overflow-hidden shadow-inner">
                                                <motion.div
                                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(data.macro[item.key as keyof typeof data.macro] / 5) * 100}%` }}
                                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                                    style={{ boxShadow: isManualMode ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none' }}
                                                />
                                                {/* Slider Thumb Indicator */}
                                                <motion.div
                                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500"
                                                    initial={{ left: 0 }}
                                                    animate={{ left: `calc(${(data.macro[item.key as keyof typeof data.macro] / 5) * 100}% - 8px)` }}
                                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                                    style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)' }}
                                                />
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={data.macro[item.key as keyof typeof data.macro]}
                                                    onChange={(e) => handleMacroChange(item.key as keyof typeof data.macro, parseFloat(e.target.value))}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                                    disabled={!isManualMode}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-600 mt-3 font-mono uppercase tracking-wider">
                                                <span className="text-rose-400/70">Correction Req.</span>
                                                <span className="text-slate-500">Standard</span>
                                                <span className="text-emerald-400/70">High Potential</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Micro Factors */}
                            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden premium-shadow">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                                <h3 className="text-xl font-serif italic text-white flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <Users className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        Micro Performance
                                        <span className="block text-[10px] text-slate-400 mt-1 font-serif tracking-widest">ミクロ実績評価</span>
                                    </div>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Revenue Card */}
                                    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 p-6 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300 group">
                                        <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest group-hover:text-emerald-400 transition-colors flex justify-between items-center">
                                            <span className="flex items-center gap-2">
                                                <span className="text-lg">💰</span>
                                                Revenue <span className="text-[9px] text-slate-600 ml-1 font-serif font-normal">売上高</span>
                                            </span>
                                            <span className="text-[9px] text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 font-medium">INPUT</span>
                                        </label>
                                        <div className="flex items-center gap-2 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-700/50 focus-within:border-emerald-400 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300">
                                            <span className="text-2xl text-emerald-400 font-serif italic pl-1">¥</span>
                                            <input
                                                type="number"
                                                value={data.micro.revenue}
                                                onChange={(e) => handleMicroChange('revenue', parseInt(e.target.value) || 0)}
                                                className="bg-transparent text-3xl lg:text-4xl font-light text-white w-full focus:outline-none placeholder-slate-700 tabular-nums"
                                                placeholder="0"
                                            />
                                        </div>
                                        {/* Visual Progress Bar */}
                                        <div className="mb-3">
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (data.micro.revenue / data.micro.revenueBenchmark) * 100)}%` }}
                                                    transition={{ duration: 0.5 }}
                                                    style={{ boxShadow: '0 0 10px rgba(16,185,129,0.5)' }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                                <span>0%</span>
                                                <span className={data.micro.revenue >= data.micro.revenueBenchmark ? 'text-emerald-400 font-bold' : ''}>
                                                    {Math.round((data.micro.revenue / data.micro.revenueBenchmark) * 100)}%
                                                </span>
                                                <span>100%+</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">TARGET</span>
                                            <div className="font-mono text-emerald-300 font-bold text-sm px-3 py-1 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
                                                ¥{data.micro.revenueBenchmark.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Card */}
                                    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] transition-all duration-300 group">
                                        <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest group-hover:text-purple-400 transition-colors flex justify-between items-center">
                                            <span className="flex items-center gap-2">
                                                <span className="text-lg">👥</span>
                                                Customers <span className="text-[9px] text-slate-600 ml-1 font-serif font-normal">来客数</span>
                                            </span>
                                            <span className="text-[9px] text-purple-400/80 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20 font-medium">INPUT</span>
                                        </label>
                                        <div className="flex items-center gap-2 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-700/50 focus-within:border-purple-400 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">
                                            <input
                                                type="number"
                                                value={data.micro.customers}
                                                onChange={(e) => handleMicroChange('customers', parseInt(e.target.value) || 0)}
                                                className="bg-transparent text-3xl lg:text-4xl font-light text-white w-full focus:outline-none placeholder-slate-700 pl-1 tabular-nums"
                                                placeholder="0"
                                            />
                                            <span className="text-lg text-purple-400 font-serif italic pr-1 whitespace-nowrap">PAX</span>
                                        </div>
                                        {/* Visual Progress Bar */}
                                        <div className="mb-3">
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (data.micro.customers / data.micro.customersBenchmark) * 100)}%` }}
                                                    transition={{ duration: 0.5 }}
                                                    style={{ boxShadow: '0 0 10px rgba(139,92,246,0.5)' }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                                <span>0%</span>
                                                <span className={data.micro.customers >= data.micro.customersBenchmark ? 'text-purple-400 font-bold' : ''}>
                                                    {Math.round((data.micro.customers / data.micro.customersBenchmark) * 100)}%
                                                </span>
                                                <span>100%+</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">TARGET</span>
                                            <div className="font-mono text-purple-300 font-bold text-sm px-3 py-1 bg-purple-950/40 rounded-lg border border-purple-800/50">
                                                {data.micro.customersBenchmark} PAX
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Column: Dashboard */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="lg:col-span-5 relative"
                        >
                            <div className="sticky top-8 space-y-6">

                                {/* Main Score Card */}
                                <div className={`glass-panel-hover glass-panel rounded-[2rem] p-10 relative overflow-hidden text-center backdrop-blur-2xl transition-colors duration-1000 premium-shadow ${isCrisis ? 'border-slate-700/50 bg-slate-900/80' : 'border-white/5'}`}>
                                    {/* Dynamic Background Mesh (Inner) */}
                                    <motion.div
                                        className={`absolute inset-0 opacity-30 bg-gradient-to-br ${getGradient(currentMood)}`}
                                        animate={{ scale: getAnimationScale(currentMood), rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: getAnimationDuration(currentMood), repeat: Infinity, repeatType: "mirror" }}
                                    />

                                    {/* Floating Orbs */}
                                    <motion.div
                                        className="absolute top-8 right-8 w-20 h-20 rounded-full bg-blue-500/10 blur-xl"
                                        animate={{ y: [-10, 10, -10], x: [-5, 5, -5] }}
                                        transition={{ duration: 8, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute bottom-12 left-8 w-16 h-16 rounded-full bg-purple-500/10 blur-xl"
                                        animate={{ y: [10, -10, 10], x: [5, -5, 5] }}
                                        transition={{ duration: 6, repeat: Infinity }}
                                    />

                                    <div className="relative flex items-center justify-center gap-2 mb-10 z-10">
                                        <Zap className={`w-4 h-4 ${currentMood >= 4 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                                        <h3 className="text-xs font-bold tracking-[0.3em] text-white/50 border-b border-white/10 pb-4 px-8">
                                            MOMENTUM SCORE
                                        </h3>
                                        <Zap className={`w-4 h-4 ${currentMood >= 4 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                                    </div>

                                    {/* Score with Circular Progress Ring */}
                                    <div className="relative inline-block z-10">
                                        {/* Circular Progress Ring */}
                                        <svg className="absolute -inset-8 w-[calc(100%+64px)] h-[calc(100%+64px)]" viewBox="0 0 100 100">
                                            {/* Background Ring */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke="rgba(30, 41, 59, 0.5)"
                                                strokeWidth="3"
                                            />
                                            {/* Progress Ring */}
                                            <motion.circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke="url(#scoreGradient)"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeDasharray="283"
                                                initial={{ strokeDashoffset: 283 }}
                                                animate={{ strokeDashoffset: 283 - (283 * ((result?.totalScore || 0) / 5)) }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                            />
                                            <defs>
                                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#3B82F6" />
                                                    <stop offset="50%" stopColor="#8B5CF6" />
                                                    <stop offset="100%" stopColor="#10B981" />
                                                </linearGradient>
                                            </defs>
                                        </svg>

                                        <motion.div
                                            className={`text-8xl md:text-9xl font-serif font-medium bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400 drop-shadow-2xl tabular-nums tracking-tighter ${currentMood >= 4.5 ? 'glow-text-gold' : ''}`}
                                            key={result?.totalScore}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                        >
                                            {result?.totalScore.toFixed(2)}
                                        </motion.div>
                                    </div>

                                    <div className="mt-10 flex justify-center gap-3 z-10 relative px-8">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <motion.div
                                                key={star}
                                                className={`h-2 flex-1 rounded-full transition-all duration-500`}
                                                initial={{ backgroundColor: "#334155" }}
                                                animate={{
                                                    backgroundColor: (result?.totalScore || 0) >= star ? "#ffffff" : "#1e293b",
                                                    opacity: (result?.totalScore || 0) >= star ? 1 : 0.2,
                                                    boxShadow: (result?.totalScore || 0) >= star ? "0 0 15px rgba(255,255,255,0.6)" : "none",
                                                    scale: (result?.totalScore || 0) >= star ? 1 : 0.9
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Status Badge */}
                                    <motion.div
                                        className={`mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full z-10 relative ${(result?.totalScore || 0) >= 4.5 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' :
                                            (result?.totalScore || 0) >= 3.5 ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30' :
                                                (result?.totalScore || 0) >= 2.5 ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30' :
                                                    'bg-gradient-to-r from-rose-500/20 to-red-500/20 border border-rose-500/30'
                                            }`}
                                        key={result?.totalScore ? Math.floor(result.totalScore) : 'default'}
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                    >
                                        <span className="text-lg font-serif italic text-white/90">
                                            {result?.totalScore && result.totalScore >= 4.5 ? "Exceptional Performance" :
                                                result?.totalScore && result.totalScore >= 3.5 ? "Positive Momentum" :
                                                    result?.totalScore && result.totalScore >= 2.5 ? "Standard Operation" :
                                                        "Strategic Review Needed"}
                                        </span>
                                    </motion.div>
                                    <motion.p className="text-[10px] text-slate-400 mt-3 z-10 relative font-serif tracking-wider">
                                        {result?.totalScore && result.totalScore >= 4.5 ? "極めて高いパフォーマンス" :
                                            result?.totalScore && result.totalScore >= 3.5 ? "良好なモメンタム" :
                                                result?.totalScore && result.totalScore >= 2.5 ? "標準的な運営状態" :
                                                    "戦略的見直しが必要"}
                                    </motion.p>
                                </div>

                                {/* Analysis Breakdown */}
                                <div className="glass-panel bg-slate-950/80 p-6 rounded-2xl border border-white/5 gradient-border">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 pl-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        Real-time Analysis <span className="ml-1 opacity-50 font-serif">リアルタイム分析</span>
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Macro Potential', jp: 'マクロポテンシャル', value: result?.macroScore, icon: TrendingUp, color: 'text-blue-400', bgColor: 'bg-blue-500' },
                                            { label: 'Revenue Index', jp: '売上指数', value: result?.revenueIndex, icon: ArrowRight, color: 'text-emerald-400', bgColor: 'bg-emerald-500' },
                                            { label: 'Customer Index', jp: '来客指数', value: result?.customerIndex, icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500' }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-3 hover:bg-white/5 rounded-xl transition-all group cursor-default">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${stat.bgColor}/20`}>
                                                            <stat.icon className={`w-4 h-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{stat.label}</span>
                                                            <span className="text-[9px] text-slate-600 group-hover:text-slate-400 font-serif tracking-wider">{stat.jp}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`font-mono font-bold text-lg ${stat.color}`}>
                                                        {stat.value?.toFixed(2)}
                                                    </span>
                                                </div>
                                                {/* Mini Progress Bar */}
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${stat.bgColor} rounded-full`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${((stat.value || 0) / 5) * 100}%` }}
                                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                                        style={{ boxShadow: `0 0 10px ${stat.bgColor === 'bg-blue-500' ? 'rgba(59,130,246,0.5)' : stat.bgColor === 'bg-emerald-500' ? 'rgba(16,185,129,0.5)' : 'rgba(139,92,246,0.5)'}` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="annual"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="glass-panel p-8 rounded-3xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-serif italic text-white mb-2">
                                    Annual Momentum Trend
                                    <span className="block text-xs font-serif not-italic text-slate-400 mt-2 tracking-widest">年間モメンタム推移</span>
                                </h3>
                                <p className="text-slate-500 text-sm">Fiscal Year 2025 Prediction vs Simulation</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs text-slate-300">Benchmark <span className="opacity-50 font-serif text-[10px]">(予算)</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-slate-500 border border-slate-400 rounded-full opacity-50"></div>
                                    <span className="text-xs text-slate-300">Last Year <span className="opacity-50 font-serif text-[10px]">(前年)</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-[500px]">
                            <AnnualMomentumChart facility={data.facility} currentDate={data.date} />
                        </div>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Annual Avg Score */}
                            <motion.div
                                className="p-6 bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-2xl border border-white/5 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300 group relative overflow-hidden"
                                whileHover={{ y: -4 }}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">📊</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
                                        Annual Avg Score <span className="ml-1 opacity-50 font-serif text-[9px]">年間平均</span>
                                    </span>
                                </div>
                                <div className="text-5xl font-serif text-white mt-2 tabular-nums">3.42</div>
                                <div className="text-sm text-emerald-400 mt-3 flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1 w-fit">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="font-medium">+0.12 vs LY</span>
                                </div>
                            </motion.div>

                            {/* Peak Momentum */}
                            <motion.div
                                className="p-6 bg-gradient-to-br from-slate-900/80 to-blue-900/20 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-300 group relative overflow-hidden"
                                whileHover={{ y: -4 }}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">⚡</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider group-hover:text-blue-300 transition-colors">
                                        Peak Momentum <span className="ml-1 opacity-50 font-serif text-[9px]">最高潮</span>
                                    </span>
                                </div>
                                <div className="text-5xl font-serif text-blue-400 mt-2">DEC</div>
                                <div className="text-sm text-slate-400 mt-3 flex items-center gap-2">
                                    <span className="text-blue-400 font-mono font-bold">4.8</span>
                                    <span>• Christmas Season 🎄</span>
                                </div>
                            </motion.div>

                            {/* Lowest Valley */}
                            <motion.div
                                className="p-6 bg-gradient-to-br from-slate-900/80 to-rose-900/20 rounded-2xl border border-white/5 hover:border-rose-500/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] transition-all duration-300 group relative overflow-hidden"
                                whileHover={{ y: -4 }}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">⚠️</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider group-hover:text-rose-300 transition-colors">
                                        Lowest Valley <span className="ml-1 opacity-50 font-serif text-[9px]">要対策</span>
                                    </span>
                                </div>
                                <div className="text-5xl font-serif text-rose-400 mt-2">FEB</div>
                                <div className="text-sm text-slate-400 mt-3 flex items-center gap-2">
                                    <span className="text-rose-400 font-mono font-bold">2.1</span>
                                    <span>• Post-event lull</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default MomentumCalculator;
