import { describe, expect, it } from 'vitest'

import { EAppearance, resolveRequestAppearance } from '@/constants/theme.constants'

describe('resolveRequestAppearance', () => {
  it.each([null, undefined, '', 'spooky', EAppearance.halloween, EAppearance.original])(
    'resolves %s to original',
    (cookieAppearance) => {
      expect(resolveRequestAppearance(cookieAppearance)).toBe(EAppearance.original)
    },
  )
})
