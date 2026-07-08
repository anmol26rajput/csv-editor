import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'Text & Code Editor — Edit TXT, Markdown & JSON Online',
    description:
        'Free online text and code editor. Open and edit Markdown, JSON, source code, and log files right in your browser. Nothing leaves your machine.',
    path: '/tools/text',
    keywords: [
        'text editor online',
        'code editor online',
        'Markdown editor',
        'JSON editor',
        'edit text file online',
        'free online text editor',
    ],
})

export default function TextLayout({ children }: { children: React.ReactNode }) {
    return children
}
