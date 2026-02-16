"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Merge, Scissors, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import PDFMerge from '@/components/tools/PDFMerge';
import PDFSplit from '@/components/tools/PDFSplit';
import PDFReorder from '@/components/tools/PDFReorder';
import { UploadedFile } from '@/components/tools/FileUploader';

export default function PDFToolsPage() {
    const [activeTab, setActiveTab] = useState<'merge' | 'split' | 'reorder'>('merge');
    const [initialFile, setInitialFile] = useState<UploadedFile | null>(null);
    const searchParams = useSearchParams();
    const fileId = searchParams.get('id');

    useEffect(() => {
        if (fileId) {
            api.get(`/api/v1/documents/${fileId}/`)
                .then(response => {
                    setInitialFile(response.data);
                    // Default to split tab if a single file is uploaded
                    setActiveTab('split');
                })
                .catch(error => {
                    console.error("Failed to load file:", error);
                });
        }
    }, [fileId]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4">
            <div className="text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-red-600 via-orange-500 to-pink-500 bg-clip-text text-transparent mb-3">
                    PDF Tools
                </h1>
                <p className="mt-2 text-lg text-gray-600">Merge, Split, and Reorder your PDF documents.</p>
            </div>

            {/* Custom Tabs */}
            <div className="flex justify-center">
                <div className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-100 p-1 text-gray-500 shadow-inner">
                    <button
                        onClick={() => setActiveTab('merge')}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-1.5 text-sm font-semibold transition-all duration-300",
                            activeTab === 'merge' ? "bg-white text-gray-900 shadow-md" : "hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <Merge className="mr-2 h-4 w-4" /> Merge
                    </button>
                    <button
                        onClick={() => setActiveTab('split')}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-1.5 text-sm font-semibold transition-all duration-300",
                            activeTab === 'split' ? "bg-white text-gray-900 shadow-md" : "hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <Scissors className="mr-2 h-4 w-4" /> Split
                    </button>
                    <button
                        onClick={() => setActiveTab('reorder')}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-1.5 text-sm font-semibold transition-all duration-300",
                            activeTab === 'reorder' ? "bg-white text-gray-900 shadow-md" : "hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Reorder
                    </button>
                </div>
            </div>

            <div className="mt-6 animate-fade-in">
                {activeTab === 'merge' && <PDFMerge initialFiles={initialFile ? [initialFile] : []} />}
                {activeTab === 'split' && <PDFSplit initialFile={initialFile} />}
                {activeTab === 'reorder' && <PDFReorder initialFile={initialFile} />}
            </div>
        </div>
    );
}
