"use client";

import { useState, useEffect } from 'react';
import api, { resolveFileUrl } from '@/lib/api';
import { Scissors, Download, FileText, Layout, Split, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from './FileUploader';

interface PDFRemoveProps {
    initialFile?: UploadedFile | null; // Keep for compatibility if needed, though we prefer File
}

export default function PDFRemove({ initialFile }: PDFRemoveProps) {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(initialFile || null);

    useEffect(() => {
        if (initialFile) {
            setUploadedFile(initialFile);
        }
    }, [initialFile]);

    const [totalPages, setTotalPages] = useState(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);

    // Fetch page count when file changes
    useEffect(() => {
        if (uploadedFile) {
            api.get(`/api/v1/tools/pdf/pages/${uploadedFile.id}/`)
                .then(res => {
                    setTotalPages(res.data.total_pages);
                })
                .catch(err => console.error("Failed to fetch page info", err));
        } else {
            setTotalPages(0);
        }
    }, [uploadedFile]);

    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<UploadedFile[]>([]);

    const handleUpload = (file: UploadedFile) => {
        setUploadedFile(file);
        setResults([]);
        setSelectedPages([]);
    };

    const handleSplit = async () => {
        if (!uploadedFile) return;
        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/pdf/split/', {
                file_id: uploadedFile.id,
                mode: 'remove',
                selected_pages: selectedPages.join(','),
            });

            // Backend always returns a single PDF now
            const data = response.data;
            const resultFile: UploadedFile = {
                id: data.id,
                filename: uploadedFile.filename.replace('.pdf', '_removed.pdf'),
                url: data.url,
                file_type: 'pdf',
                size_bytes: 0,
            };
            setResults([resultFile]);
        } catch (error) {
            console.error("Split error", error);
            alert("Split failed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg">Select File</CardTitle>
                </CardHeader>
                <CardContent>
                    {!uploadedFile ? (
                        <FileUploader onUploadComplete={handleUpload} accept=".pdf" label="Upload PDF to Remove Pages" />
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <FileText className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-ink-900 truncate">
                                            {uploadedFile.filename}
                                        </p>
                                        <p className="text-xs text-indigo-700/70">
                                            {(uploadedFile.size_bytes / 1024).toFixed(1)} KB
                                            {totalPages > 0 && ` • ${totalPages} pages`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); setResults([]); }} className="w-full mt-2">
                                    Change File
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select pages to remove ({selectedPages.length} selected):</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-md bg-gray-50">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                            const isSelected = selectedPages.includes(pageNum);
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedPages(prev => prev.filter(p => p !== pageNum));
                                                        } else {
                                                            setSelectedPages(prev => [...prev, pageNum].sort((a, b) => a - b));
                                                        }
                                                    }}
                                                    className={`
                                                            flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium transition-all
                                                            ${isSelected
                                                            ? 'bg-red-600 text-white shadow-md scale-105'
                                                            : 'bg-white text-ink-700 border border-ink-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'}
                                                        `}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end gap-2 text-xs">
                                        <button onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1))} className="hover:underline text-red-600">Select All</button>
                                        <button onClick={() => setSelectedPages([])} className="text-gray-500 hover:underline">Clear</button>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-4 bg-red-600 hover:bg-red-700"
                                    onClick={handleSplit}
                                    isLoading={processing}
                                    disabled={
                                        selectedPages.length === 0 ||
                                        (totalPages > 0 && selectedPages.length === totalPages)
                                    }
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Selected Pages
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>Result</span>
                        {results.length > 0 && <span className="text-sm font-normal text-green-600">Document ready</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4">
                    {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm min-h-[200px]">
                            {processing ? "Splitting document..." : "Resulting pages will appear here"}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col space-y-3 min-h-[500px]">
                            {results.map((resFile) => {
                                const fileUrl = resolveFileUrl(resFile.url);

                                return (
                                    <div key={resFile.id} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden relative" style={{ height: resFile.filename.endsWith('.zip') ? 'auto' : '500px' }}>
                                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700 truncate block w-full" title={resFile.filename}>
                                                {resFile.filename}
                                            </span>
                                        </div>
                                        <div className="flex-1 bg-gray-100">
                                            <iframe
                                                id={`pdf-iframe-${resFile.id}`}
                                                src={fileUrl}
                                                className="w-full h-full border-0 absolute bottom-0 right-0 left-0"
                                                style={{ height: 'calc(100% - 57px)' }}
                                                title="PDF Preview"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
