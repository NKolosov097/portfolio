'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@gravity-ui/uikit'

import { SantaFlight } from '@/home-sections/Home/components/SantaFlight/SantaFlight'
import styles from './preview.module.css'

const MODES = [
  { label: 'Model', time: -1 },
  { label: 'Distant', time: 6 },
  { label: 'Near', time: 18 },
  { label: 'Live', time: null },
] as const

/** Inspect the same authored geometry and lighting used by the winter home decoration. */
export default function SantaPreview() {
  const [time, setTime] = useState<number | null>(-1)
  return (
    <section className={styles.preview} aria-labelledby="santa-title" data-santa-preview>
      <p className={styles.eyebrow}>Winter studies</p>
      <h1 id="santa-title">Santa’s night flight</h1>
      <p>Four textured deer, a curved sleigh and Santa in his red winter cap.</p>
      <div className={styles.controls} role="group" aria-label="Santa preview pose">
        {MODES.map((mode) => (
          <Button
            key={mode.label}
            view={time === mode.time ? 'action' : 'outlined'}
            selected={time === mode.time}
            onClick={() => setTime(mode.time)}
          >
            {mode.label}
          </Button>
        ))}
      </div>
      <section className={styles.stage} aria-label="Decorative flight stage">
        {time !== -1 && (
          <div className={styles.heading}>
            <h2>I’m Nikita Kolosov</h2>
            <h3>Software Engineer</h3>
          </div>
        )}
        <SantaFlight previewTime={time} />
      </section>
      <p className={styles.note}>
        Model holds a close pose. Distant, Near and Live fly across the full window; Live repeats
        every 48 seconds. Reduced motion hides the decoration and leaves the renderer unloaded.
      </p>
      <p className={styles.note}>
        Deer adapted from Grab3D’s CC0 White-Tailed Deer.{' '}
        <a href="/assets/models/winter/SOURCE.md">Model source</a>.
      </p>
      <Link href="/">Back to portfolio</Link>
    </section>
  )
}
