import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/constants/seo.constants'
import { articles } from '@/constants/articles.constants'

/** Generates `/sitemap.xml`: root page, articles index, and one entry per article. */
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
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${SITE_URL}/articles/${article.slug}`,
      lastModified: new Date(article.publishedDate),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
