# Lint and AI-assisted Development Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm lint` compatible with Next.js 16 and document the repository's Claude-assisted development workflow with mandatory human review.

**Architecture:** Keep lint orchestration in the existing package scripts, removing only the obsolete Next.js wrapper command. Put detailed contributor guidance in a new root-level `Claude.md`, while README provides discoverable links, a concise AI-assisted development policy, and accurate script documentation.

**Tech Stack:** pnpm, ESLint 9, Stylelint 17, Prettier 3, Markdown

## Global Constraints

- Do not change lint rules, application behavior, dependencies, or CI configuration.
- The development guide filename is exactly `Claude.md`.
- Claude may assist with planning, prototyping, tests, and documentation.
- A human must review, validate, and approve AI-generated results.
- Keep all existing direct ESLint, Stylelint, and Prettier checks in `pnpm lint`.

---

### Task 1: Replace the obsolete Next.js lint command

**Files:**

- Modify: `package.json`

**Interfaces:**

- Consumes: the existing `lint:js`, `lint:styles`, and `lint:prettier` package scripts.
- Produces: a top-level `lint` script that exits after the three direct checks and never invokes `next lint`.

- [ ] **Step 1: Capture the existing failure**

Run: `pnpm lint`

Expected: the direct checks run, then the command fails when Next.js 16 interprets `lint` as an invalid project directory or otherwise rejects the removed `next lint` command.

- [ ] **Step 2: Remove only the obsolete command**

Change the script to:

```json
"lint": "npm run lint:js && npm run lint:styles && npm run lint:prettier"
```

- [ ] **Step 3: Verify the package script no longer references the removed command**

Run: `rg -n 'next lint' package.json`

Expected: no matches.

- [ ] **Step 4: Run the corrected lint pipeline**

Run: `pnpm lint`

Expected: ESLint, Stylelint, and Prettier all run; the process does not attempt `next lint` and exits successfully.

- [ ] **Step 5: Commit the lint fix**

```bash
git add package.json
git commit -m "fix: run ESLint directly on Next.js 16"
```

### Task 2: Add the Claude development guide and README policy

**Files:**

- Create: `Claude.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: the contribution conventions currently summarized in README and the corrected lint pipeline from Task 1.
- Produces: a working README link to `Claude.md`, a discoverable AI-assisted development policy, and accurate `pnpm lint` documentation.

- [ ] **Step 1: Create the development guide**

Create `Claude.md` with this structure and content:

````markdown
# Claude development guide

Claude may assist with planning, prototyping, tests, and documentation. Treat all generated output as a draft: a human must review, validate, and approve every result before it is accepted.

## Development conventions

- Use strict TypeScript. Do not introduce `any`; avoid type assertions; prefer generics, type guards, and discriminated unions. Prefix boolean identifiers with `is` or `has`.
- Use JSDoc to explain intent on interface and type fields, component props, and non-`useState` variables.
- Keep each component in its own directory with separate component and style files.
- Use stable, build-safe `id`, `data-testid`, or `data-key` selectors for QA; do not generate random selectors.
- Reuse existing patterns, helpers, and utilities before adding new abstractions.

## Validation

Before considering a change complete, run:

```bash
pnpm check-types && pnpm lint
```
````

- [ ] **Step 2: Make the README changes**

In `README.md`:

1. Add `AI-assisted development` to the table of contents before `Code quality & conventions`.
2. Update the `pnpm lint` row to say `ESLint + Stylelint + Prettier.`
3. Add an `## AI-assisted development` section before `## Code quality & conventions` stating that Claude assists with planning, prototyping, tests, and documentation, and that a human must manually review, validate, and approve every result.
4. Change the code-quality link target from `./CLAUDE.md` to `./Claude.md` while keeping the short convention summary.

- [ ] **Step 3: Check the expected documentation references**

Run: `rg -n 'AI-assisted development|Claude\.md|next lint|ESLint \+ Stylelint \+ Prettier' README.md Claude.md`

Expected: the new section, guide link, and corrected lint description are present; `next lint` and `CLAUDE.md` are absent.

- [ ] **Step 4: Verify Markdown and the complete lint gate**

Run: `pnpm exec prettier --check README.md Claude.md docs/superpowers/plans/2026-08-12-lint-and-ai-development-docs.md`

Expected: all three Markdown files pass Prettier.

Run: `pnpm check-types && pnpm lint`

Expected: type checking, ESLint, Stylelint, and Prettier all exit successfully.

- [ ] **Step 5: Commit the documentation**

```bash
git add README.md Claude.md
git commit -m "docs: describe Claude-assisted development"
```
