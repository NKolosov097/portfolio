import { JSX } from 'react'

export interface IAsideSocialLink {
  Icon: JSX.Element
  href: string
  id: string
}

/** Lets a lightbox nested inside an overlay (e.g. the mobile aside drawer) ask that overlay to stop reacting to Escape while it is open, so Escape dismisses only the top-most layer. */
export interface IAsideLightboxContext {
  onLightboxOpenChange: (_isOpen: boolean) => void
}
