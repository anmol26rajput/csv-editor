"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Merge, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FileUploader, { FileList, UploadedFile } from './FileUploader';

interface PDFMergeProps {
    initialFiles?: UploadedFile[];
}

export default function PDFMerge({ initialFiles }: PDFMergeProps) {
    const [files, setFiles] = useState<UploadedFile[]>(initialFiles || []);

    useEffect(() => {
        if (initialFiles) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<UploadedFile | null>(null);

    const handleUpload = (file: UploadedFile) => {
        setFiles(prev => [...prev, file]);
    };

    const handleRemove = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleMerge = async () => {
        if (files.length < 2) return;
        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/pdf/merge/', {
                file_ids: files.map(f => f.id)
            });
            setResult(response.data);
        } catch (error) {
            console.error("Merge error", error);
            alert("Merge failed");
        } finally {
            setProcessing(false);
        }
    };

    if (result) {
        return (
            <Card className="max-w-xl mx-auto text-center py-10">
                <CardContent className="flex flex-col items-center gap-6">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Download className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Merge Complete!</h3>
                        <p className="text-gray-500">Your PDF is ready for download.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => { setResult(null); setFiles([]); }}>
                            Merge More
                        </Button>
                        <Button onClick={() => window.open(result.file, '_blank')}>
                            Download PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg">Add Files</CardTitle>
                </CardHeader>
                <CardContent>
                    <FileUploader onUploadComplete={handleUpload} accept=".pdf" label="Upload PDF" />
                    <div className="mt-4 text-xs text-gray-400 text-center">
                        Upload at least 2 files
                    </div>
                </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>Selected Files</span>
                        <span className="text-sm font-normal text-gray-500">{files.length} files</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto min-h-[200px]">
                        {files.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No files selected
                            </div>
                        ) : (
                            <FileList files={files} onRemove={handleRemove} />
                        )}
                    </div>

                    <div className="pt-6 mt-4 border-t border-gray-100">
                        <Button
                            className="w-full"
                            size="lg"
                            disabled={files.length < 2 || processing}
                            onClick={handleMerge}
                            isLoading={processing}
                        >
                            <Merge className="mr-2 h-4 w-4" /> Merge PDFs
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
