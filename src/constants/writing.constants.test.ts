import { describe, expect, it } from 'vitest'

import { ARTICLES } from '@/constants/articles.constants'
import { WRITING_ARTICLES } from '@/constants/writing.constants'

describe('writing article cards', () => {
  it('includes every self-hosted article from the registry', () => {
    expect(WRITING_ARTICLES.map(({ id }) => id)).toEqual(ARTICLES.map(({ slug }) => slug))
  })
})
