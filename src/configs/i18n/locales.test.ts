import { describe, expect, it } from 'vitest'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

/** Narrows an unknown translation node to a plain object so it can be walked without a cast. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const collectLeaves = (value: unknown, prefix = ''): [string, unknown][] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectLeaves(item, `${prefix}[${index}]`))
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, nested]) =>
      collectLeaves(nested, prefix ? `${prefix}.${key}` : key),
    )
  }

  return [[prefix, value]]
}

const collectKeys = (value: unknown): string[] => collectLeaves(value).map(([keyPath]) => keyPath)

const enKeys = collectKeys(en)
const ruKeys = collectKeys(ru)

describe('locale files', () => {
  it('translates every English key into Russian', () => {
    expect(enKeys.filter((keyPath) => !ruKeys.includes(keyPath))).toEqual([])
  })

  it('has no Russian key that is missing from English', () => {
    expect(ruKeys.filter((keyPath) => !enKeys.includes(keyPath))).toEqual([])
  })

  it('defines at least one key, so a truncated file cannot pass the parity checks', () => {
    expect(enKeys.length).toBeGreaterThan(0)
  })

  it('has no duplicate paths after flattening', () => {
    expect(new Set(enKeys).size).toBe(enKeys.length)
    expect(new Set(ruKeys).size).toBe(ruKeys.length)
  })

  it.each([
    ['en', en],
    ['ru', ru],
  ])('has no blank values in %s.json', (_locale, source) => {
    const blankPaths = collectLeaves(source)
      .filter(([, leaf]) => typeof leaf === 'string' && leaf.trim().length === 0)
      .map(([keyPath]) => keyPath)

    expect(blankPaths).toEqual([])
  })

  it.each([
    ['en', en],
    ['ru', ru],
  ])('has only string leaves in %s.json', (_locale, source) => {
    const nonStringPaths = collectLeaves(source)
      .filter(([, leaf]) => typeof leaf !== 'string')
      .map(([keyPath]) => keyPath)

    expect(nonStringPaths).toEqual([])
  })
})
