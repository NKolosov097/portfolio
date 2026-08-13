import type { Metadata } from 'next'

import { SITE_URL } from '@/constants/seo.constants'

import en from '@public/locales/en.json'

import { ArticlesListContent } from '@/components/ArticlesListContent/ArticlesListContent'

export const metadata: Metadata = {
  title: en.articles.pageTitle,
  description: en.articles.pageDescription,
  alternates: {
    canonical: '/articles',
  },
  openGraph: {
    title: en.articles.pageTitle,
    description: en.articles.pageDescription,
    url: `${SITE_URL}/articles`,
    type: 'website',
  },
}

export default function ArticlesPage() {
  return <ArticlesListContent />
}
