"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from '@/components/tools/FileUploader';
import CSVGrid from '@/components/tools/CSVGrid';
import { Loader2 } from 'lucide-react';

function CSVToolsContent() {
    const [file, setFile] = useState<UploadedFile | null>(null);
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
        <div className="space-y-8">
            <div className="max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight">CSV editor</h1>
                <p className="mt-2 text-ink-500">View, filter, and clean your CSV files.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
                </div>
            ) : !file ? (
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload a CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FileUploader
                            onUploadComplete={setFile}
                            accept=".csv,.xlsx"
                            label="Upload CSV or Excel"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-ink-950 flex items-center gap-2">
                            <span>{file.filename}</span>
                            <span className="font-mono text-xs font-normal px-2 py-0.5 bg-ink-100 text-ink-500 rounded-md tabular">
                                {(file.size_bytes / 1024).toFixed(1)} KB
                            </span>
                        </h2>
                        <button
                            onClick={() => setFile(null)}
                            className="text-sm text-brand-700 hover:text-brand-800 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                        >
                            Upload another
                        </button>
                    </div>

                    <CSVGrid file={file} onFileUpdate={setFile} />
                </div>
            )}
        </div>
    );
}

export default function CSVToolsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-ink-300" /></div>}>
            <CSVToolsContent />
        </Suspense>
    );
}
