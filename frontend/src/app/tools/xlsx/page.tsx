"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from '@/components/tools/FileUploader';
import XLSXSheet from '@/components/tools/XLSXSheet';
import XLSXSheetReorder from '@/components/tools/XLSXSheetReorder';
import { Loader2 } from 'lucide-react';

function XLSXToolsContent() {
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [mode, setMode] = useState<'view' | 'reorder'>('view');
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const fileId = searchParams.get('id');

    useEffect(() => {
        if (fileId && !file) {
            setLoading(true);
            api.get(`/api/v1/documents/${fileId}/`)
                .then(response => {
                    setFile(response.data);
                })
                .catch(error => {
                    console.error("Failed to load file:", error);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [fileId]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Excel Viewer</h1>
                <p className="mt-2 text-lg text-gray-600">View and analyze Excel spreadsheets online.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                </div>
            ) : !file ? (
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload Workbook</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FileUploader
                            onUploadComplete={setFile}
                            accept=".xlsx,.xls"
                            label="Upload Excel File"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 animation-fade-in">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <span>{file.filename}</span>
                            <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                {(file.size_bytes / 1024).toFixed(1)} KB
                            </span>
                        </h2>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('view')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${mode === 'view'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                View Data
                            </button>
                            <button
                                onClick={() => setMode('reorder')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${mode === 'reorder'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Reorder Sheets
                            </button>
                            <button
                                onClick={() => setFile(null)}
                                className="text-sm text-green-600 hover:text-green-800 font-medium px-4"
                            >
                                Upload Another
                            </button>
                        </div>
                    </div>

                    {mode === 'view' ? (
                        <XLSXSheet file={file} />
                    ) : (
                        <XLSXSheetReorder file={file} />
                    )}
                </div>
            )}
        </div>
    );
}

export default function XLSXToolsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
            <XLSXToolsContent />
        </Suspense>
    );
}
