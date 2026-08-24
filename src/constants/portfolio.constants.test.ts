import { describe, expect, it } from 'vitest'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

import { PROJECTS } from '@/constants/portfolio.constants'

describe('portfolio project catalog', () => {
  it('links the renamed NK Meet project and its preview to the canonical repository', () => {
    const project = PROJECTS.find(({ id }) => id === 'nk-meet')

    expect(project).toMatchObject({
      href: 'https://github.com/NKolosov097/nk-meet',
      img: 'https://opengraph.githubassets.com/1/NKolosov097/nk-meet',
      descriptionKey: 'portfolio.projects.nk-meet.description',
    })
    expect(PROJECTS.some(({ id }) => id === 'native-meet')).toBe(false)
  })

  it('presents NK Meet under its current product name in both locales', () => {
    expect(en.portfolio.projects['nk-meet'].title).toBe('NK Meet')
    expect(ru.portfolio.projects['nk-meet'].title).toBe('NK Meet')
    expect(en.portfolio.projects['nk-meet'].description).toContain('shareable room links')
    expect(ru.portfolio.projects['nk-meet'].description).toContain('ссылки-приглашения')
  })
})
