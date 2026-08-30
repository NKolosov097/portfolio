import { ImageResponse } from 'next/og'

import { AUTHOR_NAME, SITE_URL } from '@/constants/seo.constants'
import { ELanguage } from '@/constants/header.constants'
import { ARTICLES } from '@/constants/articles.constants'

import * as styles from './opengraph-image.styles'

interface IArticleOpengraphImageProps {
  params: Promise<{ slug: string }>
}

/** Pixel dimensions of a generated Open Graph image. */
interface IOgImageSize {
  width: number
  height: number
}

/** Next.js file-convention export - keep this exact name, or the framework stops picking it up. */
export const size: IOgImageSize = {
  width: 1200,
  height: 630,
}

/** Next.js file-convention export (MIME type) - keep this exact name, or the framework stops picking it up. */
export const contentType = 'image/png'

export function generateStaticParams() {
  return ARTICLES.map(({ slug }) => ({ slug }))
}

export default async function ArticleOpengraphImage({ params }: IArticleOpengraphImageProps) {
  const { slug } = await params
  const article = ARTICLES.find((item) => item.slug === slug)
  const title = article?.title[ELanguage.en] ?? AUTHOR_NAME
  const host = new URL(SITE_URL).host

  return new ImageResponse(
    <div style={styles.container}>
      <div style={styles.author}>{AUTHOR_NAME}</div>
      <div style={styles.title}>{title}</div>
      <div style={styles.host}>{host}</div>
    </div>,
    size,
  )
}
