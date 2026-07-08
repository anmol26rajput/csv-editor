"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Merge, Scissors, ArrowUpDown, Repeat, Trash2, PenLine, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PDFMerge from '@/components/tools/PDFMerge';
import PDFSplit from '@/components/tools/PDFSplit';
import PDFRemove from '@/components/tools/PDFRemove';
import PDFReorder from '@/components/tools/PDFReorder';
import PDFConvert from '@/components/tools/PDFConvert';
import PDFTextEditor from '@/components/tools/PDFTextEditor';
import { UploadedFile } from '@/components/tools/FileUploader';

const tabs = [
    { id: 'convert' as const, label: 'Convert', icon: Repeat },
    { id: 'edit' as const, label: 'Edit Text', icon: PenLine },
    { id: 'merge' as const, label: 'Merge', icon: Merge },
    { id: 'split' as const, label: 'Split', icon: Scissors },
    { id: 'remove' as const, label: 'Remove', icon: Trash2 },
    { id: 'reorder' as const, label: 'Reorder', icon: ArrowUpDown },
];

function PDFToolsContent() {
    const [activeTab, setActiveTab] = useState<'convert' | 'edit' | 'merge' | 'split' | 'remove' | 'reorder'>('convert');
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
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold tracking-tight">PDF tools</h1>
                    <p className="mt-2 text-ink-500">Convert, merge, split, and reorder your PDF documents.</p>
                </div>

                <div className="inline-flex items-center rounded-xl bg-ink-100 p-1">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "inline-flex items-center whitespace-nowrap rounded-lg px-5 py-1.5 text-sm font-medium transition-all duration-200",
                                activeTab === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'convert' && <PDFConvert initialFile={initialFile} />}
                {activeTab === 'edit' && <PDFTextEditor initialFile={initialFile} />}
                {activeTab === 'merge' && <PDFMerge initialFiles={initialFile ? [initialFile] : []} />}
                {activeTab === 'split' && <PDFSplit initialFile={initialFile} />}
                {activeTab === 'remove' && <PDFRemove initialFile={initialFile} />}
                {activeTab === 'reorder' && <PDFReorder initialFile={initialFile} />}
            </div>
        </div>
    );
}

export default function PDFToolsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-ink-300" /></div>}>
            <PDFToolsContent />
        </Suspense>
    );
}
