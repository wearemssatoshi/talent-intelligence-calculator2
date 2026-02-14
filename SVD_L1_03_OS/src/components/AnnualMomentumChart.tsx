"use client";

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import momentumBenchmarks from '../data/momentumBenchmarks.json';

interface AnnualMomentumChartProps {
    facility: 'okurayama' | 'tv_tower' | 'moiwa';
    currentDate: string;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                <p className="text-slate-400 text-xs font-mono mb-3 border-b border-white/10 pb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6 py-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: entry.dataKey === 'score' ? '#3B82F6' : '#64748B',
                                    boxShadow: entry.dataKey === 'score' ? '0 0 10px rgba(59,130,246,0.5)' : 'none'
                                }}
                            />
                            <span className="text-slate-300 text-sm font-medium">
                                {entry.dataKey === 'score' ? 'Benchmark' : 'Last Year'}
                            </span>
                        </div>
                        <span className="text-white font-mono font-bold text-lg">
                            {entry.value?.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Custom Dot Component
const CustomDot = (props: any) => {
    const { cx, cy, dataKey, value } = props;
    if (!value) return null;

    const isHighScore = value >= 4;
    const color = dataKey === 'score' ? '#3B82F6' : '#64748B';

    return (
        <g>
            {/* Glow Effect for high scores */}
            {isHighScore && dataKey === 'score' && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill={color}
                    opacity={0.3}
                />
            )}
            <circle
                cx={cx}
                cy={cy}
                r={dataKey === 'score' ? 4 : 2}
                fill={color}
                stroke="#0f172a"
                strokeWidth={2}
            />
        </g>
    );
};

const AnnualMomentumChart: React.FC<AnnualMomentumChartProps> = ({ facility, currentDate }) => {
    // @ts-ignore
    const rawData = momentumBenchmarks[facility] || {};

    const chartData = Object.keys(rawData)
        .sort()
        .map(date => {
            const score = rawData[date as keyof typeof rawData];
            const simulatedLastYear = score ? Math.max(1, Math.min(5, score + (Math.random() * 1.5 - 0.75))) : null;

            return {
                date,
                displayDate: date.substring(5),
                score: score,
                lastYear: simulatedLastYear
            };
        });

    return (
        <div className="w-full h-[400px] font-sans relative">
            {/* Background Gradient Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-transparent rounded-3xl pointer-events-none" />

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 30, right: 30, left: 10, bottom: 10 }}
                >
                    <defs>
                        {/* Premium Blue Gradient */}
                        <linearGradient id="colorScorePremium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                            <stop offset="50%" stopColor="#6366F1" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                        </linearGradient>

                        {/* Last Year Subtle Gradient */}
                        <linearGradient id="colorLastYear" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#64748B" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#64748B" stopOpacity={0.02} />
                        </linearGradient>

                        {/* Glow Filter */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="1 6"
                        stroke="#334155"
                        opacity={0.4}
                        vertical={false}
                    />

                    <XAxis
                        dataKey="displayDate"
                        stroke="#64748B"
                        fontSize={11}
                        fontFamily="var(--font-outfit)"
                        tickLine={false}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickFormatter={(val) => {
                            if (val.endsWith('01')) return val.split('-')[0] + '月';
                            return '';
                        }}
                        interval="preserveStartEnd"
                        dy={10}
                    />

                    <YAxis
                        domain={[0, 5.5]}
                        stroke="#64748B"
                        fontSize={11}
                        fontFamily="var(--font-outfit)"
                        tickLine={false}
                        axisLine={false}
                        ticks={[1, 2, 3, 4, 5]}
                        tickFormatter={(val) => val.toFixed(1)}
                        dx={-5}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    {/* Last Year Area */}
                    <Area
                        type="monotone"
                        dataKey="lastYear"
                        stroke="#64748B"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        fill="url(#colorLastYear)"
                        fillOpacity={1}
                        name="Last Year"
                        dot={<CustomDot dataKey="lastYear" />}
                        activeDot={{ r: 5, stroke: '#64748B', strokeWidth: 2, fill: '#0f172a' }}
                    />

                    {/* Current Score Area */}
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorScorePremium)"
                        name="Benchmark"
                        filter="url(#glow)"
                        dot={<CustomDot dataKey="score" />}
                        activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 3, fill: '#0f172a' }}
                    />

                    {currentDate && (
                        <ReferenceLine
                            x={currentDate.substring(5)}
                            stroke="#F43F5E"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            label={{
                                position: 'top',
                                value: '📍 TODAY',
                                fill: '#F43F5E',
                                fontSize: 11,
                                fontWeight: 'bold'
                            }}
                        />
                    )}

                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AnnualMomentumChart;

