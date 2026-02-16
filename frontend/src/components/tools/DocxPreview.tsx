"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { UploadedFile } from './FileUploader';

export default function DocxPreview({ file }: { file: UploadedFile }) {
    const [html, setHtml] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (file) {
            setLoading(true);
            api.get(`/api/v1/tools/docx/${file.id}/preview/`)
                .then(res => setHtml(res.data.html))
                .catch(err => setError('Failed to load preview'))
                .finally(() => setLoading(false));
        }
    }, [file]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center p-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-100 min-h-[500px]">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-indigo-600 font-medium">Loading preview...</p>
            </div>
        );
    }

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
        <div className="bg-white p-10 shadow-xl border-2 border-gray-200 rounded-2xl min-h-[600px] prose prose-lg max-w-none hover:shadow-2xl transition-shadow duration-300">
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
