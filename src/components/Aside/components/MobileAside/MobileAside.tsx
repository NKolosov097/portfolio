'use client'

import { useCallback } from 'react'

import styles from '@/components/Aside/aside.module.css'

import { Drawer, DrawerItem } from '@gravity-ui/navigation'

import { AsideContent } from '@/components/Aside/components/AsideContent/AsideContent'

import { useAsideStore } from '@/providers/stores/AsideStore.provider'

export const MobileAside = () => {
  const { isOpenDrawer, setIsOpenDrawer } = useAsideStore((state) => state)

  const handleCloseDrawer = useCallback(() => {
    setIsOpenDrawer(false)
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
