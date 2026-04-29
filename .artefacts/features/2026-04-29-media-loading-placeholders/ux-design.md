# UX Design: Media & Message Loading Placeholders

**Feature path:** `.artefacts/features/2026-04-29-media-loading-placeholders/`
**Author:** Lojma
**Date:** 2026-04-29
**Status:** Final

---

## Open Questions — Resolved

### OQ-1: Sticker placeholder shape — square or circle?

**Decision: Square (1:1 rounded rect, `border-radius: var(--ds-radius-md)`).**

Rationale: Stickers ship as rectangular WebP/TGS frames. A circle mask would clip
sticker content unpredictably (especially ones with off-centre subjects). Square matches
the actual delivered dimensions and is visually consistent with the existing 1:1
constraint in AC-1. Circles are reserved for avatars in this design system.

### OQ-2: `MessageMediaPaidMedia` shimmer?

**Decision: Apply shimmer animation to `msg-media--card` for v1 (user-approved 2026-04-29).**

Rationale: Paid media cards render a blurred locked overlay over real content geometry.
The shimmer does not imply "loading will complete" — it communicates structural presence,
identical to how native Telegram renders paid media with a subtle motion effect on the
blurred backdrop. Apply `.placeholder--shimmer` class on the `msg-media--card` element;
suppress under `prefers-reduced-motion: reduce` identically to other placeholders.
This unblocks AC-8 coverage for the shimmer animation path in v1.

### OQ-4: Skeleton bubble count — 6 hardcoded or viewport-derived?

**Decision: 6 hardcoded.**

Rationale: Viewport-derived count adds runtime JS measurement, a React ref, a resize
listener, and conditional render paths — all for negligible benefit given the skeleton
is visible for < 1 s on a normal connection. Six bubbles fill a standard 667 px chat
pane (bubbles ~44-60 px each including margin), cover tall phones without overflow,
and are cheap to render. The spec calls out 6; accept it. Document constant as
`SKELETON_BUBBLE_COUNT = 6` in the component so it is easy to change later.

### OQ-5: Delay duration — 100 ms hardcoded or CSS variable?

**Decision: CSS custom property `--placeholder-delay` defaulting to `100ms`.**

Rationale: Hard-coding `100ms` in a `@keyframes` is fine for today, but theming and
testing both benefit from an overridable variable. E2E / screenshot tests can set
`--placeholder-delay: 0ms` to force instant visibility. Production default stays
`100ms`. Declare in `tokens.css` alongside `--placeholder-bg` and
`--placeholder-shimmer`.

---

## UAT Design Questions — Resolved (2026-04-29)

These four questions were raised during UAT review; user confirmed all four as approved.
Formal rationale is recorded here so Cmok has authoritative guidance.

### UAT-Q1: Photo/video aspect ratio — 16:9 or more square for portrait?

**Decision: 16:9 default, preserved as-is.**

Rationale: The vast majority of chat photos are landscape or near-square. Portrait
photos (taller than wide) already arrive with their intrinsic dimensions and are
capped by the bubble max-width — the placeholder only needs to reserve space during
download. A 16:9 skeleton is a reasonable placeholder that does not create a layout
jump for landscape content (the dominant case). Portrait content will slightly resize
the bubble on resolve, but this is acceptable for v1 — identical to how blank-space
worked before. The 1:1 override for stickers remains as designed (OQ-1).

### UAT-Q2: Audio waveform single flat bar — acceptable?

**Decision: Single 3 px flat bar, confirmed acceptable.**

Rationale: The waveform bar abstraction (a single `border-radius: pill` rectangle
at 3 px height) communicates "audio track" without attempting to replicate actual
waveform data, which is unavailable before the blob resolves. It is vertically
centred alongside the 32 px play-button slot, giving the row the correct 44 px height.
This avoids the complexity and fragility of generating fake waveform peaks. Matches
the visual weight of the real `<audio>` control row.

### UAT-Q3: Skeleton bubble height 40 px — proportional?

**Decision: 40 px height confirmed.**

Rationale: The real text bubbles in this UI range from ~36 px (single-line) to
variable multi-line heights. Using 40 px gives a conservative single-line estimate
that produces 6 readable bubbles in ~360 px of vertical space (6 × 40 px + 5 × 6 px
gap = 270 px), well within any portrait viewport above 480 px. It does not
over-promise multi-line content and creates no significant layout jump when real
bubbles render. Accepted proportions: 40 px height, 6 px gap, `border-radius: var(--ds-radius-xl)`.

### UAT-Q4: 100 ms delay — right feel?

**Decision: 100 ms CSS variable default confirmed.**

Rationale: 100 ms is the standard no-flash threshold: sub-100 ms connections never
show the placeholder (unmount before opacity fires); 100–250 ms connections see a
brief skeleton that disappears quickly; slow connections see a stable skeleton.
The CSS variable `--placeholder-delay` keeps this adjustable for testing and future
tuning without code changes. 100 ms is the specified minimum from AC-5.

---

## Design Tokens Required

Add to `tokens.css` (both `:root` dark default and `html[data-theme="light"]`):

```css
/* -- Loading placeholders -- */
--placeholder-bg:      rgba(255, 255, 255, 0.07);   /* dark default */
--placeholder-shimmer: rgba(255, 255, 255, 0.13);   /* dark default */
--placeholder-delay:   100ms;
```

Light theme overrides:

```css
--placeholder-bg:      rgba(0, 0, 0, 0.07);
--placeholder-shimmer: rgba(0, 0, 0, 0.11);
--placeholder-delay:   100ms;   /* same */
```

These values sit above the `--ds-color-surface` (`#151b24` dark / `#ffffff` light)
that the chat panel uses, giving sufficient contrast without being jarring.

---

## States Matrix

Each `MediaPlaceholder` variant passes through these states (mapped to `useBlob`):


| State key | Placeholder visible? | Notes                      |
| --------- | -------------------- | -------------------------- |
| `"d"`     | Yes (after delay)    | Primary placeholder state  |
| `"i"`     | No — real img shown  | Placeholder unmounts       |
| `"v"`     | No — real video      | Placeholder unmounts       |
| `"au"`    | No — real audio      | Placeholder unmounts       |
| `"at"`    | No — real attachment | Placeholder unmounts       |
| `"z"`     | No — nothing shown   | No media at all            |
| `"f"`     | No — filter badge    | GIF filtered message       |
| `"e"`     | No — error badge     | Error replaces placeholder |


`MessageListSkeleton` state:


| State           | Visible? | Trigger                                   |
| --------------- | -------- | ----------------------------------------- |
| `isInitialLoad` | Yes      | `list.length === 0` + conv key unresolved |
| List populated  | No       | Real bubbles replace skeleton             |


---

## Component Specifications

### 1. `MediaPlaceholder` (`src/ui/MediaPlaceholder.tsx`)

**Props:**

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
  /** Optional explicit dimensions; defaults per type apply if omitted */
  width?: number | string
  height?: number | string
}
```

**Accessibility on every variant:**

- `role="status"`
- `aria-label` from i18n key `chat.mediaLoading`
- `aria-busy="true"`

**No-flash rule:**

- Applied via CSS: `opacity: 0; animation: placeholder-appear 0ms step-end var(--placeholder-delay) forwards;`
- The element is in the DOM immediately but invisible until the delay fires.
- If the blob resolves before the delay completes, the component unmounts — no flicker.

---

### 1b. PaidMedia card shimmer (OQ-2 resolved)

The `msg-media--card` element already renders in the DOM when paid media is present.
Add the `.placeholder--shimmer` class to it unconditionally (the card is always a
"content behind paywall" state, which maps to the placeholder semantic).

```tsx
<div className="msg-media msg-media--card placeholder--shimmer"
     role="status"
     aria-label={t("chat.mediaLoading")}
     aria-busy="true">
  {/* existing card content */}
</div>
```

This is the one case where `placeholder--shimmer` is applied without a `{ k: "d" }`
guard — the card is always shimmer-animated because its content is always structurally
unreachable until payment.

`prefers-reduced-motion` suppression applies identically: the same
`@media (prefers-reduced-motion: reduce) { .placeholder--shimmer { animation: none } }`
rule covers it.

---

### 2. `MessageListSkeleton` (`src/ui/MessageListSkeleton.tsx`)

**Props:**

```ts
interface MessageListSkeletonProps {
  count?: number   // defaults to SKELETON_BUBBLE_COUNT = 6
}
```

**Accessibility:**

- Wrapping `<div role="status" aria-label={t("chat.messageListLoading")} aria-busy="true">`
- Individual bubble `<div>` elements are `aria-hidden="true"` (decorative)

---

## ASCII Wireframes

### Photo / Video Placeholder (AC-1)

Default aspect ratio 16:9. Maximum width constrained by chat bubble max-width
(~280 px on mobile, ~360 px on desktop).

```
+------------------------------------+
|                                    |  <- border-radius: var(--ds-radius-xl)
|                                    |  <- background: var(--placeholder-bg)
|     [no content -- loading]        |  <- 16:9 (aspect-ratio: 16/9)
|                                    |
|                                    |
+------------------------------------+
```

- Width: `100%` (bubble constrains it)
- Height: enforced via `aspect-ratio: 16/9`
- Radius: `var(--ds-radius-xl)` — matches delivered photo radius in `msg-media--photo`
- No inner icon for v1 (static skeleton; icon adds noise without value)

### Sticker Placeholder (AC-1, OQ-1 resolved: square)

```
+--------------+
|              |  <- border-radius: var(--ds-radius-md)
|              |  <- 1:1 square, 112x112 px
|              |
+--------------+
```

- Fixed 112 x 112 px (matches Telegram web sticker render target)
- `aspect-ratio: 1/1`
- Radius: `var(--ds-radius-md)` (softer than photo, not a circle)

### Audio / Voice Placeholder (AC-2)

Horizontal waveform bar — a single rounded rectangle simulating a collapsed
audio waveform, plus a play-button slot.

```
+----------------------------------------------------+
|  [O]  ------------------------------------------- |
+----------------------------------------------------+
     ^  ^
     |  waveform bar (height 3px, border-radius pill, flex:1)
     play-btn slot (circle, 32x32 px, var(--placeholder-bg))
```

Dimensions:

- Container height: 44 px (matches `<audio>` control row height)
- Play-button slot: 32 x 32 px circle, `var(--placeholder-bg)`
- Waveform bar: `height: 3px`, `border-radius: var(--ds-radius-pill)`,
`background: var(--placeholder-bg)`, `flex: 1`, `margin-left: 10px`
- Voice variant: identical shape; differentiation not needed at placeholder stage

Layout: `display: flex; align-items: center; gap: 10px; padding: 6px 10px`

### Attachment Placeholder (AC-3)

File-row skeleton: icon slot on the left, two text-line bars on the right.

```
+------------------------------------------------------+
|  +----+   ########################  (filename ~70%) |
|  |    |   #############            (size line ~35%) |
|  +----+                                             |
+------------------------------------------------------+
     ^
     icon slot 36x36 px, border-radius: var(--ds-radius-md)
```

Dimensions:

- Container: `display: flex; align-items: center; gap: 10px; padding: 8px 10px`
- Icon slot: 36 x 36 px, `border-radius: var(--ds-radius-md)`,
`background: var(--placeholder-bg)`
- Filename bar: `height: 10px`, `width: 70%`, `border-radius: var(--ds-radius-pill)`,
`background: var(--placeholder-bg)`, `margin-bottom: 6px`
- Size bar: `height: 8px`, `width: 35%`, `border-radius: var(--ds-radius-pill)`,
`background: var(--placeholder-bg)`
- Text bars live in `<div style="flex:1; display:flex; flex-direction:column">`

### Message List Skeleton (AC-4)

6 bubbles alternating inbound (left) and outbound (right), varying widths.

```
  +---------------------------------------------+
  |                                             |
  |  [===================]                      |  <- bubble 1: IN  55% width
  |                                             |
  |                    [=======================]|  <- bubble 2: OUT 65% width
  |                                             |
  |  [===============]                          |  <- bubble 3: IN  40% width
  |                                             |
  |                    [================]       |  <- bubble 4: OUT 45% width
  |                                             |
  |  [==============================]           |  <- bubble 5: IN  75% width
  |                                             |
  |                    [====================]   |  <- bubble 6: OUT 58% width
  |                                             |
  +---------------------------------------------+
```

Width sequence: `[55%, 65%, 40%, 45%, 75%, 58%]` — deliberately unequal to
look like real message variety, not a repeating pattern.

Each skeleton bubble:

- Height: 40 px
- `border-radius: var(--ds-radius-xl)` — matches real bubble radius
- `background: var(--placeholder-bg)`
- IN: `align-self: flex-start`, `margin-left: 12px`
- OUT: `align-self: flex-end`, `margin-right: 12px`
- Vertical gap between bubbles: 6 px
- `max-width: 85%` — mirrors real bubble max-width constraint

Container:

```css
display: flex;
flex-direction: column;
gap: 6px;
padding: 8px 0;
```

---

## Shimmer Specification (v1 — required for PaidMedia)

Per spec, shimmer `@keyframes` was originally deferred. **OQ-2 resolution (2026-04-29)
promotes shimmer to v1 scope** because `msg-media--card` must animate. Implement
the full shimmer keyframes in v1. Other placeholder variants (photo, audio, attachment,
skeleton bubbles) use static `var(--placeholder-bg)` — shimmer is additive via
`.placeholder--shimmer` class, not the default. When implemented:

```css
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

@media (prefers-reduced-motion: reduce) {
  .placeholder--shimmer {
    animation: none;
  }
}
```

For static variants (photo, audio, attachment, skeleton bubbles), use plain
`background: var(--placeholder-bg)` with no animation. Apply `.placeholder--shimmer`
only to `msg-media--card` (PaidMedia) for v1. The `--placeholder-shimmer` token is
declared in `tokens.css` alongside the rest; enabling shimmer on other variants later
requires only adding the class, no token changes.

---

## No-Flash Implementation Pattern (AC-5)

The delay is applied purely in CSS to avoid a JS `setTimeout` race:

```css
/* Base: invisible, then snap visible after delay */
.media-placeholder,
.msg-list-skeleton__bubble {
  opacity: 0;
  animation: placeholder-appear 0ms step-end var(--placeholder-delay) forwards;
}

@keyframes placeholder-appear {
  to { opacity: 1; }
}
```

- `animation-delay: var(--placeholder-delay)` (default `100ms`)
- `animation-fill-mode: forwards` — stays visible once it fires
- If real content arrives and unmounts the placeholder before `100ms`, zero
paint ever happens. No JS timer needed.
- Tests can inject `--placeholder-delay: 0ms` on the container to force
immediate visibility.

---

## Accessibility Notes (AC-6)

### Required attributes on every placeholder element


| Attribute    | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| `role`       | `"status"`                                                       |
| `aria-label` | `t("chat.mediaLoading")` or `t("chat.messageListLoading")`       |
| `aria-busy`  | `"true"`                                                         |
| `aria-live`  | NOT set explicitly; `role="status"` implies `aria-live="polite"` |


### Screen reader behaviour

- `role="status"` with `aria-busy="true"` signals "content is loading" without
interrupting the user. When the placeholder is replaced by real content, the
screen reader announces the new content naturally.
- The placeholder's text nodes are empty; only the `aria-label` is announced.
This prevents screen readers from reading out empty decorative bars.

### i18n keys to add


| Key                       | English value        |
| ------------------------- | -------------------- |
| `chat.mediaLoading`       | `"Loading media"`    |
| `chat.messageListLoading` | `"Loading messages"` |


Add to `en.json`, `be.json`, `es.json`.

---

## Responsive Specifics

### Narrow layout (< 640 px)

- Photo/video placeholder: `width: 100%` with `aspect-ratio: 16/9` — fills bubble
width, no fixed pixel dimensions needed.
- Sticker: fixed 112 x 112 px; does not respond to viewport (matches sticker
render at any width).
- Audio/voice: `width: 100%` minimum 200 px — waveform bar expands to fill.
- Attachment: `width: 100%` minimum 200 px — icon slot fixed, text bars flexible.
- Skeleton bubbles: `max-width: 85%` per bubble.

### Wide layout (>= 640 px)

- Photo/video: bubble max-width caps at ~360 px; placeholder follows the same
bubble max-width constraint already in `app.css` — no additional override needed.
- Skeleton bubble max-width stays at `85%` to mirror real message bubble constraints.

### RTL support

- No dedicated RTL layout needed: flex + `align-self` handles RTL automatically when
`dir="rtl"` is set on the root.
- IN/OUT alignment is `align-self: flex-start / flex-end` — works for both LTR and RTL.

---

## AC Traceability


| AC   | Design element                                                                  | Notes                                       |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| AC-1 | Photo/video: 16:9 rounded rect; sticker: 1:1 square 112x112, radius-md          | OQ-1 resolved: square                       |
| AC-2 | Audio/voice: 32px circle + 3px waveform bar, 44px row height                    |                                             |
| AC-3 | Attachment: 36x36 icon slot + 2 text bars (70%, 35% width)                      |                                             |
| AC-4 | MessageListSkeleton: 6 bubbles, alternating IN/OUT, widths [55,65,40,45,75,58]% | OQ-4 resolved: 6 hardcoded                  |
| AC-5 | CSS `animation-delay: var(--placeholder-delay)` 100ms, opacity 0 until fired    | OQ-5 resolved: CSS variable                 |
| AC-6 | `role="status"`, `aria-busy="true"`, `aria-label` i18n keys on all variants     |                                             |
| AC-7 | All bg/shimmer values via `--placeholder-bg`, `--placeholder-shimmer`           | Token values specified above                |
| AC-8 | `@media (prefers-reduced-motion: reduce) { animation: none }` on shimmer        | Applies to `.placeholder--shimmer` on PaidMedia card (v1) |


---

## Component File Map


| File                             | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src/ui/MediaPlaceholder.tsx`    | Variants: photo, video, audio, voice, attachment, sticker              |
| `src/ui/MessageListSkeleton.tsx` | 6-bubble skeleton list                                                 |
| `src/styles/tokens.css`          | Add `--placeholder-bg`, `--placeholder-shimmer`, `--placeholder-delay` |
| `src/locales/en.json`            | Add `chat.mediaLoading`, `chat.messageListLoading`                     |
| `src/locales/be.json`            | Same keys                                                              |
| `src/locales/es.json`            | Same keys                                                              |
| `src/ui/MessageMediaView.tsx`    | Insert `<MediaPlaceholder type=...>` in `s.k === "d"` branch           |
| `src/ui/ChatView.tsx`            | Add `isInitialLoad` state; render `<MessageListSkeleton>`              |


---

## Integration Notes for Cmok

### Hook point in `MessageMediaView.tsx`

Current code (lines 301-305):

```tsx
if (s.k === "d" || s.k === "e") {
  if (s.k === "e") {
    return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
  }
}
```

The `s.k === "d"` case falls through with no return — blank space today.
Replace with:

```tsx
if (s.k === "d") {
  const placeholderType = resolveMediaPlaceholderType(resolved, d)
  return <MediaPlaceholder type={placeholderType} />
}
```

`resolveMediaPlaceholderType` inspects the same `resolved` / `d` values already in
scope and returns one of `"photo" | "video" | "audio" | "voice" | "attachment" | "sticker"`.
This helper belongs in `MediaPlaceholder.tsx` or a small adjacent util — Cmok to decide.

Mapping logic (mirrors `useBlob` download branches):

- `isStickerDoc(d)` or `isCustomEmojiDoc(d)` -> `"sticker"`
- `isVideoDoc(d)` or video mime -> `"video"`
- `d.mimeType?.startsWith("image/")` -> `"photo"`
- `audioA.voice` -> `"voice"`
- audio attribute present -> `"audio"`
- document fallback -> `"attachment"`
- `media.className === "MessageMediaPhoto"` -> `"photo"`

### PaidMedia shimmer in `MessageMediaPaidMedia`

Find the `msg-media--card` wrapper in `MessageMediaPaidMedia` (or wherever it renders)
and add `placeholder--shimmer` to its class list plus the a11y attributes:

```tsx
<div
  className="msg-media msg-media--card placeholder--shimmer"
  role="status"
  aria-label={t("chat.mediaLoading")}
  aria-busy="true"
>
```

The shimmer CSS (`@keyframes placeholder-shimmer` + `.placeholder--shimmer` rule) and
its `prefers-reduced-motion` guard live in `app.css` (or a dedicated
`placeholders.css`). All three: keyframes, class rule, motion guard — must be present
for AC-8 to be satisfied.

---

### `isInitialLoad` in `ChatView.tsx`

New derived boolean, near the `useChatMessages` call:

```ts
const isInitialLoad = list.length === 0 && !listError
```

Drive `<MessageListSkeleton>` from it:

```tsx
{isInitialLoad
  ? <MessageListSkeleton />
  : <ChatMessagesVirtualList ... />}
```

Exact placement: Cmok to confirm; the principle is that the skeleton and the real
list are mutually exclusive.

---

## Deferred / Out of Scope for v1

- CSS shimmer on non-PaidMedia variants (photo, audio, attachment, skeleton bubbles) —
  tokens and keyframes are implemented; class not applied. Enable per-variant later.
- OQ-3: Video blurred-thumb extraction — deferred to a later media enhancement feature
- Viewport-derived skeleton count — deferred (6 hardcoded is sufficient)

