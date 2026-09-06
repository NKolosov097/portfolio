import { createContext, useContext } from 'react'

import { IAsideLightboxContext } from '@/layout/Aside/types/aside.type'

/** No enclosing overlay to notify by default (e.g. the desktop sidebar, which isn't dismissible). */
const DEFAULT_ASIDE_LIGHTBOX_CONTEXT: IAsideLightboxContext = {
  onLightboxOpenChange: () => {},
}

export const AsideLightboxContext = createContext<IAsideLightboxContext>(
  DEFAULT_ASIDE_LIGHTBOX_CONTEXT,
)

export const useAsideLightboxContext = (): IAsideLightboxContext => useContext(AsideLightboxContext)
