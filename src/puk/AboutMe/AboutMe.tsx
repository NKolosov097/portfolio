'use client'

import styles from './AboutMe.module.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, Icon, Popup } from '@gravity-ui/uikit'
import { Copy } from '@gravity-ui/icons'
import { Tag } from '@/components/Tag/Tag'
import { Advantage } from './components/Advantage/Advantage'

import { ETabID } from '@/constants/header.constants'
import { phone, email } from '@/constants/constants'
import { IAdvantage } from '@/types/aboutMe.type'
import { copyTextToClipboard } from '@/helpers/clipboard'

interface ICopyTooltipText {
  phone: {
    isOpen: boolean
    content: string
  }
  email: {
    isOpen: boolean
    content: string
  }
}
const defaultCopyTooltip: ICopyTooltipText = {
  phone: {
    isOpen: false,
    content: '',
  },
  email: {
    isOpen: false,
    content: '',
  },
}

export const AboutMe = () => {
  const { t } = useTranslation()

  const phoneRef = useRef<HTMLParagraphElement>(null)
  const emailRef = useRef<HTMLParagraphElement>(null)
  const [copyTooltip, setCopyTooltip] = useState<ICopyTooltipText>(defaultCopyTooltip)

  const advantages: IAdvantage[] = useMemo(
    () => [
      {
        id: 'deploys',
        title: '999+',
        description: t('aboutMe.advantageDeploy'),
      },
      {
        id: 'yearsOfExperience',
        title: '2+',
        description: t('aboutMe.yearsOfExperience'),
      },
      {
        id: 'projects',
        title: '20+',
        description: t('aboutMe.projects'),
      },
    ],
    [t],
  )

  const handleCopyPhoneBtn = useCallback(() => {
    copyTextToClipboard(phone)
      .then(() => {
        setCopyTooltip((prev) => ({
          ...prev,
          phone: { isOpen: true, content: 'Phone was been copied successfully!' },
        }))
      })
      .catch(() => {
        setCopyTooltip((prev) => ({
          ...prev,
          phone: { isOpen: true, content: 'Error with copying phone...' },
        }))
      })
  }, [])

  const handleCopyEmailBtn = useCallback(() => {
    copyTextToClipboard(email)
      .then(() => {
        setCopyTooltip((prev) => ({
          ...prev,
          email: { isOpen: true, content: 'Email was been copied successfully!' },
        }))
      })
      .catch(() => {
        setCopyTooltip((prev) => ({
          ...prev,
          email: {
            isOpen: true,
            content: 'Error with copying email...',
          },
        }))
      })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopyTooltip((prev) => ({
        ...prev,
        phone: { ...prev.phone, isOpen: false },
      }))
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [copyTooltip.phone.isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopyTooltip((prev) => ({ ...prev, email: { ...prev.phone, isOpen: false } }))
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [copyTooltip.email.isOpen])

  return (
    <section id={ETabID.aboutMe} className={styles.section}>
      <Tag title={t('headerTabs.aboutMe')} />

      <h2 className="section-header">{t('aboutMe.header')}</h2>

      <ul className={styles.advantagesList}>
        {advantages.map((advantage) => (
          <Advantage key={advantage.id} {...advantage} />
        ))}
      </ul>

      <div className={styles.contentContainer}>
        <div className={styles.content}>
          <p className={styles.contentDescription}>asdasd</p>
          <p className={styles.contentDescription}>asdasd</p>
        </div>

        <ul className={styles.contentContactContainer}>
          <li>
            <h3 className={styles.contentContactHeader}>{t('name')}</h3>
            <p className={styles.contentContactDescription}>
              {t('firstName')} {t('lastName')}
            </p>
          </li>

          <li>
            <h3 className={styles.contentContactHeader}>{t('phone')}</h3>
            <p className={styles.contentContactDescription} ref={phoneRef}>
              {phone}
              <Button onClick={handleCopyPhoneBtn} className={styles.copyBtn} size="s" view="flat">
                <Icon width={20} height={20} data={Copy} />
              </Button>
            </p>

            <Popup
              anchorElement={phoneRef?.current}
              open={copyTooltip.phone.isOpen}
              placement="top"
            >
              {copyTooltip.phone.content}
            </Popup>
          </li>

          <li>
            <h3 className={styles.contentContactHeader}>Email</h3>
            <p className={styles.contentContactDescription} ref={emailRef}>
              {email}
              <Button onClick={handleCopyEmailBtn} className={styles.copyBtn} size="s" view="flat">
                <Icon width={20} height={20} data={Copy} />
              </Button>
            </p>

            <Popup
              anchorElement={emailRef?.current}
              open={copyTooltip.email.isOpen}
              placement="top"
            >
              {copyTooltip.email.content}
            </Popup>
          </li>

          <li>
            <h3 className={styles.contentContactHeader}>{t('location')}</h3>
            <p className={styles.contentContactDescription}>{t('aside.basedInPlace')}</p>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default AboutMe
