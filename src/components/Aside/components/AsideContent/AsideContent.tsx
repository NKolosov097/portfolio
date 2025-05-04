'use client'

import Image from 'next/image'
import styles from '@/components/Aside/aside.module.css'

import { Ghost } from '@gravity-ui/icons'

import { useTranslation } from 'react-i18next'
import { asideSocialLinks } from '@/constants/aside.constants'

export const AsideContent = () => {
  const { t } = useTranslation()

  return (
    <>
      <div>
        <div className={styles.titleWrapper}>
          <Ghost width={50} height={50} />

          <h1 className={styles.fullname}>
            <span>{t('firstName')}</span>
            <span>{t('lastName')}</span>
          </h1>
        </div>

        <Image
          width={250}
          height={250}
          priority
          src="/assets/img/avatar/avatar.webp"
          alt="Avatar"
          placeholder="blur"
          blurDataURL="/assets/img/avatar/avatar.webp"
          className={styles.avatar}
        />
      </div>

      <div className={styles.block}>
        <h2>{t('aside.specialization')}: </h2>
        <p>Front-end Developer</p>
      </div>

      <div className={styles.block}>
        <h2>{t('aside.basedIn')}: </h2>
        <p>{t('aside.basedInPlace')}</p>
      </div>

      <div className={styles.block}>
        <h2>{t('aside.fullYears')}: </h2>
        <p>22 y.o.</p>
      </div>

      <nav className={styles.nav}>
        <ul>
          {asideSocialLinks.map(({ Icon, href, id }) => (
            <li key={id}>
              <a href={href} target="_blank">
                {Icon}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
