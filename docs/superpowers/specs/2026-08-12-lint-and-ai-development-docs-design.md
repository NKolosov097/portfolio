# Lint and AI-assisted development documentation design

## Goal

Restore a working lint command under Next.js 16 and make the repository's AI-assisted development practices explicit and discoverable.

## Changes

### Lint command

The top-level `pnpm lint` script will continue to run the existing JavaScript/TypeScript ESLint, stylesheet Stylelint, and Markdown Prettier checks. The removed `next lint` command will be deleted from the command chain. No lint configuration or auto-fix behavior will otherwise change.

### Claude development guide

A root-level `Claude.md` file will document the contribution conventions currently summarized in README: strict typing, intent-focused documentation, component structure, stable QA selectors, reuse of existing patterns, and the required validation commands. README will link to this exact filename so the link works on case-sensitive hosts.

### README updates

README will:

- add `AI-assisted development` to its table of contents;
- add a short section stating that Claude may assist with planning, prototyping, tests, and documentation;
- state that a human must review, validate, and approve AI-generated results;
- link the code-quality section to `Claude.md`;
- describe `pnpm lint` as ESLint, Stylelint, and Prettier, without mentioning `next lint`.

## Verification

Run `pnpm lint` and confirm that it invokes the three direct tools without attempting `next lint`. Also run the repository's Prettier check against the changed Markdown files, either through `pnpm lint` or directly if diagnosing a failure.

## Scope

This change does not alter lint rules, application behavior, dependencies, or CI configuration. It does not claim that AI output is accepted without human review.
