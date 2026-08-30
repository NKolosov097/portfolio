'use client'

import { useRef, type PointerEvent } from 'react'

import styles from '@/home-sections/Resume/Resume.module.css'

import { IFavoriteTool } from '@/home-sections/Resume/types/resume.type'

export const FavoriteTool = ({ id, icon, title }: IFavoriteTool) => {
  const cardRef = useRef<HTMLLIElement>(null)

  /** Tracks the cursor so the ambient glow centres on the point under the pointer. */
  const handlePointerMove = (event: PointerEvent<HTMLLIElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    // Card not laid out yet - nothing meaningful to compute.
    if (rect.width === 0 || rect.height === 0) return

    card.style.setProperty('--glow-x', `${event.clientX - rect.left}px`)
    card.style.setProperty('--glow-y', `${event.clientY - rect.top}px`)
  }

  return (
    <li
      ref={cardRef}
      className={styles.favoriteToolItem}
      data-key={id}
      onPointerMove={handlePointerMove}
    >
      <span className={styles.favoriteToolGlow} aria-hidden="true" />
      <span className={styles.favoriteToolIcon}>{icon}</span>
      <h4 className={styles.favoriteToolTitle}>{title}</h4>
    </li>
  )
}

export default FavoriteTool
