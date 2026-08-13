import type { CSSProperties } from 'react'

/** Styles for the article Open Graph image — inline-only, since `next/og`'s Satori renderer doesn't support CSS Modules. */
export const container: CSSProperties = {
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
}

export const author: CSSProperties = {
  display: 'flex',
  fontSize: '30px',
  color: '#6ea8ff',
}

export const title: CSSProperties = {
  display: 'flex',
  fontSize: '64px',
  lineHeight: 1.15,
  letterSpacing: '-1px',
}

export const host: CSSProperties = {
  display: 'flex',
  fontSize: '28px',
  color: '#6b7280',
}
