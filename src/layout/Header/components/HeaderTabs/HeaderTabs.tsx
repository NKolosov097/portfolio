'use client'

import styles from '@/layout/Header/Header.module.css'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import { Button, Icon } from '@gravity-ui/uikit'
import { Tabs, type TabsItemProps as ITab } from '@gravity-ui/uikit/legacy'
import { Person } from '@gravity-ui/icons'

import { ETabID } from '@/constants/header.constants'
import { WRITING_ARTICLES } from '@/constants/writing.constants'
import { getElementPosition, scrollTo } from '@/helpers/scrollTo'
import { isScrollTargetAvailable } from '@/helpers/isScrollTargetAvailable'

import { useSectionsReady } from '@/layout/Header/hooks/useSectionsReady'

import { useHeaderStore } from '@/providers/stores/HeaderStore.provider'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'

export const HeaderTabs = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const { currentTab, setCurrentTab, isClicked, setIsClicked } = useHeaderStore((state) => state)
  const { setIsOpenDrawer } = useAsideStore((state) => state)

  const tabs: (ITab & { id: ETabID })[] = useMemo(
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
      ...(WRITING_ARTICLES.length > 0
        ? [
            {
              id: ETabID.writing,
              title: t('headerTabs.writing'),
            },
          ]
        : []),
      {
        id: ETabID.contact,
        title: t('headerTabs.contact'),
      },
    ],
    [t],
  )

  const sectionIds = useMemo(() => tabs.map(({ id }) => id), [tabs])
  const hasSections = useSectionsReady(sectionIds)

  const handleSelectTab = useCallback(
    (tabId: ETabID) => {
      // A route can remove the target before the observer has disabled the tab.
      const element = document.getElementById(tabId)
      if (!hasSections || !isScrollTargetAvailable(element)) {
        return
      }

      setCurrentTab(tabId)
      setIsClicked(true)
      scrollTo({ id: tabId })
    },
    [hasSections, setCurrentTab, setIsClicked],
  )

  useEffect(() => {
    if (pathname !== '/' || !hasSections) {
      setIsClicked(false)
      return
    }

    const handleScroll = () => {
      // Measure current elements; cached positions outlive loading swaps and language changes.
      const sections = tabs.flatMap(({ id }) => {
        const element = document.getElementById(id)
        return element ? [{ id, position: getElementPosition(element) }] : []
      })

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
    window.addEventListener('resize', onScroll)

    return () => {
      window?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [hasSections, pathname, isClicked, tabs, setCurrentTab, setIsClicked])

  const handleOpenDrawer = useCallback(() => {
    setIsOpenDrawer(true)
  }, [setIsOpenDrawer])

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
          items={tabs.map((tab) => ({ ...tab, disabled: !hasSections }))}
          size="l"
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
