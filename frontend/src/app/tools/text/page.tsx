"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const TextEditor = dynamic(() => import('@/components/tools/TextEditor'), {
    ssr: false,
    loading: () => (
        <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-ink-300" />
        </div>
    ),
});

export default function TextEditorPage() {
    return (
        <div className="space-y-8">
            <div className="max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight">Text &amp; code editor</h1>
                <p className="mt-2 text-ink-500">
                    Open any plain-text file, edit it, and download the result.
                    Runs entirely in your browser — nothing is uploaded.
                </p>
            </div>
            <TextEditor />
        </div>
    );
}
