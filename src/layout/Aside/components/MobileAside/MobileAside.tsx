'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import styles from '@/layout/Aside/aside.module.css'

import { Button, Drawer } from '@gravity-ui/uikit'

import { AsideContent } from '@/layout/Aside/components/AsideContent/AsideContent'

import { AsideLightboxContext } from '@/layout/Aside/context/AsideLightbox.context'
import { IAsideLightboxContext } from '@/layout/Aside/types/aside.type'
import { useSwipeToClose } from '@/layout/Aside/hooks/useSwipeToClose'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'
import { CircleXmark } from '@gravity-ui/icons'

export const MobileAside = () => {
  const { t } = useTranslation()

  const { isOpenDrawer, setIsOpenDrawer } = useAsideStore((state) => state)

  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const handleCloseDrawer = useCallback(() => {
    setIsOpenDrawer(false)
  }, [])

  /** Stable identity so the nested avatar does not re-render on every drawer render. */
  const lightboxContextValue = useMemo<IAsideLightboxContext>(
    () => ({ onLightboxOpenChange: setIsLightboxOpen }),
    [],
  )

  const swipeToCloseRef = useSwipeToClose({ onClose: handleCloseDrawer, isEnabled: isOpenDrawer })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsOpenDrawer(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <Drawer
      open={isOpenDrawer}
      onOpenChange={(isOpen) => !isOpen && handleCloseDrawer()}
      className={styles.drawer}
      contentClassName={styles.drawerItem}
      disableEscapeKeyDown={isLightboxOpen}
    >
      <div
        id="aside-card"
        ref={swipeToCloseRef}
        data-testid="aside-drawer"
        className={styles.drawerItemContent}
      >
        <Button
          data-testid="aside-close-profile"
          view="flat"
          pin="circle-circle"
          size="m"
          aria-label={t('aside.closeProfile')}
          className={styles.closeIcon}
          onClick={handleCloseDrawer}
        >
          <CircleXmark />
        </Button>
        <AsideLightboxContext.Provider value={lightboxContextValue}>
          <AsideContent />
        </AsideLightboxContext.Provider>
      </div>
    </Drawer>
  )
}
