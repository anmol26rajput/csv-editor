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
                <div className="flex justify-between items-center p-4 border-b border-ink-100 bg-ink-50/50">
                    <h3 className="font-semibold text-ink-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-brand-500" />
                        Smart Clean
                    </h3>
                    <button onClick={onClose} className="text-ink-400 hover:text-ink-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-ink-600">
                        Select cleaning operations to apply to <strong>{file.filename}</strong>. A new file will be created.
                    </p>

                    <div className="space-y-2">
                        {operations.map((op, idx) => (
                            <div
                                key={op.type}
                                onClick={() => toggleOp(idx)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    op.selected ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500/20" : "border-ink-200 hover:border-brand-200 hover:bg-ink-50"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                    op.selected ? "border-brand-500 bg-brand-500" : "border-ink-300 bg-white"
                                )}>
                                    {op.selected && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className="text-sm font-medium text-ink-700">{op.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-ink-50 border-t border-ink-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
                    <Button
                        onClick={handleClean}
                        isLoading={processing}
                        disabled={!operations.some(op => op.selected)}
                        className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 text-white border-0"
                    >
                        <Sparkles className="mr-2 h-4 w-4" /> Run Cleaner
                    </Button>
                </div>
            </div>
        </div>
    );
}
