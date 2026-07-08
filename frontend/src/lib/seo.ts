import type { Metadata } from 'next'

// Public site URL — set NEXT_PUBLIC_SITE_URL in Vercel to your real domain so
// canonical URLs, sitemap, and social cards resolve correctly.
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://sarva.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'Sarva'
export const SITE_TAGLINE = 'Edit any file in your browser'

// Broad keyword pool reused across pages. Search engines weight on-page content
// far more than this tag, but it documents the terms every page targets.
export const BASE_KEYWORDS = [
    'file editor',
    'online file editor',
    'edit files online',
    'free file editor',
    'browser file editor',
    'PDF editor',
    'edit PDF online',
    'CSV editor',
    'edit CSV online',
    'Excel editor',
    'XLSX editor',
    'Word editor',
    'DOCX editor',
    'text editor online',
    'JSON editor',
    'convert files online',
    'no upload file editor',
    'private file editor',
]

/**
 * Build a per-page Metadata object with consistent canonical URL, OpenGraph,
 * and Twitter card wiring. `path` is the route path (e.g. "/tools/pdf").
 */
export function pageMetadata({
    title,
    description,
    path,
    keywords = [],
}: {
    title: string
    description: string
    path: string
    keywords?: string[]
}): Metadata {
    const url = `${SITE_URL}${path}`
    const fullTitle = `${title} · ${SITE_NAME}`
    return {
        title,
        description,
        keywords: [...keywords, ...BASE_KEYWORDS],
        alternates: { canonical: url },
        openGraph: {
            type: 'website',
            siteName: SITE_NAME,
            title: fullTitle,
            description,
            url,
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
        },
    }
}
