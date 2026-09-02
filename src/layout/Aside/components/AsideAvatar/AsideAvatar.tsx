'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

import styles from './AsideAvatar.module.css'

import { Button, Modal } from '@gravity-ui/uikit'
import { CircleXmark } from '@gravity-ui/icons'

import { useAsideLightboxContext } from '@/layout/Aside/context/AsideLightbox.context'

/** Absolute path to the 1024x1024 source photo; the aside thumbnail and the lightbox both scale the same file. */
const AVATAR_SRC = '/assets/img/avatar/avatar.webp'

export const AsideAvatar = () => {
  const { t } = useTranslation()
  const { onLightboxOpenChange } = useAsideLightboxContext()

  const [isPhotoOpen, setIsPhotoOpen] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    setIsPhotoOpen(isOpen)
    onLightboxOpenChange(isOpen)
  }

  /**
   * Modal's own scroll lock overwrites `body.style.paddingRight` with just the scrollbar width,
   * discarding this app's own `--body-padding` and shifting the layout - `scrollbar-gutter: stable`
   * (globals.css) already keeps the page width constant, so no compensation is needed here at all.
   */
  useEffect(() => {
    if (!isPhotoOpen) return

    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [isPhotoOpen])

  return (
    <>
      <button
        type="button"
        className={styles.avatarTrigger}
        aria-label={t('aside.viewPhoto')}
        onClick={() => handleOpenChange(true)}
        data-testid="aside-avatar-trigger"
      >
        <Image
          width={250}
          height={250}
          priority
          src={AVATAR_SRC}
          alt="Avatar"
          placeholder="blur"
          blurDataURL={AVATAR_SRC}
          className={styles.avatar}
        />
      </button>

      <Modal
        open={isPhotoOpen}
        onOpenChange={handleOpenChange}
        disableBodyScrollLock
        contentClassName={styles.lightboxSurface}
        data-testid="aside-avatar-lightbox"
      >
        <div className={styles.lightboxContent}>
          <Button
            view="flat"
            pin="circle-circle"
            size="m"
            aria-label={t('aside.closePhoto')}
            className={styles.lightboxClose}
            onClick={() => handleOpenChange(false)}
            data-testid="aside-avatar-lightbox-close"
          >
            <CircleXmark />
          </Button>

          <Image
            width={1024}
            height={1024}
            src={AVATAR_SRC}
            alt="Avatar"
            className={styles.lightboxImage}
          />
        </div>
      </Modal>
    </>
  )
}
