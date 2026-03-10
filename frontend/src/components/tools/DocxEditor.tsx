"use client";

import { useState, useEffect } from 'react';
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

export default function DocxEditor({ file, onUpdate }: { file: UploadedFile, onUpdate?: (newFile: UploadedFile) => void }) {
    const [activeTab, setActiveTab] = useState<'text' | 'images' | 'pages'>('text');
    const [replacements, setReplacements] = useState<Replacement[]>([{ old: '', new: '' }]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<UploadedFile | null>(null);

    // Paragraph editing state
    const [textMode, setTextMode] = useState<'find_replace' | 'edit_paragraphs'>('find_replace');
    const [paragraphs, setParagraphs] = useState<{ index: number; text: string }[]>([]);
    const [loadingParagraphs, setLoadingParagraphs] = useState(false);
    const [paragraphUpdates, setParagraphUpdates] = useState<Record<number, string>>({});

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

    const fetchParagraphs = async () => {
        if (activeTab === 'text' && textMode === 'edit_paragraphs') {
            setLoadingParagraphs(true);
            try {
                const response = await api.get(`/api/v1/tools/docx/${file.id}/paragraphs/`);
                setParagraphs(response.data.paragraphs || []);
                setParagraphUpdates({}); // Reset pending changes on (re)load
            } catch (err) {
                console.error("Failed to fetch paragraphs", err);
                alert("Failed to load document text.");
            } finally {
                setLoadingParagraphs(false);
            }
        }
    };

    useEffect(() => {
        fetchParagraphs();
    }, [activeTab, textMode, file.id]);

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
            if (onUpdate) {
                onUpdate(response.data);
            } else {
                setResult(response.data);
            }
        } catch (error) {
            console.error(error);
            alert("Replacement failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateParagraphs = async () => {
        if (Object.keys(paragraphUpdates).length === 0) return;

        setProcessing(true);
        try {
            const response = await api.post('/api/v1/tools/docx/paragraphs/update/', {
                file_id: file.id,
                updates: paragraphUpdates
            });
            if (onUpdate) {
                onUpdate(response.data);
            } else {
                setResult(response.data);
            }
            setParagraphUpdates({}); // clear out applied changes
        } catch (error) {
            console.error(error);
            alert("Paragraph update failed");
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
                    onClick={() => window.open(result.url, '_blank')}
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
            <div className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f4f5f7] p-1 w-full border border-gray-100">
                <button
                    onClick={() => setActiveTab('text')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200",
                        activeTab === 'text'
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                >
                    <Type className="mr-2 h-4 w-4" /> Text
                </button>
                <button
                    onClick={() => setActiveTab('images')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200",
                        activeTab === 'images'
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                >
                    <Image className="mr-2 h-4 w-4" /> Images
                </button>
                <button
                    onClick={() => setActiveTab('pages')}
                    className={cn(
                        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200",
                        activeTab === 'pages'
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                >
                    <FileText className="mr-2 h-4 w-4" /> Pages
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'text' ? (
                <div className="space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex bg-[#f8f9fa] p-1 rounded-xl border border-gray-100 w-full max-w-sm">
                            <button
                                onClick={() => setTextMode('find_replace')}
                                className={cn(
                                    "flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                    textMode === 'find_replace'
                                        ? "bg-white text-indigo-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Find & Replace
                            </button>
                            <button
                                onClick={() => setTextMode('edit_paragraphs')}
                                className={cn(
                                    "flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                    textMode === 'edit_paragraphs'
                                        ? "bg-white text-indigo-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Edit Paragraphs
                            </button>
                        </div>
                    </div>

                    {textMode === 'find_replace' ? (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                                <h3 className="text-[17px] font-bold text-slate-900">Find and Replace Text</h3>
                            </div>

                            <div className="space-y-4">
                                {replacements.map((rep, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="bg-white border-2 border-gray-100 rounded-xl p-5 shadow-sm transition-all hover:border-gray-200">
                                            <div className="space-y-3">
                                                <input
                                                    placeholder="Find text..."
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all outline-none placeholder:text-gray-400 placeholder:font-normal"
                                                    value={rep.old}
                                                    onChange={(e) => updateField(idx, 'old', e.target.value)}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <span className="text-indigo-600 font-bold ml-1 text-lg flex-shrink-0">→</span>
                                                    <input
                                                        placeholder="Replace with..."
                                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all outline-none placeholder:text-gray-400 placeholder:font-normal"
                                                        value={rep.new}
                                                        onChange={(e) => updateField(idx, 'new', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {replacements.length > 1 && (
                                                <button
                                                    onClick={() => removeField(idx)}
                                                    className="absolute -right-2 -top-2 p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove this rule"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr className="my-6 border-gray-100" />

                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    onClick={addField}
                                    size="sm"
                                    className="border border-indigo-500 text-indigo-600 bg-white hover:bg-indigo-50 font-semibold px-4 py-2 rounded-lg transition-all"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" /> Add Rule
                                </Button>
                                <Button
                                    onClick={handleReplace}
                                    isLoading={processing}
                                    disabled={!replacements.some(r => r.old)}
                                    className="bg-[#c2a3ff] hover:bg-[#b08bfc] text-white font-bold px-6 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0"
                                >
                                    <Replace className="mr-2 h-4 w-4" /> Replace All
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-gray-900">Edit Paragraphs directly</h3>
                            </div>

                            {loadingParagraphs ? (
                                <div className="py-12 text-center text-gray-500">
                                    <div className="animate-spin h-6 w-6 border-b-2 border-indigo-500 rounded-full mx-auto mb-3"></div>
                                    Loading document text...
                                </div>
                            ) : paragraphs.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    No editable text found in this document.
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 pb-10">
                                    {paragraphs.map((p) => (
                                        <div key={p.index} className="group relative">
                                            <div className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-indigo-200 transition-all duration-200 shadow-sm hover:shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Paragraph block</span>
                                                    {paragraphUpdates[p.index] !== undefined && paragraphUpdates[p.index] !== p.text && (
                                                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Edited</span>
                                                    )}
                                                </div>
                                                <textarea
                                                    className="w-full px-3 py-2 border-0 bg-gray-50/50 hover:bg-gray-50 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200 resize-y min-h-[4rem]"
                                                    value={paragraphUpdates[p.index] !== undefined ? paragraphUpdates[p.index] : p.text}
                                                    onChange={(e) => setParagraphUpdates({ ...paragraphUpdates, [p.index]: e.target.value })}
                                                    placeholder="Empty paragraph"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="sticky bottom-0 mt-4 pt-4 border-t border-gray-100 bg-white/90 backdrop-blur-sm shadow-[0_-10px_15px_-10px_rgba(0,0,0,0.05)] flex justify-end">
                                        <Button
                                            onClick={handleUpdateParagraphs}
                                            isLoading={processing}
                                            disabled={Object.keys(paragraphUpdates).length === 0}
                                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md font-medium"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : activeTab === 'images' ? (
                <DocxImageManager file={file} onUpdate={onUpdate} />
            ) : (
                <DocxPageManager file={file} />
            )}
        </div>
    );
}
