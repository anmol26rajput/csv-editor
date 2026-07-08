import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'File Utilities — Base64, JSON & Quick Tools Online',
    description:
        'Free online file utilities. Encode and decode Base64, format and inspect JSON, and run quick conversions right in your browser. No upload, fully private.',
    path: '/tools/utilities',
    keywords: [
        'Base64 encoder',
        'Base64 decoder',
        'JSON formatter',
        'JSON viewer',
        'online file utilities',
        'developer tools online',
    ],
})

export default function UtilitiesLayout({ children }: { children: React.ReactNode }) {
    return children
}
