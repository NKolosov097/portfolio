'use client'

import { PropsWithChildren } from 'react'

import { useHeaderStore } from '@/providers/stores/HeaderStore.provider'

export const Main = ({ children }: PropsWithChildren) => {
  const { setIsClicked } = useHeaderStore((state) => state)

  const handleWheel = () => {
    setIsClicked(false)
  }

  return <main onWheel={handleWheel}>{children}</main>
}
