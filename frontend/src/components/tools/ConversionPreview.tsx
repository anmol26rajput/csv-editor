"use client";

import { useState, useEffect, useRef } from 'react';
import { resolveFileUrl } from '@/lib/api';
import { loadPdfDocument, renderPageThumbnail } from '@/lib/pdfPreview';
import { FileArchive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionPreviewProps {
    url: string;
    fileType: string;
    filename: string;
}

const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg']);
const MAX_PDF_PREVIEW_PAGES = 3;

export default function ConversionPreview({ url, fileType, filename }: ConversionPreviewProps) {
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [textContent, setTextContent] = useState('');
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [pdfTotal, setPdfTotal] = useState(0);
    const docxRef = useRef<HTMLDivElement>(null);

    const resolvedUrl = resolveFileUrl(url);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        setTextContent('');
        setPdfPages([]);

        const load = async () => {
            try {
                if (fileType === 'txt') {
                    const res = await fetch(resolvedUrl);
                    const text = await res.text();
                    if (!cancelled) setTextContent(text.slice(0, 20000));
                } else if (fileType === 'pdf') {
                    const doc = await loadPdfDocument(resolvedUrl);
                    if (cancelled) { doc.loadingTask.destroy(); return; }
                    setPdfTotal(doc.numPages);
                    const count = Math.min(doc.numPages, MAX_PDF_PREVIEW_PAGES);
                    for (let i = 1; i <= count; i++) {
                        const thumb = await renderPageThumbnail(doc, i, 480);
                        if (cancelled) break;
                        setPdfPages(prev => [...prev, thumb]);
                    }
                    doc.loadingTask.destroy();
                } else if (fileType === 'docx') {
                    const res = await fetch(resolvedUrl);
                    const blob = await res.blob();
                    if (cancelled || !docxRef.current) return;
                    const { renderAsync } = await import('docx-preview');
                    docxRef.current.innerHTML = '';
                    await renderAsync(blob, docxRef.current, undefined, {
                        inWrapper: false,
                        ignoreWidth: true,
                        ignoreHeight: true,
                    });
                }
            } catch (err) {
                console.warn('Preview failed:', err);
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (IMAGE_TYPES.has(fileType) || fileType === 'html') {
            // <img> / <iframe> handle their own loading
            setLoading(false);
        } else if (['txt', 'pdf', 'docx'].includes(fileType)) {
            load();
        } else {
            setLoading(false);
            setFailed(true);
        }

        return () => { cancelled = true; };
    }, [resolvedUrl, fileType]);

    if (IMAGE_TYPES.has(fileType)) {
        return (
            <div className="flex justify-center bg-ink-50 rounded-xl border border-ink-200 p-4 max-h-96 overflow-auto">
                <img src={resolvedUrl} alt={filename} className="max-w-full h-auto rounded-lg shadow-sm bg-white" />
            </div>
        );
    }

    if (fileType === 'html') {
        return (
            <iframe
                src={resolvedUrl}
                title={filename}
                sandbox=""
                className="w-full h-96 bg-white rounded-xl border border-ink-200"
            />
        );
    }

    if (fileType === 'docx' && !failed) {
        // Container must stay mounted while loading: renderAsync targets the ref
        return (
            <div className="relative">
                {loading && (
                    <div className="flex items-center justify-center h-48 bg-ink-50 rounded-xl border border-ink-200">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                    </div>
                )}
                <div
                    ref={docxRef}
                    className={cn(
                        "max-h-96 overflow-auto bg-white rounded-xl border border-ink-200 p-6 text-sm",
                        loading && "hidden"
                    )}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 bg-ink-50 rounded-xl border border-ink-200">
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            </div>
        );
    }

    if (fileType === 'txt' && textContent) {
        return (
            <pre className="max-h-96 overflow-auto bg-ink-50 rounded-xl border border-ink-200 p-4 text-xs text-ink-700 whitespace-pre-wrap">
                {textContent}
            </pre>
        );
    }

    if (fileType === 'pdf') {
        return (
            <div className="bg-ink-50 rounded-xl border border-ink-200 p-4 max-h-96 overflow-auto">
                <div className="flex flex-wrap justify-center gap-4">
                    {pdfPages.map((src, i) => (
                        <img key={i} src={src} alt={`Page ${i + 1}`} className="w-56 rounded-lg shadow-sm bg-white" />
                    ))}
                </div>
                {pdfTotal > MAX_PDF_PREVIEW_PAGES && (
                    <p className="mt-3 text-center text-xs text-ink-500">
                        Showing first {MAX_PDF_PREVIEW_PAGES} of {pdfTotal} pages
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-2 h-48 bg-ink-50 rounded-xl border border-ink-200 text-ink-400">
            <FileArchive className="h-8 w-8" />
            <p className="text-sm font-medium">No preview available for .{fileType} — use Download</p>
        </div>
    );
}
