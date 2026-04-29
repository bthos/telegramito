# Tech Plan: Media & Message Loading Placeholders

**Feature path:** `.artefacts/features/2026-04-29-media-loading-placeholders/`
**Author:** Laznik
**Date:** 2026-04-29
**Status:** Ready for Cmok

---

## Overview

Introduce skeleton/shimmer placeholders for (a) in-flight media blobs and (b) the initial
message list, following the spec and UX design locked by UAT on 2026-04-29.

No existing hooks or state machines are changed. All integration points are additive.

---

## Component Architecture

### `src/ui/MediaPlaceholder.tsx`

Pure presentational component. Zero side-effects. Renders a shaped skeleton div
per media type.

```ts
type MediaPlaceholderType =
  | "photo"
  | "video"
  | "audio"
  | "voice"
  | "attachment"
  | "sticker"

interface MediaPlaceholderProps {
  type: MediaPlaceholderType
  width?: number | string
  height?: number | string
}
```

**Variants:**

| `type`        | Shape                                                      | Dimensions            |
|---------------|------------------------------------------------------------|-----------------------|
| `photo`       | Rounded rect                                               | `100%` / `aspect-ratio: 16/9` |
| `video`       | Same as photo                                              | Same                  |
| `sticker`     | Square rounded rect (`--ds-radius-md`)                     | 112 × 112 px, `1:1`  |
| `audio`       | Row: 32px circle + 3px pill bar                            | 44px container height |
| `voice`       | Same as audio                                              | Same                  |
| `attachment`  | Row: 36px square icon + two pill text bars (70%, 35%)      | Flex row              |

**Accessibility (all variants):**
- `role="status"`
- `aria-label={t("chat.mediaLoading")}`
- `aria-busy="true"`

**No-flash:** All variants carry the `media-placeholder` CSS class. That class applies
`opacity: 0` and `animation: placeholder-appear` with `animation-delay: var(--placeholder-delay)`.
If the parent unmounts the component before the delay fires, nothing is ever painted.

**Exports:**
- `MediaPlaceholder` (default + named)
- `resolveMediaPlaceholderType` (named) — see helper section below

---

### `src/ui/MessageListSkeleton.tsx`

Pure presentational. Renders N skeleton bubbles alternating in/out.

```ts
interface MessageListSkeletonProps {
  count?: number  // defaults to SKELETON_BUBBLE_COUNT = 6
}

const SKELETON_BUBBLE_COUNT = 6
```

**Bubble layout (UX-confirmed):**

```
widths: [55%, 65%, 40%, 45%, 75%, 58%]
sides:  [in,   out, in,  out, in,  out]
```

Each bubble: `height: 40px`, `border-radius: var(--ds-radius-xl)`,
`background: var(--placeholder-bg)`, `max-width: 85%`, vertical gap 6px.

**Accessibility:**
- Outer wrapper: `role="status"`, `aria-label={t("chat.messageListLoading")}`, `aria-busy="true"`
- Individual bubble `<div>` elements: `aria-hidden="true"` (decorative)

**No-flash:** Individual bubbles carry `msg-list-skeleton__bubble` CSS class, which shares
the same `placeholder-appear` animation + delay.

---

## `resolveMediaPlaceholderType` Helper

**Location:** Exported from `src/ui/MediaPlaceholder.tsx` (or a thin adjacent util
`src/ui/mediaPlaceholderType.ts` if Cmok prefers separation for testability — either is fine).

**Signature:**

```ts
import { Api } from "telegram"

export function resolveMediaPlaceholderType(
  resolved: Api.Message,
  d: Api.Document | null,
): MediaPlaceholderType
```

`resolved` is the output of `resolveMessageMediaForDisplay(message)` (already in scope in
`MessageMediaView`). `d` is `getMessageDocument(resolved)` (also in scope).

**Decision tree (mirrors `useBlob` download branches in priority order):**

```
1. d != null && (isStickerDoc(d) || isCustomEmojiDoc(d))  → "sticker"
2. d != null && (isVideoDoc(d) || d.mimeType?.toLowerCase().startsWith("video/"))  → "video"
3. d != null && d.mimeType?.startsWith("image/")  → "photo"
4. d != null && audioAttribute present && audioAttribute.voice === true  → "voice"
5. d != null && audioAttribute present  → "audio"
6. d != null (document fallback)  → "attachment"
7. resolved.media?.className === "MessageMediaPhoto"  → "photo"
8. fallback  → "photo"  (safe default; "photo" is the most common case)
```

**Notes:**
- `isAnimatedDoc` check is not needed in the placeholder helper: animated GIFs / videos
  still render as `"video"` or `"photo"` placeholders (same shape, content arrives shortly).
- `isTgsShapedDoc` is intentionally omitted for the same reason: TGS stickers are stickers
  regardless of shape.
- Sticker check must be first because stickers carry both sticker and (sometimes) video
  attributes; a sticker placeholder is more semantically correct.

---

## Integration Points

### `src/ui/MessageMediaView.tsx` — `{ k: "d" }` branch

**Current code (lines 301–305):**

```tsx
if (s.k === "d" || s.k === "e") {
  if (s.k === "e") {
    return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
  }
}
```

The `{ k: "d" }` case falls through and renders nothing. Replace with:

```tsx
if (s.k === "d") {
  const placeholderType = resolveMediaPlaceholderType(resolved, d)
  return <MediaPlaceholder type={placeholderType} />
}
if (s.k === "e") {
  return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
}
```

`resolved` and `d` are already in scope via `useMemo` and `getMessageDocument`. The existing
`useMemo` for `resolved` (line 260) must be available before the switch; `d` needs a derived
memo or direct call `const d = getMessageDocument(resolved)` — Cmok to confirm the exact line.

**Import additions:**

```ts
import { MediaPlaceholder, resolveMediaPlaceholderType } from "./MediaPlaceholder"
```

---

### `src/ui/ChatView.tsx` — `isInitialLoad` + `MessageListSkeleton`

**New derived boolean**, placed immediately after the `useChatMessages` destructuring (around line 190):

```ts
const isInitialLoad = list.length === 0 && !listError
```

`listError` does not currently exist on the `useChatMessages` return. Two options:
1. `useChatMessages` already surfaces a loading-vs-empty distinction via `list.length === 0`
   without an error — use that alone: `const isInitialLoad = list.length === 0`.
2. If an error surface is added, use the full form from the spec.

For v1, use option 1 to stay non-invasive: `const isInitialLoad = list.length === 0`.

**Render switch** (replace the `<ul className="msg-list">` branch in the non-virtual path,
and add symmetrically for the virtual path):

```tsx
{isInitialLoad
  ? <MessageListSkeleton />
  : (datedList.length > VIRTUAL_MSG_THRESHOLD
      ? <ChatMessagesVirtualList ... />
      : <ul className="msg-list">...</ul>)
}
```

**Import addition:**

```ts
import { MessageListSkeleton } from "./MessageListSkeleton"
```

---

### PaidMedia `msg-media--card` — `MessageMediaView.tsx` (lines 289–297)

The existing inline PaidMedia guard renders a `msg-media--card` `<div>`. Post-UAT OQ-2
resolution: add `.placeholder--shimmer` class and full a11y attributes.

**Before:**

```tsx
return (
  <div className="msg-media msg-media--card" role="status">
    <span className="msg-media-card__muted">{t("chat.paidBundlePlaceholder")}</span>
  </div>
)
```

**After:**

```tsx
return (
  <div
    className="msg-media msg-media--card placeholder--shimmer"
    role="status"
    aria-label={te("chat.mediaLoading")}
    aria-busy="true"
  >
    <span className="msg-media-card__muted">{t("chat.paidBundlePlaceholder")}</span>
  </div>
)
```

This is the only case where `.placeholder--shimmer` is applied without a `{ k: "d" }` guard.

---

## CSS Architecture

### New file vs. `app.css`

**Decision: add a dedicated `src/styles/placeholders.css`** imported once in `app.css`
(or `main.tsx`). This isolates placeholder CSS and keeps `app.css` from growing further.

Alternatively, Cmok may choose to add directly to `app.css` — both approaches satisfy the ACs.
The dedicated file approach is recommended for maintainability.

**Contents of `src/styles/placeholders.css`:**

```css
/* ── No-flash appear ─────────────────────────────────── */
@keyframes placeholder-appear {
  to { opacity: 1; }
}

.media-placeholder,
.msg-list-skeleton__bubble {
  opacity: 0;
  animation: placeholder-appear 0ms step-end var(--placeholder-delay) forwards;
}

/* ── Shimmer (PaidMedia card + future use) ───────────── */
@keyframes placeholder-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.placeholder--shimmer {
  background: linear-gradient(
    90deg,
    var(--placeholder-bg)      0%,
    var(--placeholder-shimmer) 50%,
    var(--placeholder-bg)      100%
  );
  background-size: 200% 100%;
  animation: placeholder-shimmer 1.6s ease-in-out infinite;
}

/* ── Reduced motion (AC-8) ───────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .media-placeholder,
  .msg-list-skeleton__bubble {
    /* Snap visible immediately; skip appear animation */
    opacity: 1;
    animation: none;
  }
  .placeholder--shimmer {
    animation: none;
  }
}
```

**Note on `prefers-reduced-motion`:** The no-flash `placeholder-appear` animation is also
suppressed under reduced motion. This means the placeholder becomes immediately visible under
reduced-motion. This is the correct accessible behaviour — the no-flash delay is a polish
feature for sighted users; users who request reduced motion do not benefit from hiding the
placeholder.

---

## Token Additions (`src/styles/tokens.css`)

Add to `:root` (dark default):

```css
/* -- Loading placeholders -- */
--placeholder-bg:      rgba(255, 255, 255, 0.07);
--placeholder-shimmer: rgba(255, 255, 255, 0.13);
--placeholder-delay:   100ms;
```

Add to `html[data-theme="light"]`:

```css
--placeholder-bg:      rgba(0, 0, 0, 0.07);
--placeholder-shimmer: rgba(0, 0, 0, 0.11);
--placeholder-delay:   100ms;
```

---

## i18n Additions

Add to `src/locales/en.json` inside the `"chat"` object:

```json
"mediaLoading": "Loading media",
"messageListLoading": "Loading messages"
```

Duplicate to `src/locales/be.json` and `src/locales/es.json` with equivalent translations.

---

## File Change Summary

| File | Change |
|------|--------|
| `src/ui/MediaPlaceholder.tsx` | **New** — `MediaPlaceholder` component + `resolveMediaPlaceholderType` helper |
| `src/ui/MessageListSkeleton.tsx` | **New** — `MessageListSkeleton` component |
| `src/styles/placeholders.css` | **New** — keyframes, no-flash, shimmer, reduced-motion |
| `src/styles/tokens.css` | **Add** 3 tokens in `:root` and `html[data-theme="light"]` |
| `src/styles/app.css` | **Add** `@import "./placeholders.css"` |
| `src/ui/MessageMediaView.tsx` | **Edit** — `{ k: "d" }` branch; PaidMedia card class + a11y |
| `src/ui/ChatView.tsx` | **Edit** — `isInitialLoad`; `<MessageListSkeleton>` branch |
| `src/locales/en.json` | **Add** 2 keys |
| `src/locales/be.json` | **Add** 2 keys |
| `src/locales/es.json` | **Add** 2 keys |

---

## What Laznik is NOT providing (test gaps)

- Component rendering tests — no RTL setup in this project.
- CSS animation behaviour — not unit-testable without a browser.
- `useChatMessages` hook internals — tested in its own scope.
- Visual regression for shimmer — out of scope for this pipeline.

---

## Test Coverage Summary

| Module | Test file | Coverage |
|--------|-----------|----------|
| `resolveMediaPlaceholderType` | `src/ui/mediaPlaceholderType.test.ts` | All 7 branches (sticker, video, photo-via-mime, voice, audio, attachment, MessageMediaPhoto) + fallback |
| `isInitialLoad` derivation | `src/ui/chatInitialLoad.test.ts` | 3 cases: empty+no-error=true; populated=false; empty+error=false |
