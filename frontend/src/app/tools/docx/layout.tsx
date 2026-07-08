import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'Word Editor — Edit DOCX Documents Online',
    description:
        'Free online Word (DOCX) editor. Rich-text editing with live preview, image management, and export — all in your browser. No upload, fully private.',
    path: '/tools/docx',
    keywords: [
        'Word editor',
        'DOCX editor',
        'edit Word online',
        'DOCX viewer',
        'online Word document editor',
        'free Word editor online',
    ],
})

export default function DocxLayout({ children }: { children: React.ReactNode }) {
    return children
}
