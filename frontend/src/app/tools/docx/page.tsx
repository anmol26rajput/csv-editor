"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from '@/components/tools/FileUploader';
import dynamic from 'next/dynamic';
const DocxRichEditor = dynamic(() => import('@/components/tools/DocxRichEditor'), { ssr: false });
import { Loader2 } from 'lucide-react';

function DocxToolsContent() {
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
                <h1 className="text-3xl font-bold tracking-tight">Word editor</h1>
                <p className="mt-2 text-ink-500">Preview and edit DOCX files online.</p>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-28 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
                    <p className="text-ink-500 font-medium">Loading your document…</p>
                </div>
            ) : !file ? (
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload a document</CardTitle>
                        <p className="text-sm text-ink-500">Upload a Word document to get started.</p>
                    </CardHeader>
                    <CardContent>
                        <FileUploader
                            onUploadComplete={setFile}
                            accept=".docx"
                            label="Upload Word Document"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl shadow-card border border-ink-200/70">
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
                            Change file
                        </button>
                    </div>

                    <div className="w-full">
                        <DocxRichEditor file={file} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DocxToolsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-ink-300" /></div>}>
            <DocxToolsContent />
        </Suspense>
    );
}
