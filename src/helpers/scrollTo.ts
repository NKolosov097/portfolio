import { MutableRefObject } from 'react'
import { animateScroll } from './animateScroll'

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
  paddingFromTop = 0,
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
