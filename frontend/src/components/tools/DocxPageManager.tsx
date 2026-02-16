"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GripVertical, Download, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadedFile } from './FileUploader';

interface Page {
    index: number;
    originalIndex: number;
}

export default function DocxPageManager({ file }: { file: UploadedFile }) {
    const [pages, setPages] = useState<Page[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<{ id: string; url: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (file) {
            loadPageInfo();
        }
    }, [file]);

    const loadPageInfo = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/api/v1/tools/docx/pages/${file.id}/`);
            const pageData = response.data;

            setTotalPages(pageData.total_pages);

            const initialPages: Page[] = pageData.pages.map((page: any) => ({
                index: page.index,
                originalIndex: page.index
            }));
            setPages(initialPages);
        } catch (err) {
            console.error('Failed to load page information:', err);
            setError('Failed to load page information');
        } finally {
            setLoading(false);
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
        if (file) {
            loadPageInfo();
        }
    };

    const handleReorder = async () => {
        if (!file) return;

        setProcessing(true);
        setError('');

        try {
            const pageOrder = pages.map(p => p.originalIndex);
            const response = await api.post('/api/v1/tools/docx/reorder/', {
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

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-16 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-gray-500 font-medium">Loading page information...</p>
            </div>
        );
    }

    if (result) {
        return (
            <div className="text-center py-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-lg">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-2">Pages Reordered!</h3>
                <p className="text-sm text-indigo-600 mb-6">Your pages have been reordered successfully</p>
                <Button
                    onClick={() => window.open(result.url, '_blank')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download Reordered Document
                </Button>
                <div className="mt-6">
                    <button
                        onClick={() => setResult(null)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium hover:underline transition-colors"
                    >
                        Reorder Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">Reorder Pages</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300"
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Order
                </Button>
            </div>

            {error && (
                <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-200">
                <p className="text-sm text-gray-700 mb-4">
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
                            {/* Page Preview Card */}
                            <div className={`
                                bg-white rounded-lg border-2 overflow-hidden shadow-sm
                                ${draggedIndex === index ? 'border-indigo-500 shadow-lg' : 'border-gray-200 hover:border-indigo-300'}
                                transition-all duration-200
                            `}>
                                {/* Page Number Badge */}
                                <div className="absolute top-2 left-2 z-10">
                                    <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Drag Handle */}
                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white/90 p-1 rounded shadow">
                                        <GripVertical className="h-4 w-4 text-gray-600" />
                                    </div>
                                </div>

                                {/* Page Preview */}
                                <div className="aspect-[8.5/11] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
                                    <div className="text-center p-4">
                                        <div className="text-4xl font-bold text-gray-300 mb-2">
                                            {index + 1}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                </div>

                                {/* Page Info Footer */}
                                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                                    <p className="text-xs text-gray-600 text-center truncate">
                                        {page.originalIndex !== index && (
                                            <span className="text-indigo-600 font-medium">
                                                Was page {page.originalIndex + 1}
                                            </span>
                                        )}
                                        {page.originalIndex === index && (
                                            <span className="text-gray-500">
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

            <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                    onClick={handleReorder}
                    isLoading={processing}
                    disabled={processing || totalPages <= 1}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
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
