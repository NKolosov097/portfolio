import { describe, expect, it } from 'vitest'

import { ELanguage } from '@/constants/header.constants'
import { articles } from '@/constants/articles.constants'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('articles registry', () => {
  it('defines at least one article', () => {
    expect(articles.length).toBeGreaterThan(0)
  })

  it('gives every article a unique, kebab-case slug', () => {
    const slugs = articles.map((article) => article.slug)

    for (const slug of slugs) {
      expect(slug).toMatch(SLUG_PATTERN)
    }

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('translates title and description into every supported language', () => {
    for (const article of articles) {
      for (const language of [ELanguage.en, ELanguage.ru]) {
        expect(article.title[language]?.trim()).toBeTruthy()
        expect(article.description[language]?.trim()).toBeTruthy()
      }
    }
  })

  it('gives every article a positive reading time and a parsable publish date', () => {
    for (const article of articles) {
      expect(article.readingTimeMinutes).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(article.publishedDate))).toBe(false)
    }
  })
})
