'use client'

import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { useStore } from 'zustand'

import { createAsideStore, initAsideStore, TAsideStore } from '@/stores/aside'

export type AsideStoreApi = ReturnType<typeof createAsideStore>

export const AsideStoreContext = createContext<AsideStoreApi | null>(null)

export const AsideStoreProvider = ({ children }: PropsWithChildren) => {
  const asideRef = useRef<AsideStoreApi | null>(null)

  if (!asideRef.current) {
    asideRef.current = createAsideStore(initAsideStore())
  }

  return (
    <AsideStoreContext.Provider value={asideRef.current}>{children}</AsideStoreContext.Provider>
  )
}

export const useAsideStore = <T,>(selector: (_store: TAsideStore) => T): T => {
  const asideStoreContext = useContext(AsideStoreContext)

  if (!asideStoreContext) {
    throw new Error(`useAsideStore must be used within AsideStoreProvider`)
  }

  return useStore(asideStoreContext, selector)
}
