"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Scissors, Download, FileText, Layout, Split, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from './FileUploader';

interface PDFSplitProps {
    initialFile?: UploadedFile | null; // Keep for compatibility if needed, though we prefer File
}

export default function PDFSplit({ initialFile }: PDFSplitProps) {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(initialFile || null);
    const [rawFile, setRawFile] = useState<File | null>(null);

    useEffect(() => {
        if (initialFile) {
            setUploadedFile(initialFile);
        }
    }, [initialFile]);

    const [totalPages, setTotalPages] = useState(0);
    const [splitPage, setSplitPage] = useState<string>("1");
    const [mode, setMode] = useState<'all' | 'at_page' | 'extract'>('all');
    const [selectedPages, setSelectedPages] = useState<number[]>([]);

    // Fetch page count when file changes
    useEffect(() => {
        if (uploadedFile) {
            api.get(`/api/v1/tools/pdf/pages/${uploadedFile.id}/`)
                .then(res => {
                    setTotalPages(res.data.total_pages);
                    if (res.data.total_pages > 1) {
                        setSplitPage(String(Math.floor(res.data.total_pages / 2)));
                    }
                })
                .catch(err => console.error("Failed to fetch page info", err));
        } else if (rawFile) {
            // Read local file page count using pdf.js
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    setTotalPages(pdf.numPages);
                    if (pdf.numPages > 1) {
                        setSplitPage(String(Math.floor(pdf.numPages / 2)));
                    }
                } catch (err) {
                    console.error("Failed to read local PDF", err);
                    setTotalPages(0);
                }
            };
            reader.readAsArrayBuffer(rawFile);
        } else {
            setTotalPages(0);
        }
    }, [uploadedFile, rawFile]);

    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<UploadedFile[]>([]);

    const handleFileSelect = (file: File) => {
        setRawFile(file);
        setUploadedFile(null);
        setResults([]);
        setMode('all');
        setSelectedPages([]);
    };

    const handleSplit = async () => {
        if (!uploadedFile && !rawFile) return;
        setProcessing(true);
        try {
            const formData = new FormData();

            if (rawFile) {
                formData.append('file', rawFile);
            } else if (uploadedFile) {
                formData.append('file_id', uploadedFile.id);
            }

            formData.append('mode', mode);

            if (mode === 'at_page') {
                formData.append('mode', 'extract');
                formData.append('selected_pages', String(splitPage));
            } else if (mode === 'extract') {
                formData.append('mode', mode);
                formData.append('selected_pages', selectedPages.join(','));
            }

            const response = await api.post('/api/v1/tools/pdf/split/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Backend always returns a single PDF now
            const data = response.data;
            let resultFilenameSuffix = '_extracted.pdf';
            if (mode === 'all') resultFilenameSuffix = '_split_all.zip';
            const originalFilename = rawFile ? rawFile.name : (uploadedFile ? uploadedFile.filename : 'document.pdf');

            const resultFile: UploadedFile = {
                id: data.id,
                filename: originalFilename.replace('.pdf', resultFilenameSuffix),
                file: data.url,
                file_type: mode === 'all' ? 'zip' : 'pdf',
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
                    {!uploadedFile && !rawFile ? (
                        <FileUploader onFileSelect={handleFileSelect} accept=".pdf" label="Upload PDF to Split" />
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <FileText className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-gray-900 truncate">
                                            {rawFile ? rawFile.name : uploadedFile?.filename}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {rawFile ? (rawFile.size / 1024).toFixed(1) : (uploadedFile ? (uploadedFile.size_bytes / 1024).toFixed(1) : 0)} KB
                                            {totalPages > 0 && totalPages !== 100 && ` • ${totalPages} pages`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); setRawFile(null); setResults([]); }} className="w-full mt-2">
                                    Change File
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <label className="text-base font-semibold block">Split Method</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Handle 'all' mode */}
                                    <div
                                        className={`flex items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-colors ${mode === 'all' ? 'border-primary bg-accent/10 border-indigo-600 bg-indigo-50' : 'border-muted bg-popover hover:bg-gray-50'}`}
                                        onClick={() => setMode('all')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Layout className={`h-4 w-4 ${mode === 'all' ? 'text-indigo-600' : 'text-gray-500'}`} />
                                            <div className="font-medium">Split All Pages</div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border ${mode === 'all' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {mode === 'all' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                                        </div>
                                    </div>

                                    {/* Handle 'at_page' mode */}
                                    <div
                                        className={`flex items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-colors ${mode === 'at_page' ? 'border-primary bg-accent/10 border-indigo-600 bg-indigo-50' : 'border-muted bg-popover hover:bg-gray-50'}`}
                                        onClick={() => setMode('at_page')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Split className={`h-4 w-4 ${mode === 'at_page' ? 'text-indigo-600' : 'text-gray-500'}`} />
                                            <div className="font-medium">Extract Single Page</div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border ${mode === 'at_page' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {mode === 'at_page' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                                        </div>
                                    </div>

                                    <div
                                        className={`flex items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-colors ${mode === 'extract' ? 'border-primary bg-accent/10 border-indigo-600 bg-indigo-50' : 'border-muted bg-popover hover:bg-gray-50'}`}
                                        onClick={() => setMode('extract')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText className={`h-4 w-4 ${mode === 'extract' ? 'text-indigo-600' : 'text-gray-500'}`} />
                                            <div className="font-medium">Extract Pages</div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border ${mode === 'extract' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {mode === 'extract' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                                        </div>
                                    </div>
                                </div>

                                {mode === 'at_page' && (
                                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <label htmlFor="page-num" className="block text-sm font-medium text-gray-700">Page number to extract:</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="page-num"
                                                type="number"
                                                min={1}
                                                max={totalPages > 1 ? totalPages - 1 : 1}
                                                value={splitPage}
                                                onChange={(e) => setSplitPage(e.target.value)}
                                                onBlur={() => {
                                                    const num = parseInt(splitPage);
                                                    if (!splitPage || isNaN(num) || num < 1) {
                                                        setSplitPage("1");
                                                    } else if (totalPages > 0 && num >= totalPages) {
                                                        setSplitPage(String(totalPages - 1));
                                                    } else {
                                                        setSplitPage(String(num));
                                                    }
                                                }}
                                                className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="text-sm text-gray-500">
                                                (Extracts only page {splitPage})
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {mode === 'extract' && (
                                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select pages to extract ({selectedPages.length} selected):</label>
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
                                                                ? 'bg-indigo-600 text-white shadow-md scale-105'
                                                                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}
                                                        `}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-end gap-2 text-xs">
                                            <button onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1))} className="text-indigo-600 hover:underline">Select All</button>
                                            <button onClick={() => setSelectedPages([])} className="text-gray-500 hover:underline">Clear</button>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full mt-4"
                                    onClick={handleSplit}
                                    isLoading={processing}
                                    disabled={
                                        (mode === 'at_page' && (!splitPage || isNaN(parseInt(splitPage)) || parseInt(splitPage) < 1 || (totalPages > 0 && parseInt(splitPage) >= totalPages))) ||
                                        (mode === 'extract' && selectedPages.length === 0)
                                    }
                                >
                                    <Scissors className="mr-2 h-4 w-4" />
                                    {mode === 'all' ? 'Split All Pages' : mode === 'extract' ? 'Extract Selected Pages' : 'Extract Page'}
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
                            {results.map((resFile, idx) => {
                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://csv-editorbackend.onrender.com/api/v1';
                                const backendUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
                                const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
                                const fileUrl = resFile.file.startsWith('http') ? resFile.file : `${baseUrl}${resFile.file}`;

                                return (
                                    <div key={resFile.id} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden relative" style={{ height: resFile.filename.endsWith('.zip') ? 'auto' : '500px' }}>
                                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700 truncate block w-full" title={resFile.filename}>
                                                {resFile.filename}
                                            </span>
                                        </div>
                                        {resFile.filename.endsWith('.zip') ? (
                                            <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                                    <Layout className="h-10 w-10 text-indigo-600" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">ZIP Archive Ready</h3>
                                                <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
                                                    Your PDF has been successfully split into individual pages and packaged into a ZIP archive.
                                                </p>
                                                <Button onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = fileUrl;
                                                    link.download = resFile.filename;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}>
                                                    Download ZIP
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 bg-gray-100">
                                                <iframe
                                                    id={`pdf-iframe-${resFile.id}`}
                                                    src={fileUrl}
                                                    className="w-full h-full border-0 absolute bottom-0 right-0 left-0"
                                                    style={{ height: 'calc(100% - 57px)' }}
                                                    title="PDF Preview"
                                                />
                                            </div>
                                        )}
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
