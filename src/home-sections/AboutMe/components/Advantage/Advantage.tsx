'use client'

import { useRef, type PointerEvent } from 'react'

import styles from '@/home-sections/AboutMe/AboutMe.module.css'

import { IAdvantage } from '@/home-sections/AboutMe/types/aboutMe.type'

export const Advantage = ({ id, title, description }: IAdvantage) => {
  const cardRef = useRef<HTMLLIElement>(null)

  /** Tracks the cursor so the ambient glow centres on the point under the pointer. */
  const handlePointerMove = (event: PointerEvent<HTMLLIElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    // Card not laid out yet - nothing meaningful to compute.
    if (rect.width === 0 || rect.height === 0) return

    const glowX = event.clientX - rect.left
    const glowY = event.clientY - rect.top

    card.style.setProperty('--glow-x', `${glowX}px`)
    card.style.setProperty('--glow-y', `${glowY}px`)
  }

  return (
    <li ref={cardRef} className={styles.advantage} data-key={id} onPointerMove={handlePointerMove}>
      <span className={styles.advantageGlow} aria-hidden="true" />
      <h3 className={styles.advantageHeader}>{title}</h3>
      <p className={styles.advantageDescription}>{description}</p>
    </li>
  )
}

export default Advantage
