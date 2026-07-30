import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/constants/seo.constants'

/**
 * Generates `/sitemap.xml`. The portfolio is a single-page app, so the sitemap
 * lists only the root route with its per-language alternates.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: {
          en: `${SITE_URL}/?lang=en`,
          ru: `${SITE_URL}/?lang=ru`,
        },
      },
    },
  ]
}
