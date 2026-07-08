import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'CSV Editor — Edit, Filter & Clean CSV Online',
    description:
        'Free online CSV editor. Edit cells inline, filter rows, remove columns, split large files, and clean messy data right in your browser. No upload, fully private.',
    path: '/tools/csv',
    keywords: [
        'CSV editor',
        'edit CSV online',
        'CSV cleaner',
        'filter CSV',
        'split CSV file',
        'CSV viewer',
        'free CSV editor online',
    ],
})

export default function CsvLayout({ children }: { children: React.ReactNode }) {
    return children
}
