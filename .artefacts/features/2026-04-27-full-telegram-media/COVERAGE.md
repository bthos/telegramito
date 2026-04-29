# Media type coverage (implementation snapshot)

| `MessageMedia*` | Dialog / reply label | Bubble UI | Notes |
|-----------------|----------------------|------------|--------|
| `MessageMediaEmpty` | `previewEmpty` | Card: `mediaEmpty` | |
| `MessageMediaPhoto` | `previewPhoto` | Blob / lightbox | |
| `MessageMediaDocument` | by attributes | Blob (video/voice/…) | |
| `MessageMediaWebPage` | text or `previewLink` | `WebPageView` | |
| `MessageMediaGeo` | `previewLocation` | Card + OSM link | |
| `MessageMediaVenue` | `previewLocation` | Card + link | |
| `MessageMediaGeoLive` | `previewLocationLive` | Card + link | |
| `MessageMediaContact` | `previewContact` | Card + `tel:` | |
| `MessageMediaGame` | `previewGame` | Card (title/desc) | |
| `MessageMediaInvoice` | `previewInvoice` | Card (amount, hint) | No bot URL without username |
| `MessageMediaPoll` | `previewPoll` | `MessagePollView` / readonly | |
| `MessageMediaDice` | `previewDice` | Card (emoji + value) | |
| `MessageMediaStory` | `previewStory` | Card + generic `t.me` | |
| `MessageMediaGiveaway` / `GiveawayResults` | `previewGiveaway` | Card | |
| `MessageMediaUnsupported` | `previewUnsupported` | Card | |
| `MessageMediaPaidMedia` | inner type or `previewPaidMedia` | Unwrap → inner or placeholder | Poll preferred in bundle |

**Paid nesting:** `MessageMediaPaidMedia` → `extendedMedia[]` → `MessageExtendedMedia.media` → same types as top-level; `resolveMessageMediaForDisplay` picks poll first, else first row.

**Tests:** `src/telegram/messageMediaUnwrap.test.ts`, `src/telegram/messagePollMedia.test.ts`.
