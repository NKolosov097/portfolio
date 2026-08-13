import { expect, test } from '@playwright/test'

import { LANG_COOKIE_KEY } from '@/helpers/language'
import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle as article } from '@/constants/articles.constants'

/** Routes rendered through the root layout, where the server resolves the visitor's language. */
const ROUTES = ['/', `/articles/${article.slug}`]

for (const route of ROUTES) {
  test(`renders ${route} in the cookie-persisted language with no hydration error`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: LANG_COOKIE_KEY, value: ELanguage.ru, domain: 'localhost', path: '/' },
    ])

    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

    await page.goto(route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    expect(errors, errors.join('\n\n')).toHaveLength(0)
  })
}
