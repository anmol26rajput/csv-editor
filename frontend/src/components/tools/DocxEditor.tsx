"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Replace, Plus, Trash2, Download, Type, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadedFile } from './FileUploader';
import DocxImageManager from './DocxImageManager';
import DocxPageManager from './DocxPageManager';
import { cn } from '@/lib/utils';

interface Replacement {
    old: string;
    new: string;
}

export default function DocxEditor({ file }: { file: UploadedFile }) {
    const [activeTab, setActiveTab] = useState<'text' | 'images' | 'pages'>('text');
    const [replacements, setReplacements] = useState<Replacement[]>([{ old: '', new: '' }]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<UploadedFile | null>(null);

    const addField = () => {
        setReplacements([...replacements, { old: '', new: '' }]);
    };

    const removeField = (index: number) => {
        setReplacements(replacements.filter((_, i) => i !== index));
    };

    const updateField = (index: number, field: 'old' | 'new', value: string) => {
        const newReplacements = [...replacements];
        newReplacements[index][field] = value;
        setReplacements(newReplacements);
    };

    const handleReplace = async () => {
        const replaceDict = replacements.reduce((acc, curr) => {
            if (curr.old) acc[curr.old] = curr.new;
            return acc;
        }, {} as Record<string, string>);

        if (Object.keys(replaceDict).length === 0) return;

        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/docx/replace/', {
                file_id: file.id,
                replacements: replaceDict
            });
            setResult(response.data);
        } catch (error) {
            console.error(error);
            alert("Replacement failed");
        } finally {
            setProcessing(false);
        }
    };

    if (result) {
        return (
            <div className="text-center py-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Document Updated!</h3>
                <p className="text-sm text-green-600 mb-6">Your changes have been applied successfully</p>
                <Button
                    onClick={() => window.open(result.file, '_blank')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download Edited DOCX
                </Button>
                <div className="mt-6">
                    <button
                        onClick={() => setResult(null)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium hover:underline transition-colors"
                    >
                        Make More Changes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-100 p-1 text-gray-500 shadow-inner w-full">
                <button
                    onClick={() => setActiveTab('text')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
                        activeTab === 'text'
                            ? "bg-white text-indigo-600 shadow-md"
                            : "hover:text-gray-900 hover:bg-gray-50"
                    )}
                >
                    <Type className="mr-2 h-4 w-4" /> Text
                </button>
                <button
                    onClick={() => setActiveTab('images')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
                        activeTab === 'images'
                            ? "bg-white text-indigo-600 shadow-md"
                            : "hover:text-gray-900 hover:bg-gray-50"
                    )}
                >
                    <Image className="mr-2 h-4 w-4" /> Images
                </button>
                <button
                    onClick={() => setActiveTab('pages')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
                        activeTab === 'pages'
                            ? "bg-white text-indigo-600 shadow-md"
                            : "hover:text-gray-900 hover:bg-gray-50"
                    )}
                >
                    <FileText className="mr-2 h-4 w-4" /> Pages
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'text' ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                        <h3 className="text-lg font-bold text-gray-900">Find and Replace Text</h3>
                    </div>

                    <div className="space-y-4">
                        {replacements.map((rep, idx) => (
                            <div key={idx} className="group relative">
                                <div className="flex gap-3 items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-md">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            placeholder="Find text..."
                                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 placeholder:text-gray-400"
                                            value={rep.old}
                                            onChange={(e) => updateField(idx, 'old', e.target.value)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-500 font-bold">→</span>
                                            <input
                                                placeholder="Replace with..."
                                                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 placeholder:text-gray-400"
                                                value={rep.new}
                                                onChange={(e) => updateField(idx, 'new', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {replacements.length > 1 && (
                                        <button
                                            onClick={() => removeField(idx)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                                            title="Remove this rule"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <Button
                            variant="outline"
                            onClick={addField}
                            size="sm"
                            className="border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Rule
                        </Button>
                        <Button
                            onClick={handleReplace}
                            isLoading={processing}
                            disabled={!replacements.some(r => r.old)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Replace className="mr-2 h-4 w-4" /> Replace All
                        </Button>
                    </div>
                </div>
                ) : activeTab === 'images' ? (
                    <DocxImageManager file={file} />
                ) : (
                    <DocxPageManager file={file} />
                )}
        </div>
    );
}
