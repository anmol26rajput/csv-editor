"use client";

import { useState, useEffect } from 'react';
import api, { resolveFileUrl } from '@/lib/api';
import {
    FileText, FileSpreadsheet, Presentation, FileType, FileCode,
    Image as ImageIcon, FileImage, BookOpen, Shapes, Layers,
    Download, Loader2, FileOutput, Sparkles, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import FileUploader, { UploadedFile } from './FileUploader';
import ConversionPreview from './ConversionPreview';

interface ConvertTool {
    format: string;
    label: string;
    icon: typeof FileText;
    tile: string;      // icon tile background
    card: string;      // card background tint
    available: boolean;
}

const FROM_PDF_TOOLS: ConvertTool[] = [
    { format: 'word', label: 'PDF to Word', icon: FileText, tile: 'bg-blue-500', card: 'bg-blue-50 border-blue-100 hover:border-blue-300', available: true },
    { format: 'docx', label: 'PDF to DOCX', icon: FileText, tile: 'bg-sky-500', card: 'bg-sky-50 border-sky-100 hover:border-sky-300', available: true },
    { format: 'excel', label: 'PDF to Excel', icon: FileSpreadsheet, tile: 'bg-green-500', card: 'bg-green-50 border-green-100 hover:border-green-300', available: true },
    { format: 'pptx', label: 'PDF to PPTX', icon: Presentation, tile: 'bg-red-500', card: 'bg-red-50 border-red-100 hover:border-red-300', available: true },
    { format: 'png', label: 'PDF to PNG', icon: FileImage, tile: 'bg-pink-500', card: 'bg-pink-50 border-pink-100 hover:border-pink-300', available: true },
    { format: 'jpg', label: 'PDF to JPG', icon: ImageIcon, tile: 'bg-amber-400', card: 'bg-amber-50 border-amber-100 hover:border-amber-300', available: true },
    { format: 'text', label: 'PDF to Text', icon: FileType, tile: 'bg-violet-500', card: 'bg-violet-50 border-violet-100 hover:border-violet-300', available: true },
    { format: 'html', label: 'PDF to HTML', icon: FileCode, tile: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300', available: true },
    { format: 'svg', label: 'PDF to SVG', icon: Shapes, tile: 'bg-fuchsia-500', card: 'bg-fuchsia-50 border-fuchsia-100 hover:border-fuchsia-300', available: true },
    { format: 'tiff', label: 'PDF to TIFF', icon: Layers, tile: 'bg-cyan-500', card: 'bg-cyan-50 border-cyan-100 hover:border-cyan-300', available: true },
    { format: 'webp', label: 'PDF to WebP', icon: ImageIcon, tile: 'bg-rose-500', card: 'bg-rose-50 border-rose-100 hover:border-rose-300', available: true },
    { format: 'epub', label: 'PDF to EPUB', icon: BookOpen, tile: 'bg-lime-500', card: 'bg-lime-50 border-lime-100 hover:border-lime-300', available: true },
    { format: 'image', label: 'PDF to Image', icon: FileImage, tile: 'bg-purple-500', card: 'bg-purple-50 border-purple-100 hover:border-purple-300', available: true },
    { format: 'mobi', label: 'PDF to MOBI', icon: BookOpen, tile: 'bg-indigo-400', card: 'bg-ink-50 border-ink-100', available: false },
    { format: 'azw3', label: 'PDF to AZW3', icon: BookOpen, tile: 'bg-indigo-400', card: 'bg-ink-50 border-ink-100', available: false },
    { format: 'eps', label: 'PDF to EPS', icon: Shapes, tile: 'bg-teal-400', card: 'bg-ink-50 border-ink-100', available: false },
    { format: 'dxf', label: 'PDF to DXF', icon: Shapes, tile: 'bg-orange-400', card: 'bg-ink-50 border-ink-100', available: false },
];

interface SourceTool {
    id: string;
    label: string;
    accept: string;
    icon: typeof FileText;
    tile: string;
    card: string;
}

const TO_PDF_TOOLS: SourceTool[] = [
    { id: 'word', label: 'Word to PDF', accept: '.docx,.doc,.odt,.rtf', icon: FileText, tile: 'bg-blue-500', card: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
    { id: 'excel', label: 'Excel to PDF', accept: '.xlsx,.xls,.ods,.csv', icon: FileSpreadsheet, tile: 'bg-green-500', card: 'bg-green-50 border-green-100 hover:border-green-300' },
    { id: 'ppt', label: 'PowerPoint to PDF', accept: '.pptx,.ppt,.odp', icon: Presentation, tile: 'bg-red-500', card: 'bg-red-50 border-red-100 hover:border-red-300' },
    { id: 'image', label: 'Image to PDF', accept: '.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp,.gif', icon: ImageIcon, tile: 'bg-pink-500', card: 'bg-pink-50 border-pink-100 hover:border-pink-300' },
    { id: 'html', label: 'HTML to PDF', accept: '.html,.htm', icon: FileCode, tile: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
    { id: 'text', label: 'Text to PDF', accept: '.txt,.md', icon: FileType, tile: 'bg-violet-500', card: 'bg-violet-50 border-violet-100 hover:border-violet-300' },
];

interface ConvertResult {
    id: string;
    url: string;
    filename: string;
    file_type: string;
}

interface PDFConvertProps {
    initialFile?: UploadedFile | null;
}

export default function PDFConvert({ initialFile }: PDFConvertProps) {
    const [direction, setDirection] = useState<'from' | 'to'>('from');
    const [file, setFile] = useState<UploadedFile | null>(initialFile || null);
    const [sourceTool, setSourceTool] = useState<SourceTool | null>(null);
    const [converting, setConverting] = useState<string | null>(null);
    const [result, setResult] = useState<ConvertResult | null>(null);
    const [resultLabel, setResultLabel] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialFile) {
            setFile(initialFile);
        }
    }, [initialFile]);

    const reset = () => {
        setFile(null);
        setSourceTool(null);
        setResult(null);
        setError('');
    };

    const switchDirection = (dir: 'from' | 'to') => {
        if (dir === direction) return;
        setDirection(dir);
        reset();
    };

    const handleFromUpload = (uploadedFile: UploadedFile) => {
        setFile(uploadedFile);
        setResult(null);
        setError('');
    };

    const handleConvertFrom = async (tool: ConvertTool) => {
        if (!file || converting || !tool.available) return;

        setConverting(tool.format);
        setResult(null);
        setError('');

        try {
            const response = await api.post('/api/v1/tools/pdf/convert/', {
                file_id: file.id,
                target_format: tool.format
            });
            setResult(response.data);
            setResultLabel(tool.label);
        } catch (err: any) {
            setError(err.response?.data?.error || `Failed to convert to ${tool.label.replace('PDF to ', '')}`);
        } finally {
            setConverting(null);
        }
    };

    const handleToUpload = async (uploadedFile: UploadedFile) => {
        setFile(uploadedFile);
        setResult(null);
        setError('');
        setConverting('to-pdf');

        try {
            const response = await api.post('/api/v1/tools/pdf/to-pdf/', {
                file_id: uploadedFile.id
            });
            setResult(response.data);
            setResultLabel(sourceTool?.label || 'Convert to PDF');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to convert to PDF');
        } finally {
            setConverting(null);
        }
    };

    const directionToggle = (
        <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full bg-ink-100 p-1">
                {([['from', 'Convert from PDF'], ['to', 'Convert to PDF']] as const).map(([dir, label]) => (
                    <button
                        key={dir}
                        onClick={() => switchDirection(dir)}
                        className={cn(
                            "rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200",
                            direction === dir
                                ? "bg-white text-brand-600 shadow-sm"
                                : "text-ink-500 hover:text-ink-900"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );

    const resultPanel = result && (
        <div className="space-y-4 p-5 bg-gradient-to-br from-brand-50 to-brand-50 rounded-2xl border-2 border-brand-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-brand-500 rounded-full shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-brand-800">{resultLabel} complete!</p>
                        <p className="text-sm text-brand-600">{result.filename}</p>
                    </div>
                </div>
                <Button
                    onClick={() => window.open(resolveFileUrl(result.url), '_blank')}
                    className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
            </div>
            <ConversionPreview url={result.url} fileType={result.file_type} filename={result.filename} />
        </div>
    );

    const errorPanel = error && (
        <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
            <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
    );

    // ---------- Convert TO PDF ----------
    if (direction === 'to') {
        return (
            <div className="space-y-6">
                {directionToggle}
                {errorPanel}

                {!sourceTool ? (
                    <>
                        <p className="text-center text-sm text-ink-500">Pick the type of file you want to turn into a PDF</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {TO_PDF_TOOLS.map((tool) => {
                                const Icon = tool.icon;
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => { setSourceTool(tool); setResult(null); setError(''); }}
                                        className={cn(
                                            "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                                            tool.card
                                        )}
                                    >
                                        <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", tool.tile)}>
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="text-sm font-semibold text-ink-800">{tool.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => { setSourceTool(null); setFile(null); setResult(null); setError(''); }}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" /> All file types
                            </button>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                                <FileOutput className="h-3.5 w-3.5" /> {sourceTool.label}
                            </span>
                        </div>

                        {converting === 'to-pdf' ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16">
                                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
                                <p className="text-ink-500 font-medium">Converting {file?.filename} to PDF...</p>
                            </div>
                        ) : (
                            <>
                                {resultPanel}
                                <div className="max-w-2xl mx-auto">
                                    <FileUploader
                                        onUploadComplete={handleToUpload}
                                        accept={sourceTool.accept}
                                        label={result ? 'Convert another file' : `Upload a file for ${sourceTool.label}`}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ---------- Convert FROM PDF ----------
    if (!file) {
        return (
            <div className="space-y-6">
                {directionToggle}
                <div className="max-w-2xl mx-auto">
                    <FileUploader
                        onUploadComplete={handleFromUpload}
                        accept=".pdf"
                        label="Upload PDF to Convert"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {directionToggle}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-brand-500 to-brand-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-ink-900">Convert PDF</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                        <FileOutput className="h-3.5 w-3.5" />
                        {file.filename}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="border-2 border-ink-200 text-ink-600 hover:bg-ink-50 transition-all duration-300"
                >
                    Change File
                </Button>
            </div>

            {errorPanel}
            {resultPanel}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {FROM_PDF_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isConverting = converting === tool.format;
                    return (
                        <button
                            key={tool.format}
                            onClick={() => handleConvertFrom(tool)}
                            disabled={!tool.available || converting !== null}
                            title={tool.available ? tool.label : `${tool.label} — coming soon`}
                            className={cn(
                                "relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                                tool.card,
                                tool.available
                                    ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                                    : "opacity-50 cursor-not-allowed",
                                converting !== null && !isConverting && "opacity-50",
                                isConverting && "ring-2 ring-brand-400"
                            )}
                        >
                            <span className={cn(
                                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                                tool.tile
                            )}>
                                {isConverting
                                    ? <Loader2 className="h-5 w-5 animate-spin" />
                                    : <Icon className="h-5 w-5" />}
                            </span>
                            <span className="text-sm font-semibold text-ink-800">{tool.label}</span>
                            {!tool.available && (
                                <span className="absolute top-2 right-2 rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                                    Soon
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
