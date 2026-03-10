"use client";

import React, { useEffect, useRef, useState } from 'react';
import { UploadedFile } from './FileUploader';
import { Loader2 } from 'lucide-react';
import * as docx from 'docx-preview';
import api from '@/lib/api';

interface DocxViewerProps {
    file: UploadedFile;
}

export default function DocxViewer({ file }: DocxViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadDocument() {
            if (!containerRef.current) return;

            setLoading(true);
            setError(null);

            try {
                // Fetch the DOCX as arraybuffer or blob
                const response = await api.get(file.url, { responseType: 'blob' });

                if (!isMounted) return;

                // Clear any existing content
                containerRef.current.innerHTML = '';

                // Render it using docx-preview
                await docx.renderAsync(response.data, containerRef.current, undefined, {
                    className: 'docx-preview-container',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    experimental: true,
                    useBase64URL: true,
                });
            } catch (err: any) {
                console.error("Failed to load document:", err);
                if (isMounted) {
                    setError(err.message || "Failed to render document");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        if (file) {
            loadDocument();
        }

        return () => {
            isMounted = false;
        };
    }, [file]);

    return (
        <div className="relative flex justify-center bg-[#f4f5f7] rounded-xl border border-gray-200 min-h-[600px] overflow-hidden">
            {loading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium tracking-wide">Rendering document natively...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-red-500 text-2xl font-bold">!</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Failed to render</h3>
                    <p className="text-gray-500">{error}</p>
                </div>
            )}

            <div
                ref={containerRef}
                className="w-full h-[80vh] overflow-y-auto no-scrollbar pb-8"
            />
        </div>
    );
}
