"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadedFile } from './FileUploader';

interface XLSXData {
    sheet_name: string;
    columns: string[];
    data: any[];
    total_rows: number;
    page: number;
    page_size: number;
}

export default function XLSXSheet({ file }: { file: UploadedFile }) {
    const [sheets, setSheets] = useState<string[]>([]);
    const [activeSheet, setActiveSheet] = useState<string>('');
    const [data, setData] = useState<XLSXData | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    // Fetch workbook structure (sheet names)
    useEffect(() => {
        if (file) {
            api.get(`/api/v1/tools/xlsx/${file.id}/structure/`)
                .then(res => {
                    setSheets(res.data.sheets);
                    if (res.data.sheets.length > 0) setActiveSheet(res.data.sheets[0]);
                })
                .catch(err => console.error("Failed to load xlsx structure", err));
        }
    }, [file]);

    // Fetch sheet data
    const fetchSheetData = async (sheet: string, pageNum: number = 1) => {
        if (!sheet) return;
        setLoading(true);
        try {
            const response = await api.get(`/api/v1/tools/xlsx/${file.id}/read/`, {
                params: { sheet_name: sheet, page: pageNum, page_size: 20 }
            });
            setData(response.data);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to load sheet data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSheet) {
            fetchSheetData(activeSheet, 1);
        }
    }, [activeSheet]);

    return (
        <div className="space-y-4">
            {/* Sheet Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200">
                {sheets.map(sheet => (
                    <button
                        key={sheet}
                        onClick={() => setActiveSheet(sheet)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeSheet === sheet
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {sheet}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>
            ) : data ? (
                <div className="space-y-4">
                    {/* Pagination Toolbar */}
                    <div className="flex justify-end items-center gap-2 text-sm text-gray-500">
                        <span>{data.total_rows} rows</span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => fetchSheetData(activeSheet, page - 1)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <span className="flex items-center px-2">{page}</span>
                            <Button variant="outline" size="icon" disabled={data.data.length < data.page_size} onClick={() => fetchSheetData(activeSheet, page + 1)}>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    {data.columns.map((col) => (
                                        <th key={col} className="px-4 py-3 border-b border-gray-200 whitespace-nowrap min-w-[150px]">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        {data.columns.map((col) => (
                                            <td key={`${idx}-${col}`} className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate text-gray-600">
                                                {row[col]?.toString() || ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 text-gray-500">No data loaded.</div>
            )}
        </div>
    );
}
