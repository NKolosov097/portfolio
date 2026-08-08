import { IAsideSocialLink } from '@/layout/Aside/types/aside.type'
import Image from 'next/image'

import { AUTHOR_GITHUB_URL, AUTHOR_LINKEDIN_URL } from '@/constants/constants'

/** Whether the owner currently accepts offers; drives the availability badge in the sidebar. */
export const IS_OPEN_TO_WORK = true

export const asideSocialLinks: IAsideSocialLink[] = [
  {
    id: 'LinkedIn',
    Icon: (
      <Image width={26} height={26} src="/assets/svg/social-links/linkedin.svg" alt="LinkedIn" />
    ),
    href: AUTHOR_LINKEDIN_URL,
  },
  {
    id: 'GitHub',
    Icon: <Image width={26} height={26} src="/assets/svg/social-links/github.svg" alt="GitHub" />,
    href: AUTHOR_GITHUB_URL,
  },
  // {
  //   id: 'Facebook',
  //   Icon: <Image width={26} height={26} src="/assets/img/aside/facebook.webp" alt="Facebook" />,
  //   href: 'https://www.facebook.com/profile.php?id=100041627042130',
  // },
  // {
  //   id: 'Instagram',
  //   Icon: <Image width={26} height={26} src="/assets/img/aside/instagram.webp" alt="Instagram" />,
  //   href: 'https://www.instagram.com/nkolosov097',
  // },
  {
    id: 'Twitter | X',
    Icon: <Image width={26} height={26} src="/assets/svg/social-links/x.svg" alt="Twitter | X" />,
    href: 'https://x.com/NKolosov097',
  },
  {
    id: 'Telegram',
    Icon: <Image width={26} height={26} src="/assets/img/aside/telegram.webp" alt="Telegram" />,
    href: 'https://t.me/NKolosov097',
  },
]
