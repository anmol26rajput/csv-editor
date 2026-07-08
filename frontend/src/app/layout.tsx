import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import NavLinks from '@/components/NavLinks'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SITE_URL, SITE_NAME, SITE_TAGLINE, BASE_KEYWORDS } from '@/lib/seo'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

const description =
    'Open, edit, and convert PDF, CSV, Excel (XLSX), Word (DOCX), and text files right in your browser. Free, fast, and private — your files never leave your device.'

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${SITE_NAME} — ${SITE_TAGLINE}`,
        template: `%s · ${SITE_NAME}`,
    },
    description,
    keywords: BASE_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    alternates: { canonical: '/' },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: `${SITE_NAME} — ${SITE_TAGLINE}`,
        description,
        url: SITE_URL,
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: `${SITE_NAME} — ${SITE_TAGLINE}`,
        description,
    },
    category: 'technology',
}

export const viewport: Viewport = {
    themeColor: '#ffffff',
    width: 'device-width',
    initialScale: 1,
}

// Structured data so search engines can render a rich result for the app.
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (web browser)',
    description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
        'PDF editor and converter',
        'CSV editor',
        'Excel (XLSX) viewer and editor',
        'Word (DOCX) editor',
        'Online text and code editor',
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" data-scroll-behavior="smooth">
            <body className={cn(outfit.variable, jetbrainsMono.variable, "min-h-screen flex flex-col font-sans text-ink-950 bg-paper grain")}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lift">
                    Skip to content
                </a>

                <header className="sticky top-0 z-50 w-full border-b border-ink-200/60 bg-paper/85 backdrop-blur-md">
                    <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between relative z-10">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-ink-950">
                            <span className="grid place-items-center h-7 w-7 rounded-lg bg-ink-950 text-brand-400">
                                <FileText className="h-4 w-4" strokeWidth={2.25} />
                            </span>
                            <span>Sarva</span>
                        </Link>

                        <NavLinks />
                    </div>
                </header>

                <main id="main" className="flex-1 relative z-10 mx-auto w-full max-w-6xl px-4 py-10">
                    {children}
                    <SpeedInsights />
                </main>

                <footer className="relative z-10 border-t border-ink-200/60 py-8">
                    <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-500">
                        <p>&copy; {new Date().getFullYear()} Sarva. Files are processed securely and never shared.</p>
                        <div className="flex items-center gap-5">
                            <Link href="/privacy" className="hover:text-ink-900 transition-colors">Privacy</Link>
                            <Link href="/terms" className="hover:text-ink-900 transition-colors">Terms</Link>
                            <a href="https://github.com/anmol26rajput" target="_blank" rel="noreferrer" className="hover:text-ink-900 transition-colors">GitHub</a>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    )
}
