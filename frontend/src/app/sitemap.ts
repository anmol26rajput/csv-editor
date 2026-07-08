import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()
    const routes = [
        { path: '', priority: 1.0 },
        { path: '/tools/pdf', priority: 0.9 },
        { path: '/tools/csv', priority: 0.9 },
        { path: '/tools/xlsx', priority: 0.9 },
        { path: '/tools/docx', priority: 0.9 },
        { path: '/tools/text', priority: 0.8 },
        { path: '/tools/utilities', priority: 0.7 },
        { path: '/privacy', priority: 0.3 },
        { path: '/terms', priority: 0.3 },
    ]
    return routes.map(({ path, priority }) => ({
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority,
    }))
}
