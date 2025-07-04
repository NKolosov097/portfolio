'use client'

import { useCallback, useEffect } from 'react'

import styles from '@/layout/Aside/aside.module.css'

import { Drawer, DrawerItem } from '@gravity-ui/navigation'

import { AsideContent } from '@/layout/Aside/components/AsideContent/AsideContent'

import { useAsideStore } from '@/providers/stores/AsideStore.provider'

export const MobileAside = () => {
  const { isOpenDrawer, setIsOpenDrawer } = useAsideStore((state) => state)

  const handleCloseDrawer = useCallback(() => {
    setIsOpenDrawer(false)
  }, [])

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
    <Drawer onEscape={handleCloseDrawer} onVeilClick={handleCloseDrawer}>
      <DrawerItem id="aside-card" visible={isOpenDrawer}>
        <div className={styles.drawerItemContent}>
          <AsideContent />
        </div>
      </DrawerItem>
    </Drawer>
  )
}
