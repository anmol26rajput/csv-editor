"use client";

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Loader2, Printer, FileDown } from 'lucide-react';
import { UploadedFile } from './FileUploader';
import { renderAsync } from 'docx-preview';

export default function DocxPreview({ file }: { file: UploadedFile }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [absoluteUrl, setAbsoluteUrl] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;

        const renderDocx = async () => {
            if (!containerRef.current) return;

            // Wait a tiny bit to ensure the ref is definitely attached and file is loaded
            await new Promise(r => setTimeout(r, 100));
            if (!isMounted) return;

            setLoading(true);
            setError('');

            try {
                if (!file || !file.url) {
                    throw new Error("Missing document URL from server.");
                }

                let fetchUrl = file.url;

                // Construct absolute URL if it is a relative media path (usually starting with /media/)
                // But avoid prepending the base URL if it's already an absolute HTTP/HTTPS URL
                if (fetchUrl.startsWith('/') && !fetchUrl.startsWith('http')) {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL
                        ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
                        : 'http://127.0.0.1:8000';
                    fetchUrl = `${baseUrl}${fetchUrl}`;
                }

                setAbsoluteUrl(fetchUrl);
                console.log("Fetching DOCX from:", fetchUrl);

                const res = await fetch(fetchUrl);
                if (!res.ok) {
                    throw new Error(`Server returned ${res.status}: ${res.statusText}`);
                }

                const blob = await res.blob();

                if (!isMounted) return;

                if (containerRef.current) {
                    containerRef.current.innerHTML = ''; // prevent duplicate renders

                    await renderAsync(blob, containerRef.current, undefined, {
                        className: "docx-document",
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        ignoreLastRenderedPageBreak: false,
                    });
                }
            } catch (err: any) {
                console.error("Docx preview error:", err);
                if (isMounted) {
                    setError(err.message || 'Failed to parse document');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        renderDocx();

        return () => {
            isMounted = false;
        };
    }, [file]);

    const handlePrint = () => {
        // Trigger browser print dialog for the current window.
        // It's helpful to add a specific print-only CSS class or media query if you want only the document to show.
        window.print();
    };

    if (error) {
        return (
            <div className="p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800 mb-1">Preview Error</h3>
                        <p className="text-red-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-gray-100 p-4 sm:p-8 rounded-2xl border flex flex-col items-center overflow-auto min-h-[600px] max-h-[800px]">
            {/* Hover Toolbar */}
            <div className="sticky top-0 z-20 w-full max-w-5xl flex justify-end gap-2 mb-4">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-gray-600 font-medium text-sm hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                    title="Print Document"
                >
                    <Printer className="w-4 h-4" /> Print
                </button>
                {absoluteUrl && (
                    <a
                        href={absoluteUrl}
                        download={`edited_${file.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white border border-transparent rounded-lg font-medium text-sm hover:bg-indigo-700 transition-all shadow-sm hover:shadow"
                        title="Download Document"
                    >
                        <FileDown className="w-4 h-4" /> Download
                    </a>
                )}
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/80 z-10 flex flex-col justify-center items-center rounded-2xl">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                    <p className="text-indigo-600 font-medium">Loading document preview...</p>
                </div>
            )}

            <div ref={containerRef} className="w-full max-w-5xl bg-transparent">
                {/* docx-preview will render the pages here */}
            </div>
        </div>
    );
}
