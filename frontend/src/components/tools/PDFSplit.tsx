"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Scissors, Download, FileText, Layout, Split } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { UploadedFile } from './FileUploader';

interface PDFSplitProps {
    initialFile?: UploadedFile | null;
}

export default function PDFSplit({ initialFile }: PDFSplitProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile || null);


    useEffect(() => {
        if (initialFile) {
            setFile(initialFile);
        }
    }, [initialFile]);

    const [totalPages, setTotalPages] = useState(0);
    const [splitPage, setSplitPage] = useState<string>("1");
    const [mode, setMode] = useState<'all' | 'at_page'>('all');

    // Fetch page count when file changes
    useEffect(() => {
        if (file) {
            // Correct API URL: backend expects pages/<file_id>
            api.get(`/api/v1/tools/pdf/pages/${file.id}/`)
                .then(res => {
                    setTotalPages(res.data.total_pages);
                    // Reset split page to middle or something reasonable, or just 1
                    if (res.data.total_pages > 1) {
                        setSplitPage(String(Math.floor(res.data.total_pages / 2)));
                    }
                })
                .catch(err => console.error("Failed to fetch page info", err));
        } else {
            setTotalPages(0);
        }
    }, [file]);

    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<UploadedFile[]>([]);

    const handleUpload = (uploadedFile: UploadedFile) => {
        setFile(uploadedFile);
        setResults([]);
        setMode('all');
    };

    const handleSplit = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const payload: any = {
                file_id: file.id,
                mode: mode
            };

            if (mode === 'at_page') {
                payload.page_number = parseInt(splitPage);
            }

            const response = await api.post('/api/v1/tools/pdf/split/', payload);
            // Backend returns {id, url} — wrap it in an array for the results display
            const data = response.data;
            const resultFile: UploadedFile = {
                id: data.id,
                filename: file.filename.replace('.pdf', '_split.zip'),
                file: data.url,
                file_type: 'zip',
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
                    {!file ? (
                        <FileUploader onUploadComplete={handleUpload} accept=".pdf" label="Upload PDF to Split" />
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <FileText className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size_bytes / 1024).toFixed(1)} KB
                                            {totalPages > 0 && ` • ${totalPages} pages`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setFile(null); setResults([]); }} className="w-full mt-2">
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
                                            <div className="font-medium">Split at Page</div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border ${mode === 'at_page' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {mode === 'at_page' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                                        </div>
                                    </div>
                                </div>

                                {mode === 'at_page' && (
                                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <label htmlFor="page-num" className="block text-sm font-medium text-gray-700">Split after page:</label>
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
                                                (Creates: Pages 1-{splitPage || '?'} & Pages {(parseInt(splitPage) || 0) + 1}-{totalPages})
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full mt-4"
                                    onClick={handleSplit}
                                    isLoading={processing}
                                    disabled={mode === 'at_page' && (!splitPage || isNaN(parseInt(splitPage)) || parseInt(splitPage) < 1 || (totalPages > 0 && parseInt(splitPage) >= totalPages))}
                                >
                                    <Scissors className="mr-2 h-4 w-4" />
                                    {mode === 'all' ? 'Split All Pages' : 'Split Document'}
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
                        {results.length > 0 && <span className="text-sm font-normal text-green-600">{results.length} files created</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm min-h-[200px]">
                            {processing ? "Splitting document..." : "Resulting pages will appear here"}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {results.map((resFile, idx) => (
                                <div key={resFile.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                                    <span className="text-sm font-medium text-gray-700">
                                        {mode === 'all' ? ("Page " + (idx + 1)) : ("Part " + (idx + 1))}
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                                        const fileUrl = resFile.file.startsWith('http') ? resFile.file : `${api.defaults.baseURL}${resFile.file}`;
                                        const viewerUrl = `/tools/pdf/view?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(resFile.filename)}`;
                                        window.location.href = viewerUrl;
                                    }}>
                                        <Download className="h-4 w-4 mr-1" /> View & Download
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
