"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import api, { resolveFileUrl } from '@/lib/api';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfDocument, renderPageThumbnail } from '@/lib/pdfPreview';
import {
    ChevronLeft, ChevronRight, Loader2, Save, Undo2, Download, Sparkles, PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import FileUploader, { UploadedFile } from './FileUploader';

const RENDER_WIDTH = 800;

interface Span {
    id: number;
    text: string;
    bbox: number[];
    origin: number[];
    size: number;
    color: number;
    font: string;
    ocr?: boolean;
}

interface PageData {
    page: number;
    total_pages: number;
    width: number;
    height: number;
    spans: Span[];
    ocr?: boolean;
    ocr_available?: boolean;
}

interface EditPayload {
    page: number;
    bbox: number[];
    origin: number[];
    size: number;
    color: number;
    text: string;
    ocr?: boolean;
    originalText: string;
}

interface PDFTextEditorProps {
    initialFile?: UploadedFile | null;
}

export default function PDFTextEditor({ initialFile }: PDFTextEditorProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile || null);
    const [pageNum, setPageNum] = useState(0);
    const [pageData, setPageData] = useState<PageData | null>(null);
    const [pageImage, setPageImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [edits, setEdits] = useState<Record<string, EditPayload>>({});
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ id: string; url: string; filename: string } | null>(null);
    const [error, setError] = useState('');
    const docRef = useRef<PDFDocumentProxy | null>(null);

    useEffect(() => {
        if (initialFile) setFile(initialFile);
    }, [initialFile]);

    // Load the pdf.js document once per file
    useEffect(() => {
        if (!file) return;
        let cancelled = false;
        loadPdfDocument(resolveFileUrl(file.url))
            .then(doc => {
                if (cancelled) { doc.loadingTask.destroy(); return; }
                docRef.current = doc;
                setPageNum(0);
            })
            .catch(() => setError('Could not load the PDF for preview'));
        return () => {
            cancelled = true;
            docRef.current?.loadingTask.destroy();
            docRef.current = null;
        };
    }, [file]);

    // Load spans + page image whenever the page changes
    const loadPage = useCallback(async (targetPage: number) => {
        if (!file) return;
        setLoading(true);
        setError('');
        setEditingKey(null);
        try {
            const res = await api.get(`/api/v1/tools/pdf/text-spans/${file.id}/?page=${targetPage}`);
            setPageData(res.data);
            // wait for the pdf.js doc if it is still loading
            for (let i = 0; i < 50 && !docRef.current; i++) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (docRef.current) {
                setPageImage(await renderPageThumbnail(docRef.current, targetPage + 1, RENDER_WIDTH * 2));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load page');
        } finally {
            setLoading(false);
        }
    }, [file]);

    useEffect(() => {
        if (file) loadPage(pageNum);
    }, [file, pageNum, loadPage]);

    const handleUpload = (uploaded: UploadedFile) => {
        setFile(uploaded);
        setEdits({});
        setResult(null);
        setError('');
        setPageNum(0);
    };

    const spanKey = (span: Span) => `${pageNum}:${span.id}`;

    const currentText = (span: Span) => edits[spanKey(span)]?.text ?? span.text;

    const handleTextChange = (span: Span, text: string) => {
        const key = spanKey(span);
        setEdits(prev => {
            const next = { ...prev };
            if (text === span.text) {
                delete next[key];
            } else {
                next[key] = {
                    page: pageNum,
                    bbox: span.bbox,
                    origin: span.origin,
                    size: span.size,
                    color: span.color,
                    text,
                    ocr: span.ocr,
                    originalText: span.text,
                };
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!file || Object.keys(edits).length === 0) return;
        setSaving(true);
        setError('');
        try {
            const payload = Object.values(edits).map(({ originalText, ...edit }) => edit);
            const response = await api.post('/api/v1/tools/pdf/edit-text/', {
                file_id: file.id,
                edits: payload,
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save edits');
        } finally {
            setSaving(false);
        }
    };

    if (!file) {
        return (
            <div className="max-w-2xl mx-auto">
                <FileUploader onUploadComplete={handleUpload} accept=".pdf" label="Upload PDF to Edit Text" />
            </div>
        );
    }

    const editCount = Object.keys(edits).length;
    const scale = pageData ? RENDER_WIDTH / pageData.width : 1;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-brand-500 to-brand-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-ink-900">Edit PDF Text</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                        <PenLine className="h-3.5 w-3.5" /> {file.filename}
                    </span>
                    {editCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            {editCount} edit{editCount > 1 ? 's' : ''} pending
                        </span>
                    )}
                    {pageData?.ocr && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                            Scanned page — text detected with OCR
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEdits({})} disabled={editCount === 0}>
                        <Undo2 className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        disabled={saving || editCount === 0}
                        size="sm"
                        className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700"
                    >
                        <Save className="mr-2 h-4 w-4" /> Save PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setFile(null); setEdits({}); setResult(null); }}>
                        Change File
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
            )}

            {result && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-br from-brand-50 to-brand-50 rounded-2xl border-2 border-brand-200">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brand-500 rounded-full shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-brand-800">Edits saved!</p>
                            <p className="text-sm text-brand-600">{result.filename}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => window.open(resolveFileUrl(result.url), '_blank')}
                        className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700"
                    >
                        <Download className="mr-2 h-4 w-4" /> Download edited PDF
                    </Button>
                </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-ink-100 px-4 py-2">
                <p className="text-xs font-medium text-ink-500">
                    Click any text on the page to edit it in place. Clearing a text deletes it.
                </p>
                {pageData && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={pageNum === 0 || loading} onClick={() => setPageNum(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-ink-700 whitespace-nowrap">
                            Page {pageNum + 1} / {pageData.total_pages}
                        </span>
                        <Button variant="outline" size="sm" disabled={!pageData || pageNum >= pageData.total_pages - 1 || loading} onClick={() => setPageNum(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="overflow-auto rounded-xl border-2 border-ink-200 bg-ink-50 p-4">
                {loading || !pageData || !pageImage ? (
                    <div className="flex h-96 items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
                    </div>
                ) : (
                    <div
                        className="relative mx-auto bg-white shadow-md"
                        style={{ width: RENDER_WIDTH, height: pageData.height * scale }}
                    >
                        <img
                            src={pageImage}
                            alt={`Page ${pageNum + 1}`}
                            draggable={false}
                            className="absolute inset-0 h-full w-full select-none"
                        />
                        {pageData.spans.map(span => {
                            const key = spanKey(span);
                            const isEditing = editingKey === key;
                            const isEdited = key in edits;
                            const box = {
                                left: span.bbox[0] * scale,
                                top: span.bbox[1] * scale,
                                width: Math.max((span.bbox[2] - span.bbox[0]) * scale, 24),
                                height: Math.max((span.bbox[3] - span.bbox[1]) * scale, 14),
                            };
                            if (isEditing) {
                                return (
                                    <input
                                        key={key}
                                        autoFocus
                                        value={currentText(span)}
                                        onChange={(e) => handleTextChange(span, e.target.value)}
                                        onBlur={() => setEditingKey(null)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingKey(null); }}
                                        className="absolute z-10 rounded border-2 border-brand-500 bg-white px-1 font-sans text-ink-900 shadow-lg focus:outline-none"
                                        style={{ ...box, minWidth: 120, fontSize: Math.max(span.size * scale * 0.85, 11) }}
                                    />
                                );
                            }
                            return (
                                <button
                                    key={key}
                                    title={isEdited ? `Edited (was: ${span.text})` : 'Click to edit'}
                                    onClick={() => setEditingKey(key)}
                                    className={cn(
                                        "absolute rounded-sm transition-all duration-100",
                                        isEdited
                                            ? "bg-amber-200/40 ring-2 ring-amber-400"
                                            : "hover:bg-brand-100/40 hover:ring-2 hover:ring-brand-300"
                                    )}
                                    style={box}
                                >
                                    {isEdited && (
                                        <span
                                            className="absolute inset-0 flex items-center overflow-hidden whitespace-nowrap bg-white px-0.5 font-sans text-ink-900"
                                            style={{ fontSize: Math.max(span.size * scale * 0.85, 10) }}
                                        >
                                            {currentText(span)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {pageData.spans.length === 0 && (
                            <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-ink-100 px-4 py-1.5 text-xs font-medium text-ink-500">
                                {pageData.ocr_available === false
                                    ? 'No text layer found, and OCR is not available on this server'
                                    : 'No editable text found on this page'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
