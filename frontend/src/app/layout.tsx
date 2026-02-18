import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'OmniFile - Universal File Editor',
    description: 'Edit PDF, CSV, Excel, and Word documents online.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={cn(inter.className, "min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50")}>
                {/* Navbar */}
                <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
                            <Layers className="h-6 w-6" />
                            <span>OmniFile</span>
                        </Link>

                        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
                            <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
                            <Link href="/tools/pdf" className="hover:text-indigo-600 transition-colors">PDF Tools</Link>
                            <Link href="/tools/csv" className="hover:text-indigo-600 transition-colors">CSV Editor</Link>
                            <Link href="/tools/docx" className="hover:text-indigo-600 transition-colors">Word Editor</Link>
                            <Link href="/tools/xlsx" className="hover:text-indigo-600 transition-colors">Excel Viewer</Link>
                            <a href="https://github.com/anmol26rajput" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">GitHub</a>
                        </nav>
                    </div>
                </header>

                <main className="flex-1 container mx-auto px-4 py-8">
                    {children}
                    <SpeedInsights />
                </main>

                <footer className="border-t border-gray-200 bg-white/40 backdrop-blur-sm py-6 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} OmniFile. All rights reserved.</p>
                </footer>
            </body>
        </html>
    )
}
