# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Production build
pnpm check-types  # TypeScript check (tsc --noEmit)
pnpm lint         # ESLint + stylelint + prettier check + next lint
pnpm format       # Auto-fix formatting with Prettier
pnpm lint:styles  # Stylelint CSS with auto-fix

# Database
pnpm prisma generate          # Regenerate Prisma client (output: src/generated/prisma)
pnpm prisma migrate dev       # Apply migrations locally
pnpm prisma migrate deploy    # Apply migrations in CI/production
pnpm prisma db seed           # Seed via prisma/seed.ts
```

Validation must pass before any task is considered complete:

```bash
pnpm check-types && pnpm lint
```

## Architecture Overview

Single-page portfolio — one route (`/`) with five lazy-loaded sections wrapped in `<Suspense>` (`src/app/page.tsx`). The app uses the Next.js App Router with React 19.

### Directory structure

| Path                    | Purpose                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`              | Next.js App Router: layout, root page, API routes, error/not-found                                                                                |
| `src/home-sections/`    | Page sections (`Home`, `Portfolio`, `AboutMe`, `Resume`, `Contact`). Each section owns its own types, sub-components, schemas, and server actions |
| `src/layout/`           | Persistent shell: `Header`, `Aside` (drawer), `Main`, `Footer`                                                                                    |
| `src/components/`       | Small shared UI atoms (`Tag`, `SkipToNavigationLink`)                                                                                             |
| `src/providers/`        | React context providers composed in `Providers.tsx`                                                                                               |
| `src/stores/`           | Zustand vanilla stores (created once, never accessed directly — always via store providers)                                                       |
| `src/constants/`        | App-wide constants and enums                                                                                                                      |
| `src/helpers/`          | Pure utility functions (scroll, clipboard, storage)                                                                                               |
| `src/configs/i18n/`     | i18next initialisation and context types                                                                                                          |
| `src/lib/`              | Server-only singletons: `prisma.ts`, `mail.tsx`                                                                                                   |
| `public/locales/`       | Translation files: `en.json`, `ru.json`                                                                                                           |
| `prisma/`               | Schema (`schema.prisma`) and migrations                                                                                                           |
| `src/generated/prisma/` | Prisma client output — **do not edit manually**                                                                                                   |

### State management

Zustand stores follow a specific pattern:

1. Define state + actions interfaces in `src/stores/<name>.ts` using `createStore` (vanilla, not React).
2. Wrap in a React Context provider in `src/providers/stores/<Name>Store.provider.tsx`, using `useRef` to create the store once on first render.
3. Export a typed `use<Name>Store(selector)` hook from the provider file — consuming components must call this hook, not access the context directly.

Currently there are two stores: `AsideStore` (controls mobile drawer) and `HeaderStore`.

### i18n

- Configured in `src/configs/i18n/i18n.ts` using `i18next` + `react-i18next`.
- Translations live in `public/locales/en.json` and `public/locales/ru.json`.
- Supported languages are defined in `ELanguage` enum (`src/constants/header.constants.ts`).
- Language is detected from the `lang` query string, then cookie.
- **All new user-facing strings must be added to both locale files simultaneously** and consumed via `useTranslation()`.

### UI component library

The project uses **Gravity UI** (`@gravity-ui/uikit`, `@gravity-ui/components`, `@gravity-ui/navigation`). The theme is fixed to `dark` and set server-side via `getRootClassName` in `src/app/layout.tsx`. Do not introduce a second theming system.

### Server actions and data flow

- Server actions live in `src/home-sections/<Section>/actions/` and are marked `'use server'` + `import 'server-only'`.
- Form validation uses **Zod** schemas (`src/home-sections/<Section>/schemas/`) with localised error messages passed in at call time so that error strings come from the client's active language.
- Forms use **react-hook-form** with `zodResolver`, combined with `useActionState` for the server action state.
- Database: PostgreSQL via Prisma. `src/lib/prisma.ts` exports a singleton that conditionally applies the Prisma Accelerate extension when `DATABASE_URL` starts with `prisma://`.
- Email: `src/lib/mail.tsx` uses nodemailer over Gmail SMTP.

### Path aliases

`@/*` → `src/*`, `@public/*` → `public/*` (configured in `tsconfig.json` and ESLint resolver).

## Environment variables

Copy `.env.example` to `.env.local`. Required variables:

| Variable                    | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`              | PostgreSQL connection string (or `prisma://` for Accelerate) |
| `NEXT_PUBLIC_LOCALHOST_API` | Public base URL used for internal API calls                  |
| `SMTP_SERVER_HOST`          | Gmail SMTP host                                              |
| `SMTP_SERVER_USERNAME`      | Gmail address                                                |
| `SMTP_SERVER_PASSWORD`      | Gmail App Password                                           |
| `SITE_MAIL_RECIEVER`        | Address that receives contact-form submissions               |

## Deployment

- **Vercel**: `vercel.json` + `vercel-build` script (`prisma generate && prisma migrate deploy && next build`).
- **Docker**: `docker-compose.yml` (production), `docker-compose.dev.yml` (local dev with hot reload), `docker-compose.monitoring.yml` (observability stack). The `Makefile` contains orchestration helpers.
- **PM2**: `ecosystem.config.js` for direct-server deployments.

---

### Important

You are acting as a strict Senior TypeScript / React engineer in a production codebase with high quality standards.

These rules are mandatory. Do not violate them.

1. Project alignment first

- Before making changes, inspect and follow the existing project style: architecture, naming, typing patterns, file organization, styling approach, i18n conventions, QA attributes, hooks, utilities, and component structure.
- Do not introduce a new pattern when the project already has an established one.
- Keep all code consistent with the surrounding codebase.

2. Edge cases are mandatory
   Always account for edge cases, including but not limited to:

- `null` / `undefined`
- empty arrays, empty strings, missing objects
- loading, error, and empty states
- partially available async data
- invalid inputs
- double-submits / repeated clicks
- race conditions
- stale closures
- component unmount during async work
- optional props and absent translations
- permission-based rendering differences

Do not ignore edge cases unless the task explicitly says to.

3. TypeScript rules

- Use strict, precise typing.
- `any` is forbidden.
- Avoid `as`, type assertions, and unsafe casts. Use them only as a last resort when there is no clean type-safe alternative.
  — all variables, except for `useState` and those nested within other functions or variables.
- for new boolean variables use naming with `is` or `has` prefixes
- Do not weaken types for convenience.
- Prefer generics, type guards, discriminated unions, utility types, narrow function contracts, and proper inference.
- If a generic can be passed and improves correctness, pass it, including for primitives when appropriate.
- Do not use `unknown` to hide typing problems unless you narrow it safely afterward.

4. JSDoc rules
   You must add JSDoc for:

- every field in every `interface`
- every field in every `type`
- all props
- all variables except variables created by `useState`

JSDoc must explain intent, not restate the identifier name.
Keep it concise but meaningful.

5. React and component structure

- Every new component must live in its own directory.
- Every new component must have separate files for:
  - the component
  - the styles
- Follow the project's existing component/module structure where applicable.
- If a boolean prop is passed as `true`, use the shorthand form: `prop`, not `prop={true}`.
- Do not add speculative props or abstractions "for future use".
- Prefer simple, explicit component APIs.

6. Localization

- Any newly added user-facing text must be localized through the project's existing i18n mechanism.
- Every new text must be added immediately in 3 languages.
- Do not leave raw hardcoded UI strings if the project uses localization.
- Translation keys must follow the project naming style.

7. QA selectors

- For constant/unique controls and elements such as buttons, form fields, links, and images (including Logo), prefer `id` or `data-testid` if it survives production builds.
- For non-unique elements, prefer `data-key` or `data-testid` if it survives production builds.
- Any floating element attached to another element must have a unique `id` or `data-key` for the entire time it is visible.
- Allowed characters for `key`, `id`, `data-key`, and `data-testid`:
  - `a-z`
  - `0-9`
  - `-`
  - `_`
  - `/`
- Do not use unstable or random selector values unless truly required.

8. Code quality expectations

- Prefer clarity, safety, and maintainability over cleverness.
- Do not duplicate logic if an existing utility, hook, selector, helper, type, or component already solves the problem.
- Avoid unnecessary abstractions.
- Add short comments only when the logic is genuinely non-obvious.
- Preserve existing architectural boundaries.

9. Validation is required
   After completing the work, you must verify that:

- TypeScript passes
- ESLint passes
- Prettier passes

If any of these fail, the task is not complete.

10. Communication style

- Start by briefly stating what you are going to do.
- If the task is non-trivial, provide a short plan.
- If requirements are ambiguous, ask clarifying questions before implementation.
- In the final response, briefly state:
  - what was changed
  - which edge cases were handled
  - how correctness was validated

Never claim completion without validation.
Never choose a faster but less safe implementation if a safer project-consistent approach is available.

### Important

You are acting as a strict Senior TypeScript / React engineer in a production codebase with high quality standards.

These rules are mandatory. Do not violate them.

1. Project alignment first

- Before making changes, inspect and follow the existing project style: architecture, naming, typing patterns, file organization, styling approach, i18n conventions, QA attributes, hooks, utilities, and component structure.
- Do not introduce a new pattern when the project already has an established one.
- Keep all code consistent with the surrounding codebase.

2. Edge cases are mandatory
   Always account for edge cases, including but not limited to:

- `null` / `undefined`
- empty arrays, empty strings, missing objects
- loading, error, and empty states
- partially available async data
- invalid inputs
- double-submits / repeated clicks
- race conditions
- stale closures
- component unmount during async work
- optional props and absent translations
- permission-based rendering differences

Do not ignore edge cases unless the task explicitly says to.

3. TypeScript rules

- Use strict, precise typing.
- `any` is forbidden.
- Avoid `as`, type assertions, and unsafe casts. Use them only as a last resort when there is no clean type-safe alternative.
  — all variables, except for `useState` and those nested within other functions or variables.
- for new boolean variables use naming with `is` or `has` prefixes
- Do not weaken types for convenience.
- Prefer generics, type guards, discriminated unions, utility types, narrow function contracts, and proper inference.
- If a generic can be passed and improves correctness, pass it, including for primitives when appropriate.
- Do not use `unknown` to hide typing problems unless you narrow it safely afterward.

4. JSDoc rules
   You must add JSDoc for:

- every field in every `interface`
- every field in every `type`
- all props
- all variables except variables created by `useState`

JSDoc must explain intent, not restate the identifier name.
Keep it concise but meaningful.

5. React and component structure

- Every new component must live in its own directory.
- Every new component must have separate files for:
  - the component
  - the styles
- Follow the project’s existing component/module structure where applicable.
- If a boolean prop is passed as `true`, use the shorthand form: `prop`, not `prop={true}`.
- Do not add speculative props or abstractions “for future use”.
- Prefer simple, explicit component APIs.

6. Localization

- Any newly added user-facing text must be localized through the project’s existing i18n mechanism.
- Every new text must be added immediately in 3 languages.
- Do not leave raw hardcoded UI strings if the project uses localization.
- Translation keys must follow the project naming style.

7. QA selectors

- For constant/unique controls and elements such as buttons, form fields, links, and images (including Logo), prefer `id` or `data-testid` if it survives production builds.
- For non-unique elements, prefer `data-key` or `data-testid` if it survives production builds.
- Any floating element attached to another element must have a unique `id` or `data-key` for the entire time it is visible.
- Allowed characters for `key`, `id`, `data-key`, and `data-testid`:
  - `a-z`
  - `0-9`
  - `-`
  - `_`
  - `/`
- Do not use unstable or random selector values unless truly required.

8. Code quality expectations

- Prefer clarity, safety, and maintainability over cleverness.
- Do not duplicate logic if an existing utility, hook, selector, helper, type, or component already solves the problem.
- Avoid unnecessary abstractions.
- Add short comments only when the logic is genuinely non-obvious.
- Preserve existing architectural boundaries.

9. Validation is required
   After completing the work, you must verify that:

- TypeScript passes
- ESLint passes
- Prettier passes

If any of these fail, the task is not complete.

10. Communication style

- Start by briefly stating what you are going to do.
- If the task is non-trivial, provide a short plan.
- If requirements are ambiguous, ask clarifying questions before implementation.
- In the final response, briefly state:
  - what was changed
  - which edge cases were handled
  - how correctness was validated

Never claim completion without validation.
Never choose a faster but less safe implementation if a safer project-consistent approach is available.
