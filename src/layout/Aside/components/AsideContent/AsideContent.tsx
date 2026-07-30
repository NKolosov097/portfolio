'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'

import styles from '@/layout/Aside/aside.module.css'

import { Ghost } from '@gravity-ui/icons'

import { asideSocialLinks } from '@/constants/aside.constants'
import { BIRTH_DATE } from '@/constants/constants'
import { getAge } from '@/helpers/getAge'

export const AsideContent = () => {
  const { t } = useTranslation()

  const age = getAge(BIRTH_DATE)

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

      <ul className={styles.list}>
        <li className={styles.block}>
          <h2>{t('aside.specialization')}: </h2>
          <p>Fullstack Developer</p>
        </li>

        <li className={styles.block}>
          <h2>{t('aside.basedIn')}: </h2>
          <p>{t('aside.basedInPlace')}</p>
        </li>

        {age !== null && (
          <li className={styles.block}>
            <h2>{t('aside.fullYears')}: </h2>
            <p>{age}</p>
          </li>
        )}
      </ul>

      <nav className={styles.nav}>
        <ul>
          {asideSocialLinks.map(({ Icon, href, id }) => {
            const testId = `aside-social-${id
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')}`

            return (
              <li key={id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${id} — ${t('aside.opensInNewTab')}`}
                  data-testid={testId}
                >
                  {Icon}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
