/** Suspense may hide a connected subtree instead of removing it from the document. */
export const isScrollTargetAvailable = (element: HTMLElement | null): element is HTMLElement => {
  if (!element?.isConnected) {
    return false
  }

  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.hidden || ancestor.style.display === 'none') {
      return false
    }
  }

  return true
}
