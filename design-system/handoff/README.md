# Handoff: Telegramito Design System

## Overview
Telegramito is a messaging application design system built around the **Letters** metaphor — correspondence, passages, and marginalia rather than chat bubbles and feeds. Messages are rendered as prose passages with an indented speaker column and a right-side margin for reactions and annotations.

This package contains:
- Full design token specification (CSS custom properties)
- 23 media-type components × 3 states each (preview / loading / full view)
- A full-screen app redesign ("Letters v2") showing the complete UI in context
- A visual reference dashboard (`Handoff.html`)

## About the design files
The files in this bundle are **design references created in HTML** — working prototypes showing intended look and behaviour. They are not production code to copy directly. The task is to **recreate these HTML designs in your existing codebase** (React, React Native, Swift, Kotlin, etc.) using established patterns and libraries. Apply your framework's component model, state management, accessibility primitives, and platform conventions — the HTML shows *what*, your codebase decides *how*.

## Fidelity
**High-fidelity.** These are pixel-precise mockups with final colours, typography, spacing, and interactions. Recreate the UI exactly as shown, substituting platform equivalents for CSS where needed.

---

## Design philosophy
Three governing ideas:

1. **Messages are passages, not bubbles.** Text renders as indented prose with a left-side speaker attribution and a right-side annotation margin. No rounded chat bubbles for text.
2. **A single warm accent on a newsprint ground.** The palette uses one action colour (terracotta `#b03e1b`) against warm-gray surfaces. No blue UI anywhere.
3. **Type carries meaning.** Serif (`Spectral`) for message body and speaker names; spaced-caps sans (`Manrope`) for timestamps, labels, and UI chrome; monospaced (`JetBrains Mono`) for frequencies, codes, and metadata.

---

## Design tokens

### Colour

| Token | Value | Usage |
|---|---|---|
| `--tg-blue` | `#b03e1b` | Primary action — buttons, links, active states |
| `--tg-blue-deep` | `#8b2f12` | Pressed / hover variant |
| `--tg-blue-soft` | `rgba(176,62,27,.10)` | Tinted backgrounds, hover fills |
| `--bubble-in` | `#e9e4d8` | Incoming message bubble fill |
| `--bubble-out` | `rgba(176,62,27,.08)` | Outgoing message bubble fill |
| `--chat-bg` | `#cac5bc` | Chat thread backdrop |
| `--surface` | `#dfdbd2` | Page / panel background |
| `--surface-2` | `#d4cfc3` | Secondary panel (left aside, compose bar) |
| `--hairline` | `rgba(28,24,21,.14)` | Dividers and rule lines |
| `--ink` | `#1c1815` | Primary text |
| `--ink-2` | `#3a322a` | Secondary text |
| `--ink-3` | `#7a705f` | Tertiary / muted text, timestamps |
| `--ink-4` | `#a89e8b` | Placeholder, disabled |
| `--ink-5` | `#ccc7b8` | Borders, empty states |
| `--ok` | `#4a8c3f` | Success, delivered, correct |
| `--warn` | `#c47b18` | Warning, amber |
| `--err` | `#c0331f` | Error, destructive |
| `--gold` | `#b08030` | Stars, quiz trophy, premium |
| `--overlay` | `rgba(20,14,10,.92)` | Full-screen media overlay |
| `--on-overlay` | `#f5f0e6` | Text on dark overlay |
| `--on-overlay-2` | `rgba(245,240,230,.72)` | Muted text on overlay |

### Typography

| Token | Value |
|---|---|
| `--font` | `'Manrope', system-ui, sans-serif` |
| `--font-serif` | `'Spectral', Georgia, serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, Menlo, monospace` (alias: `--mono`) |
| `--t-meta` | `11px` |
| `--t-caption` | `13px` |
| `--t-body` | `15px` |
| `--t-title` | `16px` |
| `--t-h` | `18px` |

**Font loading:**
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;1,300;1,400;1,500&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### Geometry

| Token | Value | Usage |
|---|---|---|
| `--r-bubble` | `18px` | Message bubble corner radius |
| `--r-card` | `14px` | Card / panel corner radius |
| `--r-pill` | `999px` | Pill badges and buttons |
| `--r-thumb` | `10px` | Media thumbnail corner radius |
| `--bubble-shadow` | `0 1px 3px rgba(28,24,21,.12)` | Bubble drop shadow |

---

## Layout — Letters v2

### Three-column shell
```
┌──────────────────────────────────────────────────────────────────┐
│  Header band · 54px tall · full width                            │
├──────────────┬──────────────────────────┬────────────────────────┤
│  Correspondents │  Letter / thread main  │  Today's mail         │
│  300px fixed    │  1fr (fluid)           │  320px fixed          │
└──────────────┴──────────────────────────┴────────────────────────┘
```

### Header band
- Height: `54px`
- Background: `--surface-2`
- Border-bottom: `1px solid --hairline`
- Left: wordmark (`Manrope 700 10px / .22em tracking / uppercase`) + date in italic serif
- Right: navigation links (`Manrope 11px`) + a square "Write ↗" button (`border: 1px solid --ink`, `1px × 1px padding 4×10`)

### Left aside — Correspondents
- Width: `300px`; border-right: `1px solid --hairline`; padding: `20px 0`
- Two sections: **Correspondents** (people, name-based rows) and **Channels & Bulletins** (frequency-based rows)
- Section label: `Manrope 700 10px / .22em tracking / uppercase / --ink-3`
- Active row: `border-left: 2px solid --tg-blue`; background: `--surface + .card`
- **"In the post…" indicator**: three animated dots (`animation: pulse 1.4s ease-in-out infinite`) in `--tg-blue`, staggered by 0.2s

#### Person row layout (grid)
```
[1fr name+tag] [auto date+badge]
padding: 10px 18px 10px 22px
```
- Name: `Spectral 500 15px`; tag: `Manrope 11px .04em / --ink-3`; date: `Manrope 10px .06em`
- Unread badge: `background: --ink; color: --surface; Manrope 700 10px`

#### Channel row layout (grid)
```
[54px frequency] [1fr name+tag] [auto date+badge]
padding: 11px 18px
```
- Frequency: `JetBrains Mono 700 15px / -.02em tracking`; band label: `Mono 8px .18em tracking`

### Center — Letter main
- Padding: `28px 56px 0`
- Overflow hidden; `position: relative`

#### Letter header
```
[1fr title block] [auto Insights panel]
column-gap: 28px
```

##### Insights panel (inline DNA + calendar)
- Container: `background: --surface + card; border: 1px solid --hairline`; padding `10px 14px`
- Grid: `[auto DNA] [1px divider] [auto calendar]`; column-gap `16px`
- DNA spark bars: 14 bars, `width: 5px`, heights proportional to message count; peak bar in `--tg-blue`
- Calendar: 28-cell grid (4 weeks); `grid-template-columns: repeat(7, 16px)`, gap `3px`; peak day filled `--tg-blue`

#### Day separator
```html
<div class="day-mark">
  <span class="rule"></span>
  <span class="label">April 24, afternoon</span>  <!-- Spectral italic 13px --ink-3 -->
  <span class="rule"></span>
</div>
```

#### Passage row — 3-column grid
```
[120px speaker] [1fr body] [116px margin]
column-gap: 22px
padding: 10px 0
border-bottom: 1px solid var(--hairline)
```
- **Speaker column** (`text-align: right`): time in `Manrope 700 9px .22em uppercase --ink-3`; name in `Spectral italic 13px --ink-2`; outgoing = `--tg-blue`
- **Body**: `Spectral 16px / 1.55 line-height`; quoted text gets `border-left: 2px solid --hairline` + italic + `--ink-3`
- **Margin**: `Spectral italic 12px --ink-3`; reaction glyphs with `×N` count; transcript link in `Manrope 10px uppercase`

#### Compose bar
- `position: absolute; left: 56px; right: 56px; bottom: 20px`
- Background: `--surface-2`; border: `1px solid --ink`; box-shadow: `4px 4px 0 --hairline`
- Placeholder: `Spectral italic 14px --ink-3`
- Send button: `background: --ink; color: --surface; Manrope 700 11px .16em uppercase`

### Right rail — Today's mail
- Width: `320px`; padding `22px`; background `--surface-2`; border-left `1px solid --hairline`
- Timeline list: `padding-left: 16px`; vertical rule at `left: 4px`
- Each entry: time (`Manrope 10px .14em --ink-3`), name+action (`Spectral 14px`), thread name (`Manrope 10px --ink-3`)
- Active node: filled terracotta square `9×9px`; older nodes: `background: --surface; border: 1.5px solid --ink-3`

---

## Media type components

Each media type lives in `preview/<name>.html`. All files link to `../colors_and_type.css` for shared tokens. The three states are:

| State label | Meaning | Stage background |
|---|---|---|
| **Preview** | In-chat thumbnail or collapsed row | Newsprint chat wallpaper |
| **Loading** | Upload / download / buffering | Chat wallpaper (overlaid progress) |
| **Full view** | Expanded / playing / interactive | Dark overlay or light surface |

### Progress ring (used in: Photo, Video, GIF, Sticker, Document, Audio)
```svg
<circle class="track" r="18" cx="21" cy="21" />   <!-- stroke: rgba(255,255,255,.25) -->
<circle class="bar"   r="18" cx="21" cy="21"        <!-- stroke: #fff, stroke-linecap: round -->
  stroke-dasharray="113.1"
  stroke-dashoffset="{113.1 * (1 - progress)}"
  transform="rotate(-90)" />
```
Container: `50×50px; border-radius: 50%; background: rgba(0,0,0,.55)`

### Skeleton shimmer (used in: Photo, GIF, Document, Map)
```css
background: linear-gradient(110deg, #c8c2b8 8%, #d4cec4 18%, #c8c2b8 33%);
background-size: 200% 100%;
animation: shimmer 1.4s linear infinite;
```

### Waveform (Voice, Audio)
Rendered as SVG `<rect>` elements; heights from a normalised `float[]` array. Played portion uses `--tg-blue`; unplayed uses `--ink-3`.

### Inventory

| File | Media type | TL constructor |
|---|---|---|
| `preview/photo.html` | Photo | `messageMediaPhoto` |
| `preview/video.html` | Video | `documentAttributeVideo` |
| `preview/gif.html` | GIF | `documentAttributeAnimated` |
| `preview/sticker.html` | Sticker | `documentAttributeSticker` |
| `preview/voice.html` | Voice message | `documentAttributeAudio.voice` |
| `preview/round-video.html` | Video note | `documentAttributeVideo.round_message` |
| `preview/audio.html` | Audio / music | `documentAttributeAudio` |
| `preview/document.html` | File / document | `document` (no attr) |
| `preview/geo.html` | Static location | `messageMediaGeo` |
| `preview/geo-live.html` | Live location | `messageMediaGeoLive` |
| `preview/venue.html` | Venue | `messageMediaVenue` |
| `preview/contact.html` | Contact card | `messageMediaContact` |
| `preview/webpage.html` | Link preview | `messageMediaWebPage` |
| `preview/poll.html` | Poll | `messageMediaPoll` |
| `preview/quiz.html` | Quiz | `poll.quiz=true` |
| `preview/dice.html` | Dice / animated emoji | `messageMediaDice` |
| `preview/game.html` | Bot game | `messageMediaGame` |
| `preview/invoice.html` | Payment invoice | `messageMediaInvoice` |
| `preview/paid-media.html` | Paid media unlock | `messageMediaPaidMedia` |
| `preview/story.html` | Reposted story | `messageMediaStory` |
| `preview/giveaway.html` | Giveaway invite | `messageMediaGiveaway` |
| `preview/giveaway-results.html` | Giveaway results | `messageMediaGiveawayResults` |
| `preview/todo.html` | To-do list | `messageMediaToDo` |
| `preview/unsupported.html` | Unsupported type | `messageMediaUnsupported` |

---

## Interactions & animations

| Animation | Property | Duration | Easing |
|---|---|---|---|
| Shimmer | `background-position` | 1.4s | `linear` |
| Pulse dot (typing) | `opacity` | 1.4s, staggered +.2s | `ease-in-out` |
| Channel pulse | `opacity` | 1.3s | `ease-in-out` |
| Voice waveform scroll | `transform: translateX` | continuous | `linear` |
| Quiz bubble shake (wrong) | `translateX` ±6→4px | 0.4s | `ease` |
| Dice tumble | `rotate` ±12→14°, `translateY` | 0.9s | `ease-in-out` |
| Spinner (loading) | `rotate` 360° | 1s | `linear` |
| Bounce (giveaway draw) | `translateY` | 1.2s, staggered +.15s | `ease-in-out` |

---

## Accessibility notes
- All progress indicators should expose `aria-valuenow` / `aria-valuemax`
- Waveform containers should have `role="img"` + `aria-label="Voice message, N seconds"`
- Buttons inside messages (`Play`, `Vote`, `Pay`) need `:focus-visible` states
- Colour contrast: all text on `--surface` (#dfdbd2) meets WCAG AA for `--ink` (#1c1815, contrast ~14:1) and `--ink-2` (#3a322a, ~9:1). Terracotta `--tg-blue` on white is ~4.8:1 (AA large).

---

## App implementation — CSS hygiene

Cross-reference: `design-system/docs/Ревью Telegramito.html` (Section IV, Step 4).

### Canonical tokens

- **`--ds-*`** is the canonical dialect (`src/styles/tokens.css`).
- Letters desk overrides terracotta on `.app-root--main` via `src/styles/tokens-letters.css`.
- Legacy aliases (`--acc`, `--tg-blue`, …) are deprecated — use `var(--ds-*)` or scoped `--letters-*` in new rules.

CI gate: `npm run lint:css-tokens` — fails if `#3390ec` or `#b03e1b` appear outside `design-system/`, `tokens.css`, and `tokens-letters.css`.

### Component variable contract (reactions pilot)

Set theme variables on the layout shell; component rules consume them (no `!important` wars):

```css
.app-root--letters-chats {
  --letters-reaction-bg: transparent;
  --letters-reaction-hover-bg: color-mix(in srgb, var(--letters-terra) 10%, transparent);
}

.thread--letters .letters-passage__reactions button.msg-reaction {
  background: var(--letters-reaction-bg);
}
```

Apply the same pattern file-by-file: shell sets `--letters-<component>-*`, leaf selectors read `var()`.

### Layout breakpoints

| Range | Layout | Day mail | TS constant |
|-------|--------|----------|-------------|
| <700px | stack + tab bar | tab | `BP.mobileCompactMax` |
| 700–1279px | list + thread | ☙ slide-over | `BP_PAIR.mobileCompactDesktopMin` … `lettersBelowThreeColMax` |
| ≥1280px | three columns | rail column | `BP.lettersThreeColMin` |

`@media` literals in CSS must stay in sync with `src/layout/breakpoints.ts` (custom properties inside `@media` are unreliable).

### Container queries (pilot)

| Panel | `container-name` | Follow-up |
|-------|------------------|-----------|
| Correspondents list | `letters-list` | Hide auxiliary chrome when panel &lt;360px (timestamps pilot shipped) |
| Thread | `letters-thread` | Compact passage margins, reaction density |
| Day-mail rail | `letters-day-mail` | Truncate headlines, collapse summary |

---

## Files in this bundle

```
colors_and_type.css          Design tokens (CSS custom properties)
app/Telegramito Redesign.html  Full-screen Letters v2 app UI
app/letters.jsx              Letters v2 React component source
app/thread-data.jsx          Sample data used in the mockup
preview/                     23 × media-type HTML cards
handoff/README.md            This file
handoff/Handoff.html         Visual reference dashboard
```
