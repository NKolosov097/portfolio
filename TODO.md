# TODO

- [x] Restore the feedback section.
- [x] Replace the contact form Loader with a paper-plane icon that pauses briefly and flies right during submission, while preserving the accessible sending status and reduced-motion behavior.
- [x] Let contact messages include up to three PDF, JPEG, or PNG attachments through an accessible file picker, with explicit per-file and total size limits, durable private storage, safe email delivery, retries, and cleanup.
- [ ] Improve the contact notification email layout using email-safe responsive markup, inline styles, and a plain-text fallback; verify equivalent readable rendering across major desktop, mobile, and webmail clients.
- [ ] Aside panel ghost: make it track the mouse cursor. Figure out under what conditions it should do this (always vs. only on certain sections/breakpoints, idle timeout, etc.) - see the existing ghost animation layers covered by `e2e/aside-ghost.spec.ts`.
- [x] Revisit which features belong in "favourite features" - base the picks on the resume/CV content rather than the current placeholder set.
- [x] Decide whether a link to a profile photo is worth adding to the aside panel.
- [x] Doom machine: support native fullscreen and a mobile-friendly viewport fallback when the Fullscreen API is missing or rejected, with keyboard navigation, focus restoration, and safe-area-aware controls.
- [x] Build route-specific loading skeletons for the home page, article list, and article pages; preserve the shared shell and support reduced motion and localized loading status.
- [x] Replace the generic portfolio SEO description with a professional summary shared across metadata, social cards, and structured data.
- [x] Sync `README.md` with reality: document the five previously undescribed e2e specs (contact form and attachments, contact submission, contact failures, aside avatar lightbox, aside swipe) in Testing, and add the `contact:requeue` script to Available scripts.
- [ ] Add a web app manifest (name, theme color, icon set) and reference it from metadata so the site installs cleanly as a home-screen app - currently only a bare `favicon.ico` exists, no icon artwork.
- [ ] Remove the unused `CUSTOM_KEY` browser exposure from `next.config.ts` and the unused direct `axios` and `bem-cn-lite` dependencies.
