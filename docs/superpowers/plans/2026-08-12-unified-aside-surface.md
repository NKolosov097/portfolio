# Unified Aside Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original desktop aside color `#121212` and apply it consistently to desktop aside, mobile aside, and the language menu.

**Architecture:** Keep the three surfaces linked through the existing `--aside-bg-color` custom property. Update its value once at the root and retain the existing component-level references, with Playwright asserting the computed color for every surface.

**Tech Stack:** CSS custom properties, Gravity UI, Next.js, Playwright.

## Global Constraints

- Desktop aside, mobile aside, and language menu must resolve to `rgb(18, 18, 18)`.
- All three surfaces must continue consuming `var(--aside-bg-color)`.
- Do not change typography, layout, borders, shadows, dropdown states, or ghost behavior.
- Git commits must use `Nikita Kolosov <n.kolosov2003@mail.ru>` without attribution trailers.

---

### Task 1: Restore and share the original desktop surface

**Files:**

- Modify: `e2e/aside-ghost.spec.ts`
- Modify: `src/styles/globals.css`

**Interfaces:**

- Consumes: `--aside-bg-color`, `data-testid="aside-surface"`, `.drawerItemContent`, and `.g-dropdown-menu__popup-content .g-menu`.
- Produces: three surfaces with computed `background-color: rgb(18, 18, 18)`.

- [ ] **Step 1: Write the failing browser expectations**

  Replace `SOFT_CHARCOAL` with `ORIGINAL_ASIDE_BACKGROUND = 'rgb(18, 18, 18)'` and use it in the existing language-menu, desktop-aside, and mobile-aside assertions.

- [ ] **Step 2: Run the focused suite to verify RED**

  Run: `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium --grep="surface color|soft charcoal"`.

  Expected: FAIL because the three surfaces currently resolve to `rgb(37, 37, 37)`.

- [ ] **Step 3: Implement the shared color change**

  In `src/styles/globals.css`, change only:

  ```css
  --aside-bg-color: #121212;
  ```

- [ ] **Step 4: Run the focused suite to verify GREEN**

  Run: `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium --grep="surface color|original desktop"`.

  Expected: all three color assertions pass.

- [ ] **Step 5: Commit the implementation**

  ```powershell
  git add e2e/aside-ghost.spec.ts src/styles/globals.css
  git commit -m "style: unify aside surface colors"
  ```

### Task 2: Verify the completed change

**Files:**

- Verify: all changed source, test, and documentation files.

**Interfaces:**

- Consumes: the shared surface token and regression coverage.
- Produces: a verified feature branch ready for integration.

- [ ] **Step 1: Run static and unit checks**

  Run `pnpm.cmd check-format`, `pnpm.cmd check-types`, `pnpm.cmd check-lint`, and `pnpm.cmd test`, stopping on any nonzero exit code.

- [ ] **Step 2: Run production and browser checks**

  Run `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium`.

- [ ] **Step 3: Audit scope and authorship**

  Run `git diff --check`, `git status --short`, and `git log -3 --format="%h %an <%ae> %s%n%b"`. Confirm only intended files changed and every new commit belongs solely to Nikita Kolosov.
