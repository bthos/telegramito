# Telegramito Design System

A messaging-app design system for **Telegramito** — a Telegram client for kids and their parents, built around the **Letters** metaphor: correspondence, passages and marginalia instead of chat bubbles and feeds.

The schema source is the Telegram TL-schema (MTProto layer) provided by the user — specifically the `MessageMedia` constructors and the `Document` attribute variants that distinguish video / voice / round / audio / sticker / GIF.

## What's covered

For each media type, three states are rendered as a 3-up card:

1. **Preview** — collapsed bubble or thumbnail, what you see scrolling past
2. **Loading** — uploading/downloading/buffering, progress and skeleton states
3. **Full view** — expanded, playing, or interactive

Media types (one card each):

- Photo
- Video
- GIF (animated)
- Sticker
- Voice message (waveform)
- Round video (video note)
- Audio / Music
- Document / File
- Geo (static location)
- Geo Live (live location)
- Venue
- Contact
- Web page preview
- Poll
- Quiz (poll variant)
- Dice / Animated emoji
- Game
- Invoice / Paid media
- Story (reposted)
- Giveaway
- Giveaway results
- To-do list
- Unsupported

## Visual direction

Telegram-inspired but not a 1:1 clone — soft blue accent (`#3390ec`), out-bubble pale blue, in-bubble white, rounded 18px corners with the classic "tail" notch, system sans typography, subtle shadows. Loading uses Telegram's signature radial circle progress with a small cancel cross. Full views borrow Telegram's overlay chrome (translucent dark, white captions).

## Files

- `colors_and_type.css` — design tokens (CSS custom properties)
- `app/` — full-screen mockups: desktop Letters v2 + mobile kids-client screens (`Telegramito Redesign.html`)
- `preview/` — one HTML card per media type, each showing all 3 states
- `handoff/` — developer handoff: `Handoff.html` dashboard + `README.md` spec
- `docs/` — UX review of the live app (`Ревью Telegramito.html`)
