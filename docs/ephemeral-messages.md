# Ephemeral messages

Telegram layer ≥ 228 introduces **ephemeral messages** — a guest / one-off
message type that arrives via dedicated update events separate from the classic
`Message` stream. Ephemeral messages are commonly used for transient guest-chat
interactions.

## Current behavior

Telegramito does not display ephemeral messages in the chat thread. The classic
message history, sending, and delivery ticks are unaffected.

### In-chat notice (Flow A)

If you are in a chat when the server sends an ephemeral update for that
conversation, a **dismissible header ribbon** appears in the chat:

> *Ephemeral / guest messages aren't shown in Telegramito. Open in Telegram
> to see them.*

**Placement:** the ribbon sits below the pinned-message banner (if any) and
above the message list. It is part of the thread chrome, not a floating toast.

Stack order from top to bottom:

1. Forum topic bar (if any)
2. Unread-filter empty hint (if any)
3. Pinned banner (if any)
4. **Ephemeral notice ribbon** ← here
5. Message list

The ribbon appears at most once per session per chat. Dismissing it (×) removes
it for the rest of the session; returning to the chat later in the same session
keeps it hidden.

| Condition | Ribbon |
|-----------|--------|
| No ephemeral update received this session for this chat | Absent |
| Ephemeral update received; not yet dismissed | Visible |
| User tapped × | Hidden for rest of session |
| Chat closed and reopened (same session) | Remains hidden after dismiss |

If an ephemeral update arrives while a **different** chat is open, no ribbon is
shown and no global notification is raised.

### Classic messages (Flow B)

Classic `Api.Message` history, sending, and delivery ticks are fully unchanged.
Ephemeral traffic never enters the message list — only the dismissible ribbon
may appear.

### Settings (Flow C)

In Settings (unlocked), an **About / limitations** note reads:

> Guest and ephemeral chats need the official Telegram app — Telegramito
> doesn't show them.

No action is required; the line is informational only.

## Opening ephemeral content

To read and participate in ephemeral / guest-chat threads, open the conversation
in the **official Telegram app**.

## Known limitations

- **No ephemeral thread** — `EphemeralMessage` items are not rendered in the
  message list. Only the dismissible ribbon indicates that ephemeral traffic
  has arrived.
- **No send** — `ephemeral.sendMessage` is not wired; you cannot reply to or
  initiate an ephemeral exchange from Telegramito.
- **History not fetched** — past ephemeral messages are not loaded; only live
  updates trigger the ribbon.
- **Full guest-chat UI deferred** — rendering ephemeral bubbles, media,
  replies, and send/delete is out of scope for this release (AC-E7 deferred).

---

*Covers `TelegramContext.tsx` ephemeral update listeners and the in-chat
`EphemeralNoticeRibbon` component. If the ribbon placement, wording, or
Settings copy changes, update this page to match.*
