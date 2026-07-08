import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'Excel Editor — View & Edit XLSX Spreadsheets Online',
    description:
        'Free online Excel (XLSX) editor and viewer. Open spreadsheets, edit cells, reorder sheets, and export — all in your browser. No upload, fully private.',
    path: '/tools/xlsx',
    keywords: [
        'Excel editor',
        'XLSX editor',
        'edit Excel online',
        'Excel viewer',
        'XLSX viewer',
        'spreadsheet editor online',
        'free Excel editor online',
    ],
})

export default function XlsxLayout({ children }: { children: React.ReactNode }) {
    return children
}
