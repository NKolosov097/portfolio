import { ImageResponse } from 'next/og'

import { AUTHOR_JOB_TITLE, AUTHOR_NAME, AUTHOR_SKILLS, SITE_URL } from '@/constants/seo.constants'

/** Dimensions of the generated social-preview banner (the format expected by OG/Twitter). */
export const size = {
  width: 1200,
  height: 630,
}

/** MIME type of the generated banner. */
export const contentType = 'image/png'

/** Accessible description of the banner, exposed as the `og:image:alt` value. */
export const alt = `${AUTHOR_NAME} — ${AUTHOR_JOB_TITLE}`

export default function OpengraphImage(): ImageResponse {
  const initials = AUTHOR_NAME.split(' ')
    .map((part) => part.charAt(0))
    .join('')

  const skills = AUTHOR_SKILLS.slice(0, 5).join('  ·  ')
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            color: '#0b0b0f',
            fontSize: '96px',
            backgroundImage: 'linear-gradient(135deg, #6ea8ff, #9a6eff)',
          }}
        >
          {initials}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '82px', letterSpacing: '-2px', lineHeight: 1.05 }}>
            {AUTHOR_NAME}
          </div>
          <div style={{ fontSize: '44px', color: '#6ea8ff', marginTop: '12px' }}>
            {AUTHOR_JOB_TITLE}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '30px', color: '#9aa0aa' }}>{skills}</div>
          <div style={{ fontSize: '30px', color: '#6b7280' }}>{host}</div>
        </div>
      </div>
    </div>,
    size,
  )
}
