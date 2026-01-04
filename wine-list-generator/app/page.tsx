'use client';

import React from 'react';
import Link from 'next/link';
import { Wine, Settings, ClipboardList, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalPage() {
  const apps = [
    {
      title: "Operation Center",
      description: "Invoice OCR, Cost Management, Master Data.",
      icon: Settings,
      href: "/admin",
      color: "bg-gray-900 dark:bg-gray-800",
      textColor: "text-white"
    },
    {
      title: "Digital Wine List",
      description: "Customer-facing view. No costs shown. PDF Export.",
      icon: Wine,
      href: "/menu",
      color: "bg-gold-500",
      textColor: "text-white"
    },
    {
      title: "Inventory Manager",
      description: "Stock counting, Variance analysis, Valuation.",
      icon: ClipboardList,
      href: "/inventory",
      color: "bg-blue-600",
      textColor: "text-white"
    }
  ];

  return (
    <main className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      <div className="max-w-5xl w-full space-y-12 relative z-10">

        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif font-bold text-gray-900 dark:text-white tracking-tight"
          >
            SVD <span className="text-gradient-gold">Wine OS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 dark:text-gray-400 font-light tracking-wide"
          >
            The Operating System for Modern Sommelier Teams.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app, index) => (
            <Link key={app.href} href={app.href} className="block group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
                className="glass-card h-full p-8 rounded-3xl border border-white/20 relative overflow-hidden group-hover:-translate-y-2 transition-transform duration-300"
              >
                <div className={`w-14 h-14 ${app.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <app.icon className={`w-7 h-7 ${app.textColor}`} />
                </div>

                <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
                  {app.title}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                  {app.description}
                </p>

                <div className="flex items-center gap-2 text-gold-600 dark:text-gold-400 font-medium group-hover:gap-3 transition-all">
                  <span>Launch App</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-400 dark:text-gray-600 font-mono"
        >
          v1.0.0 | Powered by SVD Intelligence
        </motion.div>
      </div>
    </main>
  );
}
