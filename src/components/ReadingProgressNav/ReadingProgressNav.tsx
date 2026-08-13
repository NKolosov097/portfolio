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

export const ReadingProgressNav = ({ headings }: IReadingProgressNavProps) => {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null)

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) {
      return
    }

    /** Tracks which observed headings are currently intersecting, keyed by id. */
    const visibleIds = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id)
          } else {
            visibleIds.delete(entry.target.id)
          }
        })

        const firstVisible = headings.find((heading) => visibleIds.has(heading.id))

        if (firstVisible) {
          setActiveId(firstVisible.id)
        }
      },
      // A heading counts as "reached" once it crosses the upper fifth of the viewport,
      // and stays current until the next heading does the same.
      { rootMargin: '-20% 0px -75% 0px', threshold: 0 },
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [headings])

  const handleSelect = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (headings.length === 0) {
    return null
  }

  const activeIndex = Math.max(
    0,
    headings.findIndex((heading) => heading.id === activeId),
  )
  const progressPercent = (activeIndex / Math.max(1, headings.length - 1)) * 100

  return (
    <div className={styles.navSlot}>
      <nav className={styles.nav} aria-label="Article sections">
        <ul className={styles.list}>
          <span className={styles.track} aria-hidden="true" />
          <span
            className={styles.progress}
            aria-hidden="true"
            style={{ height: `${progressPercent}%` }}
          />

          {headings.map((heading, index) => {
            const state = index === activeIndex ? 'active' : index < activeIndex ? 'read' : 'unread'

            return (
              <li key={heading.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.link}
                  data-state={state}
                  aria-current={state === 'active' ? 'true' : undefined}
                  onClick={() => handleSelect(heading.id)}
                >
                  <span className={styles.dot} />
                  <span className={styles.label}>{heading.label}</span>
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
