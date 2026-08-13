import { describe, expect, it } from 'vitest'
import { JSX } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import AiBoilerplateSeniorEngineersEn from './en'
import AiBoilerplateSeniorEngineersRu from './ru'

/** Extracts every `<h2>`/`<h3>` `id` attribute from a rendered article body, in document order. */
const extractHeadingIds = (Content: () => JSX.Element): string[] => {
  const html = renderToStaticMarkup(Content())
  return [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((match) => match[1])
}

describe('ai-boilerplate-senior-engineers content', () => {
  it('defines at least one deep-linkable heading', () => {
    expect(extractHeadingIds(AiBoilerplateSeniorEngineersEn).length).toBeGreaterThan(0)
  })

  it('uses the exact same heading ids in both languages, in the same order', () => {
    expect(extractHeadingIds(AiBoilerplateSeniorEngineersRu)).toEqual(
      extractHeadingIds(AiBoilerplateSeniorEngineersEn),
    )
  })
})
