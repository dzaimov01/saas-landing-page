import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_URL
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
  ]
}
