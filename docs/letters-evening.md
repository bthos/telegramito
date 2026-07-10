# Letters — evening edition

The evening edition is a day-end summary shown in `DayMailRail` when the current time falls
inside the evening window: one hour before the night lock begins, or during the night window
itself. Night mode must be configured for the window to be defined.

## Summary rows

| Row | Source | Description |
|-----|--------|-------------|
| `awaitingReply` | Private chats | Peers the user messaged today who have not yet replied (or whose reply was missed). |
| `wroteToday` | Private chats | Peers who wrote to the user today. |
| `broadcastToday` | Channels / bulletins | Channels with an inbound post today. |
| `postedToChannelsToday` | Channels / bulletins | Channels the user posted to today. |

## «Ждут ответа» — unanswered detection tiers

`awaitingReply` is computed in three tiers. Each tier is more accurate but carries a higher cost.

### Tier 0 — dialog preview heuristic (always active)

If the dialog's latest loaded message is outgoing and dated today, the peer appears under
`awaitingReply`. No API calls are made. Limitations:

- Closing phrases ("ok", "спасибо", a period, emoji-only) show as awaiting even though the
  conversation is done.
- Stale previews produce false positives: the peer may have replied since the preview was loaded.

### Tier 1 — in-memory thread cache (always active, zero API cost)

When the user opened the thread this session, messages are already in memory.
`peerAwaitingFromThreadMessages` checks for any inbound message after the user's last outbound
today. If found, the peer is removed from `awaitingReply`.

**Closing-phrase filter** (`isClosingOutbound`): short outbound messages (≤ 48 characters, no `?`)
that match a curated list (ru / en / es), end with `.`, or consist entirely of emoji are treated as
terminal — they do not generate an `awaitingReply` entry. The default list lives in
`src/util/lettersRituals.ts` (`DEFAULT_CLOSING_PHRASES`).

### Tier 2 — targeted API fetch (opt-in)

When a parent enables **«Точнее вечерний выпуск»** (`eveningSummaryPreciseEnabled`) in the Стол
settings, `refineAwaitingReplyTier2` runs after Tier 1.

What it does:

- Fetches recent history (up to 50 messages) for peers still in `awaitingReply` and re-checks the
  awaiting verdict. Stale previews that no longer represent a genuine unanswered thread are
  removed.
- Also refreshes **channel and bulletin lines** (`broadcastToday`): rows whose dialog preview
  showed an inbound post today are confirmed against actual message history. A row is dropped if no
  inbound message from today is found. This means channels that posted yesterday and whose preview
  is stale do not appear in tonight's edition.
- Outbound channel posts (`postedToChannelsToday`) are **not** refreshed — the user's own activity
  does not need API confirmation.

**Budget:** at most 5 GramJS history fetches per evening render (`TIER2_AWAITING_PEER_CAP`).
Private `awaitingReply` peers are checked first; channel `broadcastToday` peers receive any
remaining budget from the same pool.

**Default:** off. Enabling it incurs one GramJS `getMessages` call per qualifying peer per
evening render, up to 5 calls total.

## Developer reference

`buildEveningSummary` — constructs the initial `EveningSummary` from the loaded dialog list.  
`refineAwaitingReplyTier2` — applies Tier 2 (async, requires `TelegramClient`).  
`TIER2_AWAITING_PEER_CAP` — shared fetch budget constant (5).  
`getEveningTier2FetchCount` — session-cumulative fetch counter for dev / test observation.

For Tier 2 telemetry details and the private-vs-channel budget split, see
`.tlk/features/2026-07-10-letters-evening-channel-tier2/dev-notes.md`.
