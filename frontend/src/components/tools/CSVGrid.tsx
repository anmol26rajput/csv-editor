"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Search, Filter, Download, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import SmartCleanModal from './SmartCleanModal';
import { UploadedFile } from './FileUploader';

interface CSVData {
    columns: string[];
    data: any[];
    total_rows: number;
    page: number;
    page_size: number;
}

export default function CSVGrid({ file, onFileUpdate }: { file: UploadedFile, onFileUpdate?: (newFile: UploadedFile) => void }) {
    const [data, setData] = useState<CSVData | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filterColumn, setFilterColumn] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [showCleanModal, setShowCleanModal] = useState(false);

    // Removal states
    const [removeType, setRemoveType] = useState<'row' | 'column' | 'date' | 'date_range'>('row');
    const [removeColumn, setRemoveColumn] = useState('');
    const [removeRowIndex, setRemoveRowIndex] = useState('');
    const [removeDate, setRemoveDate] = useState('');
    const [removeStartDate, setRemoveStartDate] = useState('');
    const [removeEndDate, setRemoveEndDate] = useState('');

    // ... existing fetchData ...
    const fetchData = async (pageNum: number = 1) => {
        setLoading(true);
        try {
            const response = await api.get(`/api/v1/tools/csv/${file.id}/read/`, {
                params: { page: pageNum, page_size: 20 }
            });
            setData(response.data);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to load CSV data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (file) {
            fetchData(1);
        }
    }, [file]);

    const handleFilter = async () => {
        if (!filterColumn || !filterValue) return;
        setLoading(true);
        try {
            const response = await api.post('/api/v1/tools/csv/filter/', {
                file_id: file.id,
                column: filterColumn,
                value: filterValue,
                operator: 'contains'
            });
            alert(`Filter applied! ${response.data.match_count} matches found. Loading new file...`);
            if (onFileUpdate) {
                const newFile = { ...file, id: response.data.id, filename: `filtered_${file.filename}` };
                onFileUpdate(newFile);
            }
        } catch (error) {
            console.error("Filter failed", error);
            alert("Filter failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        setLoading(true);
        try {
            const payload: any = {
                file_id: file.id,
                remove_type: removeType,
            };

            if (removeType === 'row') payload.row_index = parseInt(removeRowIndex) - 1; // UI is 1-indexed, pandas is 0-indexed
            if (removeType === 'column') payload.column = removeColumn;
            if (removeType === 'date' || removeType === 'date_range') payload.column = removeColumn;
            if (removeType === 'date') payload.date_val = removeDate;
            if (removeType === 'date_range') {
                payload.start_date = removeStartDate;
                payload.end_date = removeEndDate;
            }

            const response = await api.post('/api/v1/tools/csv/remove/', payload);
            alert(`Removal applied! ${response.data.match_count} rows remain. Loading new file...`);
            if (onFileUpdate) {
                const newFile = { ...file, id: response.data.id, filename: `removed_${file.filename}` };
                onFileUpdate(newFile);
            }
        } catch (error) {
            console.error("Removal failed", error);
            alert("Removal failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            value={filterColumn}
                            onChange={(e) => setFilterColumn(e.target.value)}
                        >
                            <option value="">Select Column</option>
                            {data.columns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder="Filter value..."
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                    />
                    <Button size="sm" onClick={handleFilter} disabled={!filterColumn || !filterValue}>
                        Apply Filter
                    </Button>

                    {onFileUpdate && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowCleanModal(true)}
                            className="bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-200"
                        >
                            Smart Clean ✨
                        </Button>
                    )}
                </div>

                {/* Remove Data Toolbar */}
                <div className="flex gap-2 items-center flex-wrap mt-2 pt-2 border-t w-full">
                    <div className="relative">
                        <Trash2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                        <select
                            className="pl-9 pr-4 py-2 border border-red-200 rounded-lg text-sm bg-red-50 focus:ring-2 focus:ring-red-500 outline-none appearance-none text-red-700"
                            value={removeType}
                            onChange={(e: any) => setRemoveType(e.target.value)}
                        >
                            <option value="row">Remove Row</option>
                            <option value="column">Remove Column</option>
                            <option value="date">Remove Date</option>
                            <option value="date_range">Remove Date Range</option>
                        </select>
                    </div>

                    {removeType === 'column' && (
                        <select
                            className="px-4 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                            value={removeColumn}
                            onChange={(e) => setRemoveColumn(e.target.value)}
                        >
                            <option value="">Select Target Column</option>
                            {data.columns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    )}

                    {removeType === 'row' && (
                        <input
                            type="number"
                            placeholder="Row # (e.g. 1)"
                            className="px-4 py-2 w-32 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                            value={removeRowIndex}
                            onChange={(e) => setRemoveRowIndex(e.target.value)}
                            min={1}
                        />
                    )}

                    {removeType === 'date' && (
                        <input
                            type="date"
                            className="px-4 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                            value={removeDate}
                            onChange={(e) => setRemoveDate(e.target.value)}
                        />
                    )}

                    {removeType === 'date_range' && (
                        <>
                            <input
                                type="date"
                                className="px-4 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={removeStartDate}
                                onChange={(e) => setRemoveStartDate(e.target.value)}
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                className="px-4 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={removeEndDate}
                                onChange={(e) => setRemoveEndDate(e.target.value)}
                            />
                        </>
                    )}

                    <Button
                        size="sm"
                        onClick={handleRemove}
                        variant="destructive"
                        disabled={
                            (removeType === 'row' && !removeRowIndex) ||
                            (removeType === 'column' && !removeColumn) ||
                            (removeType === 'date' && !removeDate) ||
                            (removeType === 'date_range' && (!removeStartDate || !removeEndDate))
                        }
                    >
                        Apply Removal
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{data.total_rows} rows</span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => fetchData(page - 1)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="flex items-center px-2">{page}</span>
                        <Button variant="outline" size="icon" disabled={data.data.length < data.page_size} onClick={() => fetchData(page + 1)}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {showCleanModal && onFileUpdate && (
                <SmartCleanModal
                    file={file}
                    onClose={() => setShowCleanModal(false)}
                    onCleanComplete={(newFile) => {
                        setShowCleanModal(false);
                        const fullFile = { ...file, ...newFile }; // Merge assuming backend returns id/url
                        onFileUpdate(fullFile);
                        alert("File Cleaned! Switching to new version.");
                    }}
                />
            )}

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
    );
}
