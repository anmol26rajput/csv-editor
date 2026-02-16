"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Scissors, Download, FileText } from 'lucide-react';
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

    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<UploadedFile[]>([]);

    const handleUpload = (uploadedFile: UploadedFile) => {
        setFile(uploadedFile);
        setResults([]);
    };

    const handleSplit = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/pdf/split/', {
                file_id: file.id
            });
            setResults(response.data);
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
                        <div className="p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    <FileText className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                                    <p className="text-xs text-gray-500">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleSplit}
                                    isLoading={processing}
                                >
                                    <Scissors className="mr-2 h-4 w-4" /> Split All Pages
                                </Button>
                                <Button variant="outline" onClick={() => { setFile(null); setResults([]); }}>
                                    Change
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>Extracted Pages</span>
                        {results.length > 0 && <span className="text-sm font-normal text-green-600">{results.length} pages created</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm min-h-[200px]">
                            {processing ? "Splitting document..." : "Resulting pages will appear here"}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {results.map((resFile, idx) => (
                                <div key={resFile.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                                    <span className="text-sm font-medium text-gray-700">Page {idx + 1}</span>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => window.open(resFile.file, '_blank')}>
                                        <Download className="h-4 w-4 mr-1" /> Save
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
