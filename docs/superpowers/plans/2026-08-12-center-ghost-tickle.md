# Centered Ghost Tickle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dotted crease marks and make every tickle compression contract symmetrically toward the ghost's visual center.

**Architecture:** Keep the Web Animations controller responsible only for the stable body wrapper and the eye group. Center the body's SVG transform through a dedicated CSS class using its own painted bounding box, while retaining the existing keyframes and smooth neutral final frame.

**Tech Stack:** React 19, TypeScript, CSS Modules, SVG, Web Animations API, Vitest, Playwright.

## Global Constraints

- The ghost body and eyes remain mounted throughout the reaction.
- The full-motion reaction keeps three progressively smaller compressions and ends at `scaleX(1) scaleY(1)`.
- No crease paths, dotted lines, or motion marks are rendered.
- Horizontal compression preserves the body's center point.
- Reduced motion continues to animate only the eyes briefly.
- Git authorship remains `Nikita Kolosov <n.kolosov2003@mail.ru>` with no additional attribution trailers.

---

### Task 1: Express the centered, mark-free reaction in tests

**Files:**

- Modify: `src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`
- Modify: `e2e/aside-ghost.spec.ts`

**Interfaces:**

- Consumes: `startGhostTickle(elements, options)` and `data-testid="aside-ghost-body"`.
- Produces: regression coverage requiring only `{ body, eyes }`, no crease nodes, and a stationary body center during compression.

- [ ] **Step 1: Write the failing unit test**

  Change the controller fixtures to pass only `body` and `eyes`, assert both full-motion animations start, and retain the reduced-motion assertion that the body stays still while the eyes animate.

- [ ] **Step 2: Write the failing browser test**

  Assert that `aside-ghost-left-creases` and `aside-ghost-right-creases` do not exist. Record the body's horizontal center before activation, wait until its rendered width contracts, and assert that its center remains within one CSS pixel of the original center.

- [ ] **Step 3: Run tests to verify RED**

  Run: `pnpm.cmd vitest run src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`

  Expected: TypeScript/runtime failure because `IGhostTickleElements` still requires crease groups.

  Run: `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium`

  Expected: FAIL because the crease nodes still exist and the body currently scales toward the SVG coordinate origin.

### Task 2: Remove marks and center the deformation

**Files:**

- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`
- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`
- Modify: `src/layout/Aside/components/AnimatedGhost/ghostTickle.ts`
- Test: `src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`
- Test: `e2e/aside-ghost.spec.ts`

**Interfaces:**

- Consumes: `IGhostTickleElements` containing `body: SVGGElement` and `eyes: SVGGElement`.
- Produces: `.tickleBody` with `transform-box: fill-box` and `transform-origin: center`, plus a two-layer tickle controller.

- [ ] **Step 1: Implement the minimal component change**

  Remove both crease refs, null guards, controller arguments, and SVG crease groups. Add `className={styles.tickleBody}` to the stable body wrapper.

- [ ] **Step 2: Implement the centered CSS transform**

  Add:

  ```css
  .tickleBody {
    transform-box: fill-box;
    transform-origin: center;
  }
  ```

  Delete the unused `.creases` rule.

- [ ] **Step 3: Simplify the animation controller**

  Remove crease fields, crease keyframes, crease animations, and crease cancellation. Keep the existing body and eye timelines unchanged so the reaction still settles at an exact neutral transform.

- [ ] **Step 4: Run focused tests to verify GREEN**

  Run: `pnpm.cmd vitest run src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`

  Expected: PASS.

  Run: `pnpm.cmd playwright test e2e/aside-ghost.spec.ts --project=chromium`

  Expected: PASS.

- [ ] **Step 5: Commit the implementation**

  ```powershell
  git add src/layout/Aside/components/AnimatedGhost e2e/aside-ghost.spec.ts
  git commit -m "fix: center ghost tickle compression"
  ```

### Task 3: Verify the complete change

**Files:**

- Verify: all changed source, test, and documentation files.

**Interfaces:**

- Consumes: the completed centered reaction.
- Produces: verified build and test evidence suitable for integration.

- [ ] **Step 1: Run static and unit checks**

  Run: `pnpm.cmd check-format`, `pnpm.cmd check-types`, `pnpm.cmd check-lint`, and `pnpm.cmd test`.

  Expected: formatting, types, and unit tests pass; lint contains no new errors.

- [ ] **Step 2: Run production and browser checks**

  Run: `pnpm.cmd build` followed by `pnpm.cmd playwright test e2e/aside-ghost.spec.ts`.

  Expected: production build and supported browser projects pass. Any environment-only browser launch failure is reported separately with its exact output.

- [ ] **Step 3: Audit authorship and scope**

  Run: `git status --short`, `git diff --check`, and `git log -3 --format="%h %an <%ae> %s%n%b"`.

  Expected: only intended files are changed, no whitespace errors exist, and every new commit is authored solely by Nikita Kolosov.
