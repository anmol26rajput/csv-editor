"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { UploadedFile } from './FileUploader';
import { Loader2 } from 'lucide-react';
import { PdfHighlighter, PdfLoader, AreaHighlight } from 'react-pdf-highlighter-plus';
import 'react-pdf-highlighter-plus/style/style.css';

interface DocxAnnotatorProps {
    file: UploadedFile;
    onUpdate?: (newFile: UploadedFile) => void;
}

export default function DocxAnnotator({ file, onUpdate }: DocxAnnotatorProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [highlights, setHighlights] = useState<Array<any>>([]);

    useEffect(() => {
        let isMounted = true;
        const fetchPdf = async () => {
            try {
                setLoading(true);
                setError(null);
                // Call the new backend endpoint to convert the DOCX into a temporary PDF
                const res = await api.get(`/api/v1/tools/docx/${file.id}/pdf/`);

                if (!isMounted) return;

                let fetchedUrl = res.data.url;
                if (fetchedUrl.startsWith('/') && !fetchedUrl.startsWith('http')) {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL
                        ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
                        : 'http://127.0.0.1:8000';
                    fetchedUrl = `${baseUrl}${fetchedUrl}`;
                }
                setPdfUrl(fetchedUrl);
            } catch (err: any) {
                console.error("Failed to generate PDF map of DOCX:", err);
                if (isMounted) setError(err.response?.data?.error || "Error converting checking document.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPdf();

        return () => { isMounted = false; };
    }, [file.id]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-gray-600 font-medium">Generating an editable PDF canvas of your Word Doc...</p>
                <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">This parses the complex XML schemas out of the Word File so you can annotate it.</p>
            </div>
        );
    }

    if (error || !pdfUrl) {
        return (
            <div className="p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">!</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800 mb-1">Could not start editor</h3>
                        <p className="text-red-600">{error || "Failed to get PDF url"}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">Annotation Studio</h3>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 font-medium">
                    Highlight & Draw Mode
                </div>
            </div>

            <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-100" style={{ height: '70vh' }}>
                <PdfLoader
                    document={pdfUrl}
                    workerSrc="https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
                    beforeLoad={() => <div className="p-4 text-center text-gray-500">Loading document canvas...</div>}
                >
                    {(pdfDocument) => (
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white">
                            <PdfHighlighter
                                pdfDocument={pdfDocument}
                                enableAreaSelection={(event: MouseEvent) => event.altKey}
                                pdfScaleValue="page-width"
                                highlights={highlights}
                                utilsRef={() => { }}
                                onSelection={(PdfSelection: any) => {
                                    const newHighlight = {
                                        content: PdfSelection.content,
                                        position: PdfSelection.position,
                                        id: String(Math.random())
                                    };
                                    setHighlights([...highlights, newHighlight]);
                                    PdfSelection.makeGhostHighlight();
                                }}
                            >
                                {highlights.map((highlight, index) => (
                                    <div key={index}>
                                        {highlight.content?.image ? (
                                            <AreaHighlight highlight={highlight} onChange={() => { }} />
                                        ) : (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: highlight.position.boundingRect.x1,
                                                    top: highlight.position.boundingRect.y1,
                                                    width: highlight.position.boundingRect.width,
                                                    height: highlight.position.boundingRect.height,
                                                    backgroundColor: 'rgba(255, 226, 143, 0.5)'
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </PdfHighlighter>
                        </div>
                    )}
                </PdfLoader>
            </div>
        </div>
    );
}
