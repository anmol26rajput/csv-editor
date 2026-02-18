"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileType, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useState, DragEvent, ChangeEvent } from 'react';
import api from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type = 'pdf'; // default
        if (['csv', 'xlsx', 'docx', 'pptx'].includes(ext || '')) {
            type = ext === 'xlsx' ? 'xlsx' : ext === 'docx' ? 'docx' : ext === 'pptx' ? 'pptx' : 'csv';
        }
        formData.append('file_type', type);

        try {
            const response = await api.post('/api/v1/documents/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('Upload success:', response.data);

            // Redirect to appropriate tool
            let targetPath = '/tools/pdf';
            if (type === 'csv') targetPath = '/tools/csv';
            else if (type === 'xlsx') targetPath = '/tools/xlsx';
            else if (type === 'docx') targetPath = '/tools/docx';

            router.push(`${targetPath}?id=${response.data.id}`);

        } catch (error: any) {
            console.error('Upload failed:', error);
            const msg = error.response?.data?.details || error.response?.data?.error || "Upload failed. Check console.";
            alert(`Upload Error: ${msg}`);
            setUploading(false); // Only stop uploading state on error, keep it true on success while redirecting
        }
        // distinct from finally block because we want to keep loading state during redirect
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 px-4">
            <div className="text-center space-y-6 max-w-3xl animate-fade-in">
                <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent sm:text-7xl animate-gradient">
                    Edit Any File, Anywhere.
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    The all-in-one workspace for PDF, CSV, Excel, and Word documents.
                    <span className="block mt-2 text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text font-semibold">
                        Secure, fast, and free.
                    </span>
                </p>
            </div>

            <Card className={cn(
                "w-full max-w-2xl transition-all duration-500 border-2 border-dashed backdrop-blur-sm",
                isDragging
                    ? "border-indigo-500 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 scale-105 shadow-2xl shadow-indigo-200/50"
                    : "border-gray-300 bg-white/60 hover:border-indigo-400 hover:shadow-xl hover:scale-[1.02]"
            )}>
                <CardContent
                    className="flex flex-col items-center justify-center py-20 px-6 text-center cursor-pointer relative overflow-hidden"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('home-file-input')?.click()}
                >
                    {/* Animated background gradient */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br from-indigo-100/20 via-purple-100/20 to-pink-100/20 opacity-0 transition-opacity duration-500",
                        isDragging && "opacity-100"
                    )} />

                    <input
                        type="file"
                        id="home-file-input"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.csv,.xlsx,.docx,.pptx"
                    />

                    <div className={cn(
                        "p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-6 transition-all duration-500 relative z-10",
                        isDragging ? "scale-125 rotate-12" : "hover:scale-110 hover:rotate-6"
                    )}>
                        <UploadCloud size={56} strokeWidth={2} />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2 relative z-10">
                        {file ? (
                            <span className="text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text">
                                {file.name}
                            </span>
                        ) : (
                            "Click to upload or drag and drop"
                        )}
                    </h3>
                    <p className="text-base text-gray-500 mb-8 relative z-10">
                        Supported: <span className="font-semibold text-gray-700">PDF, CSV, Excel, Word, PowerPoint</span>
                    </p>

                    {file ? (
                        <Button
                            size="lg"
                            onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                            isLoading={uploading}
                            className="relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            Process File <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); document.getElementById('home-file-input')?.click(); }}
                            className="relative z-10 hover:bg-gray-100 transition-all duration-300"
                        >
                            Select File
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Features Grid mini-preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl">
                <Link href="/tools/pdf" className="group flex items-center justify-center p-5 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm text-sm font-semibold text-gray-700 hover:shadow-lg hover:scale-105 hover:border-indigo-300 transition-all duration-300">
                    <FileType className="mr-2 h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform" /> PDF Tools
                </Link>
                <Link href="/tools/csv" className="group flex items-center justify-center p-5 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm text-sm font-semibold text-gray-700 hover:shadow-lg hover:scale-105 hover:border-green-300 transition-all duration-300">
                    <FileType className="mr-2 h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" /> CSV Editor
                </Link>
                <Link href="/tools/docx" className="group flex items-center justify-center p-5 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm text-sm font-semibold text-gray-700 hover:shadow-lg hover:scale-105 hover:border-blue-300 transition-all duration-300">
                    <FileType className="mr-2 h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" /> Word Editor
                </Link>
                <Link href="/tools/xlsx" className="group flex items-center justify-center p-5 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm text-sm font-semibold text-gray-700 hover:shadow-lg hover:scale-105 hover:border-emerald-300 transition-all duration-300">
                    <FileType className="mr-2 h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" /> Excel Viewer
                </Link>
            </div>
        </div>
    );
}
