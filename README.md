# telegramito

A static, browser-only Telegram client built on [GramJS](https://gram.js.org/) (MTProto). No first-party backend — the session and all settings live on the device.

## Features

- MTProto connection via GramJS in the browser
- Chat list with message previews and unread counts
- Message thread with media rendering (photos, video, audio, files, polls, stickers, dice, paid media, and more)
- Compose area with auto-grow textarea and reply/forward support
- Image lightbox, inline location maps, poll voting
- Chat context panel — peer info, shared media grid, quick actions (see below)
- Parental / supervised mode: child profile, allowlist, PIN-gated settings, night-hours lock
- Infinite scroll via IntersectionObserver sentinel (no load-more button)
- PWA, single-file production HTML output
- i18n: English, Belarusian, Spanish

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript |
| Bundler | Vite 8, `vite-plugin-pwa`, `vite-plugin-singlefile` |
| Telegram | GramJS (`telegram@2.26.22`) |
| i18n | i18next, react-i18next |
| Persistence | IndexedDB via `idb` |
| Tests | Vitest, jsdom, `@testing-library/react` |

## Getting started

### Prerequisites

- Node.js 20+
- Telegram API credentials from [my.telegram.org](https://my.telegram.org)

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and fill in your credentials:

```
VITE_TELEGRAM_API_ID=<your api_id>
VITE_TELEGRAM_API_HASH=<your api_hash>
```

### Develop

```bash
npm run dev
```

### Test

```bash
npm test
```

### Build

```bash
npm run build
```

The output is a single HTML file in `dist/`.

## Project structure

```
src/
  context/        TelegramContext, ParentalContext
  hooks/          Custom React hooks (usePeerRecentMedia, etc.)
  telegram/       GramJS helpers
  parental/       Parental policy and storage
  ui/             React components
  styles/         app.css, tokens.css
  locales/        en.json, be.json, es.json
```

## Chat context panel

Toggled from any open chat by the `ℹ` info button in the chat header.

| Viewport | Behaviour |
|---|---|
| ≥ 1024 px | 360 px side column, side-by-side with the chat pane |
| 640–1023 px | Fixed right overlay with a dim backdrop |
| < 640 px | Bottom sheet (82 dvh) with drag handle and dim backdrop |

The panel closes automatically on every chat switch.

**Contents:**

- Peer header — avatar (48 px) and display name
- Shared media grid — 3 × 2 most recent photo thumbnails (blob-rendered); loading skeleton and "No shared media" fallback
- Quick actions — Search in chat (stub, pending UX-14), Mute/Unmute (stub, V2), Block user (private peers, stub V2), Leave group (groups/megagroups, with inline confirmation)

**Keyboard / a11y:** Escape dismisses the panel. Panel root is `role="dialog" aria-modal="true"`. Backdrop click also dismisses.

### `usePeerRecentMedia` hook

```ts
usePeerRecentMedia(
  entity: Api.User | Api.Chat | Api.Channel | null | undefined,
  client: TelegramClient | null,
): { items: Api.Message[]; loading: boolean; error: string | null }
```

Fetches up to 6 recent photo messages for a peer. Serves from a session-scoped module-level cache on repeated calls to the same peer.

## Parental mode

Switch between Child and Parent profiles in the top bar. In Child mode:

- Unknown private chats are hidden until allowlisted or approved by the parent
- Link previews, GIF-heavy messages, and the chat list during night hours can each be independently restricted
- Destructive actions (block user, leave group) require a parent PIN when set

## License

MIT
