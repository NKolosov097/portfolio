import { MutableRefObject } from 'react'
import { animateScroll } from './animateScroll'

/**
 * Scrolls to the element matching the current URL fragment, normalising the raw hash first —
 * a stale client-side transition can leave a duplicated fragment behind (e.g. "#writing#writing")
 * in dev, so this strips anything after the first stray "#" and replaces the history entry.
 * Pass `expectedId` to only act when the fragment matches a specific id (e.g. a section's own id).
 */
export const scrollToLocationHash = (expectedId?: string): void => {
  const rawHash = window.location.hash.slice(1)
  if (!rawHash) {
    return
  }

  const cleanHash = rawHash.split('#')[0]
  if (expectedId && cleanHash !== expectedId) {
    return
  }

  if (rawHash !== cleanHash) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${cleanHash}`,
    )
  }

  document.getElementById(cleanHash)?.scrollIntoView()
}

interface IScrollToProps<T> {
  id: string
  ref?: MutableRefObject<T> | null
  duration?: number
  paddingFromTop?: number
}

const logError = () =>
  console.error(`Invalid element, are you sure you've provided element id or react ref?`)

export const getElementPosition = (element: HTMLElement) => element.offsetTop

export const scrollTo = <T extends HTMLElement>({
  id,
  ref = null,
  duration = 750,
  paddingFromTop = 10,
}: IScrollToProps<T>) => {
  // the position of the scroll bar before the user clicks the button
  const initialPosition = window.scrollY

  // decide what type of reference that is
  // if neither ref or id is provided  set element to null
  const element: HTMLElement | null = ref ? ref?.current : id ? document.getElementById(id) : null

  if (!element) {
    // log error if the reference passed is invalid
    logError()
    return
  }

  animateScroll({
    targetPosition: getElementPosition(element),
    initialPosition,
    duration,
    paddingFromTop,
  })
}
