'use client'

import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { useStore } from 'zustand'

import { createHeaderStore, initHeaderStore, THeaderStore } from '@/stores/header'

export type HeaderStoreApi = ReturnType<typeof createHeaderStore>

export const HeaderStoreContext = createContext<HeaderStoreApi | null>(null)

export const HeaderStoreProvider = ({ children }: PropsWithChildren) => {
  const headerRef = useRef<HeaderStoreApi | null>(null)

  if (!headerRef.current) {
    headerRef.current = createHeaderStore(initHeaderStore())
  }

  return (
    <HeaderStoreContext.Provider value={headerRef.current}>{children}</HeaderStoreContext.Provider>
  )
}

export const useHeaderStore = <T,>(selector: (_store: THeaderStore) => T): T => {
  const headerStoreContext = useContext(HeaderStoreContext)

  if (!headerStoreContext) {
    throw new Error(`useHeaderStore must be used within HeaderStoreProvider`)
  }

  return useStore(headerStoreContext, selector)
}
