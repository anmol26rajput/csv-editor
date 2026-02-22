"use client";

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from './FileUploader';
import { renderAsync } from 'docx-preview';

export default function DocxPreview({ file }: { file: UploadedFile }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
                if (!file || !file.file) {
                    throw new Error("Missing document URL from server.");
                }

                let fetchUrl = file.file;

                // Construct absolute URL if it is a relative media path
                if (fetchUrl.startsWith('/')) {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL
                        ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
                        : 'http://127.0.0.1:8000';
                    fetchUrl = `${baseUrl}${fetchUrl}`;
                }

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
        <div className="relative bg-gray-100 p-4 sm:p-8 rounded-2xl border flex justify-center overflow-auto min-h-[600px] max-h-[800px]">
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
