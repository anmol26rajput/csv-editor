"use client";

import { useState, useEffect } from 'react';
import { FileArchive, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import api, { resolveFileUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn, formatBytes } from '@/lib/utils';

interface CompressResult {
    name: string;
    originalSize: number;
    compressedSize: number;
    save: () => void;
}

interface CompressButtonProps {
    /** Compress an uploaded document server-side. */
    fileId?: string;
    /** Compress text in the browser instead — it is never uploaded. */
    text?: string;
    filename?: string;
    className?: string;
}

export default function CompressButton({ fileId, text, filename, className }: CompressButtonProps) {
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<CompressResult | null>(null);
    const [error, setError] = useState('');

    // A result describes the content as it was when compressed. Once that
    // content changes, both the readout and the saved blob are stale — drop
    // them and offer a fresh compress instead.
    useEffect(() => {
        setResult(null);
        setError('');
    }, [text, fileId]);

    const compress = async () => {
        setBusy(true);
        setError('');
        setResult(null);
        try {
            if (fileId) {
                const response = await api.post('/api/v1/tools/compress/', { file_id: fileId });
                const { url, filename: name, original_size, compressed_size } = response.data;
                setResult({
                    name,
                    originalSize: original_size,
                    compressedSize: compressed_size,
                    save: () => window.open(resolveFileUrl(url), '_blank'),
                });
            } else {
                // gzip via the browser's own CompressionStream — nothing is uploaded.
                const name = `${filename || 'download.txt'}.gz`;
                const source = new Blob([text ?? '']);
                const gzipped = await new Response(
                    source.stream().pipeThrough(new CompressionStream('gzip'))
                ).blob();
                setResult({
                    name,
                    originalSize: source.size,
                    compressedSize: gzipped.size,
                    save: () => saveAs(gzipped, name),
                });
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || "We couldn't compress that.");
        } finally {
            setBusy(false);
        }
    };

    if (result) {
        const saved = 1 - result.compressedSize / result.originalSize;
        return (
            <div className={cn("flex flex-wrap items-center gap-2", className)}>
                <span className="font-mono text-xs text-ink-500">
                    {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
                    <span className={cn("ml-1.5 font-medium", saved > 0.005 ? "text-brand-700" : "text-ink-400")}>
                        {saved > 0.005 ? `${Math.round(saved * 100)}% smaller` : 'already as small as it gets'}
                    </span>
                </span>
                <Button size="sm" onClick={result.save}>
                    <Download className="mr-2 h-4 w-4" /> {result.name}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            <Button
                variant="secondary"
                size="sm"
                onClick={compress}
                isLoading={busy}
                disabled={!fileId && !text}
            >
                <FileArchive className="mr-2 h-4 w-4" /> Compress
            </Button>
            {error && <span role="alert" className="text-xs font-medium text-red-600">{error}</span>}
        </div>
    );
}
