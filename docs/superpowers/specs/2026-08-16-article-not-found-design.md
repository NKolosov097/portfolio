# Article-specific not-found page

## Problem

`src/app/articles/[slug]/page.tsx` calls `notFound()` for an unknown slug, which currently
renders the global `src/app/not-found.tsx` - generic copy ("There is no such page") pointing
back to the home page. A reader who mistyped or followed a stale article link should land on
a page that acknowledges they were looking for an article, and offers a way back into the
articles list instead of the home page.

## Solution

### Shared presentational component

`src/components/NotFoundView/{NotFoundView.tsx, NotFoundView.module.css}`:

- Props: `heading: string`, `description: string`, `linkHref: string`, `linkLabel: string`,
  `testId: string`. Each documented with JSDoc.
- Renders the existing markup shape (`section` > heading > description > `Link` styled as
  `g-link g-link_view_normal`), with `data-testid={testId}` on the link.
- No i18n awareness - callers resolve `t(...)` and pass plain strings. Keeps the component
  reusable for any not-found variant without adding a translation dependency to it.
- Owns the layout styles currently in `globals.css` (`.not-found-section`, `-header`,
  `-description`, `-link`), moved into `NotFoundView.module.css` as the single source of the
  visual treatment. Removed from `globals.css` once moved.

### Global not-found page (refactor, behavior unchanged)

`src/app/not-found.tsx` becomes a thin wrapper: `useTranslation()`, then renders
`<NotFoundView heading={t('notFound.title')} description={t('notFound.description')}
linkHref="/" linkLabel={t('notFound.backBtn')} testId="not-found-link" />`.

### Article not-found page (new)

`src/app/articles/[slug]/not-found.tsx`, same shape, `linkHref="/articles"`, new translation
namespace `articleNotFound`. Picked up automatically by Next.js for the `articles/[slug]`
segment when `notFound()` is called from `page.tsx` - no changes needed there.

### Copy (new `articleNotFound` namespace, added to both locale files)

| key           | en                                                               | ru                                                                           |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `title`       | There is no such article                                         | Такой статьи не существует                                                   |
| `description` | But don't worry! There's always something interesting to read :) | Но вы не расстраивайтесь! Всегда можно найти что-то интересное для чтения :) |
| `backBtn`     | Browse all articles                                              | Ко всем статьям                                                              |

Mirrors the tone of the existing sibling `notFound` namespace.

## Scope

- New: `src/components/NotFoundView/NotFoundView.tsx`, `NotFoundView.module.css`,
  `src/app/articles/[slug]/not-found.tsx`.
- Modified: `src/app/not-found.tsx` (refactor to use `NotFoundView`), `src/styles/globals.css`
  (remove the four `.not-found-*` rules), `public/locales/en.json`, `public/locales/ru.json`
  (new `articleNotFound` namespace).
- No changes to `src/app/articles/[slug]/page.tsx` - it already calls `notFound()`.
- No new dependencies.
