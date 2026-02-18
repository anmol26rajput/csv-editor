"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from '@/components/tools/FileUploader';
import DocxPreview from '@/components/tools/DocxPreview';
import DocxEditor from '@/components/tools/DocxEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'; // Manual tabs for now
import { cn } from '@/lib/utils';
import { Eye, Edit3, Loader2 } from 'lucide-react';

function DocxToolsContent() {
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
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
        <div className="space-y-10 max-w-7xl mx-auto px-4">
            <div className="text-center space-y-3 animate-fade-in">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-5xl">
                    Word Editor
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                    Preview and Edit DOCX files online with powerful tools.
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-32 space-y-4">
                    <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
                    <p className="text-gray-500 font-medium">Loading your document...</p>
                </div>
            ) : !file ? (
                <Card className="max-w-2xl mx-auto border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all duration-300 hover:shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl font-bold text-gray-900">Upload Document</CardTitle>
                        <p className="text-sm text-gray-500 mt-2">Upload a Word document to get started</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <FileUploader
                            onUploadComplete={setFile}
                            accept=".docx"
                            label="Upload Word Document"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-white to-gray-50 p-6 rounded-2xl shadow-md border border-gray-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                            <h2 className="text-xl font-bold text-gray-900">{file.filename}</h2>
                            <span className="text-xs font-medium px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full">
                                {(file.size_bytes / 1024).toFixed(1)} KB
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-100 p-1 text-gray-500 shadow-inner">
                                <button
                                    onClick={() => setMode('preview')}
                                    className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300",
                                        mode === 'preview'
                                            ? "bg-white text-indigo-600 shadow-md"
                                            : "hover:text-gray-900 hover:bg-gray-50"
                                    )}
                                >
                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                </button>
                                <button
                                    onClick={() => setMode('edit')}
                                    className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300",
                                        mode === 'edit'
                                            ? "bg-white text-indigo-600 shadow-md"
                                            : "hover:text-gray-900 hover:bg-gray-50"
                                    )}
                                >
                                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                                </button>
                            </div>

                            <button
                                onClick={() => setFile(null)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all duration-300"
                            >
                                Change File
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* If in edit mode, show sidebar */}
                        {mode === 'edit' && (
                            <div className="lg:col-span-1 transition-all duration-500 animate-slide-in-left">
                                <Card className="sticky top-4 border-2 border-indigo-100 shadow-lg">
                                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                                        <CardTitle className="text-lg font-bold text-indigo-900">Editor Tools</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <DocxEditor file={file} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className={cn(
                            "transition-all duration-500",
                            mode === 'edit' ? "lg:col-span-2" : "lg:col-span-3"
                        )}>
                            <DocxPreview file={file} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DocxToolsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
            <DocxToolsContent />
        </Suspense>
    );
}
