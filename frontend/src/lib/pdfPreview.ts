import type { PDFDocumentProxy } from 'pdfjs-dist';

// pdf.js must only load in the browser: it touches DOM APIs at import time
export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF (${response.status})`);
    }
    const data = await response.arrayBuffer();
    return pdfjs.getDocument({ data }).promise;
}

export async function renderPageThumbnail(
    doc: PDFDocumentProxy,
    pageNumber: number,
    targetWidth = 320
): Promise<string> {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvas, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    page.cleanup();
    return dataUrl;
}
