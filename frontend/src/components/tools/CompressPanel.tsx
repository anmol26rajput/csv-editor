"use client";

import { useState, useEffect } from 'react';
import { FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';
import FileUploader, { UploadedFile } from './FileUploader';
import CompressButton from './CompressButton';

interface CompressPanelProps {
    initialFile?: UploadedFile | null;
    accept?: string;
    label?: string;
    hint?: string;
}

export default function CompressPanel({
    initialFile,
    accept = '.pdf',
    label = 'Upload a PDF to compress',
    hint = 'Rebuilds the PDF without its unused objects — same pages, same text, smaller file.',
}: CompressPanelProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile || null);

    useEffect(() => {
        if (initialFile) setFile(initialFile);
    }, [initialFile]);

    if (!file) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUploader onUploadComplete={setFile} accept={accept} label={label} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-1 rounded-full bg-brand-500"></div>
                    <h3 className="text-lg font-bold text-ink-900">Compress</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                        <FileOutput className="h-3.5 w-3.5" />
                        {file.filename} · {formatBytes(file.size_bytes)}
                    </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                    Change File
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-ink-200 bg-ink-50 p-5">
                <CompressButton fileId={file.id} />
                <p className="text-sm text-ink-500">{hint}</p>
            </div>
        </div>
    );
}
