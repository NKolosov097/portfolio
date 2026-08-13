import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SITE_URL } from '@/constants/seo.constants'
import { ELanguage } from '@/constants/header.constants'
import { articles, IArticleMeta } from '@/constants/articles.constants'

import { ArticlePageContent } from '@/components/ArticlePageContent/ArticlePageContent'

interface IArticlePageProps {
  params: Promise<{ slug: string }>
}

/** Looks up an article's registry entry by slug, or `undefined` for an unknown slug. */
const findArticle = (slug: string): IArticleMeta | undefined =>
  articles.find((article) => article.slug === slug)

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: IArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = findArticle(slug)

  if (!article) {
    return {}
  }

  const url = `${SITE_URL}/articles/${slug}`

  return {
    title: article.title[ELanguage.en],
    description: article.description[ELanguage.en],
    alternates: { canonical: url },
    openGraph: {
      title: article.title[ELanguage.en],
      description: article.description[ELanguage.en],
      url,
      type: 'article',
      publishedTime: article.publishedDate,
    },
  }
}

/** Builds the `BlogPosting` JSON-LD node, in English to match the always-English static HTML. */
const buildArticleStructuredData = (article: IArticleMeta) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: article.title[ELanguage.en],
  description: article.description[ELanguage.en],
  datePublished: article.publishedDate,
  url: `${SITE_URL}/articles/${article.slug}`,
  author: { '@id': `${SITE_URL}/#person` },
})

export default async function ArticlePage({ params }: IArticlePageProps) {
  const { slug } = await params
  const article = findArticle(slug)

  if (!article) {
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Static, fully-trusted data; `<` is escaped to keep the inline JSON HTML-safe.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildArticleStructuredData(article)).replace(/</g, '\\u003c'),
        }}
      />
      <ArticlePageContent article={article} />
    </>
  )
}
