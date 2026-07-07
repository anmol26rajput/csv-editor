import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import NavLinks from '@/components/NavLinks'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
    title: 'OmniFile — Edit any file in your browser',
    description: 'Open, edit, and convert text, CSV, Excel, Word, and PDF files online. Free, fast, and private.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" data-scroll-behavior="smooth">
            <body className={cn(outfit.variable, jetbrainsMono.variable, "min-h-screen flex flex-col font-sans text-ink-950 bg-paper grain")}>
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lift">
                    Skip to content
                </a>

                <header className="sticky top-0 z-50 w-full border-b border-ink-200/60 bg-paper/85 backdrop-blur-md">
                    <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between relative z-10">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-ink-950">
                            <span className="grid place-items-center h-7 w-7 rounded-lg bg-ink-950 text-brand-400">
                                <FileText className="h-4 w-4" strokeWidth={2.25} />
                            </span>
                            <span>OmniFile</span>
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
                        <p>&copy; {new Date().getFullYear()} OmniFile. Files are processed securely and never shared.</p>
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
