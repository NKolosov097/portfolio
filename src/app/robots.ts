import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/constants/seo.constants'

/**
 * Generates `/robots.txt`: allows full crawling and points crawlers at the sitemap.
 * The API route is disallowed since it exposes no indexable content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
