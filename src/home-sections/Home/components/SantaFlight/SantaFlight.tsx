'use client'

import { useEffect, useRef } from 'react'

import { cancelIdle, requestIdle } from '@/helpers/idleCallback'
import type { SantaRenderer } from './santaController'
import styles from './SantaFlight.module.css'

interface SantaFlightProps {
  previewTime?: number | null
}

/** Gate the optional GPU scene on visibility, intersection, idle time and motion preferences. */
export function SantaFlight({ previewTime }: SantaFlightProps) {
  const marker = useRef<HTMLDivElement>(null)
  const renderer = useRef<SantaRenderer | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const selectedTime = useRef(previewTime)
  const preview = previewTime !== undefined

  // A mode change seeks the existing renderer; it never recreates the WebGL context.
  useEffect(() => {
    selectedTime.current = previewTime
    const host = hostRef.current
    const field = marker.current
    if (host && field) {
      const model = previewTime === -1
      host.className = model ? styles.preview : styles.portal
      ;(model ? field : document.body).append(host)
    }
    renderer.current?.seek(previewTime ?? null)
  }, [previewTime])

  // Observe the actual section: a fixed portal would otherwise appear permanently onscreen.
  useEffect(() => {
    const field = marker.current
    const section = field?.closest('[data-santa-preview]') ?? field?.closest('section')
    if (!field || !section) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const host = document.createElement('div')
    hostRef.current = host
    const model = selectedTime.current === -1
    host.className = model ? styles.preview : styles.portal
    host.dataset.testid = 'santa-flight'
    host.style.visibility = 'hidden'
    host.setAttribute('aria-hidden', 'true')
    ;(model ? field : document.body).append(host)
    let active = true
    let idle = false
    let intersects = false
    let loading = false
    let loaded: typeof import('./santaController') | null = null

    /** Recheck every prerequisite after asynchronous imports and before creating GPU resources. */
    function eligible(): boolean {
      return active && idle && intersects && !document.hidden && !motion.matches
    }

    /** Pause immediately when hidden and never resurrect a renderer after cleanup or a theme switch. */
    function reconcile(): void {
      if (!active) return
      host.style.visibility = eligible() ? 'visible' : 'hidden'
      if (motion.matches) {
        renderer.current?.dispose()
        renderer.current = null
      }
      if (!eligible()) {
        renderer.current?.setRunning(false)
        return
      }
      if (renderer.current) {
        renderer.current.setRunning(true)
        return
      }
      if (loaded) {
        try {
          renderer.current = loaded.createSantaController(host, selectedTime.current ?? null)
          renderer.current.setRunning(true)
        } catch {
          renderer.current?.dispose()
          renderer.current = null
          host.dataset.status = 'unavailable'
          host.replaceChildren()
        }
        return
      }
      if (loading) return
      loading = true
      void import('./santaController')
        .then((module) => {
          if (!eligible()) {
            loading = false
            return
          }
          loaded = module
          loading = false
          reconcile()
        })
        .catch(() => {
          loading = false
          if (active) host.dataset.status = 'unavailable'
        })
    }

    const intersection = new IntersectionObserver(([entry]) => {
      intersects = entry?.isIntersecting ?? false
      reconcile()
    })
    intersection.observe(section)
    const idleHandle = requestIdle(() => {
      idle = true
      reconcile()
    })
    motion.addEventListener('change', reconcile)
    document.addEventListener('visibilitychange', reconcile)

    return () => {
      active = false
      cancelIdle(idleHandle)
      intersection.disconnect()
      motion.removeEventListener('change', reconcile)
      document.removeEventListener('visibilitychange', reconcile)
      renderer.current?.dispose()
      renderer.current = null
      hostRef.current = null
      host.remove()
    }
  }, [preview])

  return <div ref={marker} className={preview ? styles.stage : styles.marker} aria-hidden="true" />
}
