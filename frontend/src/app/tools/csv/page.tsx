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
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">CSV Editor</h1>
                <p className="mt-2 text-lg text-gray-600">View, Filter, and Clean your CSV files.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                </div>
            ) : !file ? (
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload CSV</CardTitle>
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
                <div className="space-y-4 animation-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <span>{file.filename}</span>
                            <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                {(file.size_bytes / 1024).toFixed(1)} KB
                            </span>
                        </h2>
                        <button
                            onClick={() => setFile(null)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            Upload Another
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
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
            <CSVToolsContent />
        </Suspense>
    );
}
