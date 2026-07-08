"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Suspense } from 'react';

function PDFViewerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'document.pdf';

    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <p className="text-xl font-medium text-gray-600">No PDF URL provided.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const handlePrint = () => {
        const iframe = document.getElementById('pdf-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-4 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h1 className="text-lg font-semibold text-gray-800 truncate max-w-md" title={filename}>
                        {filename}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button size="sm" onClick={() => window.open(url, '_blank')}>
                        <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                <iframe
                    id="pdf-iframe"
                    src={url}
                    className="w-full h-full"
                    title="PDF Viewer"
                />
            </div>
        </div>
    );
}

export default function PDFViewerPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20">Loading viewer...</div>}>
            <PDFViewerContent />
        </Suspense>
    );
}
