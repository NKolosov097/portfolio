import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { TOOL_LOGOS } from '@/constants/tools.constants'

/** Absolute `public/` directory, derived from this file so the check runs on POSIX and Windows alike. */
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public')

describe('tool logo catalog', () => {
  it('keeps every id unique, so React keys and `data-key` selectors stay stable', () => {
    const ids = TOOL_LOGOS.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ships a file for every logo, so no card renders a broken image', () => {
    const missing = TOOL_LOGOS.filter(
      ({ src }) => !existsSync(path.join(PUBLIC_DIR, src.replace(/^\//, ''))),
    ).map(({ id, src }) => `${id} -> ${src}`)

    expect(missing).toEqual([])
  })

  it('labels every logo, since the title doubles as the image alt text', () => {
    const unlabelled = TOOL_LOGOS.filter(({ title }) => title.trim().length === 0).map(
      ({ id }) => id,
    )

    expect(unlabelled).toEqual([])
  })

  it('covers the technologies the CV leads with', () => {
    const ids = new Set(TOOL_LOGOS.map(({ id }) => id))

    for (const id of ['typescript', 'react', 'nextjs', 'nodejs', 'playwright', 'docker']) {
      expect(ids.has(id), id).toBe(true)
    }
  })
})
