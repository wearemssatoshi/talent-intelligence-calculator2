'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, Wine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
    progress: number;
}

export function FileUploader({ onFileSelect, isProcessing, progress }: FileUploaderProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg'],
            'application/pdf': ['.pdf']
        },
        disabled: isProcessing,
        multiple: false
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "glass-card relative overflow-hidden rounded-2xl p-12 text-center cursor-pointer transition-all duration-500 group",
                isDragActive ? "border-gold-400 bg-gold-50/30 scale-[1.02]" : "border-white/20 hover:border-gold-300/50",
                isProcessing && "cursor-not-allowed opacity-90"
            )}
        >
            <input {...getInputProps()} />

            <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
                <AnimatePresence mode="wait">
                    {isProcessing ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center space-y-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-gold-400/20 blur-xl rounded-full animate-pulse" />
                                <Loader2 className="w-16 h-16 text-gold-500 animate-spin relative z-10" />
                            </div>
                            <div className="space-y-2 w-full max-w-xs">
                                <p className="text-xl font-serif font-medium text-gray-800 dark:text-gray-100">
                                    Analyzing Vintage...
                                </p>
                                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-gold-400 to-gold-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 text-right">{Math.round(progress)}%</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center space-y-4"
                        >
                            <div className={cn(
                                "p-6 rounded-full transition-all duration-500",
                                isDragActive ? "bg-gold-100 dark:bg-gold-900/30 scale-110" : "bg-gray-50 dark:bg-gray-800/50 group-hover:bg-gold-50 dark:group-hover:bg-gold-900/20"
                            )}>
                                <Upload className={cn(
                                    "w-10 h-10 transition-colors duration-300",
                                    isDragActive ? "text-gold-600" : "text-gray-400 group-hover:text-gold-500"
                                )} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-2xl font-serif text-gray-800 dark:text-gray-100">
                                    Drop Invoice Here
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-light tracking-wide">
                                    PDF, JPG, or PNG supported
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
