import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'PDF Editor — Merge, Split, Convert & Reorder PDF',
    description:
        'Free online PDF editor. Merge PDFs, split pages, reorder and delete pages, edit PDF text, and convert to and from PDF — all in your browser. No upload, fully private.',
    path: '/tools/pdf',
    keywords: [
        'PDF editor',
        'edit PDF online',
        'merge PDF',
        'split PDF',
        'convert PDF',
        'reorder PDF pages',
        'delete PDF pages',
        'PDF to Word',
        'Word to PDF',
        'free PDF editor online',
    ],
})

export default function PdfLayout({ children }: { children: React.ReactNode }) {
    return children
}
