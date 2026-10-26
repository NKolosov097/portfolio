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
  })

  it('presents NK Meet under its current product name in both locales', () => {
    expect(en.portfolio.projects['nk-meet'].title).toBe('NK Meet')
    expect(ru.portfolio.projects['nk-meet'].title).toBe('NK Meet')
    expect(en.portfolio.projects['nk-meet'].description).toContain('shareable room links')
    expect(ru.portfolio.projects['nk-meet'].description).toContain('ссылки-приглашения')
  })

  it('ships the Clinical Cases project ahead of the older catalog entries', () => {
    expect(PROJECTS[0]).toMatchObject({
      id: 'clinical-cases',
      href: 'https://github.com/NKolosov097/clinical-cases',
      img: 'https://opengraph.githubassets.com/1/NKolosov097/clinical-cases',
      descriptionKey: 'portfolio.projects.clinical-cases.description',
    })
  })

  it('backs every catalog entry with a titled description in both locales', () => {
    for (const { id, descriptionKey } of PROJECTS) {
      expect(descriptionKey).toBe(`portfolio.projects.${id}.description`)

      for (const locale of [en, ru]) {
        const entry = locale.portfolio.projects[id as keyof typeof locale.portfolio.projects]

        expect(entry?.title, id).toBeTruthy()
        expect(entry?.description, id).toBeTruthy()
      }
    }
  })
})
