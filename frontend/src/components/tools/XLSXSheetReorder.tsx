"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GripVertical, Download, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadedFile } from './FileUploader';

interface Sheet {
    index: number;
    originalIndex: number;
    name: string;
    rows: number;
    columns: number;
}

export default function XLSXSheetReorder({ file }: { file: UploadedFile }) {
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [totalSheets, setTotalSheets] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<{ id: string; url: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (file) {
            loadSheetInfo();
        }
    }, [file]);

    const loadSheetInfo = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/api/v1/tools/xlsx/${file.id}/sheets/`);
            const sheetData = response.data;

            setTotalSheets(sheetData.total_sheets);

            const initialSheets: Sheet[] = sheetData.sheets.map((sheet: any) => ({
                index: sheet.index,
                originalIndex: sheet.index,
                name: sheet.name,
                rows: sheet.rows,
                columns: sheet.columns
            }));
            setSheets(initialSheets);
        } catch (err) {
            console.error('Failed to load sheet information:', err);
            setError('Failed to load sheet information');
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

        const newSheets = [...sheets];
        const draggedSheet = newSheets[draggedIndex];

        // Remove from old position
        newSheets.splice(draggedIndex, 1);
        // Insert at new position
        newSheets.splice(index, 0, draggedSheet);

        setSheets(newSheets);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleReset = () => {
        if (file) {
            loadSheetInfo();
        }
    };

    const handleReorder = async () => {
        if (!file) return;

        setProcessing(true);
        setError('');

        try {
            const sheetOrder = sheets.map(s => s.originalIndex);
            const response = await api.post('/api/v1/tools/xlsx/reorder/', {
                file_id: file.id,
                sheet_order: sheetOrder
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reorder sheets');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-16 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-green-500" />
                <p className="text-gray-500 font-medium">Loading sheet information...</p>
            </div>
        );
    }

    if (result) {
        return (
            <div className="text-center py-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Sheets Reordered!</h3>
                <p className="text-sm text-green-600 mb-6">Your sheets have been reordered successfully</p>
                <Button
                    onClick={() => window.open(result.url, '_blank')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download Reordered Workbook
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
                    <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">Reorder Sheets</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="border-2 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-all duration-300"
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

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                <p className="text-sm text-gray-700 mb-4">
                    <strong>Drag and drop</strong> the sheets below to reorder them
                </p>

                <div className="space-y-3">
                    {sheets.map((sheet, index) => (
                        <div
                            key={`${sheet.originalIndex}-${index}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`
                                flex items-center gap-4 p-4 bg-white rounded-xl border-2 
                                ${draggedIndex === index ? 'border-green-500 shadow-lg scale-105' : 'border-gray-200'}
                                hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-move
                            `}
                        >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded border-2 border-green-200 flex items-center justify-center">
                                        <span className="text-xs font-bold text-green-600">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{sheet.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {sheet.rows} rows × {sheet.columns} columns
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Originally position {sheet.originalIndex + 1}
                                        </p>
                                    </div>
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
                    disabled={processing || totalSheets <= 1}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
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
