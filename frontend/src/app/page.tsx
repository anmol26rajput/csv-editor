"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UploadCloud, ArrowRight, FileCode2, Table2, Sheet, FileText, FileStack, ShieldCheck, Zap, Globe, Braces } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useState, DragEvent, ChangeEvent } from 'react';
import api from '@/lib/api';
import { setPendingFile, isTextFile } from '@/lib/fileBridge';

const tools = [
    {
        href: '/tools/text',
        icon: FileCode2,
        title: 'Text & code editor',
        desc: 'Open and edit any text file — Markdown, JSON, source code, logs — right in the browser. Nothing leaves your machine.',
        meta: '40+ formats',
    },
    {
        href: '/tools/csv',
        icon: Table2,
        title: 'CSV editor',
        desc: 'Edit cells inline, filter rows, remove columns, and clean messy data.',
        meta: '.csv',
    },
    {
        href: '/tools/xlsx',
        icon: Sheet,
        title: 'Excel viewer',
        desc: 'Browse workbook sheets, inspect data, and reorder sheets.',
        meta: '.xlsx .xls',
    },
    {
        href: '/tools/docx',
        icon: FileText,
        title: 'Word editor',
        desc: 'Rich-text editing for Word documents with live preview and export.',
        meta: '.docx',
    },
    {
        href: '/tools/pdf',
        icon: FileStack,
        title: 'PDF tools',
        desc: 'Convert to and from PDF, merge documents, split pages apart, and reorder them.',
        meta: '.pdf',
    },
    {
        href: '/tools/utilities',
        icon: Braces,
        title: 'Utilities',
        desc: 'JSON viewer with graph visualization, Markdown preview, Base64 converter, image and text viewers.',
        meta: 'json · md · base64',
    },
];

export default function Home() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const acceptFile = (picked: File) => {
        setError(null);
        // Text files open instantly, fully client-side
        if (isTextFile(picked.name)) {
            setPendingFile(picked);
            router.push('/tools/text');
            return;
        }
        setFile(picked);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            acceptFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            acceptFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type = 'pdf';
        if (['csv', 'xlsx', 'docx', 'pptx'].includes(ext || '')) {
            type = ext === 'xlsx' ? 'xlsx' : ext === 'docx' ? 'docx' : ext === 'pptx' ? 'pptx' : 'csv';
        }
        formData.append('file_type', type);

        try {
            const response = await api.post('/api/v1/documents/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            let targetPath = '/tools/pdf';
            if (type === 'csv') targetPath = '/tools/csv';
            else if (type === 'xlsx') targetPath = '/tools/xlsx';
            else if (type === 'docx') targetPath = '/tools/docx';

            router.push(`${targetPath}?id=${response.data.id}`);
        } catch (err: any) {
            const msg = err.response?.data?.details || err.response?.data?.error || "We couldn't upload that file. Please try again.";
            setError(msg);
            setUploading(false);
        }
    };

    return (
        <div className="space-y-20 pb-8">
            {/* Hero — asymmetric: copy left, dropzone right */}
            <section className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center pt-8">
                <div className="space-y-6 animate-rise-in">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-700 bg-brand-50 border border-brand-100 rounded-md px-2.5 py-1">
                        Free file workspace
                    </p>
                    <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-balance">
                        Open a file.<br />
                        Edit it. <span className="text-brand-600">Done.</span>
                    </h1>
                    <p className="text-lg text-ink-600 leading-relaxed max-w-lg">
                        A fast, private workspace for text, CSV, Excel, Word, and PDF files.
                        No installs, no accounts — drop a file and start working.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500 pt-2">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" /> Text files never leave your browser</span>
                        <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-brand-600" /> Instant editing</span>
                        <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-brand-600" /> Works on any device</span>
                    </div>
                </div>

                <div
                    className={cn(
                        "relative rounded-2xl border-2 border-dashed bg-white shadow-card transition-all duration-300 animate-rise-in cursor-pointer",
                        isDragging
                            ? "border-brand-500 bg-brand-50 shadow-lift -translate-y-1"
                            : "border-ink-200 hover:border-brand-400 hover:shadow-lift hover:-translate-y-0.5"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('home-file-input')?.click()}
                >
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                        <input
                            type="file"
                            id="home-file-input"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <div className={cn(
                            "grid place-items-center h-16 w-16 rounded-2xl bg-ink-950 text-brand-400 mb-6 transition-transform duration-300",
                            isDragging ? "scale-110" : ""
                        )}>
                            <UploadCloud size={30} strokeWidth={2} />
                        </div>

                        <h2 className="text-xl font-semibold text-ink-950 mb-1.5">
                            {file ? file.name : "Drop a file here"}
                        </h2>
                        <p className="text-sm text-ink-500 mb-6">
                            {file
                                ? `${(file.size / 1024).toFixed(1)} KB — ready to process`
                                : "or click to browse. PDF, CSV, Excel, Word, and any text file."}
                        </p>

                        {error && (
                            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                                {error}
                            </p>
                        )}

                        {file ? (
                            <Button
                                size="lg"
                                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                isLoading={uploading}
                            >
                                Open in editor <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                variant="secondary"
                                onClick={(e) => { e.stopPropagation(); document.getElementById('home-file-input')?.click(); }}
                            >
                                Choose a file
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* Tools — asymmetric grid: text editor gets the wide card */}
            <section className="space-y-6">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Every tool, one place</h2>
                        <p className="text-ink-500 mt-1">Pick a tool directly, or just drop a file above and we&apos;ll route it.</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    {tools.map((tool, i) => {
                        const Icon = tool.icon;
                        return (
                            <Link
                                key={tool.href}
                                href={tool.href}
                                className={cn(
                                    "group relative flex flex-col rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:shadow-lift hover:-translate-y-1 hover:border-brand-300",
                                    i === 0
                                        ? "sm:col-span-2 lg:col-span-4 bg-ink-950 border-ink-950 text-paper hover:border-ink-950"
                                        : "lg:col-span-2"
                                )}
                            >
                                <div className={cn(
                                    "grid place-items-center h-10 w-10 rounded-xl mb-4 transition-colors",
                                    i === 0 ? "bg-brand-500/15 text-brand-400" : "bg-brand-50 text-brand-700 group-hover:bg-brand-100"
                                )}>
                                    <Icon className="h-5 w-5" strokeWidth={2} />
                                </div>
                                <h3 className={cn("font-semibold text-lg mb-1", i === 0 ? "text-paper" : "text-ink-950")}>
                                    {tool.title}
                                </h3>
                                <p className={cn("text-sm leading-relaxed flex-1", i === 0 ? "text-ink-300" : "text-ink-500")}>
                                    {tool.desc}
                                </p>
                                <div className="flex items-center justify-between mt-5">
                                    <span className={cn("font-mono text-xs", i === 0 ? "text-brand-400" : "text-ink-400")}>
                                        {tool.meta}
                                    </span>
                                    <ArrowRight className={cn(
                                        "h-4 w-4 transition-transform duration-300 group-hover:translate-x-1",
                                        i === 0 ? "text-brand-400" : "text-brand-600"
                                    )} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
