import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${SITE_NAME} — ${SITE_TAGLINE}`,
        short_name: SITE_NAME,
        description:
            'Open, edit, and convert PDF, CSV, Excel, Word, and text files in your browser. Free, fast, and private.',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf8f5',
        theme_color: '#211e1b',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    }
}
