'use client'

import styles from './ReadingProgressNav.module.css'

import { useEffect, useState } from 'react'

/** One entry in the reading-progress rail, sourced from a heading already rendered in the article. */
interface IReadingProgressHeading {
  /** The heading's `id`, used both as the scroll target and the React key. */
  id: string
  /** The heading's rendered text, read from the DOM so it always matches the active language. */
  label: string
}

interface IReadingProgressNavProps {
  /** Ordered list of the article's section headings to track and link to. */
  headings: IReadingProgressHeading[]
}

/** How far below the sticky header a heading must scroll before it counts as "reached". */
const ACTIVATION_LINE_PX = 160

export const ReadingProgressNav = ({ headings }: IReadingProgressNavProps) => {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null)

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    /** Resolved in one pass - only headings whose element actually exists in the DOM. */
    const elements = headings.reduce<HTMLElement[]>((found, { id }) => {
      const element = document.getElementById(id)
      return element ? [...found, element] : found
    }, [])

    if (elements.length === 0) {
      return
    }

    /** Recomputes which heading is current from live positions, not crossing events -
     * correct whether the user scrolled gradually or jumped straight to a heading. */
    const updateActiveHeading = () => {
      const isAtDocumentBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2

      if (isAtDocumentBottom) {
        setActiveId(elements[elements.length - 1].id)
        return
      }

      let current = elements[0]

      for (const element of elements) {
        if (element.getBoundingClientRect().top <= ACTIVATION_LINE_PX) {
          current = element
        } else {
          break
        }
      }

      setActiveId(current.id)
    }

    let frame: number | null = null

    const scheduleUpdate = () => {
      if (frame !== null) {
        return
      }

      frame = window.requestAnimationFrame(() => {
        frame = null
        updateActiveHeading()
      })
    }

    updateActiveHeading()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [headings])

  const handleSelect = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (headings.length === 0) {
    return null
  }

  const activeIndex = Math.max(0, headings.findIndex(({ id }) => id === activeId))

  return (
    <div className={styles.navSlot}>
      <nav className={styles.nav} aria-label="Article sections">
        <ul className={styles.list}>
          {headings.map(({ id, label }, index) => {
            const state = index === activeIndex ? 'active' : index < activeIndex ? 'read' : 'unread'

            return (
              <li key={id} className={styles.item} data-read={index < activeIndex}>
                <button
                  type="button"
                  className={styles.link}
                  data-state={state}
                  aria-current={state === 'active' ? 'true' : undefined}
                  onClick={() => handleSelect(id)}
                >
                  <span className={styles.dot} />
                  <span className={styles.label}>{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export default ReadingProgressNav
