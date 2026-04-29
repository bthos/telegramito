# Spec: Media & Message Loading Placeholders

**Feature path:** `.artefacts/features/2026-04-29-media-loading-placeholders/`
**Date:** 2026-04-29
**Status:** Draft

---

## Summary

When a media resource (photo, video, document, audio, sticker) or the initial message list is
loading, the UI currently shows blank space. This feature adds skeleton/shimmer placeholders
that communicate "content is coming", prevent layout jumps, and match Telegram's visual pattern.

---

## Acceptance Criteria

- [ ] **AC-1 Photo/video** — While blob is downloading (`{ k: "d" }`), render a rounded-rect
  placeholder of fixed aspect ratio (16:9 default; 1:1 for stickers) with `role="status"` and
  translated `aria-label`.
- [ ] **AC-2 Audio/voice** — While downloading, render a horizontal bar placeholder
  (waveform shape) with `role="status"` and `aria-label`.
- [ ] **AC-3 Attachment** — While downloading, render a file-row placeholder (icon slot +
  two text lines) with `role="status"`.
- [ ] **AC-4 Message list skeleton** — On initial chat open (list empty, first page not yet
  arrived), render 6 skeleton bubbles (alternating in/out, varying widths) until real list
  populates.
- [ ] **AC-5 No flash on fast loads** — Placeholder must not appear if blob resolves in < 150 ms.
  Achieve via ≥ 100 ms CSS `animation-delay` before placeholder becomes visible.
- [ ] **AC-6 Accessibility** — All placeholders: `role="status"`, translated `aria-label`
  (i18n keys `chat.mediaLoading`, `chat.messageListLoading`).
- [ ] **AC-7 Token-based styling** — Placeholder colours use CSS custom properties
  (`--placeholder-bg`, `--placeholder-shimmer`) from `tokens.css`; no raw hex values.
- [ ] **AC-8 Reduced motion** — Shimmer animation suppressed under
  `prefers-reduced-motion: reduce`.

---

## Open Questions

- [ ] **OQ-1** Sticker placeholder shape — 1:1 square or circle?
- [ ] **OQ-2** `MessageMediaPaidMedia` with no resolved inner media already shows a static card
  (`msg-media--card`). Should it also shimmer, or is the existing static card sufficient for v1?
- [ ] **OQ-3** Video blurred-thumb preview — plain skeleton sufficient for v1, or do we want
  low-res thumb extraction before full download?
- [ ] **OQ-4** Skeleton bubble count — 6 hardcoded, or derived from viewport height?
- [ ] **OQ-5** Delay duration — 100 ms hardcoded or a CSS variable?

---

## Deferred Decisions

- **Cmok: implement static skeleton (no CSS shimmer) for now; add shimmer `@keyframes` if time
  permits.** Revisit when animation design tokens are established.
- Per-type aspect ratios (sticker square vs landscape photo) — Lojma to decide in UX.
- OQ-3 (video thumb) — deferred to a later media enhancement feature.

---

## Architecture & Test Implications

- **`useBlob`** (`src/ui/MessageMediaView.tsx`) already exposes `{ k: "d" }` (downloading) —
  placeholder slots directly into the existing `s.k` switch. No hook changes needed.
- **`isInitialLoad` state** — New derived boolean in `ChatView.tsx`: true while
  `list.length === 0` and the conv key hasn't resolved yet. Drives `MessageListSkeleton`.
- **New components:**
  - `src/ui/MediaPlaceholder.tsx` — pure presentational; props: `type` (`photo | video | audio | voice | attachment | sticker`).
  - `src/ui/MessageListSkeleton.tsx` — renders N skeleton bubbles; used once in `ChatView`.
- **i18n keys:** `chat.mediaLoading`, `chat.messageListLoading` — add to `en.json`, `be.json`, `es.json`.
- **CSS tokens:** `--placeholder-bg`, `--placeholder-shimmer` — add to `tokens.css`.
- **Tests:** `isInitialLoad` derivation is unit-testable; component rendering not currently
  tested (no RTL setup in project).

---

## Documentation Implications

Placeholders are invisible when working correctly — no user-facing guide entry needed.
Internal: update `COVERAGE.md` to note `MediaPlaceholder` and `MessageListSkeleton` components.
