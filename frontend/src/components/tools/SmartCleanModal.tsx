"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { UploadedFile } from './FileUploader';

interface CleanOperation {
    type: 'deduplicate' | 'fillna' | 'drop_missing' | 'standardize_header';
    label: string;
    params?: any;
    selected: boolean;
}

export default function SmartCleanModal({ file, onCleanComplete, onClose }: { file: UploadedFile, onCleanComplete: (newFile: UploadedFile) => void, onClose: () => void }) {
    const [operations, setOperations] = useState<CleanOperation[]>([
        { type: 'deduplicate', label: 'Remove Duplicate Rows', selected: true },
        { type: 'drop_missing', label: 'Remove Rows with Missing Values', selected: false, params: { how: 'any' } },
        { type: 'fillna', label: 'Fill Missing Values with Blank', selected: false, params: { value: '' } },
        { type: 'standardize_header', label: 'Standardize Headers (lowercase_snake_case)', selected: false },
    ]);
    const [processing, setProcessing] = useState(false);

    const toggleOp = (index: number) => {
        const newOps = [...operations];
        newOps[index].selected = !newOps[index].selected;
        setOperations(newOps);
    };

    const handleClean = async () => {
        const selectedOps = operations.filter(op => op.selected).map(op => ({
            type: op.type,
            params: op.params || {}
        }));

        if (selectedOps.length === 0) return;

        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/clean/process/', {
                file_id: file.id,
                operations: selectedOps
            });
            onCleanComplete(response.data); // backend returns { id, file } similar to UploadedFile but partial
        } catch (error) {
            console.error("Cleaning failed", error);
            alert("Cleaning failed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Smart Clean
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Select cleaning operations to apply to <strong>{file.filename}</strong>. A new file will be created.
                    </p>

                    <div className="space-y-2">
                        {operations.map((op, idx) => (
                            <div
                                key={op.type}
                                onClick={() => toggleOp(idx)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    op.selected ? "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/20" : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                    op.selected ? "border-purple-500 bg-purple-500" : "border-gray-300 bg-white"
                                )}>
                                    {op.selected && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{op.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
                    <Button
                        onClick={handleClean}
                        isLoading={processing}
                        disabled={!operations.some(op => op.selected)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                    >
                        <Sparkles className="mr-2 h-4 w-4" /> Run Cleaner
                    </Button>
                </div>
            </div>
        </div>
    );
}
