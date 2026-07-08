"use client";

import { useState, useEffect } from 'react';
import api, { resolveFileUrl } from '@/lib/api';
import { GripVertical, Download, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import FileUploader, { UploadedFile } from './FileUploader';
import { loadPdfDocument, renderPageThumbnail } from '@/lib/pdfPreview';

interface Page {
    index: number;
    originalIndex: number;
}

interface PDFReorderProps {
    initialFile?: UploadedFile | null;
}

export default function PDFReorder({ initialFile }: PDFReorderProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile || null);
    const [pages, setPages] = useState<Page[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ id: string; url: string } | null>(null);
    const [error, setError] = useState('');
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

    useEffect(() => {
        if (initialFile) {
            setFile(initialFile);
        }
    }, [initialFile]);

    useEffect(() => {
        if (file && file.id) {
            loadPDFInfo(file);
        }
    }, [file]);

    const handleUpload = (uploadedFile: UploadedFile) => {
        setFile(uploadedFile);
        setResult(null);
        setError('');
    };

    const loadPDFInfo = async (uploadedFile: UploadedFile) => {
        setLoading(true);
        setError('');
        setThumbnails({});

        const setPageCount = (count: number) => {
            setTotalPages(count);
            setPages(Array.from({ length: count }, (_, i) => ({
                index: i,
                originalIndex: i
            })));
        };

        try {
            const doc = await loadPdfDocument(resolveFileUrl(uploadedFile.url));
            setPageCount(doc.numPages);
            setLoading(false);

            for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
                try {
                    const dataUrl = await renderPageThumbnail(doc, pageNumber);
                    setThumbnails(prev => ({ ...prev, [pageNumber - 1]: dataUrl }));
                } catch (renderError) {
                    console.warn(`Failed to render page ${pageNumber}:`, renderError);
                }
            }
            doc.loadingTask.destroy();
        } catch (pdfError) {
            console.warn('Client-side PDF preview failed, falling back to page count API:', pdfError);

            try {
                const response = await api.get(`/api/v1/tools/pdf/pages/${uploadedFile.id}/`);
                setPageCount(response.data.total_pages);
            } catch (apiError) {
                console.error('Failed to load PDF information:', apiError);
                setPageCount(0);
                setError('Failed to load PDF information');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === index) return;

        const newPages = [...pages];
        const draggedPage = newPages[draggedIndex];

        // Remove from old position
        newPages.splice(draggedIndex, 1);
        // Insert at new position
        newPages.splice(index, 0, draggedPage);

        setPages(newPages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleReset = () => {
        setPages(Array.from({ length: totalPages }, (_, i) => ({
            index: i,
            originalIndex: i
        })));
    };

    const handleReorder = async () => {
        if (!file) return;

        setProcessing(true);
        setError('');

        try {
            const pageOrder = pages.map(p => p.originalIndex);
            const response = await api.post('/api/v1/tools/pdf/reorder/', {
                file_id: file.id,
                page_order: pageOrder
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reorder pages');
        } finally {
            setProcessing(false);
        }
    };

    // Show file uploader if no file
    if (!file) {
        return (
            <div className="max-w-2xl mx-auto">
                <FileUploader
                    onUploadComplete={handleUpload}
                    accept=".pdf"
                    label="Upload PDF to Reorder Pages"
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-16 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
                <p className="text-ink-500 font-medium">Loading page information...</p>
            </div>
        );
    }

    if (result) {
        return (
            <div className="text-center py-10 bg-gradient-to-br from-brand-50 to-brand-50 rounded-2xl border-2 border-brand-200 shadow-lg">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-brand-800 mb-2">Pages Reordered!</h3>
                <p className="text-sm text-brand-600 mb-6">Your PDF has been reordered successfully</p>
                <Button
                    onClick={() => window.open(resolveFileUrl(result.url), '_blank')}
                    className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download Reordered PDF
                </Button>
                <div className="mt-6">
                    <button
                        onClick={() => { setResult(null); setFile(null); }}
                        className="text-sm text-ink-600 hover:text-ink-900 font-medium hover:underline transition-colors"
                    >
                        Reorder Another File
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-brand-500 to-brand-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-ink-900">Reorder Pages</h3>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="border-2 border-brand-200 text-brand-600 hover:bg-brand-50 hover:border-brand-300 transition-all duration-300"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Order
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="border-2 border-ink-200 text-ink-600 hover:bg-ink-50 transition-all duration-300"
                    >
                        Change File
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="bg-gradient-to-br from-brand-50 to-brand-50 p-6 rounded-2xl border-2 border-brand-200">
                <p className="text-sm text-ink-700 mb-4">
                    <strong>Drag and drop</strong> to reorder pages
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page, index) => (
                        <div
                            key={`${page.originalIndex}-${index}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`
                                relative group cursor-move transition-all duration-200
                                ${draggedIndex === index ? 'scale-105 z-10' : 'hover:scale-102'}
                            `}
                        >
                            <div className={`
                                bg-white rounded-lg border-2 overflow-hidden shadow-sm
                                ${draggedIndex === index ? 'border-brand-500 shadow-lg' : 'border-ink-200 hover:border-brand-300'}
                                transition-all duration-200
                            `}>
                                <div className="absolute top-2 left-2 z-10">
                                    <div className="bg-brand-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                                        {index + 1}
                                    </div>
                                </div>

                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white/90 p-1 rounded shadow">
                                        <GripVertical className="h-4 w-4 text-ink-600" />
                                    </div>
                                </div>

                                <div className="aspect-[8.5/11] bg-gradient-to-br from-ink-50 to-ink-100 flex items-center justify-center relative">
                                    {thumbnails[page.originalIndex] ? (
                                        <img
                                            src={thumbnails[page.originalIndex]}
                                            alt={`Page ${page.originalIndex + 1}`}
                                            draggable={false}
                                            className="w-full h-full object-contain bg-white pointer-events-none"
                                        />
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="text-4xl font-bold text-ink-300 mb-2">
                                                {page.originalIndex + 1}
                                            </div>
                                            <div className="text-xs text-ink-400">
                                                Page {page.originalIndex + 1}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-3 py-2 bg-ink-50 border-t border-ink-200">
                                    <p className="text-xs text-ink-600 text-center truncate">
                                        {page.originalIndex !== index && (
                                            <span className="text-brand-600 font-medium">
                                                Was page {page.originalIndex + 1}
                                            </span>
                                        )}
                                        {page.originalIndex === index && (
                                            <span className="text-ink-500">
                                                Original position
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-ink-200">
                <Button
                    onClick={handleReorder}
                    isLoading={processing}
                    disabled={processing || totalPages <= 1}
                    className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    {processing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Reordering...
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            Apply Reorder
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
