'use client'

import { Footer as GravityFooter } from '@gravity-ui/navigation'

import { EMAIL } from '@/constants/constants'

export const Footer = () => {
  return (
    <GravityFooter
      copyright={`${new Date().getFullYear()} NKolosov097`}
      menuItems={[
        {
          text: EMAIL,
          href: `mailto:${EMAIL}`,
          qa: 'footer-email-link',
        },
      ]}
    />
  )
}
