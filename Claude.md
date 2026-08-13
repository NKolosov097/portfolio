# Claude development guide

Claude may assist with planning, prototyping, tests, and documentation. Treat all generated output as a draft: a human must review, validate, and approve every result before it is accepted.

## Development conventions

- Use strict TypeScript. Do not introduce `any`; avoid type assertions; prefer generics, type guards, and discriminated unions. Prefix boolean identifiers with `is` or `has`.
- Use JSDoc to explain intent on interface and type fields, component props, and non-`useState` variables.
- Keep comments to 1-2 lines — short but information-dense: state the non-obvious reason, not paragraph-length blocks.
- Name true module-level constants (fixed config values, lookup arrays/records) in `UPPER_SNAKE_CASE`. Exempt Next.js file-convention exports (`size`, `contentType`, `generateStaticParams`, etc.), which must keep their framework-mandated names.
- Keep each component in its own directory with separate component and style files.
- Use stable, build-safe `id`, `data-testid`, or `data-key` selectors for QA; do not generate random selectors.
- Reuse existing patterns, helpers, and utilities before adding new abstractions.
- Prefer destructuring — function params, callback args, object fields — over repeated dotted access.

## Documentation

- After any change to the code structure (new/removed/renamed top-level `src/*` directories, new routes, new scripts, new test files), check whether `README.md` still matches reality and update it if not — Architecture, Project structure, Available scripts, Testing, and Code quality & conventions are the sections most likely to drift.

## Git

- Commits are authored by the repo owner only. Do not add yourself as a co-author or participant (no `Co-Authored-By` trailer).

## Validation

Before considering a change complete, run:

```bash
pnpm check-types && pnpm lint
```
