'use client'

import styles from '@/layout/Header/Header.module.css'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import { Button, Icon } from '@gravity-ui/uikit'
// eslint-disable-next-line import/named
import { Tabs, TabsItemProps as ITab } from '@gravity-ui/uikit/legacy'
import { Person } from '@gravity-ui/icons'

import { ETabID, paddingFromTopAfterScroll } from '@/constants/header.constants'
import { getElementPosition, scrollTo } from '@/helpers/scrollTo'

import { IPosition } from '@/types/header.type'

import { useHeaderStore } from '@/providers/stores/HeaderStore.provider'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'

export const HeaderTabs = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const { currentTab, setCurrentTab, isClicked, setIsClicked } = useHeaderStore((state) => state)
  const { setIsOpenDrawer } = useAsideStore((state) => state)

  console.log('WE HERE CRYA')

  const tabs: ITab[] = useMemo(
    () => [
      {
        id: ETabID.home,
        title: t('headerTabs.home'),
      },
      {
        id: ETabID.portfolio,
        title: t('headerTabs.portfolio'),
      },
      {
        id: ETabID.aboutMe,
        title: t('headerTabs.aboutMe'),
      },
      {
        id: ETabID.resume,
        title: t('headerTabs.resume'),
      },
      {
        id: ETabID.contact,
        title: t('headerTabs.contact'),
      },
    ],
    [t],
  )

  const handleSelectTab = useCallback((tabId: ETabID) => {
    setCurrentTab(tabId)
    setIsClicked(true)
    scrollTo({ id: tabId, paddingFromTop: paddingFromTopAfterScroll })
  }, [])

  useEffect(() => {
    const sections: IPosition[] = []

    const setSections = () =>
      tabs?.forEach((tab) => {
        const element = document.getElementById(tab?.id)

        if (element) {
          const position = getElementPosition(element)
          const id = element?.id as ETabID

          sections?.push({ id, position })
        }
      })
    setSections()

    const handleScroll = () => {
      if (sections?.length !== tabs?.length) {
        setSections()
      }

      // padding from top in percent
      const paddingFromTop = 0.05 * window?.scrollY

      const newActiveTab = sections
        ?.filter((section) => {
          // 20px - padding from top of window
          // 84px - header's height
          // paddingFromTopAfterScroll - header's padding from bottom, that we use to scroll after click
          return (
            section?.position - window?.scrollY <=
            20 + 84 + paddingFromTopAfterScroll + paddingFromTop
          )
        })
        ?.at(-1)

      if (newActiveTab && !isClicked) {
        setCurrentTab(newActiveTab?.id)
      }
    }
    handleScroll()

    window?.addEventListener('scroll', handleScroll)

    return () => {
      window?.removeEventListener('scroll', handleScroll)
    }
  }, [isClicked])

  const handleOpenDrawer = useCallback(() => {
    setIsOpenDrawer(true)
  }, [])

  return pathname === '/' ? (
    <>
      <Button className={styles.drawerBtn} size="l" view="outlined" onClick={handleOpenDrawer}>
        <Icon width={30} height={30} data={Person} />
      </Button>

      <Tabs
        items={tabs}
        size="xl"
        activeTab={currentTab}
        onSelectTab={handleSelectTab}
        className={styles.tabs}
      />
    </>
  ) : (
    <div className={styles.tabs} />
  )
}
