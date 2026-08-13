'use client'

import styles from '@/layout/Header/Header.module.css'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import { Button, Icon } from '@gravity-ui/uikit'
import { Tabs, type TabsItemProps as ITab } from '@gravity-ui/uikit/legacy'
import { Person } from '@gravity-ui/icons'

import { ETabID, tabsCompactBreakpoint } from '@/constants/header.constants'
import { writingArticles } from '@/constants/writing.constants'
import { getElementPosition, scrollTo } from '@/helpers/scrollTo'

import { IPosition } from '@/layout/Header/types/header.type'

import { useHeaderStore } from '@/providers/stores/HeaderStore.provider'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'

export const HeaderTabs = () => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [width, setWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const { currentTab, setCurrentTab, isClicked, setIsClicked } = useHeaderStore((state) => state)
  const { setIsOpenDrawer } = useAsideStore((state) => state)

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
      // Surfaced only once the Writing section has publications (see writing.constants.ts).
      ...(writingArticles.length > 0
        ? [
            {
              id: ETabID.writing,
              title: t('headerTabs.writing'),
            },
          ]
        : []),
    ],
    [t],
  )

  const handleSelectTab = useCallback((tabId: ETabID) => {
    setCurrentTab(tabId)
    setIsClicked(true)
    scrollTo({ id: tabId })
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
          return section?.position - window?.scrollY <= 20 + 84 + paddingFromTop
        })
        ?.at(-1)

      if (newActiveTab && !isClicked) {
        setCurrentTab(newActiveTab?.id)
      }
    }
    handleScroll()

    // coalesce scroll events into one handler call per frame to avoid layout thrash
    let rafId: number | null = null

    const onScroll = () => {
      if (rafId !== null) {
        return
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null
        handleScroll()
      })
    }

    window?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window?.removeEventListener('scroll', onScroll)

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [isClicked])

  const handleOpenDrawer = useCallback(() => {
    setIsOpenDrawer(true)
  }, [])

  return (
    <>
      <Button
        data-testid="header-open-profile"
        className={styles.drawerBtn}
        size="l"
        view="outlined"
        aria-label={t('aside.openProfile')}
        onClick={handleOpenDrawer}
      >
        <Icon width={30} height={30} data={Person} />
      </Button>

      {pathname === '/' ? (
        <Tabs
          items={tabs}
          size={width !== undefined && width < tabsCompactBreakpoint ? 'm' : 'l'}
          activeTab={currentTab}
          onSelectTab={handleSelectTab}
          className={styles.tabs}
        />
      ) : (
        <div className={styles.tabs} />
      )}
    </>
  )
}
