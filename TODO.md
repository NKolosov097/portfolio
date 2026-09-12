# TODO

- [x] Restore the feedback section.
- [ ] Replace the contact form Loader during submission with a playful animated emoji or similarly lighthearted indicator while preserving the accessible sending status and reduced-motion behavior.
- [ ] Let contact messages include file and image attachments through the file picker, drag and drop, and Ctrl/Cmd+V paste, with explicit type and size limits, accessible controls, durable storage, and safe email delivery.
- [ ] Improve the contact notification email layout using email-safe responsive markup, inline styles, and a plain-text fallback; verify equivalent readable rendering across major desktop, mobile, and webmail clients.
- [ ] Aside panel ghost: make it track the mouse cursor. Figure out under what conditions it should do this (always vs. only on certain sections/breakpoints, idle timeout, etc.) - see the existing ghost animation layers covered by `e2e/aside-ghost.spec.ts`.
- [x] Revisit which features belong in "favourite features" - base the picks on the resume/CV content rather than the current placeholder set.
- [x] Decide whether a link to a profile photo is worth adding to the aside panel.
- [x] Doom machine: support native fullscreen and a mobile-friendly viewport fallback when the Fullscreen API is missing or rejected, with keyboard navigation, focus restoration, and safe-area-aware controls.
- [x] Build route-specific loading skeletons for the home page, article list, and article pages; preserve the shared shell and support reduced motion and localized loading status.
