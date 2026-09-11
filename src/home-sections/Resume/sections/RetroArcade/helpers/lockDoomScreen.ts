/** Keeps the page behind the expanded game inert and restores its exact scroll position on exit. */
export const lockDoomScreen = (screen: HTMLElement): (() => void) => {
  const siblings = new Map<HTMLElement, boolean>()
  let branch: HTMLElement = screen

  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        siblings.set(sibling, sibling.inert)
        sibling.inert = true
      }
    }
    branch = branch.parentElement
    if (branch === document.body) break
  }

  const { scrollX, scrollY } = window
  const body = document.body
  const previous = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    width: body.style.width,
    overflow: body.style.overflow,
  }
  const rootOverflow = document.documentElement.style.overflow
  Object.assign(body.style, {
    position: 'fixed',
    top: `-${scrollY}px`,
    left: `-${scrollX}px`,
    width: '100%',
    overflow: 'hidden',
  })
  document.documentElement.style.overflow = 'hidden'

  return () => {
    siblings.forEach((inert, sibling) => {
      sibling.inert = inert
    })
    Object.assign(body.style, previous)
    document.documentElement.style.overflow = rootOverflow
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
  }
}
