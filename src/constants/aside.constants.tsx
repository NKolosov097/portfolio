import { IAsideSocialLink } from '@/layout/Aside/types/aside.type'
import Image from 'next/image'

export const asideSocialLinks: IAsideSocialLink[] = [
  {
    id: 'Facebook',
    Icon: <Image width={26} height={26} src="/assets/img/aside/facebook.webp" alt="Facebook" />,
    href: 'https://www.facebook.com/profile.php?id=100041627042130',
  },
  {
    id: 'Instagram',
    Icon: <Image width={26} height={26} src="/assets/img/aside/instagram.webp" alt="Instagram" />,
    href: 'https://www.instagram.com/nkolosov097',
  },
  {
    id: 'Twitter | X',
    Icon: <Image width={26} height={26} src="/assets/img/aside/twitter.webp" alt="Twitter | X" />,
    href: 'https://x.com/NKolosov_097',
  },
  {
    id: 'Telegram',
    Icon: <Image width={26} height={26} src="/assets/img/aside/telegram.webp" alt="Telegram" />,
    href: 'https://t.me/NKolosov097',
  },
]
