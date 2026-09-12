'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { isScrollTargetAvailable } from '@/helpers/isScrollTargetAvailable'

/** The server cannot promise that streamed section elements are already available to click. */
const getServerSnapshot = () => false

/** Tracks actual section availability across Suspense swaps without coupling pages to header state. */
export const useSectionsReady = (sectionIds: readonly string[]) => {
  const getSnapshot = useCallback(
    () => sectionIds.every((id) => isScrollTargetAvailable(document.getElementById(id))),
    [sectionIds],
  )

  const subscribe = useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange)
    observer.observe(document.querySelector('main') ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'hidden', 'style'],
    })
    return () => observer.disconnect()
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
