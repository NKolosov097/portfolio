'use client'

import styles from './AboutMe.module.css'

import { useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { ClipboardButton, Icon } from '@gravity-ui/uikit'
import { Copy } from '@gravity-ui/icons'
import { Tag } from '@/components/Tag/Tag'
import { Advantage } from './components/Advantage/Advantage'

import { ETabID } from '@/constants/header.constants'
import { EMAIL } from '@/constants/constants'
import { IAdvantage } from '@/home-sections/AboutMe/types/aboutMe.type'

export const AboutMe = () => {
  const { t } = useTranslation()

  // const phoneRef = useRef<HTMLParagraphElement>(null)
  const emailRef = useRef<HTMLParagraphElement>(null)

  const advantages: IAdvantage[] = useMemo(
    () => [
      {
        id: 'performance',
        title: '×1.4',
        description: t('aboutMe.advantagePerformance'),
      },
      {
        id: 'test-coverage',
        title: '87%',
        description: t('aboutMe.advantageTestCoverage'),
      },
      {
        id: 'server-costs',
        title: '×1.37',
        description: t('aboutMe.advantageServerCosts'),
      },
      {
        id: 'accessibility',
        title: 'AA',
        description: t('aboutMe.advantageAccessibility'),
      },
    ],
    [t],
  )

  return (
    <section id={ETabID.aboutMe} className={styles.section}>
      <Tag title={t('headerTabs.aboutMe')} />

      <h2 className="section-header">{t('aboutMe.header')}</h2>

      <div className={styles.advantagesContainer}>
        <ul className={styles.advantagesList}>
          {advantages.map((advantage) => (
            <Advantage key={advantage.id} {...advantage} />
          ))}
        </ul>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.content}>
          <p className={styles.contentDescription}>
            <Trans
              i18nKey="aboutMe.descriptionFirst"
              components={{ accent: <span className={styles.accent} /> }}
            />
          </p>
          <p className={styles.contentDescription}>
            <Trans
              i18nKey="aboutMe.descriptionSecond"
              components={{ accent: <span className={styles.accent} /> }}
            />
          </p>
        </div>

        <ul className={styles.contentContactContainer}>
          <li>
            <h3 className={styles.contentContactHeader}>{t('name')}</h3>
            <p className={styles.contentContactDescription}>
              {t('firstName')} {t('lastName')}
            </p>
          </li>

          <li>
            <h3 className={styles.contentContactHeader}>Email</h3>
            <p className={styles.contentContactDescription} ref={emailRef}>
              {EMAIL}
              <ClipboardButton text={EMAIL} className={styles.copyBtn} size="s" view="flat">
                <Icon width={20} height={20} data={Copy} />
              </ClipboardButton>
            </p>
          </li>

          {/* <li>
            <h3 className={styles.contentContactHeader}>{t('phone')}</h3>
            <p className={styles.contentContactDescription} ref={phoneRef}>
              {PHONE}
              <ClipboardButton text={PHONE} className={styles.copyBtn} size="l" view="flat" />
            </p>
          </li> */}

          {/* <li>
            <h3 className={styles.contentContactHeader}>{t('location')}</h3>
            <p className={styles.contentContactDescription}>{t('aside.basedInPlace')}</p>
          </li> */}
        </ul>
      </div>
    </section>
  )
}

export default AboutMe
