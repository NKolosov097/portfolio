'use client'

import { useRef, type PointerEvent } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

import styles from './Project.module.css'

import { IProject } from '@/home-sections/Portfolio/types/portfolio.type'

/** Maximum tilt angle (deg) the card reaches as the cursor presses over it. */
const MAX_TIL_DEG = 10
/** Maximum white-shadow offset (px) shifted toward the lifted side of the card. */
const MAX_SHADOW_SHIFT = 24

export const Project = ({ id, img, href, descriptionKey, tags }: IProject) => {
  const { t } = useTranslation()

  const cardRef = useRef<HTMLAnchorElement>(null)

  const title = t(`portfolio.projects.${id}.title`)
  const description = t(descriptionKey)

  /** Tilts the card so the point under the cursor recedes and offsets the shadow oppositely. */
  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    // Card not laid out yet - nothing meaningful to compute.
    if (rect.width === 0 || rect.height === 0) return

    const relativeX = (event.clientX - rect.left) / rect.width
    const relativeY = (event.clientY - rect.top) / rect.height

    // CSS Y axis points down, so these signs make the point under the cursor
    // recede from the viewer ("pressed into the surface").
    const rotateX = (0.5 - relativeY) * MAX_TIL_DEG
    const rotateY = (relativeX - 0.5) * MAX_TIL_DEG
    // White glow concentrates under the cursor, marking the pressed point.
    const shadowX = (relativeX - 0.5) * MAX_SHADOW_SHIFT
    const shadowY = (relativeY - 0.5) * MAX_SHADOW_SHIFT

    card.style.setProperty('--rotate-x', `${rotateX}deg`)
    card.style.setProperty('--rotate-y', `${rotateY}deg`)
    card.style.setProperty('--shadow-x', `${shadowX}px`)
    card.style.setProperty('--shadow-y', `${shadowY}px`)
  }

  /** Resets the card back to its flat resting state when the cursor leaves. */
  const handlePointerLeave = () => {
    const card = cardRef.current
    if (!card) return

    card.style.setProperty('--rotate-x', '0deg')
    card.style.setProperty('--rotate-y', '0deg')
    card.style.setProperty('--shadow-x', '0px')
    card.style.setProperty('--shadow-y', '0px')
  }

  return (
    <li className={styles.container}>
      <a
        ref={cardRef}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title} - ${t('aside.opensInNewTab')}`}
        data-testid={`project-card-${id}`}
        className={styles.card}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <span className={styles.imageWrapper}>
          <Image
            src={img}
            alt={title}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.image}
          />
        </span>

        <span className={styles.body}>
          <span className={styles.title}>{title}</span>
          <span className={styles.description}>{description}</span>

          {tags.length > 0 && (
            <span className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag.id} data-key={tag.id} className={styles.tag}>
                  {tag.title}
                </span>
              ))}
            </span>
          )}
        </span>
      </a>
    </li>
  )
}
