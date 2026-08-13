import { ImageResponse } from 'next/og'

import { AUTHOR_NAME, SITE_URL } from '@/constants/seo.constants'
import { ELanguage } from '@/constants/header.constants'
import { articles } from '@/constants/articles.constants'

interface IArticleOpengraphImageProps {
  params: Promise<{ slug: string }>
}

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export default async function ArticleOpengraphImage({ params }: IArticleOpengraphImageProps) {
  const { slug } = await params
  const article = articles.find((item) => item.slug === slug)
  const title = article?.title[ELanguage.en] ?? AUTHOR_NAME
  const host = new URL(SITE_URL).host

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        color: '#ffffff',
        backgroundColor: '#0b0b0f',
        backgroundImage:
          'radial-gradient(circle at 18% 20%, rgba(110, 168, 255, 0.20), transparent 45%), radial-gradient(circle at 85% 88%, rgba(154, 110, 255, 0.18), transparent 42%)',
      }}
    >
      <div style={{ display: 'flex', fontSize: '30px', color: '#6ea8ff' }}>{AUTHOR_NAME}</div>

      <div style={{ display: 'flex', fontSize: '64px', lineHeight: 1.15, letterSpacing: '-1px' }}>
        {title}
      </div>

      <div style={{ display: 'flex', fontSize: '28px', color: '#6b7280' }}>{host}</div>
    </div>,
    size,
  )
}
