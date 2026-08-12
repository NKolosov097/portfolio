# Language Dropdown Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the opened language menu the same `#252525` soft-charcoal background as the aside panel.

**Architecture:** Reuse the global `--aside-bg-color` token in the existing Gravity UI language-menu override. Verify the rendered popup through Playwright so the portal-based dropdown and its computed color are covered end to end.

**Tech Stack:** CSS custom properties, Gravity UI DropdownMenu, Playwright, Next.js.

## Global Constraints

- Change only the menu rendered inside `.g-dropdown-menu__popup-content`.
- Use `var(--aside-bg-color)` rather than duplicating `#252525`.
- Preserve transparent hover and selected states and the branded selected-language underline.
- Do not change other popup components or typography.
- Git commits must use `Nikita Kolosov <n.kolosov2003@mail.ru>` without attribution trailers.

---

### Task 1: Match the language menu to the aside surface

**Files:**

- Modify: `e2e/aside-ghost.spec.ts`
- Modify: `src/styles/globals.css`

**Interfaces:**

- Consumes: `.g-dropdown-menu__popup-content .g-menu` and `--aside-bg-color`.
- Produces: a language menu whose computed background is `rgb(37, 37, 37)`.

- [ ] **Step 1: Write the failing browser test**

  Add a test that opens `/`, reveals the aside, clicks the `change language` button, locates `.g-dropdown-menu__popup-content .g-menu`, and expects its `background-color` to equal the aside surface color `rgb(37, 37, 37)`.

- [ ] **Step 2: Run the focused test to verify RED**

  Run: `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium --grep="language menu"`.

  Expected: FAIL because the menu currently uses `var(--g-color-base-background)`.

- [ ] **Step 3: Implement the minimal CSS change**

  Replace the existing rule with:

  ```css
  .g-dropdown-menu__popup-content .g-menu {
    background-color: var(--aside-bg-color);
  }
  ```

- [ ] **Step 4: Run the focused test to verify GREEN**

  Run: `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium --grep="language menu"`.

  Expected: PASS.

- [ ] **Step 5: Commit the implementation**

  ```powershell
  git add e2e/aside-ghost.spec.ts src/styles/globals.css
  git commit -m "style: match language menu to aside"
  ```

### Task 2: Verify the project

**Files:**

- Verify: all changed files.

**Interfaces:**

- Consumes: the completed CSS override and browser regression test.
- Produces: verified local changes ready for integration.

- [ ] **Step 1: Run static and unit checks**

  Run `pnpm.cmd check-format`, `pnpm.cmd check-types`, `pnpm.cmd check-lint`, and `pnpm.cmd test`, stopping on the first nonzero exit code.

- [ ] **Step 2: Run production and focused browser checks**

  Run `pnpm.cmd build` and `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium`.

- [ ] **Step 3: Audit scope and authorship**

  Run `git diff --check`, `git status --short`, and `git log -3 --format="%h %an <%ae> %s%n%b"`. Confirm no unrelated files changed and all new commits belong only to Nikita Kolosov.
